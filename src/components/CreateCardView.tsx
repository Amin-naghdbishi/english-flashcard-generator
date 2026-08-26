import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CardData, ManualOverrides, AppSettings, StepLog, AnkiCardVerificationDetails, CardType, AppTheme } from '../types';
import { CardPreview } from './CardPreview';
import { AudioPlayer } from './AudioPlayer';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import {
  runFullPipeline,
  getAnkiDecks,
  checkDuplicate,
  runAnkiPipelineTest,
  openInAnki,
  verifyNoteInAnki,
  downloadImage,
  searchOnlineImages,
} from '../services/api';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
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
} from 'lucide-react';

interface CreateCardViewProps {
  settings: AppSettings;
  onCardCreated?: (cardData: CardData, noteId?: number) => void;
  appTheme?: AppTheme;
}

const DEFAULT_STEPS: Array<{ step: number; name: string }> = [
  { step: 1, name: 'Word received' },
  { step: 2, name: 'Deck validated' },
  { step: 3, name: 'AI Provider Connected' },
  { step: 4, name: 'AI data generated' },
  { step: 5, name: 'Smart Image Attached' },
  { step: 6, name: 'TTS Service Reachable' },
  { step: 7, name: 'Audio Generated' },
  { step: 8, name: 'AnkiConnect Connected' },
  { step: 9, name: 'Deck Ensured' },
  { step: 10, name: 'Note Type Configured' },
  { step: 11, name: 'Fields Prepared' },
  { step: 12, name: 'Media Uploaded' },
  { step: 13, name: 'Note Created' },
  { step: 14, name: 'Card Verified' },
];

