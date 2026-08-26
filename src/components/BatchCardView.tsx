import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, BatchItem, CardData, BatchFieldConfig, ManualOverrides, AppTheme, CardType } from '../types';
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
  Square,
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
  CheckCircle2,
  XCircle,
  PauseCircle,
} from 'lucide-react';

interface BatchCardViewProps {
  settings: AppSettings;
  appTheme?: AppTheme;
}

export type BatchFormatType = 'formatB_structured';

export interface BatchParsedResult {
  format: BatchFormatType;
  formatLabel: string;
  formatDescription: string;
  items: Array<{ word: string; deck: string; parsedFields: Partial<CardData> & { needsPhoto?: boolean; cardType?: CardType } }>;
}

const MAX_AUTO_RETRIES = 2; // Total 3 attempts (1 initial + 2 retries)

function batchItemToCardData(item: BatchItem | null): CardData | null {
  if (!item) return null;
  if (item.cardData) return item.cardData;

  const pf = item.parsedFields || {};
  return {
    word: item.word || 'batch card',
    phonetic: pf.phonetic || '/.../',
    partOfSpeech: pf.partOfSpeech || 'noun',
    meaningFa: pf.meaningFa || '[Meaning will be generated]',
    example: pf.example || 'Example sentence will be generated.',
    translationFa: pf.translationFa || 'ترجمه مثال تولید خواهد شد.',
    mnemonic: pf.mnemonic || 'Memory aid will be generated.',
    cardType: pf.cardType || 'normal',
    needsPhoto: pf.needsPhoto,
  };
}

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
      format: 'formatB_structured',
      formatLabel: 'Format B (Structured Blocks with --)',
      formatDescription: 'All batch processing exclusively uses the advanced Format B structure.',
      items: [],
    };
  }

  const hasSeparator = /(?:^|\r?\n)\s*--\s*(?:\r?\n|$)/m.test(trimmed);
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

  return {
    format: 'formatB_structured',
    formatLabel: 'Format B (Structured Blocks with --)',
    formatDescription: 'All batch processing exclusively uses Format B. All custom fields, overrides, target decks, photo flags, and spelling modes are preserved.',
    items: results,
  };
}

