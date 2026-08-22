import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, BatchItem, CardData, BatchFieldConfig, ManualOverrides, AppTheme } from '../types';
import {
  runFullPipeline,
  getAnkiDecks,
  checkOllama,
  checkGemini,
  checkTTS,
  checkOnlineTTS,
  checkAnki,
} from '../services/api';
import { CardPreview } from './CardPreview';
import {
  FileText,
  Upload,
  Play,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  List,
} from 'lucide-react';

interface BatchCardViewProps {
  settings: AppSettings;
  appTheme?: AppTheme;
}

export type BatchFormatType = 'formatA_simple' | 'formatB_structured';

export interface BatchParsedResult {
  format: BatchFormatType;
  formatLabel: string;
  formatDescription: string;
  items: Array<{ word: string; deck: string; parsedFields: Partial<CardData> & { needsPhoto?: boolean } }>;
}

const DEFAULT_SAMPLE_FORMAT_A = `apple
bank
photo
abandon
wander
wonder`;

const DEFAULT_SAMPLE_FORMAT_B = `--
Word=eraser
Deck=English::B1
Phonetic=/ɪˈreɪzər/
Part of Speech=noun
Persian Meaning=پاک‌کن
Example Sentence=I need an eraser to fix this mistake.
ExampleTranslation=من به یک پاک‌کن برای تصحیح این اشتباه نیاز دارم.
Memory Aid=ERASE-ER: It erases mistakes on paper.
Photo=true
--
Word=abandon
Deck=English::B1
Phonetic=/əˈbændən/
Part of Speech=verb
Persian Meaning=رها کردن، ترک کردن
Example Sentence=He abandoned his car on the highway.
ExampleTranslation=او ماشین خود را در بزرگراه رها کرد.
Memory Aid=A-BAND-ON: Imagine a band left behind on the stage.
Photo=false
--
Word=bank
Deck=English::B1
Persian Meaning=بانک (موسسه مالی)
Photo=true
--
Word=bank
Deck=English::B1
Persian Meaning=ساحل رودخانه
Photo=true
--`;

/**
 * Automatically detects whether the TXT input is Format A (simple word list)
 * or Format B (structured key-value entries separated by --).
 * User does NOT need to manually select a format.
 */
