import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CardData, ManualOverrides, AppSettings, StepLog, AnkiCardVerificationDetails, CardType, AppTheme, getFrontCustomBlocks, getBackCustomBlocks, getAllCustomBlocks } from '../types';
import { CardPreview } from './CardPreview';
import { AudioPlayer } from './AudioPlayer';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { makeSpellingSentence } from '../themes';
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
          if (!res.decks.includes(deck)) {
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

    setIsGenerating(true);
    setActiveStepNumber(1);
    setExecutionLogs([]);
    setCreatedNoteId(null);
    setCreatedCardIds([]);
    setVerificationDetails(null);
    setAnkiActionMessage(null);

    try {
      const manualOverrides: ManualOverrides = {
        phonetic: editableCard?.phonetic || undefined,
        partOfSpeech: editableCard?.partOfSpeech || undefined,
        meaningFa: editableCard?.meaningFa || undefined,
        example: editableCard?.example || undefined,
        translationFa: editableCard?.translationFa || undefined,
        mnemonic: editableCard?.mnemonic || undefined,
        cardType,
        imageBase64: editableCard?.imageBase64 || undefined,
        imageFileName: editableCard?.imageFileName || undefined,
        frontCustomBlocks: getFrontCustomBlocks(editableCard),
        backCustomBlocks: getBackCustomBlocks(editableCard),
        customBlocks: getAllCustomBlocks(editableCard),
        needsPhoto: photoChoice === 'yes' || !!editableCard?.imageBase64,
      };

      const pipelineRes = await runFullPipeline({
        word: trimmedWord,
        deck: deck.trim(),
        manualOverrides,
        cardType,
        createInAnki: true,
        theme: settings.theme,
        url: settings.anki.url,
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
      setErrorMessage(err.message || 'An unexpected error occurred during card generation');
      setActiveStepNumber(-1); // Error state
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct Update Note in Anki
  const handleSaveToAnki = async () => {
    if (!createdNoteId || !editableCard) return;
    setIsUpdatingAnki(true);
    setAnkiActionMessage(null);
    try {
      const res = await updateAnkiNote(createdNoteId, editableCard, settings.theme, settings.anki.url);
      if (res.success) {
        setAnkiActionMessage(`✓ Note #${createdNoteId} successfully updated in Anki!`);
      } else {
        setAnkiActionMessage(`✕ Failed to update note: ${res.error}`);
      }
    } catch (err: any) {
      setAnkiActionMessage(`✕ Error updating note: ${err?.message}`);
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
      return editableCard;
    }
    if (generatedCard) {
      return generatedCard;
    }
    if (word.trim()) {
      return {
        word: word.trim(),
        phonetic: '',
        partOfSpeech: '',
        meaningFa: '',
        example: '',
        translationFa: '',
        mnemonic: '',
        cardType,
        spellingSentence: '',
        needsPhoto: photoChoice === 'yes',
        customBlocks: [],
      };
    }
    return null;
  }, [editableCard, generatedCard, word, cardType, photoChoice]);

  return (
    <div className="w-full max-w-[1920px] mx-auto flex flex-col lg:flex-row gap-4 xl:gap-5 p-3 sm:p-5 min-w-0">
      {/* LEFT COLUMN: Creation Parameters & Pipeline Status */}
      <section className="w-full lg:w-[350px] xl:w-[375px] flex flex-col gap-4 shrink-0 min-w-0">
        {/* Box 1: Build Flashcard Form */}
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight">{t('create.title')}</h2>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              Single Card
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="space-y-4"
          >
            {/* Word Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                  {t('create.wordLabel')} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {settings.ai.provider.toUpperCase()} AI
                </span>
              </div>
              <input
                type="text"
                required
                autoFocus
                disabled={isGenerating || testingAnkiOnly}
                placeholder={t('create.wordPlaceholder')}
                value={word}
                onChange={(e) => {
                  const newWord = e.target.value;
                  setWord(newWord);
                  setEditableCard((prev) => (prev ? { ...prev, word: newWord } : null));
                }}
                className={`w-full p-2.5 border rounded-md text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-[#18181B] border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>

            {/* Target Deck Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                  {t('create.deckLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomDeck(!isCustomDeck)}
                  className="text-[11px] text-blue-500 hover:text-blue-400 font-medium cursor-pointer"
                >
                  {isCustomDeck ? t('create.selectDeck') : t('create.customDeckToggle')}
                </button>
              </div>

              {isCustomDeck ? (
                <input
                  type="text"
                  required
                  placeholder={t('create.customDeckPlaceholder')}
                  value={deck}
                  onChange={(e) => setDeck(e.target.value)}
                  className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-[#18181B] border-zinc-700 text-zinc-100'
                      : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
              ) : (
                <div className="relative">
                  <select
                    value={deck}
                    onChange={(e) => setDeck(e.target.value)}
                    disabled={loadingDecks}
                    className={`w-full p-2 border rounded-md text-xs font-medium appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      isDark
                        ? 'bg-[#18181B] border-zinc-700 text-zinc-100'
                        : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  >
                    {availableDecks.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div
                    className={`absolute ${
                      isRTL ? 'left-3' : 'right-3'
                    } top-3 pointer-events-none text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
                  >
                    ▼
                  </div>
                </div>
              )}
            </div>

            {/* Card Type Selection */}
            <div>
              <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {t('create.cardTypeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCardType('normal')}
                  className={`p-2.5 border rounded-lg text-left transition-all cursor-pointer ${
                    cardType === 'normal'
                      ? isDark
                        ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                      : isDark
                      ? 'border-zinc-700 bg-zinc-850 hover:bg-zinc-800'
                      : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-blue-500">{t('create.typeNormalTitle')}</span>
                    {cardType === 'normal' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Standard front & back vocabulary card
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCardType('spelling')}
                  className={`p-2.5 border rounded-lg text-left transition-all cursor-pointer ${
                    cardType === 'spelling'
                      ? isDark
                        ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-500'
                        : 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                      : isDark
                      ? 'border-zinc-700 bg-zinc-850 hover:bg-zinc-800'
                      : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-purple-500">{t('create.typeSpellingTitle')}</span>
                    {cardType === 'spelling' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Interactive keyboard spelling challenge
                  </p>
                </button>
              </div>
            </div>

            {/* Smart Image Choice */}
            <div>
              <label className={`text-xs font-semibold block mb-1.5 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {t('create.smartImageChoiceLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoChoice('yes')}
                  className={`p-2 border rounded-md text-center transition-all text-xs font-semibold cursor-pointer ${
                    photoChoice === 'yes'
                      ? isDark
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                      : isDark
                      ? 'border-zinc-700 bg-zinc-850 text-zinc-400'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  }`}
                >
                  🖼️ {t('create.smartImageYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoChoice('no')}
                  className={`p-2 border rounded-md text-center transition-all text-xs font-semibold cursor-pointer ${
                    photoChoice === 'no'
                      ? isDark
                        ? 'border-zinc-500 bg-zinc-800 text-zinc-200 ring-1 ring-zinc-500'
                        : 'border-zinc-400 bg-zinc-100 text-zinc-800 ring-1 ring-zinc-400'
                      : isDark
                      ? 'border-zinc-700 bg-zinc-850 text-zinc-400'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                  }`}
                >
                  🚫 {t('create.smartImageNo')}
                </button>
              </div>
            </div>

            {/* Duplicate Notice */}
            {duplicateWarning && duplicateWarning.isDup && (
              <div
                className={`p-3 border rounded-lg text-xs flex flex-col gap-2 shadow-xs ${
                  isDark
                    ? 'bg-amber-950/40 text-amber-200 border-amber-800'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{t('create.duplicateWarning', { deck, noteId: duplicateWarning.noteIds[0] || '' })}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className={`flex-1 px-3 py-1.5 font-medium border rounded-md text-xs cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreate(true)}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 text-xs cursor-pointer shadow-xs"
                  >
                    {t('common.yes')}
                  </button>
                </div>
              </div>
            )}

            {/* Error Notice */}
            {errorMessage && (
              <div
                className={`p-3 border rounded-lg text-xs flex flex-col gap-1 shadow-xs ${
                  isDark
                    ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-500" /> {t('create.stageError')}{' '}
                  {failedStage || 'Execution'}
                </span>
                <p className="text-xs">{errorMessage}</p>
              </div>
            )}

            {/* Action Buttons: Generate, Update, Clear */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isGenerating || testingAnkiOnly || !word.trim()}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{t('create.generating')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{t('create.generateCardBtn')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClearForm}
                  disabled={isGenerating || testingAnkiOnly || (!word.trim() && !editableCard)}
                  className={`py-2.5 px-3.5 border rounded-md font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                  }`}
                  title="Clear form to create another card"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('common.clear')}</span>
                </button>
              </div>

              {/* Direct "Update Note in Anki" button when note exists */}
              {createdNoteId && (
                <button
                  type="button"
                  onClick={handleSaveToAnki}
                  disabled={isUpdatingAnki}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isUpdatingAnki ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Note #{createdNoteId}...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{t('preview.saveToAnki') || `Update Note #${createdNoteId} in Anki`}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Box 2: Pipeline Execution Box */}
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs flex flex-col ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('create.pipelineProgress')}
            </h3>
            {isGenerating && (
              <span className="text-[11px] text-blue-500 font-semibold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('create.step')} {activeStepNumber}/14
              </span>
            )}
            {!isGenerating && activeStepNumber === 14 && (
              <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('create.completed')}
              </span>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full transition-all duration-300 ${
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

          {/* Stepper List of Logs */}
          <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto mb-3 pr-1">
            {DEFAULT_STEPS.map((st) => {
              const matchedLog = executionLogs.find((l) => l.step === st.step);
              let icon = <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />;
              let textColor = 'text-zinc-400 dark:text-zinc-500';

              if (matchedLog) {
                if (matchedLog.status === 'success') {
                  icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
                  textColor = 'text-zinc-700 dark:text-zinc-200 font-medium';
                } else if (matchedLog.status === 'error') {
                  icon = <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
                  textColor = 'text-rose-500 font-semibold';
                } else if (matchedLog.status === 'running') {
                  icon = <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />;
                  textColor = 'text-blue-500 font-semibold';
                }
              } else if (isGenerating && activeStepNumber === st.step) {
                icon = <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />;
                textColor = 'text-blue-500 font-semibold';
              }

              return (
                <div key={st.step} className="flex items-center gap-2 text-xs py-0.5">
                  <div className="w-4 flex items-center justify-center">{icon}</div>
                  <span className={`text-[11px] truncate ${textColor}`}>{st.name}</span>
                </div>
              );
            })}
          </div>

          {/* Verification Banner */}
          {verificationDetails && (
            <div
              className={`p-3 border rounded-md text-xs mb-3 space-y-1.5 ${
                verificationDetails.isVerified
                  ? isDark
                    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : isDark
                  ? 'bg-rose-950/30 border-rose-800 text-rose-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {verificationDetails.isVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span>
                    {verificationDetails.isVerified
                      ? t('create.verifiedInAnki')
                      : t('create.verificationFailed')}
                  </span>
                </span>
                <span className="text-[10px] font-mono opacity-80">
                  Note #{verificationDetails.noteId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                <div>
                  <span className="opacity-70">{t('create.deck')}:</span>{' '}
                  <span className="font-semibold">{verificationDetails.actualDeck}</span>
                </div>
                <div>
                  <span className="opacity-70">{t('create.cardsCreated')}:</span>{' '}
                  <span className="font-semibold">{verificationDetails.cardsCount}</span>
                </div>
              </div>

              {/* Anki Actions: Open in GUI, Re-verify */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenInAnki(verificationDetails.noteId)}
                  disabled={isOpeningInAnki}
                  className={`px-2 py-1 text-[10px] font-bold rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
                      : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300'
                  }`}
                  title="Open this card in the Anki Desktop Browser window"
                >
                  <ExternalLink className="w-3 h-3 text-blue-500" />
                  <span>{isOpeningInAnki ? 'Opening...' : t('create.openInAnki')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReverifyNote(verificationDetails.noteId)}
                  disabled={isReverifying}
                  className={`px-2 py-1 text-[10px] font-medium rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                      : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                  }`}
                  title="Re-query AnkiConnect to verify note and cards existence"
                >
                  <RotateCcw className={`w-3 h-3 ${isReverifying ? 'animate-spin' : ''}`} />
                  <span>{isReverifying ? 'Verifying...' : t('create.reverifyNote')}</span>
                </button>
              </div>

              {ankiActionMessage && (
                <p className="text-[10px] text-blue-400 dark:text-blue-300 pt-1 font-mono">
                  {ankiActionMessage}
                </p>
              )}
            </div>
          )}

          {/* Test Card Button (Direct AnkiConnect Diagnostic) */}
          <div className="mt-auto pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRunAnkiTest}
              disabled={isGenerating || testingAnkiOnly}
              className={`text-xs font-semibold px-2.5 py-1 rounded border flex items-center gap-1.5 cursor-pointer transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
              }`}
              title="Test AnkiConnect note creation directly without calling AI or TTS"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{testingAnkiOnly ? 'Testing Anki...' : t('create.testCardBtn')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: Live Card Preview & Card Editor */}
      <section className="flex-1 flex flex-col min-h-[580px] min-w-0">
        <div
          className={`flex-1 border rounded-lg p-2.5 sm:p-3.5 relative overflow-hidden shadow-xs flex flex-col ${
            isDark ? 'bg-[#1F1F23] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <CardPreview
            cardData={previewDisplayCard}
            themeId={settings.theme}
            cardType={cardType}
            emptyWordPlaceholder={word.trim() || 'Word'}
            appTheme={isDark ? 'anki-dark' : 'anki-light'}
            editable={true}
            onCardChange={handleCardChange}
            onSaveToAnki={handleSaveToAnki}
            isSavingToAnki={isUpdatingAnki}
            canSaveToAnki={!!createdNoteId}
            onOpenImageSearch={handleOpenInternetSearch}
            onUploadImage={handleLocalImageUpload}
            onRemoveImage={handleRemoveImage}
          />
        </div>
      </section>

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
