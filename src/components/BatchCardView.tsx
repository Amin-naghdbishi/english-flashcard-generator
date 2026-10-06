import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, BatchItem, CardData, BatchFieldConfig, ManualOverrides, AppTheme, CardType, ThemeId, isCardComplete } from '../types';
import {
  runFullPipeline,
  getAnkiDecks,
  checkOllama,
  checkGemini,
  checkTTS,
  checkOnlineTTS,
  checkAnki,
  updateAnkiNote,
  openInAnki,
} from '../services/api';
import { UnifiedCardEditor } from './UnifiedCardEditor';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { resolveThemeFromNoteType } from '../themes';
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
  ChevronLeft,
  ChevronRight,
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
  ExternalLink,
  Tag as TagIcon,
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
  items: Array<{
    word: string;
    deck: string;
    parsedFields: Partial<CardData> & {
      needsPhoto?: boolean;
      cardType?: CardType;
      tags?: string[];
      allowAi?: boolean;
    };
  }>;
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
    definitionEn: pf.definitionEn || 'English definition will be generated.',
    example: pf.example || 'Example sentence will be generated.',
    translationFa: pf.translationFa || 'ترجمه مثال تولید خواهد شد.',
    mnemonic: pf.mnemonic || 'Memory aid will be generated.',
    cardType: pf.cardType || 'normal',
    needsPhoto: pf.needsPhoto,
    tags: pf.tags || [],
  };
}

