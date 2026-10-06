import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CardData, ManualOverrides, AppSettings, StepLog, AnkiCardVerificationDetails, CardType, AppTheme, ThemeId, getFrontCustomBlocks, getBackCustomBlocks, getAllCustomBlocks, isCardComplete } from '../types';
import { UnifiedCardEditor } from './UnifiedCardEditor';
import { AudioPlayer } from './AudioPlayer';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { makeSpellingSentence, resolveThemeFromNoteType, getDefaultNoteType } from '../themes';
import {
  runFullPipeline,
  getAnkiDecks,
  checkDuplicate,
  runAnkiPipelineTest,
  openInAnki,
  verifyNoteInAnki,
  downloadImage,
  searchOnlineImages,
  updateAnkiNote,
  createDirectAnkiNote,
} from '../services/api';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Zap,
  Info,
  ExternalLink,
  Image as ImageIcon,
  Globe,
  RotateCcw,
  Save,
  Plus,
  Square,
} from 'lucide-react';

interface CreateCardViewProps {
  settings: AppSettings;
  onCardCreated?: (cardData: CardData, noteId?: number) => void;
  appTheme?: AppTheme;
}

const STORAGE_DECK_KEY = 'flashcard_generator_selected_deck';
const STORAGE_CARD_TYPE_KEY = 'flashcard_generator_selected_card_type';
const STORAGE_PHOTO_CHOICE_KEY = 'flashcard_generator_selected_photo_choice';

const DEFAULT_STEPS: Array<{ step: number; name: string }> = [
  { step: 1, name: 'Check dictionary & frequency' },
  { step: 2, name: 'Evaluate image requirement' },
  { step: 3, name: 'Query Wikipedia/Unsplash' },
  { step: 4, name: 'Generate AI prompt (Gemini/Ollama)' },
  { step: 5, name: 'Parse & validate AI JSON' },
  { step: 6, name: 'Synthesize Piper TTS (US Normal)' },
  { step: 7, name: 'Synthesize Piper TTS (US Slow)' },
  { step: 8, name: 'Synthesize Piper TTS (UK Normal)' },
  { step: 9, name: 'Synthesize Piper TTS (UK Slow)' },
  { step: 10, name: 'Connect to AnkiConnect' },
  { step: 11, name: 'Verify Anki deck existence' },
  { step: 12, name: 'Inject CSS & Ensure Note Type' },
  { step: 13, name: 'Add Note & Store audio/images' },
  { step: 14, name: 'Verify Note & Cards in Anki' },
];

