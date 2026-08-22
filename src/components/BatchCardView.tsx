import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, BatchItem, CardData, BatchFieldConfig, ManualOverrides } from '../types';
import {
  runFullPipeline,
  getAnkiDecks,
  checkDuplicate,
  checkOllama,
  checkGemini,
  checkTTS,
  checkOnlineTTS,
  checkAnki,
  openInAnki,
} from '../services/api';
import { CardPreview } from './CardPreview';
import {
  FileText,
  Upload,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface BatchCardViewProps {
  settings: AppSettings;
}

const DEFAULT_SAMPLE_TEXT = `apple
bank
photo
abandon
accurate
ancient`;

const DEFAULT_STRUCTURED_SAMPLE = `--
Word=apple
Deck=English::B1
Phonetic=/ˈæpəl/
Part of Speech=noun
Persian Meaning=سیب
Example Sentence=I ate a sweet apple for breakfast.
ExampleTranslation=من برای صبحانه یک سیب شیرین خوردم.
Memory Aid=Think of a crisp red apple.
--

--
Word=bank
Deck=English::B1
Phonetic=/bæŋk/
Part of Speech=noun
Persian Meaning=بانک
Example Sentence=She went to the bank to deposit some cash.
ExampleTranslation=او برای واریز مقداری پول نقد به بانک رفت.
Memory Aid=Imagine the building where money is kept safely.
--`;

/**
 * Parses either Format A (simple list) or Format B (structured cards with -- separator).
 */
function parseBatchInput(
  rawText: string,
  defaultDeck: string
): Array<{ word: string; deck: string; parsedFields: Partial<CardData> }> {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // Check if Format B: contains '--' separator
  if (trimmed.includes('--')) {
    const blocks = trimmed
      .split(/(?:^|\n)--(?:\n|$)/)
      .map((b) => b.trim())
      .filter(Boolean);

    const results: Array<{ word: string; deck: string; parsedFields: Partial<CardData> }> = [];

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const fields: Record<string, string> = {};

      for (const line of lines) {
        const sepIndex = line.indexOf('=') !== -1 ? line.indexOf('=') : line.indexOf(':');
        if (sepIndex !== -1) {
          const rawKey = line.slice(0, sepIndex).trim().toLowerCase().replace(/[\s_-]/g, '');
          const val = line.slice(sepIndex + 1).trim();
          fields[rawKey] = val;
        } else if (!fields['word'] && line) {
          fields['word'] = line.trim();
        }
      }

      const word = fields['word'] || '';
      if (!word) continue;

      const deck = fields['deck'] || defaultDeck;
      const parsedFields: Partial<CardData> = {
        word,
        phonetic: fields['phonetic'] || fields['ipa'] || undefined,
        partOfSpeech: fields['partofspeech'] || fields['pos'] || undefined,
        meaningFa: fields['persianmeaning'] || fields['meaning'] || fields['meaningfa'] || undefined,
        example: fields['examplesentence'] || fields['example'] || fields['sentence'] || undefined,
        translationFa: fields['exampletranslation'] || fields['translation'] || fields['translationfa'] || undefined,
        mnemonic: fields['memoryaid'] || fields['mnemonic'] || undefined,
      };

      results.push({ word, deck, parsedFields });
    }

    if (results.length > 0) return results;
  }

  // Format A: Simple word list (one word per line)
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const uniqueWords = Array.from(new Set(lines));

  return uniqueWords.map((w) => ({
    word: w,
    deck: defaultDeck,
    parsedFields: { word: w },
  }));
}

