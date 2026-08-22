import React, { useState, useEffect } from 'react';
import { CardData, ManualOverrides, AppSettings, StepLog, AnkiCardVerificationDetails, CardType, AppTheme } from '../types';
import { CardPreview } from './CardPreview';
import { AudioPlayer } from './AudioPlayer';
import { useAppTheme } from '../context/ThemeContext';
import {
  runFullPipeline,
  getAnkiDecks,
  checkDuplicate,
  runAnkiPipelineTest,
  openInAnki,
  verifyNoteInAnki,
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

export const CreateCardView: React.FC<CreateCardViewProps> = ({ settings, onCardCreated, appTheme: propTheme }) => {
  const themeContext = useAppTheme();
  const isDark = (propTheme || themeContext.appTheme) === 'anki-dark';

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
  });

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
              Build Flashcard
            </h2>
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
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}
              >
                Word (واژه انگلیسی)
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. abandon, accurate..."
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
                Card Type (نوع کارت)
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
                  <span>Normal Vocab</span>
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
                  <span>Spelling Challenge</span>
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
                <span>Photo (تصویر کارت)</span>
                <span className="text-[11px] opacity-75 font-normal">{photoChoice === 'yes' ? 'Include Image' : 'No Image'}</span>
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
                  <span>Yes</span>
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
                  <span>No</span>
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
                  <span>Deck (دسته در انکی)</span>
                  {loadingDecks && <Loader2 className="w-3 h-3 animate-spin inline text-blue-500" />}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadDecks}
                    title="Refresh Decks from Anki"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomDeck(!isCustomDeck)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {isCustomDeck ? 'List Decks' : '+ Custom Deck'}
                  </button>
                </div>
              </div>

              {isCustomDeck ? (
                <input
                  type="text"
                  value={deck}
                  onChange={(e) => setDeck(e.target.value)}
                  placeholder="e.g. English::Vocabulary"
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
                    className={`w-full p-2.5 text-sm font-medium rounded-md border appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer pr-10 ${
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
                  <div className={`absolute right-3 top-3 pointer-events-none text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
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
                  <span>⚙</span> Advanced Overrides (اختیاری)
                </span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className={`mt-3 pt-3 grid grid-cols-1 gap-2 text-xs border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                  <p className={`text-[11px] mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    * Manual values entered here override AI and are permanently stored in the note.
                  </p>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>IPA Phonetic</label>
                    <input
                      type="text"
                      placeholder="e.g. /əˈbændən/"
                      value={overrides.phonetic}
                      onChange={(e) => setOverrides({ ...overrides, phonetic: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Part of Speech</label>
                    <input
                      type="text"
                      placeholder="e.g. verb, noun"
                      value={overrides.partOfSpeech}
                      onChange={(e) => setOverrides({ ...overrides, partOfSpeech: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Persian Meaning (معنی فارسی)</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="رها کردن، ترک کردن"
                      value={overrides.meaningFa}
                      onChange={(e) => setOverrides({ ...overrides, meaningFa: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Example Sentence (جمله نمونه)</label>
                    <input
                      type="text"
                      placeholder="He abandoned his car on the road."
                      value={overrides.example}
                      onChange={(e) => setOverrides({ ...overrides, example: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Example Translation (ترجمه مثال)</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="او ماشین خود را در جاده رها کرد."
                      value={overrides.translationFa}
                      onChange={(e) => setOverrides({ ...overrides, translationFa: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Memory Aid (کدگذاری و یادافزا)</label>
                    <input
                      type="text"
                      placeholder="A-BAND-ON: Imagine a band left on the stage."
                      value={overrides.mnemonic}
                      onChange={(e) => setOverrides({ ...overrides, mnemonic: e.target.value })}
                      className={`w-full p-2 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
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
                  <span>Word already exists in "{deck}"!</span>
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
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreate(true)}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 text-xs cursor-pointer shadow-xs"
                  >
                    Add Anyway
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
                  <XCircle className="w-4 h-4 shrink-0 text-rose-500" /> Error in Stage: {failedStage || 'Execution'}
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
                  <span>Generating & Syncing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Flashcard</span>
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
                  <span>Testing Anki Connection...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-blue-500" />
                  <span>Test Anki Direct Creation</span>
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
              Execution Pipeline
            </h3>
            {createdNoteId && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isDark
                    ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> Note #{createdNoteId}
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
                {testAnkiResult.success ? '✓ Anki Direct Test Passed' : '✕ Anki Direct Test Failed'}
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
                    <span>Anki Verified Status</span>
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-200 text-emerald-900'}`}>
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span>
                    <span>Note created in Anki (ID: #{createdNoteId})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span>
                    <span>Model: <code className={`font-mono px-1 rounded ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>{verificationDetails?.modelName || 'AI Vocabulary'}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span>
                    <span>Deck: <code className={`font-mono px-1 rounded ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>{verificationDetails?.actualDeck || deck}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <span>✓</span>
                    <span>Cards: <code className={`font-mono px-1 rounded ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>{createdCardIds.map((id) => `#${id}`).join(', ') || `#${createdNoteId}`}</code></span>
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
                    <span>Open in Anki</span>
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
                    title="Query AnkiConnect again to re-verify"
                  >
                    {isReverifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Re-Verify</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDiagnosticsDetail(!showDiagnosticsDetail)}
                    className={`py-1.5 px-2.5 font-medium text-xs border rounded-md flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-700'
                        : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
                    }`}
                    title="View Raw Anki Diagnostics"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showDiagnosticsDetail ? 'Hide' : 'Details'}</span>
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
          <div className="relative z-10 w-full flex-1 flex flex-col justify-center min-w-0">
            <CardPreview
              cardData={generatedCard}
              themeId={settings.theme}
              emptyWordPlaceholder={word || 'abandon'}
              appTheme={isDark ? 'anki-dark' : 'anki-light'}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