export function autoDetectAndParseBatchInput(
  rawText: string,
  defaultDeck: string
): BatchParsedResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      format: 'formatA_simple',
      formatLabel: 'Format A (Simple Word List)',
      formatDescription: 'One English word per line. AI and dictionaries will automatically generate all details.',
      items: [],
    };
  }

  // 1. Detection heuristic for Format B:
  // Check for '--' block separators or structured key-value patterns (e.g. Word=, Persian Meaning=, Photo=, etc.)
  const hasSeparator = /(?:^|\r?\n)\s*--\s*(?:\r?\n|$)/m.test(trimmed);
  const hasKeyValuePairs = /(?:^|\r?\n)\s*(?:word|deck|phonetic|ipa|part\s*of\s*speech|pos|persian\s*meaning|meaning|example\s*sentence|example|memory\s*aid|mnemonic|photo|image|picture)\s*[:=]/i.test(trimmed);

  if (hasSeparator || hasKeyValuePairs) {
    // FORMAT B: Structured Entries
    const rawBlocks = hasSeparator
      ? trimmed.split(/(?:^|\r?\n)\s*--\s*(?:\r?\n|$)/m)
      : trimmed.split(/\r?\n\s*\r?\n/); // fallback split on blank lines

    const blocks = rawBlocks.map((b) => b.trim()).filter(Boolean);
    const results: Array<{ word: string; deck: string; parsedFields: Partial<CardData> & { needsPhoto?: boolean } }> = [];

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const fields: Record<string, string> = {};

      for (const line of lines) {
        const sepIndex = line.indexOf('=') !== -1 ? line.indexOf('=') : line.indexOf(':');
        if (sepIndex !== -1) {
          const rawKey = line.slice(0, sepIndex).trim().toLowerCase().replace(/[\s_-]/g, '');
          const val = line.slice(sepIndex + 1).trim();
          fields[rawKey] = val;
        } else if (!fields['word'] && line && !line.startsWith('--')) {
          fields['word'] = line.trim();
        }
      }

      const word = fields['word'] || fields['english'] || fields['term'] || '';
      if (!word) continue;

      let needsPhoto: boolean | undefined = undefined;
      const photoRaw = fields['photo'] || fields['image'] || fields['picture'] || fields['needsphoto'] || fields['needsimage'];
      if (photoRaw !== undefined) {
        const pLow = photoRaw.trim().toLowerCase();
        if (pLow === 'true' || pLow === 'yes' || pLow === '1' || pLow === 'y' || pLow === 'on') {
          needsPhoto = true;
        } else if (pLow === 'false' || pLow === 'no' || pLow === '0' || pLow === 'n' || pLow === 'off') {
          needsPhoto = false;
        }
      }

      const deck = fields['deck'] || fields['deckname'] || fields['targetdeck'] || defaultDeck;
      const parsedFields: Partial<CardData> & { needsPhoto?: boolean } = {
        word,
        phonetic: fields['phonetic'] || fields['ipa'] || fields['pronunciation'] || undefined,
        partOfSpeech: fields['partofspeech'] || fields['pos'] || fields['type'] || undefined,
        meaningFa: fields['persianmeaning'] || fields['meaning'] || fields['meaningfa'] || fields['persian'] || fields['farsi'] || undefined,
        example: fields['examplesentence'] || fields['example'] || fields['sentence'] || fields['sample'] || undefined,
        translationFa: fields['exampletranslation'] || fields['translation'] || fields['translationfa'] || fields['sentencefa'] || undefined,
        mnemonic: fields['memoryaid'] || fields['mnemonic'] || fields['aid'] || fields['code'] || undefined,
        needsPhoto,
      };

      results.push({ word, deck, parsedFields });
    }

    if (results.length > 0) {
      return {
        format: 'formatB_structured',
        formatLabel: 'Format B (Structured Blocks with --)',
        formatDescription: 'Key-value pairs separated by "--". Custom fields are preserved with highest priority.',
        items: results,
      };
    }
  }

  // 2. FORMAT A: Simple Word List (one word per line, duplicates fully allowed)
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = lines.map((w) => ({
    word: w,
    deck: defaultDeck,
    parsedFields: { word: w },
  }));

  return {
    format: 'formatA_simple',
    formatLabel: 'Format A (Simple Word List)',
    formatDescription: 'One English word per line. AI and selected dictionaries will generate all fields.',
    items,
  };
}