const DEFAULT_SAMPLE_BATCH_TXT = `--
Word=eraser
Deck=English::B1
Tag=stationery, vocabulary
AI=false
Phonetic=/ɪˈreɪzər/
Part of Speech=noun
Persian Meaning=پاک‌کن
English Definition=A piece of rubber or other material used for erasing marks made by pencil or ink.
Example Sentence=I need an eraser to fix this mistake.
ExampleTranslation=من به یک پاک‌کن برای تصحیح این اشتباه نیاز دارم.
Memory Aid=ERASE-ER: It erases mistakes on paper.
Photo=true
Spelling=false
--
Word=abandon
Deck=English::B1
Tag=verbs, b1
AI=true
Phonetic=/əˈbændən/
Part of Speech=verb
Persian Meaning=رها کردن، ترک کردن
English Definition=To leave a place, thing, or person forever, or to give up completely.
Example Sentence=He abandoned his car on the highway.
ExampleTranslation=او ماشین خود را در بزرگراه رها کرد.
Memory Aid=A-BAND-ON: Imagine a band left behind on the stage.
Photo=false
Spelling=true
--
Word=bank
Deck=English::B1
Tag=finance
Persian Meaning=بانک (موسسه مالی)
Photo=true
Spelling=false
--
Word=bank
Deck=English::B1
Tag=nature
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
  const results: BatchParsedResult['items'] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const fields: Record<string, string> = {};
    const tagsList: string[] = [];

    for (const line of lines) {
      const sepIndex = line.indexOf('=') !== -1 ? line.indexOf('=') : line.indexOf(':');
      if (sepIndex !== -1) {
        const rawKey = line.slice(0, sepIndex).trim().toLowerCase().replace(/[\s_-]/g, '');
        const val = line.slice(sepIndex + 1).trim();
        if (rawKey === 'tag' || rawKey === 'tags') {
          const splitTags = val.split(',').map((t) => t.trim()).filter(Boolean);
          tagsList.push(...splitTags);
        } else {
          fields[rawKey] = val;
        }
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

    let allowAi: boolean | undefined = undefined;
    const aiRaw = fields['ai'] || fields['useai'] || fields['allowai'] || fields['enableai'];
    if (aiRaw !== undefined) {
      const aLow = aiRaw.trim().toLowerCase();
      if (aLow === 'false' || aLow === 'no' || aLow === '0' || aLow === 'off') {
        allowAi = false;
      } else if (aLow === 'true' || aLow === 'yes' || aLow === '1' || aLow === 'on') {
        allowAi = true;
      }
    }

    const deck = fields['deck'] || fields['deckname'] || fields['targetdeck'] || defaultDeck;
    const dedupedTags = Array.from(new Set(tagsList));
    const parsedFields: BatchParsedResult['items'][0]['parsedFields'] = {
      word,
      phonetic: fields['phonetic'] || fields['ipa'] || fields['pronunciation'] || undefined,
      partOfSpeech: fields['partofspeech'] || fields['pos'] || fields['type'] || undefined,
      meaningFa: fields['persianmeaning'] || fields['meaning'] || fields['meaningfa'] || fields['persian'] || fields['farsi'] || undefined,
      definitionEn: fields['englishdefinition'] || fields['definition'] || fields['definitionen'] || fields['englishdef'] || fields['def'] || undefined,
      example: fields['examplesentence'] || fields['example'] || fields['sentence'] || fields['sample'] || undefined,
      translationFa: fields['exampletranslation'] || fields['translation'] || fields['translationfa'] || fields['sentencefa'] || undefined,
      mnemonic: fields['memoryaid'] || fields['mnemonic'] || fields['aid'] || fields['code'] || undefined,
      needsPhoto,
      cardType,
      tags: dedupedTags.length > 0 ? dedupedTags : undefined,
      allowAi,
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
  const [isShowingInAnki, setIsShowingInAnki] = useState<boolean>(false);

  // Note Type & Card Theme selection (defaults to Settings)
  const defaultNoteType = settings.anki?.defaultNoteType || 'AI Vocabulary - Comic Pop (Dark) (Normal)';
  const [selectedNoteType, setSelectedNoteType] = useState<string>(defaultNoteType);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(settings.theme || 'comic-pop-dark');

  useEffect(() => {
    if (settings.anki?.defaultNoteType) {
      setSelectedNoteType(settings.anki.defaultNoteType);
    }
  }, [settings.anki?.defaultNoteType]);

  useEffect(() => {
    if (settings.theme) {
      setSelectedTheme(settings.theme);
    }
  }, [settings.theme]);

  const handleNoteTypeChange = (newModelName: string) => {
    setSelectedNoteType(newModelName);
    const newTheme = resolveThemeFromNoteType(newModelName, selectedTheme);
    setSelectedTheme(newTheme);
    if (selectedItemForPreview) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemForPreview.id
            ? {
                ...item,
                isEdited: true,
                cardData: item.cardData
                  ? { ...item.cardData, modelName: newModelName, noteType: newModelName }
                  : undefined,
              }
            : item
        )
      );
    }
  };

  const isUserNavigatingRef = useRef<boolean>(false);
  const selectedItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedItemIdRef.current = selectedItemForPreview?.id || null;
  }, [selectedItemForPreview]);

  // Compute preview index in batch
  const previewIndex = selectedItemForPreview
    ? items.findIndex((it) => it.id === selectedItemForPreview.id)
    : -1;

  const handlePreviousCard = () => {
    if (previewIndex > 0) {
      const prevItem = items[previewIndex - 1];
      isUserNavigatingRef.current = true;
      setSelectedItemForPreview(prevItem);
      setPreviewCard(prevItem.cardData || batchItemToCardData(prevItem));
    }
  };

  const handleNextCard = () => {
    if (previewIndex >= 0 && previewIndex < items.length - 1) {
      const nextItem = items[previewIndex + 1];
      isUserNavigatingRef.current = true;
      setSelectedItemForPreview(nextItem);
      setPreviewCard(nextItem.cardData || batchItemToCardData(nextItem));
    }
  };

  const handleSelectCard = (item: BatchItem) => {
    isUserNavigatingRef.current = true;
    setSelectedItemForPreview(item);
    setPreviewCard(item.cardData || batchItemToCardData(item));
  };

  // Keyboard shortcut Ctrl+Left / Ctrl+Right for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePreviousCard();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextCard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, items]);

  const handleShowInAnki = async (noteIdToOpen: number) => {
    setIsShowingInAnki(true);
    setSaveActionMessage(null);
    try {
      const res = await openInAnki({ noteId: noteIdToOpen, url: settings.anki.url });
      if (res.success) {
        setSaveActionMessage(`✓ Opened Note #${noteIdToOpen} in Anki Browser GUI`);
      } else {
        setSaveActionMessage(`✕ Could not open in Anki: ${res.error || 'Anki is not running or note not found'}`);
      }
    } catch (err: any) {
      setSaveActionMessage(`✕ Could not connect to Anki: ${err?.message}`);
    } finally {
      setIsShowingInAnki(false);
    }
  };

  const [fieldConfig, setFieldConfig] = useState<BatchFieldConfig>({
    word: true,
    deck: true,
    phonetic: true,
    partOfSpeech: true,
    meaningFa: true,
    definitionEn: true,
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

    const isGlobalAiDisabled = settings.ai?.enabled === false;
    const anyItemNeedsAi =
      !isGlobalAiDisabled &&
      items.some((it) => {
        if (it.parsedFields?.allowAi === false) return false;
        return !isCardComplete(it.parsedFields);
      });

    if (anyItemNeedsAi) {
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

    const cardAllowAi = item.parsedFields?.allowAi !== false;
    const cardTags = item.parsedFields?.tags || [];
    const willUseAi = settings.ai?.enabled !== false && cardAllowAi && !isCardComplete(item.parsedFields);

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
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  status: willUseAi ? 'generating_ai' : 'creating_anki',
                  error: undefined,
                  retryCount: 0,
                }
              : it
          )
        );
      }

      try {
        const customOverrides: ManualOverrides = {};
        if (item.parsedFields) {
          if (fieldConfig.phonetic && item.parsedFields.phonetic) customOverrides.phonetic = item.parsedFields.phonetic;
          if (fieldConfig.partOfSpeech && item.parsedFields.partOfSpeech) customOverrides.partOfSpeech = item.parsedFields.partOfSpeech;
          if (fieldConfig.meaningFa && item.parsedFields.meaningFa) customOverrides.meaningFa = item.parsedFields.meaningFa;
          if (fieldConfig.definitionEn && item.parsedFields.definitionEn) customOverrides.definitionEn = item.parsedFields.definitionEn;
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
            tags: cardTags,
            allowAi: cardAllowAi,
          },
          cardType: effectiveCardType,
          createInAnki: true,
          theme: settings.theme,
          url: settings.anki.url,
          tags: cardTags,
          allowAi: cardAllowAi,
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
      if (!isUserNavigatingRef.current) {
        setSelectedItemForPreview(currentItem);
        setPreviewCard(currentItem.cardData || batchItemToCardData(currentItem));
      }

      const result = await processBatchItemWithRetries(currentItem, i);

      if (abortControllerRef.current) {
        setIsCancelled(true);
        break;
      }

      // REQUIREMENT: CARDS AVAILABLE IMMEDIATELY WHILE GENERATING
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

        if (!isUserNavigatingRef.current || selectedItemIdRef.current === currentItem.id) {
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
        }
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
    isUserNavigatingRef.current = true;
    setSelectedItemForPreview(item);
    setPreviewCard(item.cardData || batchItemToCardData(item));
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
        settings.theme,
        settings.anki.url
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
        const res = await updateAnkiNote(it.noteId!, it.cardData!, settings.theme, settings.anki.url);
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
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row min-w-0">
      {/* LEFT COLUMN: 25% width - Minimal Batch Controls */}
      <div className="w-full md:w-1/4 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 min-w-0 flex flex-col select-none">
        <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">
          Batch
        </h2>

        <div className="text-xs text-zinc-500 mb-4">
          {items.length} cards
        </div>

        {/* Deck input */}
        <div className="space-y-1 mb-3">
          <label className="text-xs font-semibold block text-zinc-700 dark:text-zinc-300">
            Deck
          </label>
          <input
            type="text"
            list="batch-view-decks-list"
            value={deck}
            onChange={(e) => setDeck(e.target.value)}
            disabled={isProcessing}
            placeholder="English::B1"
            className="w-full px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 focus:border-blue-500 bg-transparent text-xs font-medium rounded-none focus:outline-none transition-colors text-zinc-900 dark:text-zinc-100"
          />
          <datalist id="batch-view-decks-list">
            {availableDecks.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        {/* Upload Button */}
        <div className="mb-4">
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
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-none cursor-pointer transition-colors"
          >
            Upload
          </button>
        </div>

        {/* Grouping */}
        <div className="space-y-2 mb-4 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Grouping</span>
            <input
              type="checkbox"
              checked={isGroupingEnabled}
              onChange={(e) => {
                setIsGroupingEnabled(e.target.checked);
                setCurrentGroupIndex(0);
              }}
              disabled={isProcessing}
              className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600 cursor-pointer"
            />
          </div>

          {isGroupingEnabled && (
            <div className="space-y-2 pt-1">
              <input
                type="number"
                min={1}
                max={100}
                value={groupSize}
                onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={isProcessing}
                className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-700 bg-transparent text-xs rounded-none focus:outline-none focus:border-blue-500"
              />

              {/* Groups navigation line: 1 ───── 2 ───── 3 */}
              {totalGroups > 1 && (
                <div className="flex items-center justify-between py-1 text-xs">
                  {Array.from({ length: totalGroups }).map((_, gIdx) => (
                    <React.Fragment key={gIdx}>
                      <button
                        type="button"
                        onClick={() => setCurrentGroupIndex(gIdx)}
                        disabled={isProcessing}
                        className={`w-6 h-6 flex items-center justify-center font-bold rounded-none cursor-pointer text-xs ${
                          currentGroupIndex === gIdx
                            ? 'bg-blue-600 text-white'
                            : 'border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {gIdx + 1}
                      </button>
                      {gIdx < totalGroups - 1 && (
                        <div className="flex-1 h-px bg-zinc-300 dark:border-zinc-700 mx-1" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Field Settings: Collapsed by default */}
        <div className="mb-4 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setShowFieldConfig(!showFieldConfig)}
            className="w-full flex items-center justify-between py-1 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-blue-500"
          >
            <span>Field Settings</span>
            <span className="text-[10px]">{showFieldConfig ? '▲' : '▼'}</span>
          </button>

          {showFieldConfig && (
            <div className="space-y-1.5 pt-2 pl-1 text-xs text-zinc-600 dark:text-zinc-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.meaningFa}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, meaningFa: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>Persian Meaning</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.definitionEn}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, definitionEn: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>English Definition</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.example}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, example: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>Example Sentence</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.mnemonic}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, mnemonic: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>Mnemonic</span>
              </label>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="mb-4">
          {isProcessing ? (
            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-none cursor-pointer"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleBuildBatch(false)}
              disabled={items.length === 0}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-none cursor-pointer transition-colors"
            >
              Generate
            </button>
          )}
        </div>

        <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />

        {/* Words List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Words
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-1 pr-1 text-xs border border-zinc-200 dark:border-zinc-800 p-1.5">
            {items.length === 0 ? (
              <div className="text-zinc-400 text-xs py-4 text-center">
                Upload a TXT file to populate words
              </div>
            ) : (
              items.map((item, idx) => {
                const isSelected = selectedItemForPreview?.id === item.id;
                const isCurrent = currentIndex === idx;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectForPreview(item)}
                    className={`px-2 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="truncate flex-1">
                      {item.word}
                    </span>

                    {/* Status */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {item.status === 'success' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                          100%
                        </span>
                      )}
                      {(item.status === 'generating_ai' || item.status === 'creating_anki' || isCurrent) && (
                        <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                          ...
                        </span>
                      )}
                      {item.status === 'error' && (
                        <div className="flex items-center gap-1">
                          <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            Error
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBuildBatch(true);
                            }}
                            className="text-[10px] underline text-blue-500 hover:text-blue-600 cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {item.status !== 'success' && item.status !== 'error' && !isCurrent && item.status !== 'generating_ai' && (
                        <span className="text-zinc-400 font-mono text-[11px]">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: 75% width - Shared Card Editor */}
      <div className="w-full md:w-3/4 flex-1 min-w-0 p-4 sm:p-6 flex flex-col">
        <UnifiedCardEditor
            cardData={previewCard}
            emptyWordPlaceholder={selectedItemForPreview?.word || items[0]?.word || 'batch card'}
            themeId={selectedTheme}
            cardType={previewCard?.cardType || (settings.defaultCard?.cardType as CardType) || 'normal'}
            noteType={selectedNoteType}
            onNoteTypeChange={handleNoteTypeChange}
            deckName={selectedItemForPreview?.deck || deck}
            noteId={selectedItemForPreview?.noteId}
            editable={true}
            canSaveToAnki={Boolean(selectedItemForPreview?.noteId)}
            isSavingToAnki={isSavingCardToAnki}
            onShowInAnki={handleShowInAnki}
            isShowingInAnki={isShowingInAnki}
            onCardChange={handleCardChange}
            onSaveToAnki={handleSaveSingleCardToAnki}
            isDirty={Boolean(selectedItemForPreview?.isEdited)}
            saveSuccessMsg={saveActionMessage}
            availableTags={selectedItemForPreview?.parsedFields?.tags}
            ankiUrl={settings.anki?.url}
            navigation={items.length > 0 ? {
              currentIndex: previewIndex,
              totalCount: items.length,
              onPrevious: handlePreviousCard,
              onNext: handleNextCard,
              hasPrevious: previewIndex > 0,
              hasNext: previewIndex < items.length - 1,
              itemNameLabel: 'Card',
            } : undefined}
          />
        </div>
      </div>
  );
};
