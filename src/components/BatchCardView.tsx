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
  updateAnkiNote,
} from '../services/api';
import { CardPreview } from './CardPreview';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
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
  Save,
  Check,
  Edit3,
  Layers3,
  ArrowRight,
} from 'lucide-react';

interface BatchCardViewProps {
  settings: AppSettings;
  appTheme?: AppTheme;
}

export type BatchFormatType = 'structured_txt';

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

const DEFAULT_SAMPLE_BATCH_TXT = `--
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
      format: 'structured_txt',
      formatLabel: 'Batch TXT File',
      formatDescription: 'Upload or paste your vocabulary list to generate Anki flashcards.',
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
    format: 'structured_txt',
    formatLabel: 'Batch TXT File',
    formatDescription: 'Upload or paste your vocabulary list to generate Anki flashcards.',
    items: results,
  };
}

export const BatchCardView: React.FC<BatchCardViewProps> = ({ settings }) => {
  const themeContext = useAppTheme();
  const { t, isRTL } = useTranslation();
  const isDark = themeContext.isDark;

  const [inputText, setInputText] = useState<string>(DEFAULT_SAMPLE_BATCH_TXT);
  const [fileName, setFileName] = useState<string>('sample_batch.txt');
  const [deck, setDeck] = useState<string>(settings.anki.defaultDeck || 'English::B1');
  const [availableDecks, setAvailableDecks] = useState<string[]>(['English::B1', 'English::B2', 'IELTS']);
  const [items, setItems] = useState<BatchItem[]>([]);

  // Batch Grouping State (Requirement 3)
  const [isGroupingEnabled, setIsGroupingEnabled] = useState<boolean>(false);
  const [groupSize, setGroupSize] = useState<number>(10);
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(0);
  const [groupJustFinished, setGroupJustFinished] = useState<boolean>(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<BatchItem | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState<boolean>(false);

  // Anki Update sync state (Requirement 2 & 4)
  const [isSavingCardToAnki, setIsSavingCardToAnki] = useState<boolean>(false);
  const [isSavingAllEdited, setIsSavingAllEdited] = useState<boolean>(false);
  const [saveActionMessage, setSaveActionMessage] = useState<string | null>(null);

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

    const newItems: BatchItem[] = parseResult.items.map((parsed, idx) => ({
      id: `${parsed.word}_${idx}_${Date.now()}`,
      word: parsed.word,
      deck: parsed.deck || deck,
      status: 'idle',
      parsedFields: parsed.parsedFields,
    }));

    setItems(newItems);
    setCurrentGroupIndex(0);
    setGroupJustFinished(false);
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
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
      if (abortControllerRef.current) {
        return { success: false, error: 'Cancelled by user' };
      }

      if (attempt > 0) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  status: 'retrying',
                  retryCount: attempt,
                  error: `Retrying (attempt ${attempt}/${MAX_AUTO_RETRIES}): ${lastError}`,
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

  // Group calculations
  const totalCards = items.length;
  const safeGroupSize = Math.max(1, groupSize || 10);
  const totalGroups = isGroupingEnabled ? Math.ceil(totalCards / safeGroupSize) : 1;

  const handleBuildBatch = async (retryOnlyFailed: boolean = false) => {
    if (items.length === 0 || isProcessing) return;

    const preflightOk = await runPreflightChecks();
    if (!preflightOk) return;

    abortControllerRef.current = false;
    setIsProcessing(true);
    setIsCancelled(false);
    setGroupJustFinished(false);
    setSaveActionMessage(null);

    // Determine range of indices to process
    let startIndex = 0;
    let endIndex = items.length;

    if (isGroupingEnabled) {
      startIndex = currentGroupIndex * safeGroupSize;
      endIndex = Math.min((currentGroupIndex + 1) * safeGroupSize, items.length);
    }

    // Mark items in range as 'waiting'
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx >= startIndex && idx < endIndex) {
          if (retryOnlyFailed) {
            if (it.status === 'error') return { ...it, status: 'waiting', error: undefined };
            return it;
          } else {
            if (it.status !== 'success') return { ...it, status: 'waiting', error: undefined };
            return it;
          }
        }
        return it;
      })
    );

    for (let i = startIndex; i < endIndex; i++) {
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

      // REQUIREMENT 4: CARDS MUST BE AVAILABLE IMMEDIATELY!
      if (result.success && result.cardData) {
        const updatedCardData = result.cardData;
        const updatedNoteId = result.noteId;

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'success',
                  cardData: updatedCardData,
                  noteId: updatedNoteId,
                  error: undefined,
                }
              : item
          )
        );

        setPreviewCard(updatedCardData);
        setSelectedItemForPreview((prev) =>
          prev && prev.id === currentItem.id
            ? {
                ...prev,
                status: 'success',
                cardData: updatedCardData,
                noteId: updatedNoteId,
              }
            : prev
        );
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

    setIsProcessing(false);
    setCurrentIndex(-1);

    if (!abortControllerRef.current) {
      if (isGroupingEnabled) {
        setGroupJustFinished(true);
        if (currentGroupIndex < totalGroups - 1) {
          // Prepared for next group
        } else {
          setIsFinished(true);
        }
      } else {
        setIsFinished(true);
      }
    }
  };

  const handleNextGroup = () => {
    if (currentGroupIndex < totalGroups - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      setGroupJustFinished(false);
      // Automatically trigger generation for next group
      setTimeout(() => {
        handleBuildBatch(false);
      }, 100);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current = true;
    setIsCancelled(true);
    setIsProcessing(false);
  };

  const handleSelectForPreview = (item: BatchItem) => {
    setSelectedItemForPreview(item);
    setPreviewCard(batchItemToCardData(item));
    setSaveActionMessage(null);
  };

  // REQUIREMENT 2: EDIT CARD AND SAVE TO ANKI (IN-PLACE WITHOUT DUPLICATES)
  const handleCardChange = (updatedCard: CardData) => {
    setPreviewCard(updatedCard);
    if (!selectedItemForPreview) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === selectedItemForPreview.id
          ? {
              ...it,
              cardData: updatedCard,
              isEdited: true,
            }
          : it
      )
    );

    setSelectedItemForPreview((prev) =>
      prev ? { ...prev, cardData: updatedCard, isEdited: true } : prev
    );
  };

  const handleSaveSingleCardToAnki = async () => {
    if (!selectedItemForPreview || !selectedItemForPreview.noteId || !previewCard) return;
    setIsSavingCardToAnki(true);
    setSaveActionMessage(null);

    try {
      const res = await updateAnkiNote(
        selectedItemForPreview.noteId,
        previewCard,
        settings.theme
      );

      if (res.success) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === selectedItemForPreview.id
              ? { ...it, isEdited: false }
              : it
          )
        );
        setSelectedItemForPreview((prev) => (prev ? { ...prev, isEdited: false } : prev));
        setSaveActionMessage(`✓ Note #${selectedItemForPreview.noteId} successfully updated in Anki!`);
      } else {
        setSaveActionMessage(`✕ Failed to update in Anki: ${res.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setSaveActionMessage(`✕ Error: ${e?.message}`);
    } finally {
      setIsSavingCardToAnki(false);
    }
  };

  // Save all edited cards in batch
  const handleSaveAllEditedCards = async () => {
    const editedItems = items.filter((it) => it.isEdited && it.noteId && it.cardData);
    if (editedItems.length === 0) return;

    setIsSavingAllEdited(true);
    setSaveActionMessage(null);

    let savedCount = 0;
    for (const it of editedItems) {
      try {
        const res = await updateAnkiNote(it.noteId!, it.cardData!, settings.theme);
        if (res.success) {
          savedCount++;
          setItems((prev) =>
            prev.map((item) => (item.id === it.id ? { ...item, isEdited: false } : item))
          );
        }
      } catch (err) {
        console.error(`Failed to update note #${it.noteId}:`, err);
      }
    }

    setIsSavingAllEdited(false);
    setSaveActionMessage(t('batch.allEditedSaved') || `✓ Successfully updated ${savedCount} edited cards in Anki!`);
  };

  const completedCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const editedCount = items.filter((i) => i.isEdited && i.noteId).length;
  const totalParsedFieldsCount = items.reduce((acc, it) => {
    return acc + Object.keys(it.parsedFields || {}).length;
  }, 0);

  return (
    <div className="w-full max-w-[1920px] mx-auto flex flex-col lg:flex-row gap-4 xl:gap-5 p-3 sm:p-5 min-w-0">
      {/* LEFT COLUMN: Controls, Upload TXT, Grouping, Queue */}
      <section className="w-full lg:w-[420px] xl:w-[440px] flex flex-col gap-4 shrink-0 min-w-0">
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Header & Simple Upload TXT Button (Requirement 1) */}
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              {t('batch.title')}
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
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Upload any .txt vocabulary file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t('batch.uploadTxtBtn')}</span>
              </button>
            </div>
          </div>

          {/* Clean TXT File & Deck Selection */}
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
                {items.length} {t('common.total')}
              </span>
            </div>

            <div
              className={`p-2.5 border rounded-md flex items-center justify-between gap-1 ${
                isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
              }`}
            >
              <label className="text-xs font-semibold">{t('common.deck')}:</label>
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

          {/* Load Sample TXT */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setFileName('sample_batch.txt');
                setInputText(DEFAULT_SAMPLE_BATCH_TXT);
              }}
              className={`w-full py-1.5 px-2 text-xs font-medium rounded border cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>{t('batch.loadTemplateBtn')}</span>
            </button>
          </div>

          {/* Text Area */}
          <div className="mb-3">
            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              className={`w-full text-xs font-medium font-mono p-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                isDark
                  ? 'bg-[#18181B] border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                  : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
              }`}
              placeholder={t('batch.textareaPlaceholder')}
            />
          </div>

          {/* BATCH GROUPING CONTROLS (Requirement 3) */}
          <div
            className={`border rounded-md p-3 mb-3 shadow-xs ${
              isDark ? 'bg-zinc-900/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGroupingEnabled}
                  onChange={(e) => {
                    setIsGroupingEnabled(e.target.checked);
                    setCurrentGroupIndex(0);
                    setGroupJustFinished(false);
                  }}
                  disabled={isProcessing}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Layers3 className="w-3.5 h-3.5 text-purple-500" />
                  <span>{t('batch.groupingTitle')}</span>
                </span>
              </label>

              {isGroupingEnabled && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-zinc-500">{t('batch.groupSizeLabel')}:</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={groupSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setGroupSize(isNaN(val) || val < 1 ? 1 : val);
                      setCurrentGroupIndex(0);
                      setGroupJustFinished(false);
                    }}
                    disabled={isProcessing}
                    className={`w-14 p-1 text-center font-bold text-xs border rounded focus:outline-none ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>
              )}
            </div>

            {isGroupingEnabled && (
              <div className="mt-2 text-[11px] text-zinc-400">
                {t('batch.groupSummary', { size: safeGroupSize, totalGroups })}
                {totalGroups > 1 && (
                  <span className="ml-1 text-purple-400 font-semibold">
                    (Current: Group {currentGroupIndex + 1} of {totalGroups})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Field Settings Toggle */}
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
                <span>{t('batch.fieldSettingsTitle', { count: totalParsedFieldsCount })}</span>
              </span>
              {showFieldConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFieldConfig && (
              <div className={`mt-3 pt-3 border-t text-xs space-y-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <p className={`text-[11px] mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('batch.fieldSettingsNotice')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.word} disabled className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.word')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.deck} onChange={(e) => setFieldConfig({ ...fieldConfig, deck: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.deck')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.phonetic} onChange={(e) => setFieldConfig({ ...fieldConfig, phonetic: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.phonetic')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.partOfSpeech} onChange={(e) => setFieldConfig({ ...fieldConfig, partOfSpeech: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.partOfSpeech')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.meaningFa} onChange={(e) => setFieldConfig({ ...fieldConfig, meaningFa: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.meaning')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.example} onChange={(e) => setFieldConfig({ ...fieldConfig, example: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.example')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.translationFa} onChange={(e) => setFieldConfig({ ...fieldConfig, translationFa: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.translation')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={fieldConfig.mnemonic} onChange={(e) => setFieldConfig({ ...fieldConfig, mnemonic: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">{t('common.mnemonic')}</span>
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

          {/* Group Just Finished Inspection Notice (Requirement 3) */}
          {groupJustFinished && !isProcessing && (
            <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs rounded-md shadow-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {t('batch.groupCompletedNotice', {
                    current: currentGroupIndex + 1,
                    total: totalGroups,
                    count: Math.min(safeGroupSize, items.length - currentGroupIndex * safeGroupSize),
                  })}
                </span>
              </div>
              {currentGroupIndex < totalGroups - 1 && (
                <button
                  type="button"
                  onClick={handleNextGroup}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>
                    {t('batch.nextGroupBtn', {
                      start: (currentGroupIndex + 1) * safeGroupSize + 1,
                      end: Math.min((currentGroupIndex + 2) * safeGroupSize, items.length),
                    })}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isProcessing ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleBuildBatch(false)}
                  disabled={items.length === 0}
                  className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {isGroupingEnabled
                      ? t('batch.generateGroupBtn', {
                          current: currentGroupIndex + 1,
                          total: totalGroups,
                          count: Math.min(safeGroupSize, items.length - currentGroupIndex * safeGroupSize),
                        })
                      : t('batch.generateBatchBtn', { count: items.length })}
                  </span>
                </button>

                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleBuildBatch(true)}
                    className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('batch.retryFailedBtn', { count: errorCount })}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2.5 px-4 bg-zinc-600 text-white font-medium text-xs rounded-md flex items-center justify-center gap-2 opacity-80"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>
                    {t('batch.processingCount', {
                      current: currentIndex + 1,
                      total: isGroupingEnabled
                        ? Math.min((currentGroupIndex + 1) * safeGroupSize, items.length)
                        : items.length,
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{t('batch.cancelBtn')}</span>
                </button>
              </div>
            )}

            {/* SAVE ALL EDITED CARDS BUTTON (Requirement 4) */}
            {editedCount > 0 && (
              <button
                type="button"
                onClick={handleSaveAllEditedCards}
                disabled={isSavingAllEdited}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSavingAllEdited ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSavingAllEdited
                    ? t('batch.savingEdited')
                    : t('batch.saveAllEditedBtn', { count: editedCount })}
                </span>
              </button>
            )}

            {/* Feedback Message */}
            {saveActionMessage && (
              <div
                className={`p-2 rounded text-xs font-semibold flex items-center gap-1.5 ${
                  saveActionMessage.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-500/30'
                }`}
              >
                <span>{saveActionMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Batch Queue & Status List (Requirement 4: immediately available!) */}
        <div
          className={`border rounded-lg p-4 shadow-xs flex-1 flex flex-col min-h-[260px] ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-700 text-xs">
            <h3 className="font-bold flex items-center gap-2">
              <List className="w-4 h-4 text-zinc-400" />
              <span>{t('batch.queueTitle', { completed: completedCount, total: items.length })}</span>
            </h3>
            {editedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                {editedCount} {t('batch.editedBadge') || 'Edited'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-1 pr-1 text-xs">
            {items.map((item, idx) => {
              const isSelected = selectedItemForPreview?.id === item.id;
              const isCurrent = currentIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectForPreview(item)}
                  className={`p-2 rounded-md border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-purple-950/40 border-purple-600'
                        : 'bg-purple-50 border-purple-300'
                      : isDark
                      ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750'
                      : 'bg-white hover:bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Status Icon */}
                    {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    {item.status === 'error' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    {(item.status === 'generating_ai' || item.status === 'retrying') && (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500 shrink-0" />
                    )}
                    {item.status === 'waiting' && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                    {item.status === 'idle' && <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />}

                    <span className={`font-semibold truncate ${isSelected ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                      {item.word}
                    </span>

                    {item.noteId && (
                      <span className="text-[10px] font-mono text-zinc-400">
                        #{item.noteId}
                      </span>
                    )}

                    {item.isEdited && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                        {t('batch.editedBadge') || 'Edited'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        item.status === 'success'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : item.status === 'error'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: EXPANDED CARD PREVIEW & EDITOR PANEL (Requirement 2 & 7) */}
      <section className="flex-1 flex flex-col min-h-[580px] min-w-0">
        <div
          className={`flex-1 border rounded-lg p-4 sm:p-5 relative overflow-hidden shadow-xs flex flex-col ${
            isDark ? 'bg-[#1F1F23] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-700/80">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold">{t('batch.livePreviewTitle')}</h3>
              {selectedItemForPreview && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isDark ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {selectedItemForPreview.word} {selectedItemForPreview.noteId ? `(#${selectedItemForPreview.noteId})` : ''}
                </span>
              )}
            </div>

            {selectedItemForPreview && (
              <div className="text-xs flex items-center gap-2">
                {selectedItemForPreview.isEdited && (
                  <span className="text-amber-500 font-bold flex items-center gap-1 text-[11px]">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Unsaved Changes</span>
                  </span>
                )}
                {selectedItemForPreview.status === 'success' ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('batch.createdInAnkiBadge')}</span>
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    {t('batch.draftBadge', { deck: selectedItemForPreview.deck || deck })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Full CardPreview & Editor Panel */}
          <div className="relative z-10 w-full flex-1 flex flex-col min-w-0">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder={selectedItemForPreview?.word || items[0]?.word || 'batch card'}
              appTheme={isDark ? 'anki-dark' : 'anki-light'}
              editable={true}
              canSaveToAnki={Boolean(selectedItemForPreview?.noteId)}
              isSavingToAnki={isSavingCardToAnki}
              onCardChange={handleCardChange}
              onSaveToAnki={handleSaveSingleCardToAnki}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