export const BatchCardView: React.FC<BatchCardViewProps> = ({ settings, appTheme = settings.appTheme || 'comic' }) => {
  const [inputText, setInputText] = useState<string>(DEFAULT_SAMPLE_FORMAT_A);
  const [fileName, setFileName] = useState<string>('sample_words.txt');
  const [deck, setDeck] = useState<string>(settings.anki.defaultDeck || 'English::B1');
  const [availableDecks, setAvailableDecks] = useState<string[]>(['English::B1', 'English::B2', 'IELTS']);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [detectedFormatInfo, setDetectedFormatInfo] = useState<{
    format: BatchFormatType;
    formatLabel: string;
    formatDescription: string;
  }>({
    format: 'formatA_simple',
    formatLabel: 'Format A (Simple Word List)',
    formatDescription: 'One English word per line. AI and dictionaries will automatically generate all details.',
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState<boolean>(false);

  const isMinimalLight = appTheme === 'minimal-light';
  const isMinimalDark = appTheme === 'minimal-dark';
  const isMinimal = isMinimalLight || isMinimalDark;

  // User-Controlled Fields Config
  const [fieldConfig, setFieldConfig] = useState<BatchFieldConfig>({
    word: true,
    deck: true,
    phonetic: true,
    partOfSpeech: true,
    meaningFa: true,
    example: true,
    translationFa: true,
    mnemonic: true,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Decks
  useEffect(() => {
    getAnkiDecks(settings.anki.url).then((res) => {
      if (res.success && res.decks.length > 0) {
        setAvailableDecks(res.decks);
        if (!res.decks.includes(deck)) {
          setDeck(res.decks[0]);
        }
      }
    }).catch(() => {});
  }, [settings.anki.url]);

  // Sync Input and Auto-Parse Items Whenever Input or Deck changes
  useEffect(() => {
    const parsed = autoDetectAndParseBatchInput(inputText, deck);
    setDetectedFormatInfo({
      format: parsed.format,
      formatLabel: parsed.formatLabel,
      formatDescription: parsed.formatDescription,
    });

    setItems(
      parsed.items.map((it, idx) => ({
        id: `batch-${idx}-${it.word}`,
        word: it.word,
        deck: it.deck,
        status: 'idle',
        parsedFields: it.parsedFields,
      }))
    );
  }, [inputText, deck]);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  // Preflight Health Checks
  const runPreflightCheck = async (): Promise<boolean> => {
    setPreflightError(null);

    // 1. AI Check
    if (settings.ai.provider === 'gemini') {
      const geminiCheck = await checkGemini(settings.ai.gemini.apiKey, settings.ai.gemini.model);
      if (!geminiCheck.connected) {
        setPreflightError(`Preflight Failed: Gemini API error: ${geminiCheck.error}. Check your API key in Settings.`);
        return false;
      }
    } else {
      const aiCheck = await checkOllama(settings.ai.ollama.url);
      if (!aiCheck.connected) {
        setPreflightError(`Preflight Failed: Ollama is unreachable at ${settings.ai.ollama.url}.`);
        return false;
      }
    }

    // 2. TTS Check
    if (settings.tts.provider === 'online') {
      const onlineCheck = await checkOnlineTTS();
      if (!onlineCheck.connected) {
        setPreflightError(`Preflight Failed: Online TTS unreachable (${onlineCheck.error}).`);
        return false;
      }
    } else {
      const ttsCheck = await checkTTS(settings.tts.endpoint);
      if (!ttsCheck.ready) {
        setPreflightError(`Preflight Failed: Piper TTS is offline at ${settings.tts.endpoint}.`);
        return false;
      }
    }

    // 3. AnkiConnect Check
    const ankiCheck = await checkAnki(settings.anki.url);
    if (!ankiCheck.connected) {
      setPreflightError(`Preflight Failed: AnkiConnect is unreachable at ${settings.anki.url}. Make sure Anki is running.`);
      return false;
    }

    return true;
  };

  // Process a single item respecting user-controlled field configuration & duplicate allowance
  const processItem = async (item: BatchItem): Promise<BatchItem> => {
    const targetDeck = item.deck || deck;

    // Build manual overrides from parsedFields based on user field config
    const overrides: ManualOverrides = {};
    if (item.parsedFields) {
      if (fieldConfig.phonetic && item.parsedFields.phonetic) overrides.phonetic = item.parsedFields.phonetic;
      if (fieldConfig.partOfSpeech && item.parsedFields.partOfSpeech) overrides.partOfSpeech = item.parsedFields.partOfSpeech;
      if (fieldConfig.meaningFa && item.parsedFields.meaningFa) overrides.meaningFa = item.parsedFields.meaningFa;
      if (fieldConfig.example && item.parsedFields.example) overrides.example = item.parsedFields.example;
      if (fieldConfig.translationFa && item.parsedFields.translationFa) overrides.translationFa = item.parsedFields.translationFa;
      if (fieldConfig.mnemonic && item.parsedFields.mnemonic) overrides.mnemonic = item.parsedFields.mnemonic;
      if (item.parsedFields.needsPhoto !== undefined) overrides.needsPhoto = item.parsedFields.needsPhoto;
    }

    // Run Pipeline with allowDuplicate: true so duplicate words with distinct meanings create separate cards
    const res = await runFullPipeline({
      word: item.word,
      deck: targetDeck,
      manualOverrides: overrides,
      cardType: settings.defaultCard?.cardType || 'normal',
      createInAnki: true,
    });

    if (res.success && res.cardData) {
      return {
        ...item,
        status: 'success',
        cardData: res.cardData,
        noteId: res.noteId,
      };
    } else {
      return {
        ...item,
        status: 'error',
        error: res.error || 'Failed during processing',
      };
    }
  };

  // Build All Cards sequentially
  const handleBuildAll = async () => {
    if (items.length === 0 || isProcessing) return;

    const preflightPassed = await runPreflightCheck();
    if (!preflightPassed) return;

    setIsProcessing(true);

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      if (updatedItems[i].status === 'success') continue;

      updatedItems[i] = { ...updatedItems[i], status: 'generating_ai' };
      setItems([...updatedItems]);

      const processed = await processItem(updatedItems[i]);
      updatedItems[i] = processed;
      setItems([...updatedItems]);

      if (processed.cardData) {
        setPreviewCard(processed.cardData);
      }
    }

    setIsProcessing(false);
  };

  // Retry single item
  const handleRetrySingle = async (index: number) => {
    if (isProcessing) return;
    const targetItem = items[index];
    if (!targetItem) return;

    const preflightPassed = await runPreflightCheck();
    if (!preflightPassed) return;

    const updated = [...items];
    updated[index] = { ...targetItem, status: 'generating_ai', error: undefined };
    setItems(updated);

    const processed = await processItem(targetItem);
    updated[index] = processed;
    setItems([...updated]);

    if (processed.cardData) {
      setPreviewCard(processed.cardData);
    }
  };

  const completedCount = items.filter((it) => it.status === 'success').length;
  const errorCount = items.filter((it) => it.status === 'error').length;
  const totalParsedFieldsCount = items.reduce((acc, it) => {
    return acc + Object.keys(it.parsedFields || {}).length;
  }, 0);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 min-w-0">
      {/* LEFT COLUMN: TXT Batch Input & Queue */}
      <section className="w-full lg:w-[480px] flex flex-col gap-6 shrink-0 min-w-0">
        {/* Batch File Box */}
        <div
          className={
            isMinimalLight
              ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm text-slate-800'
              : isMinimalDark
              ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm text-zinc-100'
              : 'bg-[#4ADE80] p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black'
          }
        >
          <div className={isMinimal ? 'flex items-center justify-between border-b pb-3 mb-4 border-slate-200 dark:border-zinc-700' : 'flex items-center justify-between border-b-4 border-black pb-3 mb-4'}>
            <h2 className={isMinimal ? 'text-lg font-bold tracking-tight' : 'text-xl sm:text-2xl font-black uppercase italic tracking-tight flex items-center gap-2'}>
              Batch Import (TXT)
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={
                  isMinimal
                    ? 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer'
                    : 'px-3 py-1.5 bg-[#FFD93D] hover:bg-[#ffe066] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer uppercase active:translate-y-0.5'
                }
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload TXT</span>
              </button>
            </div>
          </div>

          {/* AUTO-DETECTED FORMAT BANNER */}
          <div
            className={
              isMinimalLight
                ? 'bg-slate-50 text-slate-800 p-3 border border-slate-200 rounded-md shadow-sm mb-3'
                : isMinimalDark
                ? 'bg-zinc-900 text-zinc-200 p-3 border border-zinc-700 rounded-md shadow-sm mb-3'
                : 'bg-black text-white p-3 border-4 border-black shadow-[3px_3px_0px_#000000] mb-3'
            }
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FFD93D]" />
                <span className={isMinimal ? 'text-xs font-semibold' : 'text-xs font-black uppercase text-[#FFD93D] tracking-wider'}>
                  Auto-Detected Format:
                </span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                  detectedFormatInfo.format === 'formatB_structured'
                    ? 'bg-purple-600 text-white border-purple-700'
                    : 'bg-blue-600 text-white border-blue-700'
                } ${isMinimal ? 'rounded' : ''}`}
              >
                {detectedFormatInfo.format === 'formatB_structured' ? 'Format B (Structured)' : 'Format A (Simple List)'}
              </span>
            </div>
            <p className={isMinimal ? 'text-xs text-slate-500 dark:text-zinc-400' : 'text-[11px] text-zinc-300 font-bold'}>
              {detectedFormatInfo.formatDescription}
            </p>
          </div>

          {/* TXT File Status & Default Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div
              className={
                isMinimalLight
                  ? 'bg-white p-2.5 border border-slate-200 rounded-md flex items-center justify-between'
                  : isMinimalDark
                  ? 'bg-zinc-900 p-2.5 border border-zinc-700 rounded-md flex items-center justify-between'
                  : 'bg-white p-2.5 border-4 border-black flex items-center justify-between'
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-black dark:text-zinc-300 shrink-0" />
                <span className="text-xs font-bold truncate max-w-[120px]">
                  {fileName}
                </span>
              </div>
              <span
                className={
                  isMinimal
                    ? 'text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded'
                    : 'text-xs font-black bg-black text-[#4ADE80] px-2 py-0.5 border border-black'
                }
              >
                {items.length} cards
              </span>
            </div>

            <div
              className={
                isMinimalLight
                  ? 'bg-white p-2.5 border border-slate-200 rounded-md flex items-center justify-between gap-1'
                  : isMinimalDark
                  ? 'bg-zinc-900 p-2.5 border border-zinc-700 rounded-md flex items-center justify-between gap-1'
                  : 'bg-white p-2.5 border-4 border-black flex items-center justify-between gap-1'
              }
            >
              <label className="text-xs font-bold uppercase">Deck:</label>
              <select
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
                disabled={isProcessing}
                className={
                  isMinimalLight
                    ? 'flex-1 bg-white text-slate-900 text-xs font-medium px-1 py-0.5 focus:outline-none cursor-pointer'
                    : isMinimalDark
                    ? 'flex-1 bg-zinc-900 text-zinc-100 text-xs font-medium px-1 py-0.5 focus:outline-none cursor-pointer'
                    : 'flex-1 bg-white text-black text-xs font-bold px-1 py-0.5 focus:outline-none cursor-pointer'
                }
              >
                {availableDecks.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Helper Example Loaders (One-Click Testing) */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setFileName('sample_simple_list.txt');
                setInputText(DEFAULT_SAMPLE_FORMAT_A);
              }}
              className={
                isMinimal
                  ? 'flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-medium rounded border border-slate-200 dark:border-zinc-700 cursor-pointer flex items-center justify-center gap-1 transition-colors'
                  : 'flex-1 py-1.5 px-2 bg-white hover:bg-zinc-100 text-black text-[11px] font-black uppercase border-2 border-black cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-1'
              }
            >
              <List className="w-3.5 h-3.5 text-blue-600" />
              <span>Load Format A Example</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFileName('sample_structured_blocks.txt');
                setInputText(DEFAULT_SAMPLE_FORMAT_B);
              }}
              className={
                isMinimal
                  ? 'flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-medium rounded border border-slate-200 dark:border-zinc-700 cursor-pointer flex items-center justify-center gap-1 transition-colors'
                  : 'flex-1 py-1.5 px-2 bg-white hover:bg-zinc-100 text-black text-[11px] font-black uppercase border-2 border-black cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-1'
              }
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Load Format B Example</span>
            </button>
          </div>

          {/* TXT Input Area */}
          <div className="mb-3">
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              className={
                isMinimalLight
                  ? 'w-full bg-white text-slate-900 text-xs font-medium font-mono p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  : isMinimalDark
                  ? 'w-full bg-zinc-950 text-zinc-100 text-xs font-medium font-mono p-3 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  : 'w-full bg-white text-black text-xs font-bold font-mono p-3 border-4 border-black focus:outline-none'
              }
              placeholder="Paste words or upload TXT file. Format is auto-detected automatically!"
            />
          </div>

          {/* Field Settings Collapsible */}
          <div
            className={
              isMinimalLight
                ? 'bg-white border border-slate-200 rounded-md p-3 mb-4 shadow-sm'
                : isMinimalDark
                ? 'bg-zinc-900 border border-zinc-700 rounded-md p-3 mb-4 shadow-sm'
                : 'bg-white border-4 border-black p-3 mb-4'
            }
          >
            <button
              type="button"
              onClick={() => setShowFieldConfig(!showFieldConfig)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider cursor-pointer hover:opacity-80"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Field Settings ({totalParsedFieldsCount} parsed values found)</span>
              </span>
              {showFieldConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFieldConfig && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-700 text-xs space-y-2">
                <p className={isMinimal ? 'text-[11px] text-slate-500 dark:text-zinc-400 mb-2' : 'text-[10px] text-zinc-600 font-bold mb-2'}>
                  * If present in TXT, the file's data is preserved with top priority. Missing fields are generated by AI / dictionary.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.word}
                      disabled
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Word (Always)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.deck}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, deck: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Deck</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.phonetic}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, phonetic: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Phonetic</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.partOfSpeech}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, partOfSpeech: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Part of Speech</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.meaningFa}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, meaningFa: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Persian Meaning</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.example}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, example: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Example Sentence</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.translationFa}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, translationFa: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Example Translation</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.mnemonic}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, mnemonic: e.target.checked })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-[11px] font-medium">Memory Aid</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Preflight Error Banner */}
          {preflightError && (
            <div className="mb-3 p-3 bg-red-600 text-white text-xs flex items-center gap-2 font-bold shadow-sm rounded-md">
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              <span>{preflightError}</span>
            </div>
          )}

          {/* Build All Button */}
          <button
            type="button"
            onClick={handleBuildAll}
            disabled={isProcessing || items.length === 0}
            className={
              isMinimal
                ? `w-full py-3 px-4 font-semibold text-sm rounded-md shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isProcessing
                      ? 'bg-blue-400 text-white cursor-wait'
                      : isMinimalDark
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`
                : `w-full bg-[#FF4B4B] text-white font-black py-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xl uppercase tracking-wider hover:translate-y-0.5 active:translate-y-1 transition-transform flex items-center justify-center gap-2 select-none ${
                    isProcessing ? 'opacity-80 cursor-wait' : 'cursor-pointer'
                  }`
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>PROCESSING ({completedCount} / {items.length})...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>GENERATE BATCH CARDS</span>
              </>
            )}
          </button>
        </div>

        {/* Batch Queue List */}
        <div
          className={
            isMinimalLight
              ? 'bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm flex flex-col text-slate-800'
              : isMinimalDark
              ? 'bg-[#27272A] border border-zinc-700 rounded-lg p-4 sm:p-5 shadow-sm flex flex-col text-zinc-100'
              : 'bg-white border-4 border-black p-4 sm:p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col text-black'
          }
        >
          <div className="flex items-center justify-between border-b pb-2 mb-3 border-slate-200 dark:border-zinc-700">
            <span className="text-xs font-bold uppercase tracking-wider">
              Batch Queue ({completedCount} / {items.length})
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold">
              {completedCount > 0 && <span className="text-emerald-600">{completedCount} ✓</span>}
              {errorCount > 0 && <span className="text-red-500">{errorCount} ✕</span>}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const isSuccess = item.status === 'success';
              const isRunning = item.status === 'generating_ai';
              const isFailed = item.status === 'error';
              const customMeaning = item.parsedFields?.meaningFa;

              return (
                <div
                  key={item.id}
                  onClick={() => item.cardData && setPreviewCard(item.cardData)}
                  className={
                    isMinimal
                      ? `p-2.5 border rounded-md flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                          isSuccess
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                            : isFailed
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-950 dark:text-red-200'
                            : isRunning
                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200 animate-pulse'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200'
                        }`
                      : `p-2.5 border-2 border-black flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                          isSuccess
                            ? 'bg-emerald-50 text-black'
                            : isFailed
                            ? 'bg-red-50 text-black'
                            : isRunning
                            ? 'bg-sky-50 text-black animate-pulse'
                            : 'bg-white text-black'
                        }`
                  }
                >
                  {/* Left: Word & Info */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-zinc-400 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate">{item.word}</span>
                        {item.noteId && (
                          <span className="text-[10px] bg-slate-800 text-emerald-400 font-bold px-1.5 py-0.2 rounded">
                            #{item.noteId}
                          </span>
                        )}
                      </div>
                      {customMeaning && (
                        <span className="text-[10px] text-zinc-500 font-medium block truncate max-w-[200px]" dir="rtl">
                          {customMeaning}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isSuccess && (
                      <span className="text-emerald-600 font-bold text-sm">✓</span>
                    )}
                    {isRunning && (
                      <span className="text-blue-600 font-bold text-xs">generating...</span>
                    )}
                    {isFailed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetrySingle(idx);
                        }}
                        disabled={isProcessing}
                        className="px-2 py-0.5 bg-red-600 text-white font-medium text-[10px] rounded flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Retry</span>
                      </button>
                    )}
                    {item.status === 'idle' && (
                      <span className="text-zinc-400 font-medium text-xs">ready</span>
                    )}
                    {item.cardData && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCard(item.cardData!);
                        }}
                        className="p-1 hover:opacity-70 cursor-pointer"
                        title="Inspect Card"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: Live Card Preview Frame */}
      <section className="flex-1 flex flex-col min-h-[560px] min-w-0">
        <div
          className={
            isMinimalLight
              ? 'flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-6 relative overflow-hidden shadow-sm flex flex-col'
              : isMinimalDark
              ? 'flex-1 bg-[#1F1F23] border border-zinc-700 rounded-lg p-4 sm:p-6 relative overflow-hidden shadow-sm flex flex-col'
              : 'flex-1 bg-[#F5F2EB] border-4 border-black p-4 sm:p-8 relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col'
          }
        >
          <div className="relative z-10 w-full flex-1 flex flex-col justify-center min-w-0">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder={items[0]?.word || 'batch card'}
              appTheme={appTheme}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
