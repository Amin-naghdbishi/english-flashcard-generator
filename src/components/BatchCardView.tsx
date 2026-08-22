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
import { useAppTheme } from '../context/ThemeContext';
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
  items: Array<{ word: string; deck: string; parsedFields: Partial<CardData> & { needsPhoto?: boolean; cardType?: CardType } }>;
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
Spelling=false
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
Spelling=true
--
Word=bank
Deck=English::B1
Persian Meaning=بانک (موسسه مالی)
Photo=true
Spelling=false
--
Word=bank
Deck=English::B1
Persian Meaning=ساحل رودخانه
Photo=true
Spelling=true
--`;

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

  const hasSeparator = /(?:^|\r?\n)\s*--\s*(?:\r?\n|$)/m.test(trimmed);
  const hasKeyValuePairs = /(?:^|\r?\n)\s*(?:word|deck|phonetic|ipa|part\s*of\s*speech|pos|persian\s*meaning|meaning|example\s*sentence|example|memory\s*aid|mnemonic|photo|image|picture|spelling|cardtype)\s*[:=]/i.test(trimmed);

  if (hasSeparator || hasKeyValuePairs) {
    const rawBlocks = hasSeparator
      ? trimmed.split(/(?:^|\r?\n)\s*--\s*(?:\r?\n|$)/m)
      : trimmed.split(/\r?\n\s*\r?\n/);

    const blocks = rawBlocks.map((b) => b.trim()).filter(Boolean);
    const results: Array<{ word: string; deck: string; parsedFields: Partial<CardData> & { needsPhoto?: boolean; cardType?: CardType } }> = [];

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

      let cardType: CardType | undefined = undefined;
      const spellingRaw =
        fields['spelling'] ||
        fields['isspelling'] ||
        fields['spellingcard'] ||
        fields['cardtype'];

      if (spellingRaw !== undefined) {
        const sLow = spellingRaw.trim().toLowerCase();
        if (sLow === 'true' || sLow === 'yes' || sLow === '1' || sLow === 'y' || sLow === 'on' || sLow === 'spelling') {
          cardType = 'spelling';
        } else if (sLow === 'false' || sLow === 'no' || sLow === '0' || sLow === 'n' || sLow === 'off' || sLow === 'normal') {
          cardType = 'normal';
        }
      }

      const deck = fields['deck'] || fields['deckname'] || fields['targetdeck'] || defaultDeck;
      const parsedFields: Partial<CardData> & { needsPhoto?: boolean; cardType?: CardType } = {
        word,
        phonetic: fields['phonetic'] || fields['ipa'] || fields['pronunciation'] || undefined,
        partOfSpeech: fields['partofspeech'] || fields['pos'] || fields['type'] || undefined,
        meaningFa: fields['persianmeaning'] || fields['meaning'] || fields['meaningfa'] || fields['persian'] || fields['farsi'] || undefined,
        example: fields['examplesentence'] || fields['example'] || fields['sentence'] || fields['sample'] || undefined,
        translationFa: fields['exampletranslation'] || fields['translation'] || fields['translationfa'] || fields['sentencefa'] || undefined,
        mnemonic: fields['memoryaid'] || fields['mnemonic'] || fields['aid'] || fields['code'] || undefined,
        needsPhoto,
        cardType,
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

export const BatchCardView: React.FC<BatchCardViewProps> = ({ settings }) => {
  const themeContext = useAppTheme();
  const isDark = themeContext.isDark;

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAnkiDecks(settings.anki.url).then((res) => {
      if (res.success && res.decks.length > 0) {
        setAvailableDecks(res.decks);
      }
    });
  }, [settings.anki.url]);

  useEffect(() => {
    const parseResult = autoDetectAndParseBatchInput(inputText, deck);
    setDetectedFormatInfo({
      format: parseResult.format,
      formatLabel: parseResult.formatLabel,
      formatDescription: parseResult.formatDescription,
    });

    const newItems: BatchItem[] = parseResult.items.map((parsed, idx) => ({
      id: `${parsed.word}_${idx}_${Date.now()}`,
      word: parsed.word,
      deck: parsed.deck || deck,
      status: 'idle',
      parsedFields: parsed.parsedFields,
    }));

    setItems(newItems);
  }, [inputText, deck]);

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

  const runPreflightChecks = async (): Promise<boolean> => {
    setPreflightError(null);

    const ankiRes = await checkAnki(settings.anki.url);
    if (!ankiRes.connected) {
      setPreflightError(`AnkiConnect is offline at ${settings.anki.url}. Please open Anki Desktop with AnkiConnect.`);
      return false;
    }

    if (settings.ai.provider === 'ollama') {
      const ollamaRes = await checkOllama(settings.ai.ollama.url);
      if (!ollamaRes.connected) {
        setPreflightError(`Ollama is offline at ${settings.ai.ollama.url}. Please start Ollama or switch to Gemini.`);
        return false;
      }
    } else if (settings.ai.provider === 'gemini') {
      const geminiRes = await checkGemini(settings.ai.gemini.apiKey, settings.ai.gemini.model);
      if (!geminiRes.connected) {
        setPreflightError(`Google Gemini is not reachable: ${geminiRes.error || 'Check API Key'}`);
        return false;
      }
    }

    if (settings.tts.provider === 'piper') {
      const ttsRes = await checkTTS(settings.tts.endpoint);
      if (!ttsRes.ready) {
        setPreflightError(`Piper TTS service is not reachable at ${settings.tts.endpoint}.`);
        return false;
      }
    } else if (settings.tts.provider === 'online') {
      const onlineTtsRes = await checkOnlineTTS();
      if (!onlineTtsRes.connected) {
        setPreflightError(`Online TTS service error: ${onlineTtsRes.error}`);
        return false;
      }
    }

    return true;
  };

  const handleBuildAll = async () => {
    if (items.length === 0 || isProcessing) return;

    const preflightOk = await runPreflightChecks();
    if (!preflightOk) return;

    setIsProcessing(true);

    for (let i = 0; i < items.length; i++) {
      const currentItem = items[i];

      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'generating_ai' } : item))
      );

      try {
        const customOverrides: ManualOverrides = {};
        if (currentItem.parsedFields) {
          if (fieldConfig.phonetic && currentItem.parsedFields.phonetic) {
            customOverrides.phonetic = currentItem.parsedFields.phonetic;
          }
          if (fieldConfig.partOfSpeech && currentItem.parsedFields.partOfSpeech) {
            customOverrides.partOfSpeech = currentItem.parsedFields.partOfSpeech;
          }
          if (fieldConfig.meaningFa && currentItem.parsedFields.meaningFa) {
            customOverrides.meaningFa = currentItem.parsedFields.meaningFa;
          }
          if (fieldConfig.example && currentItem.parsedFields.example) {
            customOverrides.example = currentItem.parsedFields.example;
          }
          if (fieldConfig.translationFa && currentItem.parsedFields.translationFa) {
            customOverrides.translationFa = currentItem.parsedFields.translationFa;
          }
          if (fieldConfig.mnemonic && currentItem.parsedFields.mnemonic) {
            customOverrides.mnemonic = currentItem.parsedFields.mnemonic;
          }
          if (currentItem.parsedFields.needsPhoto !== undefined) {
            customOverrides.needsPhoto = currentItem.parsedFields.needsPhoto;
          }
          if (currentItem.parsedFields.cardType !== undefined) {
            customOverrides.cardType = currentItem.parsedFields.cardType;
          }
        }

        const effectiveCardType: CardType =
          currentItem.parsedFields?.cardType ||
          settings.defaultCard?.cardType ||
          'normal';

        const targetDeck = currentItem.deck || deck;

        const res = await runFullPipeline({
          word: currentItem.word,
          deck: targetDeck,
          manualOverrides: {
            ...customOverrides,
            cardType: effectiveCardType,
          },
          cardType: effectiveCardType,
          createInAnki: true,
        });

        if (!res.success || !res.cardData) {
          throw new Error(res.error || 'Card generation failed');
        }

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'success',
                  cardData: res.cardData,
                  noteId: res.noteId,
                }
              : item
          )
        );

        setPreviewCard(res.cardData);
      } catch (err: any) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'error',
                  error: err.message || 'Error occurred',
                }
              : item
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const handleRetrySingle = async (index: number) => {
    const itemToRetry = items[index];
    if (!itemToRetry || isProcessing) return;

    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, status: 'generating_ai', error: undefined } : it))
    );

    try {
      const customOverrides: ManualOverrides = {};
      if (itemToRetry.parsedFields) {
        if (fieldConfig.phonetic && itemToRetry.parsedFields.phonetic) customOverrides.phonetic = itemToRetry.parsedFields.phonetic;
        if (fieldConfig.partOfSpeech && itemToRetry.parsedFields.partOfSpeech) customOverrides.partOfSpeech = itemToRetry.parsedFields.partOfSpeech;
        if (fieldConfig.meaningFa && itemToRetry.parsedFields.meaningFa) customOverrides.meaningFa = itemToRetry.parsedFields.meaningFa;
        if (fieldConfig.example && itemToRetry.parsedFields.example) customOverrides.example = itemToRetry.parsedFields.example;
        if (fieldConfig.translationFa && itemToRetry.parsedFields.translationFa) customOverrides.translationFa = itemToRetry.parsedFields.translationFa;
        if (fieldConfig.mnemonic && itemToRetry.parsedFields.mnemonic) customOverrides.mnemonic = itemToRetry.parsedFields.mnemonic;
        if (itemToRetry.parsedFields.needsPhoto !== undefined) customOverrides.needsPhoto = itemToRetry.parsedFields.needsPhoto;
        if (itemToRetry.parsedFields.cardType !== undefined) customOverrides.cardType = itemToRetry.parsedFields.cardType;
      }

      const effectiveCardType: CardType =
        itemToRetry.parsedFields?.cardType ||
        settings.defaultCard?.cardType ||
        'normal';

      const res = await runFullPipeline({
        word: itemToRetry.word,
        deck: itemToRetry.deck || deck,
        manualOverrides: {
          ...customOverrides,
          cardType: effectiveCardType,
        },
        cardType: effectiveCardType,
        createInAnki: true,
      });

      if (!res.success || !res.cardData) {
        throw new Error(res.error || 'Failed retry');
      }

      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'success',
                cardData: res.cardData,
                noteId: res.noteId,
              }
            : it
        )
      );

      setPreviewCard(res.cardData);
    } catch (e: any) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'error',
                error: e.message || 'Error occurred',
              }
            : it
        )
      );
    }
  };

  const completedCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const totalParsedFieldsCount = items.reduce((acc, it) => {
    return acc + Object.keys(it.parsedFields || {}).length;
  }, 0);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 min-w-0">
      <section className="w-full lg:w-[480px] flex flex-col gap-6 shrink-0 min-w-0">
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
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
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload TXT</span>
              </button>
            </div>
          </div>

          <div
            className={`p-3 border rounded-md shadow-xs mb-3 ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold">
                  Detected Format:
                </span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                  detectedFormatInfo.format === 'formatB_structured'
                    ? 'bg-purple-900/40 text-purple-300 border-purple-800'
                    : 'bg-blue-900/40 text-blue-300 border-blue-800'
                }`}
              >
                {detectedFormatInfo.format === 'formatB_structured' ? 'Format B (Structured)' : 'Format A (Simple List)'}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {detectedFormatInfo.formatDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div
              className={`p-2.5 border rounded-md flex items-center justify-between ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs font-semibold truncate max-w-[120px]">
                  {fileName}
                </span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {items.length} cards
              </span>
            </div>

            <div
              className={`p-2.5 border rounded-md flex items-center justify-between gap-1 ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              }`}
            >
              <label className="text-xs font-semibold">Deck:</label>
              <select
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
                disabled={isProcessing}
                className={`flex-1 text-xs font-medium px-1 py-0.5 focus:outline-none cursor-pointer ${
                  isDark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900'
                }`}
              >
                {availableDecks.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setFileName('sample_simple_list.txt');
                setInputText(DEFAULT_SAMPLE_FORMAT_A);
              }}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded border cursor-pointer flex items-center justify-center gap-1 transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5 text-blue-500" />
              <span>Format A Example</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFileName('sample_structured_blocks.txt');
                setInputText(DEFAULT_SAMPLE_FORMAT_B);
              }}
              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded border cursor-pointer flex items-center justify-center gap-1 transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>Format B Example</span>
            </button>
          </div>

          <div className="mb-3">
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              className={`w-full text-xs font-medium font-mono p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDark
                  ? 'bg-[#18181B] border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                  : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
              }`}
              placeholder="Paste words or upload TXT file. Format is auto-detected automatically!"
            />
          </div>

          <div
            className={`border rounded-md p-3 mb-4 shadow-xs ${
              isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowFieldConfig(!showFieldConfig)}
              className="w-full flex items-center justify-between text-xs font-semibold cursor-pointer hover:opacity-80"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Field Settings ({totalParsedFieldsCount} parsed values found)</span>
              </span>
              {showFieldConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFieldConfig && (
              <div className={`mt-3 pt-3 border-t text-xs space-y-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <p className={`text-[11px] mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  * If present in TXT, the file's data is preserved with top priority. Missing fields are generated by AI / dictionary.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.word} disabled className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Word</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.deck} onChange={(e) => setFieldConfig({ ...fieldConfig, deck: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Deck</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.phonetic} onChange={(e) => setFieldConfig({ ...fieldConfig, phonetic: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Phonetic</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.partOfSpeech} onChange={(e) => setFieldConfig({ ...fieldConfig, partOfSpeech: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Part of Speech</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.meaningFa} onChange={(e) => setFieldConfig({ ...fieldConfig, meaningFa: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Persian Meaning</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.example} onChange={(e) => setFieldConfig({ ...fieldConfig, example: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Example Sentence</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.translationFa} onChange={(e) => setFieldConfig({ ...fieldConfig, translationFa: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Example Translation</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.mnemonic} onChange={(e) => setFieldConfig({ ...fieldConfig, mnemonic: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Memory Aid</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {preflightError && (
            <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2 font-medium shadow-xs rounded-md">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{preflightError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleBuildAll}
            disabled={isProcessing || items.length === 0}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing ({completedCount} / {items.length})...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Generate Batch Cards</span>
              </>
            )}
          </button>
        </div>

        <div
          className={`border rounded-lg p-4 sm:p-5 shadow-xs flex flex-col ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-2 mb-3 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <span className="text-xs font-semibold uppercase tracking-wider">
              Batch Queue ({completedCount} / {items.length})
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold">
              {completedCount > 0 && <span className="text-emerald-600 dark:text-emerald-400">{completedCount} ✓</span>}
              {errorCount > 0 && <span className="text-rose-600 dark:text-rose-400">{errorCount} ✕</span>}
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
                  className={`p-2.5 border rounded-md flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                    isSuccess
                      ? isDark
                        ? 'bg-emerald-950/20 border-emerald-900 text-emerald-200'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : isFailed
                      ? isDark
                        ? 'bg-rose-950/20 border-rose-900 text-rose-200'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                      : isRunning
                      ? isDark
                        ? 'bg-blue-950/20 border-blue-900 text-blue-200 animate-pulse'
                        : 'bg-blue-50 border-blue-200 text-blue-950 animate-pulse'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-850'
                      : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-zinc-500 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm truncate">{item.word}</span>
                        {item.noteId && (
                          <span className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                            isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-zinc-100 text-emerald-700'
                          }`}>
                            #{item.noteId}
                          </span>
                        )}
                        {item.parsedFields?.cardType === 'spelling' && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                            isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            Spelling
                          </span>
                        )}
                        {item.parsedFields?.cardType === 'normal' && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                            isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}>
                            Normal
                          </span>
                        )}
                        {item.parsedFields?.needsPhoto === true && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                            isDark ? 'bg-purple-950/60 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-800 border-purple-300'
                          }`}>
                            Photo
                          </span>
                        )}
                      </div>
                      {customMeaning && (
                        <span className="text-[11px] text-zinc-500 font-normal block truncate max-w-[200px]" dir="rtl">
                          {customMeaning}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSuccess && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                    )}
                    {isRunning && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">generating...</span>
                    )}
                    {isFailed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetrySingle(idx);
                        }}
                        disabled={isProcessing}
                        className="px-2 py-0.5 bg-rose-600 text-white font-medium text-[10px] rounded flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Retry</span>
                      </button>
                    )}
                    {item.cardData && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCard(item.cardData!);
                        }}
                        className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
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

      <section className="flex-1 flex flex-col min-h-[560px] min-w-0">
        <div
          className={`flex-1 border rounded-lg p-4 sm:p-6 relative overflow-hidden shadow-xs flex flex-col ${
            isDark ? 'bg-[#1F1F23] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="relative z-10 w-full flex-1 flex flex-col justify-center min-w-0">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder={items[0]?.word || 'batch card'}
              appTheme={isDark ? 'anki-dark' : 'anki-light'}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
