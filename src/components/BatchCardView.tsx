import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, BatchItem, CardData } from '../types';
import {
  runFullPipeline,
  getAnkiDecks,
  checkDuplicate,
  checkOllama,
  checkTTS,
  checkAnki,
  openInAnki,
} from '../services/api';
import { CardPreview } from './CardPreview';
import { AudioPlayer } from './AudioPlayer';
import {
  FileText,
  Upload,
  Layers,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  Check,
  ExternalLink,
} from 'lucide-react';

interface BatchCardViewProps {
  settings: AppSettings;
}

export const BatchCardView: React.FC<BatchCardViewProps> = ({ settings }) => {
  const [inputText, setInputText] = useState<string>(
    'apple\nbank\nphoto\nabandon\naccurate\nancient'
  );
  const [fileName, setFileName] = useState<string>('sample_words.txt');
  const [deck, setDeck] = useState<string>(settings.anki.defaultDeck || 'English::B1');
  const [availableDecks, setAvailableDecks] = useState<string[]>(['English::B1', 'English::B2', 'IELTS']);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);

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

  // Update Items whenever input text changes
  useEffect(() => {
    const rawLines = inputText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const uniqueWords = Array.from(new Set(rawLines));

    setItems(
      uniqueWords.map((word, idx) => ({
        id: `${word}_${idx}`,
        word,
        status: 'idle',
      }))
    );
  }, [inputText]);

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

  // Run Preflight Check
  const runPreflightCheck = async (): Promise<boolean> => {
    setPreflightError(null);

    // 1. Ollama Check
    const aiCheck = await checkOllama(settings.ai.url);
    if (!aiCheck.connected) {
      setPreflightError(`Preflight Failed: Ollama is unreachable at ${settings.ai.url}. Start 'ollama serve' first.`);
      return false;
    }

    // 2. TTS Check
    const ttsCheck = await checkTTS(settings.tts.endpoint, settings.tts.voice);
    if (!ttsCheck.ready) {
      setPreflightError(`Preflight Failed: TTS Engine diagnostic not ready (${ttsCheck.error || 'Check TTS in Settings'}).`);
      return false;
    }

    // 3. AnkiConnect Check
    const ankiCheck = await checkAnki(settings.anki.url);
    if (!ankiCheck.connected) {
      setPreflightError(`Preflight Failed: AnkiConnect is unreachable at ${settings.anki.url}. Make sure Anki is open with AnkiConnect installed.`);
      return false;
    }

    return true;
  };

  // Process a single item
  const processItem = async (item: BatchItem): Promise<BatchItem> => {
    // 1. Duplicate Check
    try {
      const dup = await checkDuplicate(deck, item.word, settings.anki.url);
      if (dup.isDuplicate) {
        return {
          ...item,
          status: 'duplicate',
          isDuplicate: true,
          error: 'Word already exists in target deck',
        };
      }
    } catch {
      // Proceed if check fails
    }

    // 2. Run Pipeline
    const res = await runFullPipeline({
      word: item.word,
      deck: deck,
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
      if (current.status === 'success') continue; // Skip already completed

      // Mark running
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
  const handleRetrySingle = async (index: number, force = false) => {
    const item = items[index];
    if (!item || isProcessing) return;

    setItems((prev) =>
      prev.map((it, idx) =>
        idx === index ? { ...it, status: 'generating_ai', error: undefined } : it
      )
    );

    try {
      const res = await runFullPipeline({
        word: item.word,
        deck: deck,
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

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6">
      {/* LEFT: Batch Source & Progress List */}
      <section className="w-full lg:w-[460px] flex flex-col gap-6 shrink-0">
        {/* Batch File Box (#4ADE80 Bento Container) */}
        <div className="bg-[#4ADE80] p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black">
          <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4">
            <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight flex items-center gap-2">
              Batch Generator
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

          {/* TXT Info & Deck Bar */}
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

          {/* Quick TXT Editing */}
          <div className="mb-4">
            <label className="text-xs font-black text-black uppercase block mb-1">
              Words (One per line):
            </label>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              className="w-full bg-white text-black text-xs font-bold font-mono p-3 border-4 border-black focus:outline-none"
              placeholder="apple&#10;bank&#10;photo..."
            />
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
                <span>BUILD ALL CARDS</span>
              </>
            )}
          </button>
        </div>

        {/* Progress List Bento Container (bg-white text-black) */}
        <div className="bg-white border-4 border-black p-4 sm:p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col text-black">
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
            <span className="text-xs font-black text-black uppercase tracking-wider">
              Queue Status ({completedCount} / {items.length} ready)
            </span>
            <div className="flex items-center gap-2 text-[11px] font-black">
              {errorCount > 0 && <span className="text-red-600">{errorCount} failed</span>}
              {duplicateCount > 0 && <span className="text-amber-600">{duplicateCount} duplicates</span>}
            </div>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => item.cardData && setPreviewCard(item.cardData)}
                className={`p-2.5 border-2 border-black flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                  item.status === 'success'
                    ? 'bg-emerald-100 text-black border-emerald-800'
                    : item.status === 'error'
                    ? 'bg-red-100 text-black border-red-800'
                    : item.status === 'duplicate'
                    ? 'bg-amber-100 text-black border-amber-800'
                    : item.status === 'generating_ai'
                    ? 'bg-sky-100 text-black border-sky-800'
                    : 'bg-zinc-100 text-black'
                }`}
              >
                {/* Left: Word & Note ID */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-black text-zinc-500 w-5 text-right">
                    {idx + 1}.
                  </span>
                  <span className="font-black text-black truncate">{item.word}</span>
                  {item.noteId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInAnki({ noteId: item.noteId, query: `nid:${item.noteId}`, url: settings.anki.url });
                      }}
                      title="Click to Open in Anki Browser"
                      className="text-[10px] bg-black text-[#4ADE80] hover:text-[#FFD93D] font-black px-1.5 py-0.5 border border-black flex items-center gap-1 cursor-pointer"
                    >
                      <span>Note #{item.noteId}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                  {item.error && (
                    <span className="text-[10px] text-red-600 font-bold truncate max-w-[130px]">
                      {item.error}
                    </span>
                  )}
                </div>

                {/* Right: Status Icon & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'success' && (
                    <span className="w-5 h-5 border-2 border-black bg-green-400 flex items-center justify-center text-xs text-black font-black">
                      ✓
                    </span>
                  )}

                  {item.status === 'generating_ai' && (
                    <span className="w-5 h-5 border-2 border-black bg-blue-400 flex items-center justify-center text-xs text-white font-black animate-spin">
                      ⟳
                    </span>
                  )}

                  {item.status === 'duplicate' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-700 font-black text-[10px]">Duplicate</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetrySingle(idx, true);
                        }}
                        disabled={isProcessing}
                        className="px-2 py-0.5 bg-[#FFD93D] text-black font-black text-[10px] border border-black hover:bg-[#ffe066]"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetrySingle(idx);
                        }}
                        disabled={isProcessing}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] border border-black flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {item.status === 'idle' && (
                    <span className="w-5 h-5 border-2 border-black bg-gray-200" />
                  )}

                  {item.cardData && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewCard(item.cardData!);
                      }}
                      className="p-1 text-black hover:opacity-70"
                      title="Inspect Card"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RIGHT: Live Selected Card Preview */}
      <section className="flex-1 flex flex-col min-h-[560px]">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-black uppercase tracking-widest bg-white text-black px-2.5 py-1 border-2 border-black">
            {previewCard ? `Batch Card: ${previewCard.word}` : 'Live Card Inspector'}
          </span>
          {previewCard?.wordAudioBase64 && (
            <AudioPlayer base64Wav={previewCard.wordAudioBase64} label="Word WAV" size="sm" />
          )}
        </div>

        {/* Bento Stage Container (Warm Ivory #F5F2EB) */}
        <div className="flex-1 bg-[#F5F2EB] border-4 border-black p-4 sm:p-8 relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
          <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-6xl text-black pointer-events-none select-none">
            BATCH
          </div>

          <div className="relative z-10 w-full flex-1 flex flex-col justify-center">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder="batch item"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