export const BatchCardView: React.FC<BatchCardViewProps> = ({ settings }) => {
  const [inputText, setInputText] = useState<string>(DEFAULT_SAMPLE_TEXT);
  const [fileName, setFileName] = useState<string>('sample_words.txt');
  const [deck, setDeck] = useState<string>(settings.anki.defaultDeck || 'English::B1');
  const [availableDecks, setAvailableDecks] = useState<string[]>(['English::B1', 'English::B2', 'IELTS']);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState<boolean>(false);

  // User-Controlled Fields Config (Requirement 8)
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

  // Update Items whenever input text or deck changes
  useEffect(() => {
    const parsed = parseBatchInput(inputText, deck);
    setItems(
      parsed.map((p, idx) => ({
        id: `${p.word}_${idx}`,
        word: p.word,
        deck: p.deck || deck,
        status: 'idle',
        parsedFields: p.parsedFields,
      }))
    );
  }, [inputText, deck]);

  // Handle TXT File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      setInputText(text);
    };
    reader.readAsText(file);
  };

  // Run Preflight Check for selected AI, TTS, and Anki
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

  // Process a single item respecting user-controlled field configuration
  const processItem = async (item: BatchItem): Promise<BatchItem> => {
    const targetDeck = item.deck || deck;

    // 1. Duplicate Check
    try {
      const dup = await checkDuplicate(targetDeck, item.word, settings.anki.url);
      if (dup.isDuplicate) {
        return {
          ...item,
          status: 'duplicate',
          isDuplicate: true,
          error: 'Word already exists in target deck',
        };
      }
    } catch {
      // Proceed if duplicate check network error
    }

    // Build manual overrides from parsedFields based on user field config
    const overrides: ManualOverrides = {};
    if (item.parsedFields) {
      if (fieldConfig.phonetic && item.parsedFields.phonetic) overrides.phonetic = item.parsedFields.phonetic;
      if (fieldConfig.partOfSpeech && item.parsedFields.partOfSpeech) overrides.partOfSpeech = item.parsedFields.partOfSpeech;
      if (fieldConfig.meaningFa && item.parsedFields.meaningFa) overrides.meaningFa = item.parsedFields.meaningFa;
      if (fieldConfig.example && item.parsedFields.example) overrides.example = item.parsedFields.example;
      if (fieldConfig.translationFa && item.parsedFields.translationFa) overrides.translationFa = item.parsedFields.translationFa;
      if (fieldConfig.mnemonic && item.parsedFields.mnemonic) overrides.mnemonic = item.parsedFields.mnemonic;
    }

    // 2. Run Pipeline
    const res = await runFullPipeline({
      word: item.word,
      deck: targetDeck,
      manualOverrides: overrides,
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

  // Build All Cards
  const handleBuildAll = async () => {
    if (items.length === 0 || isProcessing) return;

    const preflightPassed = await runPreflightCheck();
    if (!preflightPassed) return;

    setIsProcessing(true);

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      if (current.status === 'success') continue;

      // Mark generating
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i ? { ...it, status: 'generating_ai' } : it
        )
      );

      try {
        const resultItem = await processItem(current);
        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? resultItem : it))
        );

        if (resultItem.cardData) {
          setPreviewCard(resultItem.cardData);
        }
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: 'error', error: err.message || 'Error' }
              : it
          )
        );
      }
    }

    setIsProcessing(false);
  };

  // Retry single item
  const handleRetrySingle = async (index: number) => {
    const item = items[index];
    if (!item || isProcessing) return;

    setItems((prev) =>
      prev.map((it, idx) =>
        idx === index ? { ...it, status: 'generating_ai', error: undefined } : it
      )
    );

    try {
      const targetDeck = item.deck || deck;
      const overrides: ManualOverrides = {};
      if (item.parsedFields) {
        if (fieldConfig.phonetic && item.parsedFields.phonetic) overrides.phonetic = item.parsedFields.phonetic;
        if (fieldConfig.partOfSpeech && item.parsedFields.partOfSpeech) overrides.partOfSpeech = item.parsedFields.partOfSpeech;
        if (fieldConfig.meaningFa && item.parsedFields.meaningFa) overrides.meaningFa = item.parsedFields.meaningFa;
        if (fieldConfig.example && item.parsedFields.example) overrides.example = item.parsedFields.example;
        if (fieldConfig.translationFa && item.parsedFields.translationFa) overrides.translationFa = item.parsedFields.translationFa;
        if (fieldConfig.mnemonic && item.parsedFields.mnemonic) overrides.mnemonic = item.parsedFields.mnemonic;
      }

      const res = await runFullPipeline({
        word: item.word,
        deck: targetDeck,
        manualOverrides: overrides,
        createInAnki: true,
      });

      if (res.success && res.cardData) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  status: 'success',
                  cardData: res.cardData,
                  noteId: res.noteId,
                  error: undefined,
                }
              : it
          )
        );
        setPreviewCard(res.cardData);
      } else {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === index ? { ...it, status: 'error', error: res.error } : it
          )
        );
      }
    } catch (err: any) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index ? { ...it, status: 'error', error: err.message } : it
        )
      );
    }
  };

  const completedCount = items.filter((it) => it.status === 'success').length;
  const errorCount = items.filter((it) => it.status === 'error').length;
  const duplicateCount = items.filter((it) => it.status === 'duplicate').length;
  const inProgressItem = items.find((it) => it.status === 'generating_ai');

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6">
      {/* LEFT COLUMN: TXT Batch Input & Clean Queue */}
      <section className="w-full lg:w-[460px] flex flex-col gap-6 shrink-0">
        {/* Batch File Box (#4ADE80) */}
        <div className="bg-[#4ADE80] p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black">
          <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight flex items-center gap-2">
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
                className="px-3 py-1.5 bg-[#FFD93D] hover:bg-[#ffe066] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer uppercase active:translate-y-0.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload TXT</span>
              </button>
            </div>
          </div>

          {/* TXT Format Switcher & Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="bg-white p-2.5 border-4 border-black flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-black shrink-0" />
                <span className="text-xs font-black text-black truncate max-w-[120px]">
                  {fileName}
                </span>
              </div>
              <span className="text-xs font-black bg-black text-[#4ADE80] px-2 py-0.5 border border-black">
                {items.length} words
              </span>
            </div>

            <div className="bg-white p-2.5 border-4 border-black flex items-center justify-between gap-1">
              <label className="text-xs font-black text-black uppercase">Deck:</label>
              <select
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
                disabled={isProcessing}
                className="flex-1 bg-white text-black text-xs font-bold px-1 py-0.5 focus:outline-none cursor-pointer"
              >
                {availableDecks.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Format Presets */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setInputText(DEFAULT_SAMPLE_TEXT)}
              className="flex-1 py-1 px-2 bg-white hover:bg-zinc-100 text-black text-[11px] font-black uppercase border-2 border-black cursor-pointer"
            >
              Format A (Simple List)
            </button>
            <button
              type="button"
              onClick={() => setInputText(DEFAULT_STRUCTURED_SAMPLE)}
              className="flex-1 py-1 px-2 bg-white hover:bg-zinc-100 text-black text-[11px] font-black uppercase border-2 border-black cursor-pointer"
            >
              Format B (Structured --)
            </button>
          </div>

          {/* TXT Input Area */}
          <div className="mb-3">
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-white text-black text-xs font-bold font-mono p-3 border-4 border-black focus:outline-none"
              placeholder="Format A (apple\nbank) or Format B (--\nWord=apple\nDeck=English::B1\n--)..."
            />
          </div>

          {/* User-Controlled Fields Collapsible (Requirement 8) */}
          <div className="bg-white border-4 border-black p-3 mb-4">
            <button
              type="button"
              onClick={() => setShowFieldConfig(!showFieldConfig)}
              className="w-full flex items-center justify-between text-xs font-black uppercase tracking-wider text-black cursor-pointer hover:opacity-80"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Field Settings (Use TXT vs Generate AI)</span>
              </span>
              {showFieldConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFieldConfig && (
              <div className="mt-3 pt-3 border-t-2 border-black text-xs space-y-2">
                <p className="text-[10px] text-zinc-600 font-bold mb-2">
                  * If checked and present in TXT, the file's data is used. Missing or unchecked fields are generated by AI.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.word}
                      disabled
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Word (Always)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.deck}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, deck: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Deck</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.phonetic}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, phonetic: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Phonetic</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.partOfSpeech}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, partOfSpeech: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Part of Speech</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.meaningFa}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, meaningFa: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Persian Meaning</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.example}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, example: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Example Sentence</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.translationFa}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, translationFa: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Example Translation</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fieldConfig.mnemonic}
                      onChange={(e) => setFieldConfig({ ...fieldConfig, mnemonic: e.target.checked })}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    <span className="text-[11px] font-bold">Memory Aid</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Preflight Error Banner */}
          {preflightError && (
            <div className="mb-3 p-3 bg-red-600 border-4 border-black text-white text-xs flex items-center gap-2 font-bold shadow-[2px_2px_0px_#000000]">
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              <span>{preflightError}</span>
            </div>
          )}

          {/* Build All Button (#FF4B4B) */}
          <button
            type="button"
            onClick={handleBuildAll}
            disabled={isProcessing || items.length === 0}
            className={`w-full bg-[#FF4B4B] text-white font-black py-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xl uppercase tracking-wider hover:translate-y-0.5 active:translate-y-1 transition-transform flex items-center justify-center gap-2 select-none ${
              isProcessing ? 'opacity-80 cursor-wait' : 'cursor-pointer'
            }`}
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

        {/* Clean Batch Progress List (Requirement 9) */}
        <div className="bg-white border-4 border-black p-4 sm:p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col text-black">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <span className="text-xs font-black text-black uppercase tracking-wider">
              Batch Progress ({completedCount} / {items.length})
            </span>
            <div className="flex items-center gap-2 text-[11px] font-black">
              {completedCount > 0 && <span className="text-emerald-700">{completedCount} ✓</span>}
              {errorCount > 0 && <span className="text-red-600">{errorCount} ✕</span>}
              {duplicateCount > 0 && <span className="text-amber-600">{duplicateCount} dup</span>}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const isSuccess = item.status === 'success';
              const isRunning = item.status === 'generating_ai';
              const isFailed = item.status === 'error';
              const isDuplicate = item.status === 'duplicate';

              return (
                <div
                  key={item.id}
                  onClick={() => item.cardData && setPreviewCard(item.cardData)}
                  className={`p-2 border-2 border-black flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                    isSuccess
                      ? 'bg-emerald-50 text-black'
                      : isFailed
                      ? 'bg-red-50 text-black'
                      : isDuplicate
                      ? 'bg-amber-50 text-black'
                      : isRunning
                      ? 'bg-sky-50 text-black animate-pulse'
                      : 'bg-white text-black'
                  }`}
                >
                  {/* Left: Word Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-zinc-400 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <span className="font-black text-black text-sm truncate">{item.word}</span>
                    {item.noteId && (
                      <span className="text-[10px] bg-black text-[#4ADE80] font-black px-1.5 py-0.2 border border-black">
                        #{item.noteId}
                      </span>
                    )}
                    {item.error && (
                      <span className="text-[10px] text-red-600 font-bold truncate max-w-[140px]">
                        {item.error}
                      </span>
                    )}
                  </div>

                  {/* Right: Simple Status Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isSuccess && (
                      <span className="text-emerald-700 font-black text-sm">✓</span>
                    )}
                    {isRunning && (
                      <span className="text-blue-700 font-black text-xs">generating...</span>
                    )}
                    {isDuplicate && (
                      <span className="text-amber-700 font-black text-xs">duplicate</span>
                    )}
                    {isFailed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetrySingle(idx);
                        }}
                        disabled={isProcessing}
                        className="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] border border-black flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Retry</span>
                      </button>
                    )}
                    {item.status === 'idle' && (
                      <span className="text-zinc-400 font-bold text-xs">waiting...</span>
                    )}
                    {item.cardData && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCard(item.cardData!);
                        }}
                        className="p-1 text-black hover:opacity-70 cursor-pointer"
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
      <section className="flex-1 flex flex-col min-h-[560px]">
        {/* Bento Stage Container (Warm Ivory #F5F2EB) */}
        <div className="flex-1 bg-[#F5F2EB] border-4 border-black p-4 sm:p-8 relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <div className="relative z-10 w-full flex-1 flex flex-col justify-center">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder={items[0]?.word || 'batch card'}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