export const CreateCardView: React.FC<CreateCardViewProps> = ({
  settings,
  onCardCreated,
  appTheme: propTheme,
}) => {
  const themeContext = useAppTheme();
  const { t, isRTL } = useTranslation();
  const isDark = (propTheme || themeContext.appTheme) === 'anki-dark';

  // Input & Selection State (with localStorage persistence)
  const [word, setWord] = useState('');
  const [deck, setDeck] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DECK_KEY);
      if (saved) return saved;
    } catch {}
    return settings.anki?.defaultDeck || 'English::B2';
  });

  const [cardType, setCardType] = useState<CardType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CARD_TYPE_KEY) as CardType;
      if (saved === 'normal' || saved === 'spelling') return saved;
    } catch {}
    return settings.defaultCard?.cardType || 'normal';
  });

  const [photoChoice, setPhotoChoice] = useState<'yes' | 'no'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PHOTO_CHOICE_KEY);
      if (saved === 'yes' || saved === 'no') return saved as 'yes' | 'no';
    } catch {}
    return settings.smartImages?.enabled ? 'yes' : 'no';
  });

  const [availableDecks, setAvailableDecks] = useState<string[]>(['English::B1', 'English::B2', 'IELTS']);
  const [isCustomDeck, setIsCustomDeck] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(false);

  // Sync state to localStorage whenever changed
  useEffect(() => {
    if (deck) {
      try {
        localStorage.setItem(STORAGE_DECK_KEY, deck);
      } catch {}
    }
  }, [deck]);

  useEffect(() => {
    if (cardType) {
      try {
        localStorage.setItem(STORAGE_CARD_TYPE_KEY, cardType);
      } catch {}
    }
  }, [cardType]);

  useEffect(() => {
    if (photoChoice) {
      try {
        localStorage.setItem(STORAGE_PHOTO_CHOICE_KEY, photoChoice);
      } catch {}
    }
  }, [photoChoice]);

  // Sync if settings load later and nothing in localStorage
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_DECK_KEY) && settings.anki?.defaultDeck) {
        setDeck(settings.anki.defaultDeck);
      }
      if (!localStorage.getItem(STORAGE_CARD_TYPE_KEY) && settings.defaultCard?.cardType) {
        setCardType(settings.defaultCard.cardType);
      }
      if (!localStorage.getItem(STORAGE_PHOTO_CHOICE_KEY) && settings.smartImages?.enabled !== undefined) {
        setPhotoChoice(settings.smartImages.enabled ? 'yes' : 'no');
      }
    } catch {}
  }, [settings.anki?.defaultDeck, settings.defaultCard?.cardType, settings.smartImages?.enabled]);

  // Editable Card Data (updated directly by CardPreview editor)
  const [editableCard, setEditableCard] = useState<CardData | null>(null);

  // Dedicated editor tags state (preserves tags even when clearing the word form)
  const [editorTags, setEditorTags] = useState<string[]>(() => settings.anki?.tags || []);

  // Note Type & Card Theme selection (defaults to Settings)
  const defaultNoteType = getDefaultNoteType(settings);
  const [selectedNoteType, setSelectedNoteType] = useState<string>(() => getDefaultNoteType(settings));
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(() => resolveThemeFromNoteType(getDefaultNoteType(settings), settings.theme || 'comic-pop-dark'));

  useEffect(() => {
    const def = getDefaultNoteType(settings);
    setSelectedNoteType(def);
    setSelectedTheme(resolveThemeFromNoteType(def, settings.theme || 'comic-pop-dark'));
  }, [settings.anki?.defaultNoteType, settings.theme]);

  const handleNoteTypeChange = useCallback((newModelName: string) => {
    setSelectedNoteType(newModelName);
    const newTheme = resolveThemeFromNoteType(newModelName, selectedTheme);
    setSelectedTheme(newTheme);
    let detectedType = cardType;
    if (/(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(newModelName)) {
      detectedType = 'spelling';
      setCardType('spelling');
    } else if (/(\b|_|\(|-)normal(\b|_|\)|-)/i.test(newModelName)) {
      detectedType = 'normal';
      setCardType('normal');
    }
    setEditableCard((prev) => (prev ? { ...prev, modelName: newModelName, noteType: newModelName, cardType: detectedType } : null));
  }, [selectedTheme, cardType]);

  // Online Image Search Dialog State
  const [showInternetPanel, setShowInternetPanel] = useState(false);
  const [internetUrlInput, setInternetUrlInput] = useState('');
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [imageDownloadError, setImageDownloadError] = useState<string | null>(null);
  const [onlineSearchResults, setOnlineSearchResults] = useState<
    Array<{ title: string; thumbUrl: string; fullUrl: string; source: string }>
  >([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Pipeline Status & Logs
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdatingAnki, setIsUpdatingAnki] = useState(false);
  const [activeStepNumber, setActiveStepNumber] = useState<number>(0);
  const [executionLogs, setExecutionLogs] = useState<StepLog[]>([]);
  const [generatedCard, setGeneratedCard] = useState<CardData | null>(null);
  const [createdNoteId, setCreatedNoteId] = useState<number | null>(null);
  const [createdCardIds, setCreatedCardIds] = useState<number[]>([]);
  const [verificationDetails, setVerificationDetails] = useState<AnkiCardVerificationDetails | null>(null);
  const [showDiagnosticsDetail, setShowDiagnosticsDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedStage, setFailedStage] = useState<string | null>(null);

  // Anki GUI Interaction
  const [isOpeningInAnki, setIsOpeningInAnki] = useState(false);
  const [ankiActionMessage, setAnkiActionMessage] = useState<string | null>(null);
  const [isReverifying, setIsReverifying] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setErrorMessage('Card generation cancelled.');
  };

  // Test Card state
  const [testingAnkiOnly, setTestingAnkiOnly] = useState(false);
  const [testAnkiResult, setTestAnkiResult] = useState<any>(null);

  // Duplicate warning modal/notice
  const [duplicateWarning, setDuplicateWarning] = useState<{ isDup: boolean; noteIds: number[] } | null>(null);

  // Fetch Anki decks on mount
  useEffect(() => {
    async function loadDecks() {
      setLoadingDecks(true);
      try {
        const res = await getAnkiDecks(settings.anki?.url);
        if (res.success && res.decks.length > 0) {
          setAvailableDecks(res.decks);
          if (!deck) {
            setDeck(res.decks[0]);
          }
        }
      } catch (err) {
        console.warn('Could not auto-fetch Anki decks, using defaults.');
      } finally {
        setLoadingDecks(false);
      }
    }
    loadDecks();
  }, [settings.anki?.url]);

  // Handle updates from CardPreview editor
  const handleCardChange = useCallback(
    (updated: CardData) => {
      setEditableCard(updated);
      if (updated.tags) {
        setEditorTags(updated.tags);
      }
      if (updated.word && updated.word.trim() !== word) {
        setWord(updated.word.trim());
      }
      if (updated.cardType && (updated.cardType === 'normal' || updated.cardType === 'spelling')) {
        setCardType(updated.cardType);
      }
    },
    [word]
  );

  // Open image search dialog
  const handleOpenInternetSearch = () => {
    setShowInternetPanel(true);
    setImageDownloadError(null);
    const searchTarget = editableCard?.word || word.trim() || 'illustration';
    setIsSearchingOnline(true);
    searchOnlineImages(searchTarget)
      .then((res) => {
        if (res.success && res.results) {
          setOnlineSearchResults(res.results);
        }
      })
      .catch((err) => {
        console.warn('Online search error:', err);
      })
      .finally(() => {
        setIsSearchingOnline(false);
      });
  };

  // Select online image result
  const handleSelectOnlineResult = async (url: string) => {
    setIsDownloadingImage(true);
    setImageDownloadError(null);
    try {
      const res = await downloadImage(url);
      if (res.success && res.imageBase64) {
        const fileExt = url.toLowerCase().includes('.png') ? 'png' : 'jpg';
        const fileName = `search_${Date.now()}.${fileExt}`;
        setEditableCard((prev) => ({
          ...(prev || {
            word: word.trim() || 'Word',
            cardType,
          }),
          imageBase64: res.imageBase64,
          imageFileName: fileName,
          needsPhoto: true,
        }));
        setShowInternetPanel(false);
      } else {
        setImageDownloadError(res.error || 'Failed to download selected image');
      }
    } catch (err: any) {
      setImageDownloadError(err?.message || 'Error downloading image');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Download image from custom URL
  const handleDownloadFromUrl = async () => {
    if (!internetUrlInput.trim()) return;
    setIsDownloadingImage(true);
    setImageDownloadError(null);
    try {
      const res = await downloadImage(internetUrlInput.trim());
      if (res.success && res.imageBase64) {
        const fileExt = internetUrlInput.toLowerCase().includes('.png') ? 'png' : 'jpg';
        const fileName = `url_${Date.now()}.${fileExt}`;
        setEditableCard((prev) => ({
          ...(prev || {
            word: word.trim() || 'Word',
            cardType,
          }),
          imageBase64: res.imageBase64,
          imageFileName: fileName,
          needsPhoto: true,
        }));
        setShowInternetPanel(false);
      } else {
        setImageDownloadError(res.error || 'Failed to download image from URL');
      }
    } catch (err: any) {
      setImageDownloadError(err?.message || 'Error downloading image');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Upload local image file
  const handleLocalImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (re) => {
      const res = re.target?.result as string;
      if (res) {
        const b64 = res.split(',')[1] || res;
        const fileName = `manual_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        setEditableCard((prev) => ({
          ...(prev || {
            word: word.trim() || 'Word',
            cardType,
          }),
          imageBase64: b64,
          imageFileName: fileName,
          needsPhoto: true,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove current image
  const handleRemoveImage = () => {
    setEditableCard((prev) => (prev ? { ...prev, imageBase64: undefined, imageFileName: undefined } : null));
  };

  // Clear all form fields to start a new card
  const handleClearForm = () => {
    setWord('');
    setEditableCard(null);
    setGeneratedCard(null);
    setCreatedNoteId(null);
    setCreatedCardIds([]);
    setVerificationDetails(null);
    setDuplicateWarning(null);
    setErrorMessage(null);
    setFailedStage(null);
    setExecutionLogs([]);
    setActiveStepNumber(0);
    setAnkiActionMessage(null);
    setShowInternetPanel(false);
  };

  // Handle Form Submit: Generate Full Card via AI & Pipeline
  const handleCreate = async (forceAdd = false) => {
    const trimmedWord = (editableCard?.word || word).trim();
    if (!trimmedWord) return;

    setErrorMessage(null);
    setFailedStage(null);
    setDuplicateWarning(null);
    setTestAnkiResult(null);

    // 1. Check duplicate if not forced
    if (!forceAdd) {
      try {
        const dupRes = await checkDuplicate(deck, trimmedWord, settings.anki.url);
        if (dupRes.isDuplicate) {
          setDuplicateWarning({ isDup: true, noteIds: dupRes.existingNoteIds });
          return;
        }
      } catch {
        // Ignore and proceed
      }
    }

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;
    setIsGenerating(true);
    setActiveStepNumber(1);
    setExecutionLogs([]);
    setCreatedNoteId(null);
    setCreatedCardIds([]);
    setVerificationDetails(null);
    setAnkiActionMessage(null);

    try {
      const activeTags = editableCard?.tags || editorTags;
      const manualOverrides: ManualOverrides = {
        phonetic: editableCard?.phonetic || undefined,
        partOfSpeech: editableCard?.partOfSpeech || undefined,
        meaningFa: editableCard?.meaningFa || undefined,
        definitionEn: editableCard?.definitionEn || undefined,
        example: editableCard?.example || undefined,
        translationFa: editableCard?.translationFa || undefined,
        mnemonic: editableCard?.mnemonic || undefined,
        cardType,
        tags: activeTags,
        allowAi: settings.ai?.enabled !== false,
        imageBase64: editableCard?.imageBase64 || undefined,
        imageFileName: editableCard?.imageFileName || undefined,
        frontCustomBlocks: getFrontCustomBlocks(editableCard),
        backCustomBlocks: getBackCustomBlocks(editableCard),
        customBlocks: getAllCustomBlocks(editableCard),
        mainBoxStyles: editableCard?.mainBoxStyles || undefined,
        needsPhoto: photoChoice === 'yes' || !!editableCard?.imageBase64,
        modelName: selectedNoteType,
      };

      const pipelineRes = await runFullPipeline({
        word: trimmedWord,
        deck: deck.trim(),
        manualOverrides,
        cardType,
        modelName: selectedNoteType,
        createInAnki: true,
        theme: selectedTheme,
        url: settings.anki.url,
        tags: activeTags,
        allowAi: settings.ai?.enabled !== false,
        signal: abortCtrl.signal,
      });

      if (pipelineRes.logs) {
        setExecutionLogs(pipelineRes.logs);
      }

      if (!pipelineRes.success || !pipelineRes.cardData) {
        setFailedStage(pipelineRes.stage || 'pipeline');
        if (pipelineRes.verification) {
          setVerificationDetails(pipelineRes.verification);
        }
        throw new Error(pipelineRes.error || 'Failed to complete card creation pipeline');
      }

      // Strict validation: Only proceed to success if verified
      if (pipelineRes.verification && !pipelineRes.verification.isVerified) {
        setVerificationDetails(pipelineRes.verification);
        throw new Error(pipelineRes.verification.verificationMessage || 'Verification failed in Anki.');
      }

      setGeneratedCard(pipelineRes.cardData);
      setEditableCard(pipelineRes.cardData);
      setCreatedNoteId(pipelineRes.noteId || null);
      setCreatedCardIds(pipelineRes.cardIds || []);
      setVerificationDetails(pipelineRes.verification || null);
      setActiveStepNumber(14); // Completed

      if (onCardCreated) {
        onCardCreated(pipelineRes.cardData, pipelineRes.noteId);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setErrorMessage('Card generation was cancelled.');
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred during card generation');
      }
      setActiveStepNumber(-1); // Error state
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Direct Save/Update Note in Anki
  const handleSaveToAnki = async () => {
    const cardToSave = previewDisplayCard || editableCard;
    if (!cardToSave) return;
    setIsUpdatingAnki(true);
    setAnkiActionMessage(null);
    try {
      if (createdNoteId) {
        const res = await updateAnkiNote(
          createdNoteId,
          cardToSave,
          selectedTheme,
          settings.anki.url,
          deck.trim(),
          selectedNoteType
        );
        if (res.success) {
          setAnkiActionMessage(`✓ Note #${createdNoteId} successfully updated in Anki!`);
        } else {
          setAnkiActionMessage(`✕ Failed to update note: ${res.error}`);
        }
      } else {
        const res = await createDirectAnkiNote({
          deck: deck.trim(),
          cardData: cardToSave,
          theme: selectedTheme,
          cardType,
          modelName: selectedNoteType,
          url: settings.anki.url,
          tags: cardToSave.tags || editorTags,
        });
        if (res.success && res.noteId) {
          setCreatedNoteId(res.noteId);
          if (res.cardIds) setCreatedCardIds(res.cardIds);
          setAnkiActionMessage(`✓ Created Note #${res.noteId} in Anki!`);
        } else {
          setAnkiActionMessage(`✕ Failed to create note: ${res.error}`);
        }
      }
    } catch (err: any) {
      setAnkiActionMessage(`✕ Error saving note: ${err?.message}`);
    } finally {
      setIsUpdatingAnki(false);
    }
  };

  // Run Test Card (Direct AnkiConnect Test without AI or TTS)
  const handleRunAnkiTest = async () => {
    setTestingAnkiOnly(true);
    setErrorMessage(null);
    setTestAnkiResult(null);
    setAnkiActionMessage(null);
    try {
      const res = await runAnkiPipelineTest({
        deck: deck.trim(),
        theme: settings.theme,
        url: settings.anki.url,
        cardType,
      });
      setTestAnkiResult(res);
      if (res.success && res.testNoteId) {
        setCreatedNoteId(res.testNoteId);
        setCreatedCardIds(res.testCardIds || []);
        setVerificationDetails(res.verification || null);
        setActiveStepNumber(14);
        if (res.sampleCard) {
          setGeneratedCard(res.sampleCard);
          setEditableCard(res.sampleCard);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Test card creation failed');
    } finally {
      setTestingAnkiOnly(false);
    }
  };

  // Open note in Anki Browser
  const handleOpenInAnki = async (noteIdToOpen: number) => {
    setIsOpeningInAnki(true);
    setAnkiActionMessage(null);
    try {
      const res = await openInAnki({ noteId: noteIdToOpen, url: settings.anki.url });
      if (res.success) {
        setAnkiActionMessage(`✓ Opened Note #${noteIdToOpen} in Anki Browser GUI`);
      } else {
        setAnkiActionMessage(`✕ Could not open Anki Browser: ${res.error || 'Anki desktop window may be minimized'}`);
      }
    } catch (e: any) {
      setAnkiActionMessage(`✕ Error opening Anki: ${e?.message}`);
    } finally {
      setIsOpeningInAnki(false);
    }
  };

  // Re-verify Note in Anki
  const handleReverifyNote = async (noteIdToVerify: number) => {
    setIsReverifying(true);
    setAnkiActionMessage(null);
    try {
      const res = await verifyNoteInAnki(noteIdToVerify, deck.trim(), settings.anki.url);
      if (res.success && res.verification) {
        setVerificationDetails(res.verification);
        setAnkiActionMessage(
          `✓ Re-verified Note #${noteIdToVerify}: Exists in deck '${res.verification.actualDeck}' with ${res.verification.cardsCount} card(s)!`
        );
      } else {
        setAnkiActionMessage(`✕ Verification failed: ${res.error || 'Note not found in Anki'}`);
      }
    } catch (e: any) {
      setAnkiActionMessage(`✕ Verification error: ${e?.message}`);
    } finally {
      setIsReverifying(false);
    }
  };

  // Display card for the preview/editor
  const previewDisplayCard = useMemo(() => {
    if (editableCard) {
      return {
        ...editableCard,
        tags: editableCard.tags || editorTags,
        modelName: editableCard.modelName || selectedNoteType,
        noteType: editableCard.noteType || selectedNoteType,
      };
    }
    if (generatedCard) {
      return {
        ...generatedCard,
        tags: generatedCard.tags || editorTags,
        modelName: generatedCard.modelName || selectedNoteType,
        noteType: generatedCard.noteType || selectedNoteType,
      };
    }
    return {
      word: word.trim() || '',
      phonetic: '',
      partOfSpeech: '',
      meaningFa: '',
      definitionEn: '',
      example: '',
      translationFa: '',
      mnemonic: '',
      cardType,
      spellingSentence: '',
      needsPhoto: photoChoice === 'yes',
      customBlocks: [],
      tags: editorTags,
      modelName: selectedNoteType,
      noteType: selectedNoteType,
    };
  }, [editableCard, generatedCard, word, cardType, photoChoice, editorTags, selectedNoteType]);

  const isAiEnabled = settings.ai?.enabled !== false;
  const isCardAlreadyComplete = useMemo(() => isCardComplete(previewDisplayCard), [previewDisplayCard]);

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row min-w-0">
      {/* LEFT COLUMN: 25% width - Minimal Creation Controls */}
      <div className="w-full md:w-1/4 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 min-w-0 flex flex-col select-none">
        <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
          Generate Single Flashcard
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          {/* Word Input */}
          <div>
            <label className="text-xs font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
              Word
            </label>
            <input
              type="text"
              required
              autoFocus
              disabled={isGenerating || testingAnkiOnly}
              placeholder="Enter word..."
              value={word}
              onChange={(e) => {
                const newWord = e.target.value;
                setWord(newWord);
                setEditableCard((prev) => (prev ? { ...prev, word: newWord } : null));
              }}
              className="w-full px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 focus:border-blue-500 bg-transparent text-sm font-semibold rounded-none focus:outline-none transition-colors text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Target Deck Input (with autocomplete & Tab/Enter selection) */}
          <div>
            <label className="text-xs font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">
              Deck
            </label>
            <div className="relative">
              <input
                type="text"
                list="create-view-decks-list"
                required
                placeholder="English::B1"
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 focus:border-blue-500 bg-transparent text-xs font-medium rounded-none focus:outline-none transition-colors text-zinc-900 dark:text-zinc-100"
              />
              <datalist id="create-view-decks-list">
                {availableDecks.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Card Mode: Only □ Standard and □ Spelling */}
          <div>
            <label className="text-xs font-semibold block mb-1.5 text-zinc-700 dark:text-zinc-300">
              Card Mode
            </label>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cardType === 'normal'}
                  onChange={() => setCardType('normal')}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600 cursor-pointer"
                />
                <span className={cardType === 'normal' ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}>
                  Standard
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cardType === 'spelling'}
                  onChange={() => setCardType('spelling')}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600 cursor-pointer"
                />
                <span className={cardType === 'spelling' ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}>
                  Spelling
                </span>
              </label>
            </div>
          </div>

          {/* Image: Only □ Yes and □ No */}
          <div>
            <label className="text-xs font-semibold block mb-1.5 text-zinc-700 dark:text-zinc-300">
              Image
            </label>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={photoChoice === 'yes'}
                  onChange={() => setPhotoChoice('yes')}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600 cursor-pointer"
                />
                <span className={photoChoice === 'yes' ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}>
                  Yes
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={photoChoice === 'no'}
                  onChange={() => setPhotoChoice('no')}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600 cursor-pointer"
                />
                <span className={photoChoice === 'no' ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}>
                  No
                </span>
              </label>
            </div>
          </div>

          {/* Duplicate notice if detected */}
          {duplicateWarning && duplicateWarning.isDup && (
            <div className="p-2 border border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs space-y-1 rounded-none">
              <div className="font-bold">Duplicate card detected in Anki</div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-2 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded-none text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCreate(true)}
                  className="px-2 py-0.5 bg-blue-600 text-white rounded-none text-xs font-bold"
                >
                  Create Anyway
                </button>
              </div>
            </div>
          )}

          {/* Buttons: [ Generate ] [ Clear ] */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isGenerating || testingAnkiOnly || !word.trim()}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-none cursor-pointer transition-colors shadow-none"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              disabled={isGenerating || testingAnkiOnly || (!word.trim() && !editableCard)}
              className="py-2 px-3 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-none cursor-pointer transition-colors disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="my-5 border-t border-zinc-200 dark:border-zinc-800" />

        {/* Progress: Keep it extremely simple */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Progress</span>
            <span className="font-mono text-zinc-500 font-medium">
              {activeStepNumber === 14 ? '100%' : `${Math.round(Math.max(0, (activeStepNumber / 14) * 100))}%`}
            </span>
          </div>

          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-none overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-none ${
                activeStepNumber === -1
                  ? 'bg-rose-500 w-full'
                  : activeStepNumber === 14
                  ? 'bg-emerald-500 w-full'
                  : 'bg-blue-600'
              }`}
              style={{
                width:
                  activeStepNumber === -1
                    ? '100%'
                    : activeStepNumber === 14
                    ? '100%'
                    : `${(activeStepNumber / 14) * 100}%`,
              }}
            />
          </div>

          <div className="text-[11px] text-zinc-500 truncate">
            {isGenerating
              ? (executionLogs[executionLogs.length - 1]?.name || 'Creating card...')
              : errorMessage
              ? `Error: ${errorMessage}`
              : activeStepNumber === 14
              ? 'Card created successfully'
              : 'Idle'}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: 75% width - Shared Card Editor */}
      <div className="w-full md:w-3/4 flex-1 min-w-0 p-4 sm:p-6 flex flex-col">
        <UnifiedCardEditor
          key={`${createdNoteId || 'new'}_${selectedNoteType}`}
          cardData={previewDisplayCard}
          emptyWordPlaceholder={word.trim() || 'Word'}
          themeId={selectedTheme}
          cardType={cardType}
          noteType={selectedNoteType}
          onNoteTypeChange={handleNoteTypeChange}
          deckName={deck.trim()}
          noteId={createdNoteId || undefined}
          editable={true}
          onCardChange={handleCardChange}
          onSaveToAnki={handleSaveToAnki}
          isSavingToAnki={isUpdatingAnki}
          canSaveToAnki={true}
          saveSuccessMsg={ankiActionMessage}
          onShowInAnki={handleOpenInAnki}
          isShowingInAnki={isOpeningInAnki}
          onOpenImageSearch={handleOpenInternetSearch}
          onUploadImage={handleLocalImageUpload}
          onRemoveImage={handleRemoveImage}
          availableTags={editorTags}
          ankiUrl={settings.anki?.url}
        />
      </div>

      {/* ONLINE IMAGE SEARCH MODAL */}
      {showInternetPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`w-full max-w-xl p-5 rounded-xl border shadow-2xl space-y-3 ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-700/50">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold">{t('create.searchInternet') || 'Online Image Search'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInternetPanel(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* URL Input Bar */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">
                {t('create.pasteImageUrl') || 'Direct Image URL:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://.../image.jpg"
                  value={internetUrlInput}
                  onChange={(e) => setInternetUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDownloadFromUrl()}
                  className={`flex-1 p-2 border rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleDownloadFromUrl}
                  disabled={isDownloadingImage || !internetUrlInput.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-md shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isDownloadingImage ? 'Loading...' : 'Download'}
                </button>
              </div>
            </div>

            {/* Error in modal */}
            {imageDownloadError && (
              <p className="text-xs text-rose-500 font-semibold">{imageDownloadError}</p>
            )}

            {/* Search query indicator */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-zinc-400">
                Results for "{editableCard?.word || word || 'illustration'}":
              </span>
            </div>

            {/* Results Grid */}
            {isSearchingOnline && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Searching Wikimedia & Unsplash...</span>
              </div>
            )}

            {!isSearchingOnline && onlineSearchResults.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                {onlineSearchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectOnlineResult(res.fullUrl || res.thumbUrl)}
                    disabled={isDownloadingImage}
                    className={`group relative border rounded-lg overflow-hidden aspect-square hover:ring-2 hover:ring-blue-500 cursor-pointer transition-all ${
                      isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-zinc-100'
                    }`}
                    title={res.title}
                  >
                    <img src={res.thumbUrl} alt={res.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                      <span className="text-[10px] text-white font-bold bg-blue-600 px-2 py-1 rounded">
                        Select
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isSearchingOnline && onlineSearchResults.length === 0 && (
              <p className="text-xs text-zinc-500 py-4 text-center">
                No automatic search results found. Paste an image URL above.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInternetPanel(false)}
                className="px-4 py-1.5 text-xs font-semibold border rounded-md cursor-pointer hover:bg-zinc-800"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
