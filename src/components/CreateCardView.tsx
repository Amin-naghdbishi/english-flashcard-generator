import React, { useState, useEffect } from 'react';
import { CardData, ManualOverrides, AppSettings, StepLog, AnkiCardVerificationDetails, CardType } from '../types';
import { CardPreview } from './CardPreview';
import { AudioPlayer } from './AudioPlayer';
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
  Search,
  CheckSquare,
} from 'lucide-react';

interface CreateCardViewProps {
  settings: AppSettings;
  onCardCreated?: (cardData: CardData, noteId?: number) => void;
}

const DEFAULT_STEPS: Array<{ step: number; name: string }> = [
  { step: 1, name: 'Word received' },
  { step: 2, name: 'Deck validated' },
  { step: 3, name: 'AI Provider Connected' },
  { step: 4, name: 'AI data generated' },
  { step: 5, name: 'TTS Service Reachable' },
  { step: 6, name: 'Audio Generated' },
  { step: 7, name: 'AnkiConnect Connected' },
  { step: 8, name: 'Deck Ensured' },
  { step: 9, name: 'Note Type Configured' },
  { step: 10, name: 'Fields Prepared' },
  { step: 11, name: 'Media Uploaded' },
  { step: 12, name: 'Note Created' },
  { step: 13, name: 'Card Verified' },
];