export const BatchCardView: React.FC<BatchCardViewProps> = ({ settings }) => {
  const themeContext = useAppTheme();
  const isDark = themeContext.isDark;

  const [inputText, setInputText] = useState<string>(DEFAULT_SAMPLE_FORMAT_B);
  const [fileName, setFileName] = useState<string>('sample_batch_format_b.txt');
  const [deck, setDeck] = useState<string>(settings.anki.defaultDeck || 'English::B1');
  const [availableDecks, setAvailableDecks] = useState<string[]>(['English::B1', 'English::B2', 'IELTS']);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [detectedFormatInfo, setDetectedFormatInfo] = useState<{
    format: BatchFormatType;
    formatLabel: string;
    formatDescription: string;
  }>({
    format: 'formatB_structured',
    formatLabel: 'Format B (Structured Blocks with --)',
    formatDescription: 'All batch processing exclusively uses Format B. All custom fields, overrides, target decks, photo flags, and spelling modes are preserved.',
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<BatchItem | null>(null);
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
  const abortControllerRef = useRef<boolean>(false);

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
    if (newItems.length > 0) {
      setSelectedItemForPreview(newItems[0]);
      setPreviewCard(batchItemToCardData(newItems[0]));
    }
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

  const processBatchItemWithRetries = async (
    item: BatchItem,
    index: number
  ): Promise<{ success: boolean; cardData?: CardData; noteId?: number; error?: string }> => {
    let attempts = 0;
    let lastError = 'Unknown error';

    while (attempts <= MAX_AUTO_RETRIES) {
      if (abortControllerRef.current) {
        return { success: false, error: 'Cancelled by user' };
      }

      attempts++;

      if (attempts > 1) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  status: 'retrying',
                  retryCount: attempts - 1,
                  error: `Attempt ${attempts}/${MAX_AUTO_RETRIES + 1}: Retrying...`,
                }
              : it
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 600));
      } else {
        setItems((prev) =>
          prev.map((it, idx) => (idx === index ? { ...it, status: 'generating_ai', error: undefined, retryCount: 0 } : it))
        );
      }

      try {
        const customOverrides: ManualOverrides = {};
        if (item.parsedFields) {
          if (fieldConfig.phonetic && item.parsedFields.phonetic) customOverrides.phonetic = item.parsedFields.phonetic;
          if (fieldConfig.partOfSpeech && item.parsedFields.partOfSpeech) customOverrides.partOfSpeech = item.parsedFields.partOfSpeech;
          if (fieldConfig.meaningFa && item.parsedFields.meaningFa) customOverrides.meaningFa = item.parsedFields.meaningFa;
          if (fieldConfig.example && item.parsedFields.example) customOverrides.example = item.parsedFields.example;
          if (fieldConfig.translationFa && item.parsedFields.translationFa) customOverrides.translationFa = item.parsedFields.translationFa;
          if (fieldConfig.mnemonic && item.parsedFields.mnemonic) customOverrides.mnemonic = item.parsedFields.mnemonic;
          if (item.parsedFields.needsPhoto !== undefined) customOverrides.needsPhoto = item.parsedFields.needsPhoto;
          if (item.parsedFields.cardType !== undefined) customOverrides.cardType = item.parsedFields.cardType;
        }

        const effectiveCardType: CardType =
          item.parsedFields?.cardType ||
          settings.defaultCard?.cardType ||
          'normal';

        const targetDeck = item.deck || deck;

        const res = await runFullPipeline({
          word: item.word,
          deck: targetDeck,
          manualOverrides: {
            ...customOverrides,
            cardType: effectiveCardType,
          },
          cardType: effectiveCardType,
          createInAnki: true,
        });

        if (res.success && res.cardData) {
          return {
            success: true,
            cardData: res.cardData,
            noteId: res.noteId,
          };
        }

        lastError = res.error || 'Card generation failed';
      } catch (err: any) {
        lastError = err.message || 'Error occurred during generation';
      }
    }

    return { success: false, error: lastError };
  };

  const handleBuildAll = async (retryOnlyFailed: boolean = false) => {
    if (items.length === 0 || isProcessing) return;

    const preflightOk = await runPreflightChecks();
    if (!preflightOk) return;

    abortControllerRef.current = false;
    setIsProcessing(true);
    setIsCancelled(false);

    // Mark pending items as 'waiting'
    setItems((prev) =>
      prev.map((it) => {
        if (retryOnlyFailed) {
          if (it.status === 'error') return { ...it, status: 'waiting', error: undefined };
          return it;
        } else {
          if (it.status !== 'success') return { ...it, status: 'waiting', error: undefined };
          return it;
        }
      })
    );

    for (let i = 0; i < items.length; i++) {
      if (abortControllerRef.current) {
        setIsCancelled(true);
        break;
      }

      const currentItem = items[i];

      if (retryOnlyFailed && currentItem.status !== 'error' && currentItem.status !== 'waiting') {
        continue;
      }

      if (currentItem.status === 'success') {
        continue;
      }

      setCurrentIndex(i);
      setSelectedItemForPreview(currentItem);

      const result = await processBatchItemWithRetries(currentItem, i);

      if (abortControllerRef.current) {
        setIsCancelled(true);
        break;
      }

      if (result.success && result.cardData) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'success',
                  cardData: result.cardData,
                  noteId: result.noteId,
                  error: undefined,
                }
              : item
          )
        );
        setPreviewCard(result.cardData);
      } else {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'error',
                  error: result.error || 'Error occurred after retries',
                }
              : item
          )
        );
      }
    }

    // Reset remaining 'waiting' items back to idle if cancelled
    setItems((prev) =>
      prev.map((it) => (it.status === 'waiting' ? { ...it, status: 'idle' } : it))
    );

    setIsProcessing(false);
    setCurrentIndex(-1);
  };

  const handleCancelProcessing = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
    setIsCancelled(true);
  };

  const handleRetrySingle = async (index: number) => {
    const itemToRetry = items[index];
    if (!itemToRetry || isProcessing) return;

    setCurrentIndex(index);
    setSelectedItemForPreview(itemToRetry);

    const result = await processBatchItemWithRetries(itemToRetry, index);

    if (result.success && result.cardData) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'success',
                cardData: result.cardData,
                noteId: result.noteId,
                error: undefined,
              }
            : it
        )
      );
      setPreviewCard(result.cardData);
    } else {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'error',
                error: result.error || 'Error occurred during retry',
              }
            : it
        )
      );
    }

    setCurrentIndex(-1);
  };

  const handleSelectForPreview = (item: BatchItem) => {
    setSelectedItemForPreview(item);
    setPreviewCard(batchItemToCardData(item));
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
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold">
                  Batch Format:
                </span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                  isDark ? 'bg-purple-900/40 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-800 border-purple-200'
                }`}
              >
                Format B (Structured Key-Value Blocks)
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Structured key-value blocks separated by &quot;--&quot;. All custom overrides, target decks, photo flags, and spelling modes are preserved.
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
                setFileName('sample_batch_format_b.txt');
                setInputText(DEFAULT_SAMPLE_FORMAT_B);
              }}
              className={`w-full py-1.5 px-2 text-xs font-medium rounded border cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>Load Format B Template Example</span>
            </button>
          </div>

          <div className="mb-3">
            <textarea
              rows={7}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              className={`w-full text-xs font-medium font-mono p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                isDark
                  ? 'bg-[#18181B] border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                  : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
              }`}
              placeholder="Paste Format B blocks (separated by --). Example:&#10;--&#10;Word=abandon&#10;Persian Meaning=رها کردن&#10;Photo=true&#10;Spelling=true&#10;--"
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

          {/* Action Buttons: [ Generate Batch Cards ] / In-progress button + [ Cancel ] */}
          <div className="space-y-2">
            {!isProcessing ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleBuildAll(false)}
                  disabled={items.length === 0}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Generate Batch Cards ({items.length} cards)</span>
                </button>

                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleBuildAll(true)}
                    className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    title="Retry only failed cards"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Failed ({errorCount})</span>
                  </button>
                )}
              </div>
            ) : (
              /* While Processing: BLUE/NEUTRAL in-progress button + CANCEL button (NEVER RED) */
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled
                  className={`flex-1 py-2.5 px-4 rounded-md font-medium text-xs flex items-center justify-center gap-2 cursor-wait border ${
                    isDark
                      ? 'bg-blue-900/40 border-blue-700 text-blue-200'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}
                >
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="font-semibold">
                    ⋯ Processing {currentIndex + 1} / {items.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelProcessing}
                  className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  title="Safely cancel batch and keep created cards"
                >
                  <Square className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>

          {/* Live Progress & Active Item Status while Processing */}
          {isProcessing && (
            <div className="mt-4 pt-3 border-t border-zinc-700/50">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>
                    Processing {currentIndex + 1} / {items.length}
                  </span>
                </span>
                <span>{items.length > 0 ? Math.round(((completedCount + errorCount) / items.length) * 100) : 0}%</span>
              </div>

              {/* Progress bar */}
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${items.length > 0 ? Math.round(((completedCount + errorCount) / items.length) * 100) : 0}%` }}
                />
              </div>

              {/* Currently processing item */}
              {currentIndex >= 0 && currentIndex < items.length && (
                <div className={`text-xs mt-2 font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <span className="text-zinc-500">Currently processing:</span>
                  <span className="font-bold text-blue-500">{items[currentIndex].word}</span>
                  {items[currentIndex].retryCount !== undefined && items[currentIndex].retryCount! > 0 && (
                    <span className="text-[10px] text-amber-500 font-semibold px-1.5 py-0.2 rounded bg-amber-500/10">
                      Retry {items[currentIndex].retryCount}/{MAX_AUTO_RETRIES}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-between text-[11px] mt-2 font-medium">
                <span className="text-emerald-500">✓ Completed: {completedCount}</span>
                <span className="text-red-500">✕ Failed: {errorCount}</span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Total: {items.length}
                </span>
              </div>
            </div>
          )}

          {/* Cancellation Notification Banner */}
          {isCancelled && !isProcessing && (
            <div
              className={`mt-4 p-3.5 border rounded-lg text-xs ${
                isDark
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <PauseCircle className="w-4 h-4 text-amber-500" />
                <span>Processing Cancelled</span>
              </div>
              <p className="text-xs mb-2">
                {completedCount} / {items.length} completed. Successfully created cards remain in Anki.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleBuildAll(false)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>Resume Remaining Cards</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Batch Queue Section */}
        <div
          className={`border rounded-lg p-4 sm:p-5 shadow-xs flex flex-col ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-2 mb-3 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <List className="w-3.5 h-3.5 text-blue-500" />
              <span>Batch Queue ({completedCount} / {items.length})</span>
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold">
              {completedCount > 0 && <span className="text-emerald-600 dark:text-emerald-400">{completedCount} ✓</span>}
              {errorCount > 0 && <span className="text-rose-600 dark:text-rose-400">{errorCount} ✕</span>}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const isSelected = selectedItemForPreview?.id === item.id;
              const isSuccess = item.status === 'success';
              const isRunning = item.status === 'generating_ai' || item.status === 'generating_audio' || item.status === 'creating_anki';
              const isRetrying = item.status === 'retrying';
              const isWaiting = item.status === 'waiting';
              const isFailed = item.status === 'error';
              const customMeaning = item.parsedFields?.meaningFa;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectForPreview(item)}
                  className={`p-2.5 border rounded-md flex items-center justify-between gap-2.5 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                        : 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : isSuccess
                      ? isDark
                        ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-200'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : isFailed
                      ? isDark
                        ? 'bg-rose-950/20 border-rose-900/60 text-rose-200'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : isRunning || isRetrying
                      ? isDark
                        ? 'bg-blue-950/30 border-blue-800 text-blue-200 animate-pulse'
                        : 'bg-blue-50 border-blue-300 text-blue-950 animate-pulse'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-850'
                      : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-xs text-zinc-500 w-5 text-right shrink-0">
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
                      {item.error && (
                        <span className="text-[11px] text-red-500 font-normal block truncate max-w-[220px]">
                          {item.error}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSuccess && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Complete</span>
                      </span>
                    )}
                    {isRunning && (
                      <span className="flex items-center gap-1 text-[11px] text-blue-400 font-medium px-1.5 py-0.5 rounded bg-blue-500/10">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Processing</span>
                      </span>
                    )}
                    {isRetrying && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-500/10">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Retry {item.retryCount || 1}</span>
                      </span>
                    )}
                    {isWaiting && (
                      <span className="text-[11px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-700/30">
                        Waiting
                      </span>
                    )}
                    {isFailed && (
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold px-1.5 py-0.5 rounded bg-red-500/10">
                          <XCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetrySingle(idx);
                          }}
                          disabled={isProcessing}
                          className="p-1 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer transition-colors"
                          title="Retry this card"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Eye Preview Button (👁) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectForPreview(item);
                      }}
                      className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                      }`}
                      title="Preview card details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Right Column: Live Card Preview Panel */}
      <section className="flex-1 flex flex-col min-h-[560px] min-w-0">
        <div
          className={`flex-1 border rounded-lg p-4 sm:p-6 relative overflow-hidden shadow-xs flex flex-col ${
            isDark ? 'bg-[#1F1F23] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Header over preview with selected word and status */}
          <div className={`flex items-center justify-between pb-3 mb-3 border-b shrink-0 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Live Card Preview
              </span>
              {selectedItemForPreview && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isDark ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-700'
                }`}>
                  {selectedItemForPreview.word} {selectedItemForPreview.noteId ? `(#${selectedItemForPreview.noteId})` : ''}
                </span>
              )}
            </div>

            {selectedItemForPreview && (
              <div className="text-xs">
                {selectedItemForPreview.status === 'success' ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Created in Anki</span>
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    Draft ({selectedItemForPreview.deck || deck})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="relative z-10 w-full flex-1 flex flex-col justify-center min-w-0">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder={selectedItemForPreview?.word || items[0]?.word || 'batch card'}
              appTheme={isDark ? 'anki-dark' : 'anki-light'}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