export const CreateCardView: React.FC<CreateCardViewProps> = ({ settings, onCardCreated }) => {
  const themeContext = useAppTheme();
  const { t, isRTL } = useTranslation();
  const isDark = themeContext.isDark;

  const [word, setWord] = useState('abandon');
  const [deck, setDeck] = useState(settings.anki.defaultDeck || 'English::B1');
  const [cardType, setCardType] = useState<CardType>(settings.defaultCard?.cardType || 'normal');
  const [photoChoice, setPhotoChoice] = useState<'yes' | 'no'>('no');
  const [availableDecks, setAvailableDecks] = useState<string[]>(['English::B1', 'English::B2', 'IELTS']);
  const [isCustomDeck, setIsCustomDeck] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(false);

  // Advanced Overrides (strictly prioritized over AI)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrides, setOverrides] = useState<ManualOverrides>({
    phonetic: '',
    partOfSpeech: '',
    meaningFa: '',
    example: '',
    translationFa: '',
    mnemonic: '',
    imageBase64: undefined,
    imageFileName: undefined,
  });

  // Manual Image Selection State
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [testAnkiResult, setTestAnkiResult] = useState<{
    success: boolean;
    steps: Array<{ step: string; status: 'ok' | 'error'; message: string; details?: any }>;
    testNoteId?: number;
    testCardIds?: number[];
    verification?: AnkiCardVerificationDetails;
  } | null>(null);

  // Duplicate state
  const [duplicateWarning, setDuplicateWarning] = useState<{ isDup: boolean; noteIds: number[] } | null>(null);

  // Fetch real decks from Anki
  const loadDecks = async () => {
    setLoadingDecks(true);
    try {
      const res = await getAnkiDecks(settings.anki.url);
      if (res.success && res.decks.length > 0) {
        setAvailableDecks(res.decks);
        if (!res.decks.includes(deck)) {
          setDeck(res.decks[0]);
        }
      }
    } catch {
      // Keep defaults
    } finally {
      setLoadingDecks(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, [settings.anki.url]);

  // Manual image handlers
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const ext = file.name.split('.').pop() || 'png';
      const cleanWord = (word || 'card').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const fileName = `card_manual_${cleanWord}_${Date.now()}.${ext}`;

      setOverrides((prev) => ({
        ...prev,
        imageBase64: base64,
        imageFileName: fileName,
      }));
    };
    reader.readAsDataURL(file);
  };

  const fetchOnlineImageSuggestions = async (term: string) => {
    if (!term) return;
    setIsSearchingOnline(true);
    try {
      const res = await searchOnlineImages(term);
      if (res.success && res.results) {
        setOnlineSearchResults(res.results);
      }
    } catch {
      // Ignore
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleOpenInternetSearch = () => {
    const currentWord = word.trim() || 'word';
    let searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(currentWord)}`;
    if (settings.smartImages?.searchProvider === 'wikimedia') {
      searchUrl = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(currentWord)}`;
    } else if (settings.smartImages?.searchProvider === 'unsplash') {
      searchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(currentWord)}`;
    }
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
    setShowInternetPanel(true);
    fetchOnlineImageSuggestions(currentWord);
  };

  const handleDownloadFromUrl = async () => {
    const url = internetUrlInput.trim();
    if (!url) return;
    setIsDownloadingImage(true);
    setImageDownloadError(null);
    try {
      const res = await downloadImage(url, word.trim());
      if (!res.success || !res.imageBase64) {
        throw new Error(res.error || 'Failed to download image from the provided URL');
      }
      setOverrides((prev) => ({
        ...prev,
        imageBase64: res.imageBase64,
        imageFileName: res.imageFileName || `card_manual_${word.trim()}_${Date.now()}.png`,
      }));
      setInternetUrlInput('');
      setShowInternetPanel(false);
    } catch (err: any) {
      setImageDownloadError(err.message || 'Could not download image from the provided URL');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleSelectOnlineResult = async (imgUrl: string) => {
    setIsDownloadingImage(true);
    setImageDownloadError(null);
    try {
      const res = await downloadImage(imgUrl, word.trim());
      if (!res.success || !res.imageBase64) {
        throw new Error(res.error || 'Failed to download image from the selected result');
      }
      setOverrides((prev) => ({
        ...prev,
        imageBase64: res.imageBase64,
        imageFileName: res.imageFileName || `card_manual_${word.trim()}_${Date.now()}.png`,
      }));
      setShowInternetPanel(false);
    } catch (err: any) {
      setImageDownloadError(err.message || 'Could not download image');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleRemoveImageOverride = () => {
    setOverrides((prev) => ({
      ...prev,
      imageBase64: undefined,
      imageFileName: undefined,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Form Submit
  const handleCreate = async (forceAdd = false) => {
    const trimmedWord = word.trim();
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
      const pipelineRes = await runFullPipeline({
        word: trimmedWord,
        deck: deck.trim(),
        manualOverrides: {
          ...overrides,
          needsPhoto: photoChoice === 'yes',
        },
        cardType,
        createInAnki: true,
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
        if (res.verification) {
          setVerificationDetails(res.verification);
        }
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Test note pipeline failed');
    } finally {
      setTestingAnkiOnly(false);
    }
  };

  // Open note/card in Anki GUI Browser
  const handleOpenInAnki = async () => {
    const noteIdToOpen = createdNoteId || verificationDetails?.noteId || testAnkiResult?.testNoteId;
    if (!noteIdToOpen) return;

    setIsOpeningInAnki(true);
    setAnkiActionMessage(null);
    try {
      const query = `nid:${noteIdToOpen}`;
      const res = await openInAnki({ noteId: noteIdToOpen, query, url: settings.anki.url });
      if (res.success) {
        setAnkiActionMessage(`Opened Anki Browser with query: "${query}". (Note #${noteIdToOpen})`);
      } else {
        setAnkiActionMessage(`Anki Browser command sent. Search in Anki Browse: "${query}"`);
      }
    } catch (e: any) {
      setAnkiActionMessage(`Could not open Anki browser: ${e?.message}. Query: "nid:${noteIdToOpen}"`);
    } finally {
      setIsOpeningInAnki(false);
    }
  };

  // Re-verify Note directly with AnkiConnect
  const handleReverifyInAnki = async () => {
    const noteIdToVerify = createdNoteId || verificationDetails?.noteId || testAnkiResult?.testNoteId;
    if (!noteIdToVerify) return;

    setIsReverifying(true);
    setAnkiActionMessage(null);
    try {
      const res = await verifyNoteInAnki(noteIdToVerify, deck.trim(), settings.anki.url);
      if (res.success && res.verification) {
        setVerificationDetails(res.verification);
        setAnkiActionMessage(`✓ Re-verified Note #${noteIdToVerify}: Exists in deck '${res.verification.actualDeck}' with ${res.verification.cardsCount} card(s)!`);
      } else {
        setAnkiActionMessage(`✕ Verification failed: ${res.error || 'Note not found in Anki'}`);
      }
    } catch (e: any) {
      setAnkiActionMessage(`✕ Verification error: ${e?.message}`);
    } finally {
      setIsReverifying(false);
    }
  };

  const previewDisplayCard = useMemo(() => {
    return (
      generatedCard || {
        word: word.trim() || 'abandon',
        phonetic: overrides.phonetic || '/əˈbændən/',
        partOfSpeech: overrides.partOfSpeech || 'verb',
        meaningFa: overrides.meaningFa || 'رها کردن، ترک کردن',
        example: overrides.example || 'He abandoned his car on the highway.',
        translationFa: overrides.translationFa || 'او ماشین خود را در بزرگراه رها کرد.',
        mnemonic: overrides.mnemonic || 'A-BAND-ON: Imagine a band left behind on the stage.',
        cardType: cardType,
        spellingSentence: 'He ______ his car on the highway.',
        imageBase64: overrides.imageBase64,
        imageFileName: overrides.imageFileName,
        needsImage: !!overrides.imageBase64 || photoChoice === 'yes',
      }
    );
  }, [generatedCard, word, overrides, cardType, photoChoice]);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 min-w-0">
      {/* LEFT COLUMN: Creation Box & Pipeline Box */}
      <section className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0 min-w-0">
        {/* Box 1: Build Flashcard Form */}
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              {t('create.title')}
            </h2>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              {t('create.title')}
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
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                {t('create.wordLabel')}
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder={t('create.wordPlaceholder')}
                disabled={isGenerating || testingAnkiOnly}
                className={`w-full p-2.5 text-sm font-medium rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-[#18181B] border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                }`}
                required
              />
            </div>

            {/* Card Type Selector [ Normal | Spelling ] */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                {t('create.cardTypeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCardType('normal')}
                  disabled={isGenerating || testingAnkiOnly}
                  className={`py-2 px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    cardType === 'normal'
                      ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                      : isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span>{t('common.normal')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('spelling')}
                  disabled={isGenerating || testingAnkiOnly}
                  className={`py-2 px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    cardType === 'spelling'
                      ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                      : isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span>{t('common.spelling')}</span>
                </button>
              </div>
            </div>

            {/* Photo Option: [ Yes ] [ No ] */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                <span>{t('create.photoLabel')}</span>
                <span className="text-[11px] opacity-75 font-normal">{photoChoice === 'yes' ? t('create.photoYes') : t('create.photoNo')}</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoChoice('yes')}
                  disabled={isGenerating || testingAnkiOnly}
                  className={`py-2 px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    photoChoice === 'yes'
                      ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                      : isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t('common.yes')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoChoice('no')}
                  disabled={isGenerating || testingAnkiOnly}
                  className={`py-2 px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    photoChoice === 'no'
                      ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-xs'
                      : isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <span>{t('common.no')}</span>
                </button>
              </div>
            </div>

            {/* Deck Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  className={`block text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  }`}
                >
                  <span>{t('create.deckLabel')}</span>
                  {loadingDecks && <Loader2 className="w-3 h-3 animate-spin inline text-blue-500" />}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadDecks}
                    title={t('common.refresh')}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomDeck(!isCustomDeck)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {isCustomDeck ? t('create.selectDeck') : t('create.customDeckToggle')}
                  </button>
                </div>
              </div>

              {isCustomDeck ? (
                <input
                  type="text"
                  value={deck}
                  onChange={(e) => setDeck(e.target.value)}
                  placeholder={t('create.customDeckPlaceholder')}
                  disabled={isGenerating || testingAnkiOnly}
                  className={`w-full p-2.5 text-sm font-medium rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-[#18181B] border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
              ) : (
                <div className="relative flex gap-1">
                  <select
                    value={deck}
                    onChange={(e) => setDeck(e.target.value)}
                    disabled={isGenerating || testingAnkiOnly}
                    className={`w-full p-2.5 text-sm font-medium rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      isRTL ? 'pl-10 pr-3' : 'pr-10 pl-3'
                    } ${
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
                  <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-3 pointer-events-none text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    ▼
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Overrides Collapsible (Strict User Priority) */}
            <div
              className={`border rounded-lg p-3 ${
                isDark ? 'border-zinc-700 bg-zinc-900/40 text-zinc-100' : 'border-zinc-200 bg-zinc-50 text-zinc-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`w-full flex items-center justify-between text-xs font-semibold cursor-pointer ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span>⚙</span> {showAdvanced ? t('create.advancedToggleHide') : t('create.advancedToggleShow')}
                </span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className={`mt-3 pt-3 grid grid-cols-1 gap-2 text-xs border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                  <p className={`text-[11px] mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t('create.advancedDesc')}
                  </p>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{t('common.phonetic')}</label>
                    <input
                      type="text"
                      placeholder={t('create.ipaPlaceholder')}
                      value={overrides.phonetic}
                      onChange={(e) => setOverrides({ ...overrides, phonetic: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{t('common.partOfSpeech')}</label>
                    <input
                      type="text"
                      placeholder={t('create.posPlaceholder')}
                      value={overrides.partOfSpeech}
                      onChange={(e) => setOverrides({ ...overrides, partOfSpeech: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{t('common.meaning')}</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder={t('create.meaningPlaceholder')}
                      value={overrides.meaningFa}
                      onChange={(e) => setOverrides({ ...overrides, meaningFa: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{t('common.example')}</label>
                    <input
                      type="text"
                      placeholder={t('create.examplePlaceholder')}
                      value={overrides.example}
                      onChange={(e) => setOverrides({ ...overrides, example: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{t('common.translation')}</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder={t('create.translationPlaceholder')}
                      value={overrides.translationFa}
                      onChange={(e) => setOverrides({ ...overrides, translationFa: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{t('common.mnemonic')}</label>
                    <input
                      type="text"
                      placeholder={t('create.mnemonicPlaceholder')}
                      value={overrides.mnemonic}
                      onChange={(e) => setOverrides({ ...overrides, mnemonic: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  {/* Manual Image Override */}
                  <div className="pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-700">
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <label className={`text-[11px] font-semibold flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t('create.imageSourceTitle')}</span>
                        {overrides.imageBase64 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ {t('common.selected')}
                          </span>
                        )}
                      </label>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLocalImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`px-2 py-1 text-xs font-semibold rounded border cursor-pointer flex items-center gap-1 transition-colors ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                              : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                          }`}
                          title={t('create.uploadLocalImage')}
                        >
                          <span className="text-xs">📁</span>
                          <span className="text-[11px]">{t('common.browse')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenInternetSearch}
                          className={`px-2 py-1 text-xs font-semibold rounded border cursor-pointer flex items-center gap-1 transition-colors ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                              : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                          }`}
                          title={t('create.searchInternet')}
                        >
                          <span className="text-xs">🌐</span>
                          <span className="text-[11px]">{t('common.search')}</span>
                        </button>
                      </div>
                    </div>

                    {overrides.imageBase64 ? (
                      <div
                        className={`p-2 border rounded-md flex items-center justify-between gap-2 mt-1 ${
                          isDark ? 'bg-zinc-850 border-zinc-700' : 'bg-white border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={
                              overrides.imageBase64.startsWith('data:')
                                ? overrides.imageBase64
                                : `data:image/jpeg;base64,${overrides.imageBase64}`
                            }
                            alt="Selected manual override"
                            className="w-12 h-12 object-cover rounded border border-zinc-300 dark:border-zinc-700 shrink-0"
                          />
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">
                              {overrides.imageFileName || 'custom_image.jpg'}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {t('create.cardCreatedSuccess')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveImageOverride}
                          className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-800 cursor-pointer shrink-0"
                        >
                          ✕ {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {t('create.photoDesc')}
                      </p>
                    )}

                    {showInternetPanel && (
                      <div
                        className={`mt-2 p-2.5 border rounded-md text-xs space-y-2 ${
                          isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[11px] flex items-center gap-1">
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                            <span>{t('create.searchInternet')}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowInternetPanel(false)}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        <p className="text-[10px] text-zinc-500">
                          {t('create.pasteImageUrl')}
                        </p>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Paste image URL (e.g. https://.../photo.jpg)"
                            value={internetUrlInput}
                            onChange={(e) => setInternetUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDownloadFromUrl()}
                            className={`flex-1 p-1.5 border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={handleDownloadFromUrl}
                            disabled={isDownloadingImage || !internetUrlInput.trim()}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs rounded cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            {isDownloadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            <span>{t('create.fetchUrl')}</span>
                          </button>
                        </div>

                        {imageDownloadError && (
                          <p className="text-[11px] text-rose-500 font-medium">{imageDownloadError}</p>
                        )}

                        {isSearchingOnline && (
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 py-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>{t('create.searching')}</span>
                          </div>
                        )}

                        {onlineSearchResults.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] text-zinc-500 block font-medium">
                              {t('create.searchOnline')}:
                            </span>
                            <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-0.5">
                              {onlineSearchResults.map((res, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleSelectOnlineResult(res.fullUrl || res.thumbUrl)}
                                  className={`group relative border rounded overflow-hidden aspect-square hover:ring-2 hover:ring-blue-500 cursor-pointer ${
                                    isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
                                  }`}
                                  title={res.title}
                                >
                                  <img src={res.thumbUrl} alt={res.title} className="w-full h-full object-cover" />
                                  <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                                    Select
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                  <XCircle className="w-4 h-4 shrink-0 text-rose-500" /> {t('create.stageError')} {failedStage || 'Execution'}
                </span>
                <p className="text-xs">{errorMessage}</p>
              </div>
            )}

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={isGenerating || testingAnkiOnly || !word.trim()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Standalone Test Card in Anki Button (No AI/TTS) */}
            <button
              type="button"
              onClick={handleRunAnkiTest}
              disabled={isGenerating || testingAnkiOnly}
              className={`w-full py-2 px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
              }`}
            >
              {testingAnkiOnly ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('create.testingCard')}</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('create.testCardBtn')}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Box 2: Execution Logs */}
        <div
          className={`flex-1 border rounded-lg p-4 sm:p-5 shadow-xs overflow-hidden min-w-0 ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between mb-3 pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {t('create.diagnosticPipelineTitle')}
            </h3>
            {createdNoteId && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isDark
                    ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> {t('create.noteIdLabel')} #{createdNoteId}
              </span>
            )}
          </div>

          {/* Test Anki Result Banner */}
          {testAnkiResult && (
            <div
              className={`p-2.5 mb-3 border rounded-lg text-xs font-medium ${
                testAnkiResult.success
                  ? isDark
                    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : isDark
                  ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="font-semibold uppercase mb-1">
                {testAnkiResult.success ? `✓ ${t('common.success')}` : `✕ ${t('common.failed')}`}
              </div>
              <div className="space-y-1">
                {testAnkiResult.steps.map((st, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span>{st.step}</span>
                    <span className={st.status === 'ok' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                      {st.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto space-y-2 font-mono text-xs pr-1">
            {DEFAULT_STEPS.map(({ step, name }) => {
              const matchedLog = executionLogs.find((l) => l.step === step);
              const isPassed = matchedLog && matchedLog.status === 'success';
              const isFailed = matchedLog && matchedLog.status === 'error';
              const isSkipped = matchedLog && matchedLog.status === 'skipped';
              const isRunning = isGenerating && activeStepNumber === step;

              let badgeBg = isDark ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-zinc-100 text-zinc-500 border border-zinc-200';
              let symbol = step.toString();
              let textStyle = isDark ? 'text-zinc-400' : 'text-zinc-500';

              if (isPassed) {
                badgeBg = isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold' : 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold';
                symbol = '✓';
                textStyle = isDark ? 'text-zinc-100 font-medium' : 'text-zinc-800 font-medium';
              } else if (isFailed) {
                badgeBg = isDark ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold' : 'bg-rose-100 text-rose-800 border border-rose-200 font-semibold';
                symbol = '✕';
                textStyle = 'text-rose-600 dark:text-rose-400 font-medium';
              } else if (isSkipped) {
                badgeBg = isDark ? 'bg-zinc-800/40 text-zinc-600 border border-zinc-800' : 'bg-zinc-50 text-zinc-400 border border-zinc-200';
                symbol = '-';
                textStyle = isDark ? 'text-zinc-500 line-through' : 'text-zinc-400 line-through';
              } else if (isRunning) {
                badgeBg = isDark ? 'bg-blue-950 text-blue-300 border border-blue-800 font-semibold animate-pulse' : 'bg-blue-100 text-blue-800 border border-blue-200 font-semibold animate-pulse';
                symbol = '⟳';
                textStyle = 'text-blue-600 dark:text-blue-400 font-medium animate-pulse';
              }

              return (
                <div
                  key={step}
                  className={`p-2 rounded-md border flex flex-col gap-0.5 ${
                    isFailed
                      ? isDark ? 'bg-rose-950/20 border-rose-900' : 'bg-rose-50/50 border-rose-200'
                      : isPassed
                      ? isDark ? 'bg-emerald-950/20 border-emerald-900/60' : 'bg-emerald-50/40 border-emerald-200/60'
                      : isRunning
                      ? isDark ? 'bg-blue-950/20 border-blue-900' : 'bg-blue-50/50 border-blue-200'
                      : isDark
                      ? 'bg-zinc-900/60 border-zinc-800'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${badgeBg}`}>
                        {symbol}
                      </span>
                      <span className={`text-xs ${textStyle}`}>
                        [{step}] {name}
                      </span>
                    </div>
                    {matchedLog?.status && (
                      <span className={`text-[10px] uppercase px-1.5 py-0.2 font-semibold rounded border ${
                        isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-zinc-200 bg-white text-zinc-700'
                      }`}>
                        {matchedLog.status}
                      </span>
                    )}
                  </div>
                  {matchedLog?.message && (
                    <p className={`text-[11px] font-sans pl-7 font-normal break-words ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {matchedLog.message}
                    </p>
                  )}
                  {matchedLog?.details && (
                    <p className={`text-[10px] font-mono pl-7 break-words ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {matchedLog.details}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real Card & Note ID confirmation & Verification Panel */}
          {createdNoteId && (
            <div className={`mt-3 pt-2 border-t space-y-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              {/* Verification Checklist */}
              <div
                className={`p-3 border rounded-lg space-y-1.5 text-xs ${
                  isDark
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-zinc-100'
                    : 'bg-emerald-50/70 border-emerald-200 text-zinc-800'
                }`}
              >
                <div className={`flex items-center justify-between font-semibold uppercase text-xs pb-1 border-b ${isDark ? 'border-emerald-800' : 'border-emerald-200'}`}>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('create.cardCreatedSuccess')}</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-200 text-emerald-900'}`}>
                    {t('common.ready')}
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span>
                    <span>{t('create.noteIdLabel')} #{createdNoteId}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span>
                    <span>{t('common.deck')}: <code className={`font-mono px-1 rounded ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>{verificationDetails?.actualDeck || deck}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span>
                    <span>{t('create.cardIdsLabel')} <code className={`font-mono px-1 rounded ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>{createdCardIds.map((id) => `#${id}`).join(', ') || `#${createdNoteId}`}</code></span>
                  </div>
                </div>

                {/* Open in Anki & Re-verify Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleOpenInAnki}
                    disabled={isOpeningInAnki}
                    className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    {isOpeningInAnki ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    <span>{t('create.openInAnkiBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReverifyInAnki}
                    disabled={isReverifying}
                    className={`py-1.5 px-2.5 font-medium text-xs border rounded-md flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                    }`}
                    title={t('create.reverifyBtn')}
                  >
                    {isReverifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>{t('create.reverifyBtn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDiagnosticsDetail(!showDiagnosticsDetail)}
                    className={`py-1.5 px-2.5 font-medium text-xs border rounded-md flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                    }`}
                    title={t('create.showLogs')}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showDiagnosticsDetail ? t('create.hideLogs') : t('create.showLogs')}</span>
                  </button>
                </div>

                {/* Anki Action feedback */}
                {ankiActionMessage && (
                  <div className={`p-1.5 rounded text-[10px] font-mono ${isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-200' : 'bg-white border border-zinc-200 text-zinc-800'}`}>
                    {ankiActionMessage}
                  </div>
                )}
              </div>

              {/* Collapsible Card Diagnostics Report */}
              {showDiagnosticsDetail && verificationDetails && (
                <div className={`p-3 text-xs font-mono space-y-2 border rounded-lg ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className={`font-semibold uppercase text-[11px] pb-1 flex justify-between border-b ${isDark ? 'border-zinc-700 text-zinc-200' : 'border-zinc-200 text-zinc-800'}`}>
                    <span>Card Diagnostics Data</span>
                    <span className="text-[10px] opacity-75">nid:{verificationDetails.noteId}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div>
                      <span className="text-zinc-500 font-medium block">Note ID:</span>
                      <span className="font-semibold">#{verificationDetails.noteId}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium block">Card ID(s):</span>
                      <span className="font-semibold">{verificationDetails.cardIds.map((id) => `#${id}`).join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium block">Deck:</span>
                      <span className="font-semibold">{verificationDetails.actualDeck}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium block">Model:</span>
                      <span className="font-semibold">{verificationDetails.modelName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium block">Card Count:</span>
                      <span className="font-semibold">{verificationDetails.cardsCount}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-medium block">Verification:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Passed ✓</span>
                    </div>
                  </div>

                  {/* Populated Fields preview */}
                  <div className="mt-2 pt-1 border-t border-zinc-300 dark:border-zinc-700">
                    <span className="text-zinc-500 font-medium text-[10px] uppercase block mb-1">Fields in Anki Note:</span>
                    <div className={`max-h-[140px] overflow-y-auto space-y-1 p-2 border rounded text-[10px] ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                      {Object.entries(verificationDetails.fields).map(([fieldName, fieldVal]) => (
                        <div key={fieldName} className="flex gap-2">
                          <span className="font-semibold min-w-[80px] text-zinc-500">{fieldName}:</span>
                          <span className="truncate">{fieldVal || '<empty>'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Audio playback verify buttons */}
          {generatedCard && (generatedCard.wordAudioBase64 || generatedCard.exampleAudioBase64) && (
            <div className={`mt-3 pt-2 border-t flex gap-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              {generatedCard.wordAudioBase64 && (
                <div className="flex-1">
                  <AudioPlayer
                    base64Wav={generatedCard.wordAudioBase64}
                    label="Word Audio"
                    size="sm"
                    className="w-full justify-center"
                  />
                </div>
              )}
              {generatedCard.exampleAudioBase64 && (
                <div className="flex-1">
                  <AudioPlayer
                    base64Wav={generatedCard.exampleAudioBase64}
                    label="Example Audio"
                    size="sm"
                    className="w-full justify-center"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Live Card Preview Frame */}
      <section className="flex-1 flex flex-col min-h-[560px] min-w-0">
        <div
          className={`flex-1 border rounded-lg p-4 sm:p-6 relative overflow-hidden shadow-xs flex flex-col ${
            isDark ? 'bg-[#1F1F23] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
            <CardPreview
              cardData={previewDisplayCard}
              themeId={settings.theme}
              emptyWordPlaceholder={word || 'abandon'}
              appTheme={isDark ? 'anki-dark' : 'anki-light'}
            />
        </div>
      </section>
    </div>
  );
};