export const CreateCardView: React.FC<CreateCardViewProps> = ({ settings, onCardCreated }) => {
  const [word, setWord] = useState('abandon');
  const [deck, setDeck] = useState(settings.anki.defaultDeck || 'English::B1');
  const [cardType, setCardType] = useState<CardType>(settings.defaultCard?.cardType || 'normal');
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
        manualOverrides: overrides,
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
      const res = await runAnkiPipelineTest(deck.trim(), settings.theme, settings.anki.url);
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
        setAnkiActionMessage(`Anki Browser command sent. You can also search in Anki Browse: "${query}"`);
      }
    } catch (e: any) {
      setAnkiActionMessage(`Could not open Anki browser automatically: ${e?.message}. Search query: "nid:${noteIdToOpen}"`);
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
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6">
      {/* LEFT COLUMN: Bento Creation Box & Pipeline Box */}
      <section className="w-full lg:w-[420px] flex flex-col gap-6 shrink-0">
        {/* Bento Box 1: Build Flashcard Form (#FFD93D) */}
        <div className="bg-[#FFD93D] p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Build Flashcard
            </h2>
            <span className="text-[10px] font-black uppercase bg-black text-[#FFD93D] px-2 py-0.5 border border-black">
              Single Mode
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
              <label className="block text-xs font-black uppercase mb-1 tracking-wider text-black">
                Word (واژه انگلیسی)
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. abandon, accurate..."
                disabled={isGenerating || testingAnkiOnly}
                className="w-full border-4 border-black p-3 bg-white text-black text-lg sm:text-xl font-bold rounded-none focus:outline-none placeholder:text-zinc-400"
                required
              />
            </div>

            {/* Card Type Selector [ Normal | Spelling ] */}
            <div>
              <label className="block text-xs font-black uppercase mb-1 tracking-wider text-black">
                Card Type (نوع کارت)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCardType('normal')}
                  disabled={isGenerating || testingAnkiOnly}
                  className={`py-2 px-3 border-2 border-black font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] ${
                    cardType === 'normal'
                      ? 'bg-[#4ADE80] text-black ring-2 ring-black'
                      : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <span>Normal Vocab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('spelling')}
                  disabled={isGenerating || testingAnkiOnly}
                  className={`py-2 px-3 border-2 border-black font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] ${
                    cardType === 'spelling'
                      ? 'bg-[#C084FC] text-black ring-2 ring-black'
                      : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <span>Spelling Exercise</span>
                </button>
              </div>
            </div>

            {/* Deck Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black uppercase tracking-wider text-black flex items-center gap-1">
                  <span>Deck (دسته در انکی)</span>
                  {loadingDecks && <Loader2 className="w-3 h-3 animate-spin inline" />}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadDecks}
                    title="Refresh Decks from Anki"
                    className="text-[11px] text-black hover:opacity-70 font-bold flex items-center gap-0.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomDeck(!isCustomDeck)}
                    className="text-[11px] text-black hover:underline font-bold"
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
                  className="w-full border-4 border-black p-3 bg-white text-black text-base font-bold rounded-none focus:outline-none"
                />
              ) : (
                <div className="relative flex gap-1">
                  <select
                    value={deck}
                    onChange={(e) => setDeck(e.target.value)}
                    disabled={isGenerating || testingAnkiOnly}
                    className="w-full border-4 border-black p-3 bg-white text-black text-base font-bold rounded-none appearance-none focus:outline-none cursor-pointer pr-10"
                  >
                    {availableDecks.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none text-black font-black text-sm">
                    ▼
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Overrides Collapsible (Strict User Priority) */}
            <div className="border-4 border-black bg-white p-3 text-black">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-xs font-black text-black hover:opacity-80 uppercase tracking-wider cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span>⚙</span> Advanced Overrides (اختیاری)
                </span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-3 pt-3 border-t-2 border-black grid grid-cols-1 gap-2 text-xs">
                  <p className="text-[10px] text-zinc-600 font-bold mb-1">
                    * Any manual entry here overrides AI and is permanently preserved.
                  </p>

                  <div>
                    <label className="text-[10px] font-black uppercase block mb-0.5">IPA Phonetic</label>
                    <input
                      type="text"
                      placeholder="e.g. /əˈbændən/"
                      value={overrides.phonetic}
                      onChange={(e) => setOverrides({ ...overrides, phonetic: e.target.value })}
                      className="w-full bg-[#f8fafc] text-black p-2 border-2 border-black text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase block mb-0.5">Part of Speech</label>
                    <input
                      type="text"
                      placeholder="e.g. verb, noun"
                      value={overrides.partOfSpeech}
                      onChange={(e) => setOverrides({ ...overrides, partOfSpeech: e.target.value })}
                      className="w-full bg-[#f8fafc] text-black p-2 border-2 border-black text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase block mb-0.5">Persian Meaning (معنی فارسی)</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="رها کردن، ترک کردن"
                      value={overrides.meaningFa}
                      onChange={(e) => setOverrides({ ...overrides, meaningFa: e.target.value })}
                      className="w-full bg-[#f8fafc] text-black p-2 border-2 border-black text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase block mb-0.5">Example Sentence (جمله نمونه)</label>
                    <input
                      type="text"
                      placeholder="He abandoned his car on the road."
                      value={overrides.example}
                      onChange={(e) => setOverrides({ ...overrides, example: e.target.value })}
                      className="w-full bg-[#f8fafc] text-black p-2 border-2 border-black text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase block mb-0.5">Example Translation (ترجمه مثال)</label>
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="او ماشین خود را در جاده رها کرد."
                      value={overrides.translationFa}
                      onChange={(e) => setOverrides({ ...overrides, translationFa: e.target.value })}
                      className="w-full bg-[#f8fafc] text-black p-2 border-2 border-black text-xs font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase block mb-0.5">Memory Aid (کدگذاری و یادافزا)</label>
                    <input
                      type="text"
                      placeholder="A-BAND-ON: Imagine a band left on the stage."
                      value={overrides.mnemonic}
                      onChange={(e) => setOverrides({ ...overrides, mnemonic: e.target.value })}
                      className="w-full bg-[#f8fafc] text-black p-2 border-2 border-black text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Duplicate Notice */}
            {duplicateWarning && duplicateWarning.isDup && (
              <div className="p-3 bg-black text-[#FFD93D] border-4 border-black text-xs flex flex-col gap-2 shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center gap-1.5 font-black">
                  <AlertTriangle className="w-4 h-4 text-[#FFD93D] shrink-0" />
                  <span>Word already exists in "{deck}"!</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="flex-1 px-3 py-1 bg-white text-black font-bold border-2 border-black hover:bg-zinc-200 text-xs"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreate(true)}
                    className="flex-1 px-3 py-1 bg-[#4ADE80] text-black font-black border-2 border-black hover:bg-[#3ecb73] text-xs uppercase"
                  >
                    Add Anyway
                  </button>
                </div>
              </div>
            )}

            {/* Error Notice */}
            {errorMessage && (
              <div className="p-3 bg-red-600 text-white border-4 border-black text-xs flex flex-col gap-1 shadow-[2px_2px_0px_#000000]">
                <span className="font-black uppercase tracking-wider flex items-center gap-1">
                  <XCircle className="w-4 h-4 shrink-0" /> Error in Stage: {failedStage || 'Execution'}
                </span>
                <p className="font-bold">{errorMessage}</p>
              </div>
            )}

            {/* Action Submit Button (#FF4B4B) */}
            <button
              type="submit"
              disabled={isGenerating || testingAnkiOnly || !word.trim()}
              className={`w-full bg-[#FF4B4B] text-white font-black py-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xl uppercase tracking-wider hover:translate-y-0.5 active:translate-y-1 transition-transform flex items-center justify-center gap-2 select-none ${
                isGenerating ? 'opacity-80 cursor-wait' : 'cursor-pointer'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>GENERATING & SYNCING...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>CREATE CARD</span>
                </>
              )}
            </button>

            {/* Standalone Test Card in Anki Button (No AI/TTS) */}
            <button
              type="button"
              onClick={handleRunAnkiTest}
              disabled={isGenerating || testingAnkiOnly}
              className="w-full bg-white hover:bg-zinc-100 text-black font-black py-2 px-3 border-2 border-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              {testingAnkiOnly ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Anki Direct Connection...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#FF4B4B]" />
                  <span>Test Anki Card Creation (No AI/TTS)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bento Box 2: 13-Stage Detailed Execution Logs (bg-white text-black) */}
        <div className="flex-1 bg-white border-4 border-black p-4 sm:p-5 text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
            <h3 className="text-sm font-black uppercase flex items-center gap-1.5">
              <span>Execution Pipeline</span>
            </h3>
            {createdNoteId && (
              <span className="text-[10px] bg-[#4ADE80] text-black font-black px-2 py-0.5 border border-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Note #{createdNoteId}
              </span>
            )}
          </div>

          {/* Test Anki Result Banner */}
          {testAnkiResult && (
            <div className={`p-2.5 mb-3 border-2 border-black text-xs font-bold ${
              testAnkiResult.success ? 'bg-[#bbf7d0] text-black' : 'bg-[#fecaca] text-black'
            }`}>
              <div className="font-black uppercase mb-1">
                {testAnkiResult.success ? '✓ Anki Direct Test Passed!' : '✕ Anki Direct Test Failed'}
              </div>
              <div className="space-y-1">
                {testAnkiResult.steps.map((st, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span>{st.step}</span>
                    <span className={st.status === 'ok' ? 'text-green-800' : 'text-red-800'}>
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

              let badgeBg = 'bg-zinc-200 text-zinc-600';
              let symbol = step.toString();
              let textStyle = 'text-zinc-500';

              if (isPassed) {
                badgeBg = 'bg-[#4ADE80] text-black font-black';
                symbol = '✓';
                textStyle = 'text-black font-bold';
              } else if (isFailed) {
                badgeBg = 'bg-[#FF4B4B] text-white font-black';
                symbol = '✕';
                textStyle = 'text-red-700 font-bold';
              } else if (isSkipped) {
                badgeBg = 'bg-zinc-300 text-zinc-700';
                symbol = '-';
                textStyle = 'text-zinc-400 line-through';
              } else if (isRunning) {
                badgeBg = 'bg-[#38bdf8] text-black font-black animate-pulse';
                symbol = '⟳';
                textStyle = 'text-blue-700 font-bold animate-pulse';
              }

              return (
                <div
                  key={step}
                  className={`p-2 border border-black flex flex-col gap-0.5 ${
                    isFailed ? 'bg-red-50' : isPassed ? 'bg-emerald-50/50' : isRunning ? 'bg-sky-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 flex items-center justify-center text-[10px] border border-black ${badgeBg}`}>
                        {symbol}
                      </span>
                      <span className={`text-xs ${textStyle}`}>
                        [{step}] {name}
                      </span>
                    </div>
                    {matchedLog?.status && (
                      <span className="text-[10px] uppercase font-black px-1 border border-black bg-white">
                        {matchedLog.status}
                      </span>
                    )}
                  </div>
                  {matchedLog?.message && (
                    <p className="text-[10px] text-zinc-600 font-sans pl-7 font-normal break-words">
                      {matchedLog.message}
                    </p>
                  )}
                  {matchedLog?.details && (
                    <p className="text-[9px] text-zinc-500 font-mono pl-7 break-words">
                      {matchedLog.details}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real Card & Note ID confirmation & Verification Panel */}
          {createdNoteId && (
            <div className="mt-3 pt-2 border-t-2 border-black space-y-2">
              {/* Verification Checklist */}
              <div className="bg-[#4ADE80]/20 p-3 border-2 border-black space-y-1.5 text-xs text-black">
                <div className="flex items-center justify-between font-black uppercase text-xs border-b border-black pb-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Anki Verified Status</span>
                  </span>
                  <span className="bg-[#4ADE80] px-1.5 py-0.5 border border-black text-[10px] font-black">
                    VERIFIED IN ANKI
                  </span>
                </div>

                <div className="space-y-1 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <span>✓</span>
                    <span>Note created in Anki (ID: #{createdNoteId})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <span>✓</span>
                    <span>Note verified in model: <code className="font-mono bg-white px-1 border border-black/30">{verificationDetails?.modelName || 'AI Vocabulary'}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <span>✓</span>
                    <span>Deck verified: <code className="font-mono bg-white px-1 border border-black/30">{verificationDetails?.actualDeck || deck}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <span>✓</span>
                    <span>Card(s) verified in Anki: <code className="font-mono bg-white px-1 border border-black/30">{createdCardIds.map((id) => `#${id}`).join(', ') || `#${createdNoteId}`}</code></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <span>✓</span>
                    <span>Card exists and active in Anki (Queue: {verificationDetails?.cardsInfo?.[0]?.queueLabel || 'New (0)'})</span>
                  </div>
                </div>

                {/* Open in Anki & Re-verify Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleOpenInAnki}
                    disabled={isOpeningInAnki}
                    className="flex-1 py-1.5 px-2 bg-black hover:bg-zinc-800 text-white font-black text-[11px] uppercase border-2 border-black flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000000] cursor-pointer"
                  >
                    {isOpeningInAnki ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4ADE80]" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 text-[#FFD93D]" />
                    )}
                    <span>Open in Anki</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReverifyInAnki}
                    disabled={isReverifying}
                    className="py-1.5 px-2 bg-white hover:bg-zinc-100 text-black font-black text-[11px] uppercase border-2 border-black flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000000] cursor-pointer"
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
                    className="py-1.5 px-2 bg-white hover:bg-zinc-100 text-black font-black text-[11px] uppercase border-2 border-black flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000000] cursor-pointer"
                    title="View Raw Anki Diagnostics"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showDiagnosticsDetail ? 'Hide' : 'Details'}</span>
                  </button>
                </div>

                {/* Anki Action feedback */}
                {ankiActionMessage && (
                  <div className="p-1.5 bg-white border border-black text-[10px] font-mono text-black">
                    {ankiActionMessage}
                  </div>
                )}
              </div>

              {/* Collapsible Card Diagnostics Report */}
              {showDiagnosticsDetail && verificationDetails && (
                <div className="p-3 bg-zinc-50 border-2 border-black text-xs font-mono space-y-2">
                  <div className="font-black uppercase text-[11px] text-black border-b border-black pb-1 flex justify-between">
                    <span>Card Diagnostics Data</span>
                    <span className="text-[10px] text-zinc-600">nid:{verificationDetails.noteId}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div>
                      <span className="text-zinc-500 font-bold block">Note ID:</span>
                      <span className="font-bold text-black">#{verificationDetails.noteId}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block">Card ID(s):</span>
                      <span className="font-bold text-black">{verificationDetails.cardIds.map((id) => `#${id}`).join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block">Deck:</span>
                      <span className="font-bold text-black">{verificationDetails.actualDeck}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block">Model:</span>
                      <span className="font-bold text-black">{verificationDetails.modelName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block">Card Count:</span>
                      <span className="font-bold text-black">{verificationDetails.cardsCount}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block">Card Queue:</span>
                      <span className="font-bold text-black">{verificationDetails.cardsInfo[0]?.queueLabel || '0 (New)'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block">Card Type:</span>
                      <span className="font-bold text-black">{verificationDetails.cardsInfo[0]?.typeLabel || '0 (New)'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold block">Verification:</span>
                      <span className="font-bold text-emerald-700 font-black">Passed ✓</span>
                    </div>
                  </div>

                  {/* Populated Fields preview */}
                  <div className="mt-2 pt-1 border-t border-zinc-300">
                    <span className="text-zinc-500 font-bold text-[10px] uppercase block mb-1">Populated Fields in Note:</span>
                    <div className="max-h-[140px] overflow-y-auto space-y-1 bg-white p-2 border border-zinc-300 text-[10px]">
                      {Object.entries(verificationDetails.fields).map(([fieldName, fieldVal]) => (
                        <div key={fieldName} className="flex gap-2">
                          <span className="font-bold text-zinc-700 min-w-[80px]">{fieldName}:</span>
                          <span className="text-black truncate">{fieldVal || '<empty>'}</span>
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
            <div className="mt-3 pt-2 border-t-2 border-black flex gap-2">
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
      <section className="flex-1 flex flex-col min-h-[560px]">
        {/* Bento Stage Container (Warm Ivory #F5F2EB) */}
        <div className="flex-1 bg-[#F5F2EB] border-4 border-black p-4 sm:p-8 relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <div className="relative z-10 w-full flex-1 flex flex-col justify-center">
            <CardPreview
              cardData={generatedCard}
              themeId={settings.theme}
              emptyWordPlaceholder={word || 'abandon'}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
