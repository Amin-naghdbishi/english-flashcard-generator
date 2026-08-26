import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AppTheme, TaggedNoteItem, CardData } from '../types';
import { getAnkiTags, findNotesByTag, completeAnkiNote, checkAnki } from '../services/api';
import { CardPreview } from './CardPreview';
import { useAppTheme } from '../context/ThemeContext';
import {
  Tag,
  Tags,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  RotateCcw,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Search,
  RefreshCw,
  Eye,
  Layers,
} from 'lucide-react';

interface CompleteCardsByTagViewProps {
  settings: AppSettings;
  appTheme?: AppTheme;
}

export const CompleteCardsByTagView: React.FC<CompleteCardsByTagViewProps> = ({ settings }) => {
  const themeContext = useAppTheme();
  const isDark = themeContext.isDark;

  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isFetchingTags, setIsFetchingTags] = useState<boolean>(false);
  const [isScanningNotes, setIsScanningNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<TaggedNoteItem[]>([]);
  const [hasScanned, setHasScanned] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Settings for Tag Completion
  const [includeImage, setIncludeImage] = useState<boolean>(true);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Live preview of the latest completed card
  const [previewCard, setPreviewCard] = useState<CardData | null>(null);
  const [selectedNoteForPreview, setSelectedNoteForPreview] = useState<TaggedNoteItem | null>(null);

  const abortControllerRef = useRef<boolean>(false);

  // Fetch tags on mount or when anki url changes
  const loadTags = async () => {
    setIsFetchingTags(true);
    try {
      const res = await getAnkiTags(settings.anki.url);
      if (res.success && Array.isArray(res.tags)) {
        setAvailableTags(res.tags);
        if (!selectedTag && res.tags.length > 0) {
          const preferred = res.tags.find((t) => /complete|todo|vocab|draft|new|tag/i.test(t)) || res.tags[0];
          setSelectedTag(preferred);
        }
      }
    } catch (e) {
      console.warn('Failed to load Anki tags:', e);
    } finally {
      setIsFetchingTags(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, [settings.anki.url]);

  // Scan notes for selected tag
  const handleScanNotes = async () => {
    const cleanTag = selectedTag.trim();
    if (!cleanTag) {
      setScanError('Please specify or select a tag name.');
      return;
    }

    setScanError(null);
    setIsScanningNotes(true);
    setHasScanned(false);
    setIsFinished(false);
    setCompletedCount(0);
    setFailedCount(0);
    setSkippedCount(0);

    try {
      const ankiCheck = await checkAnki(settings.anki.url);
      if (!ankiCheck.connected) {
        throw new Error(`AnkiConnect is offline at ${settings.anki.url}. Please open Anki Desktop with AnkiConnect.`);
      }

      const res = await findNotesByTag({ tag: cleanTag, url: settings.anki.url });
      if (!res.success) {
        throw new Error(res.error || 'Failed to find notes with tag.');
      }

      setNotes(res.notes || []);
      setHasScanned(true);
      if (res.notes && res.notes.length > 0) {
        setSelectedNoteForPreview(res.notes[0]);
      }
    } catch (err: any) {
      setScanError(err.message || 'An error occurred while scanning tagged notes.');
    } finally {
      setIsScanningNotes(false);
    }
  };

  // Start completion process
  const handleStartCompletion = async () => {
    if (isProcessing || notes.length === 0) return;

    abortControllerRef.current = false;
    setIsProcessing(true);
    setIsFinished(false);

    let comp = 0;
    let fail = 0;
    let skip = 0;

    for (let i = 0; i < notes.length; i++) {
      if (abortControllerRef.current) {
        break;
      }

      const item = notes[i];
      setCurrentIndex(i);

      // If already complete or no missing fields
      if (!item.needsCompletion) {
        skip++;
        setSkippedCount(skip);
        setNotes((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'skipped' as const } : it))
        );
        continue;
      }

      // Set item to generating state
      setNotes((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'generating_ai' as const, error: undefined } : it))
      );

      try {
        const res = await completeAnkiNote({
          noteId: item.noteId,
          selectedTag: selectedTag.trim(),
          includeImage,
          url: settings.anki.url,
        });

        if (!res.success || !res.cardData) {
          throw new Error(res.error || 'Failed to complete note fields in Anki');
        }

        comp++;
        setCompletedCount(comp);
        setPreviewCard(res.cardData);

        setNotes((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'success' as const,
                  updatedCardData: res.cardData,
                  generatedFieldsSummary: res.generatedFields,
                  missingFields: [],
                  needsCompletion: false,
                }
              : it
          )
        );
      } catch (err: any) {
        fail++;
        setFailedCount(fail);
        setNotes((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error' as const,
                  error: err.message || 'Error completing card',
                }
              : it
          )
        );
      }
    }

    setIsProcessing(false);
    setCurrentIndex(-1);
    setIsFinished(true);
  };

  const handleStopCompletion = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
  };

  const handleRetrySingle = async (index: number) => {
    const itemToRetry = notes[index];
    if (!itemToRetry || isProcessing) return;

    setNotes((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, status: 'generating_ai' as const, error: undefined } : it))
    );

    try {
      const res = await completeAnkiNote({
        noteId: itemToRetry.noteId,
        selectedTag: selectedTag.trim(),
        includeImage,
        url: settings.anki.url,
      });

      if (!res.success || !res.cardData) {
        throw new Error(res.error || 'Failed to complete note fields in Anki');
      }

      setPreviewCard(res.cardData);
      setNotes((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'success' as const,
                updatedCardData: res.cardData,
                generatedFieldsSummary: res.generatedFields,
                missingFields: [],
                needsCompletion: false,
              }
            : it
        )
      );
      setCompletedCount((c) => c + 1);
      setFailedCount((f) => Math.max(0, f - 1));
    } catch (err: any) {
      setNotes((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'error' as const,
                error: err.message || 'Error occurred during retry',
              }
            : it
        )
      );
    }
  };

  const missingFieldsCount = notes.filter((n) => n.needsCompletion).length;
  const progressPercent = notes.length > 0 ? Math.round(((completedCount + failedCount + skippedCount) / notes.length) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 min-w-0">
      {/* Left Control Panel */}
      <section className="w-full lg:w-[480px] flex flex-col gap-5 shrink-0 min-w-0">
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <Tags className="w-5 h-5 text-blue-500" />
              <span>Complete Cards by Tag</span>
            </h2>
            <button
              type="button"
              onClick={loadTags}
              disabled={isFetchingTags || isProcessing}
              title="Refresh tag list from Anki"
              className={`p-1.5 rounded-md border cursor-pointer transition-colors ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTags ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tag Selection & Input */}
          <div className="mb-4">
            <label className={`block text-xs font-semibold uppercase mb-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Select or Enter Anki Tag:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  disabled={isProcessing || isScanningNotes}
                  placeholder="e.g. abc, to-complete, vocab"
                  className={`w-full text-xs font-medium pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={handleScanNotes}
                disabled={isScanningNotes || isProcessing || !selectedTag.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                {isScanningNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Scan Notes</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Tag Pills from Anki collection */}
            {availableTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
                {availableTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTag(t)}
                    className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                      selectedTag === t
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : isDark
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Option: Image Generation Toggle */}
          <div
            className={`p-3 border rounded-md mb-4 shadow-xs ${
              isDark ? 'bg-zinc-900/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs font-semibold">Generate / Attach Image:</div>
                  <div className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Attach smart illustration to missing image fields
                  </div>
                </div>
              </div>

              {/* [ Yes ] [ No ] Toggle */}
              <div className={`inline-flex border p-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
                <button
                  type="button"
                  onClick={() => setIncludeImage(true)}
                  disabled={isProcessing}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                    includeImage
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeImage(false)}
                  disabled={isProcessing}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                    !includeImage
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* Scan Error Message */}
          {scanError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-xs flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Safety & Preview Summary Box */}
          {hasScanned && (
            <div
              className={`p-3.5 border rounded-lg mb-4 space-y-2 ${
                isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-blue-50/50 border-blue-200 text-zinc-900'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pre-flight Inspection Summary</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="flex flex-col">
                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Tag:</span>
                  <span className="font-semibold text-blue-500 font-mono">#{selectedTag}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Notes Found:</span>
                  <span className="font-semibold">{notes.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Cards with Missing Fields:</span>
                  <span className="font-bold text-amber-500">{missingFieldsCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Image:</span>
                  <span className={`font-semibold ${includeImage ? 'text-emerald-500' : 'text-zinc-400'}`}>
                    {includeImage ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className={`text-[11px] pt-1 border-t ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                Existing user fields will be 100% preserved. Tag #{selectedTag} will be removed upon completion.
              </div>
            </div>
          )}

          {/* Action Buttons: [ Start Completion ] / [ Stop ] */}
          {hasScanned && notes.length > 0 && (
            <div className="flex gap-2">
              {!isProcessing ? (
                <button
                  type="button"
                  onClick={handleStartCompletion}
                  disabled={missingFieldsCount === 0}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Completion ({missingFieldsCount} cards)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopCompletion}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop / Cancel</span>
                </button>
              )}
            </div>
          )}

          {/* Live Progress Bar & Status while processing */}
          {isProcessing && (
            <div className="mt-4 pt-3 border-t border-zinc-700/50">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span>
                  Processing {currentIndex + 1} / {notes.length}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] mt-2 font-medium">
                <span className="text-emerald-500">✓ Completed: {completedCount}</span>
                <span className="text-red-500">✗ Failed: {failedCount}</span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Skipped: {skippedCount}
                </span>
              </div>
            </div>
          )}

          {/* Final Completion Summary Banner */}
          {isFinished && (
            <div
              className={`mt-4 p-3.5 border rounded-lg text-xs ${
                failedCount === 0
                  ? isDark
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : isDark
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Tag Completion Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 text-center font-semibold">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                  Completed: {completedCount}
                </div>
                <div className="p-1 rounded bg-red-500/20 text-red-400">
                  Failed: {failedCount}
                </div>
                <div className="p-1 rounded bg-zinc-500/20 text-zinc-400">
                  Skipped: {skippedCount}
                </div>
              </div>
              {failedCount > 0 && (
                <div className="mt-2 text-[11px] opacity-90">
                  Failed cards retained their #{selectedTag} tag so you can easily retry them.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tagged Note List Table */}
        {hasScanned && (
          <div
            className={`p-4 border rounded-lg shadow-xs flex-1 flex flex-col min-h-[300px] max-h-[500px] overflow-hidden ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Scanned Cards ({notes.length})</span>
              </h3>
              <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {missingFieldsCount} missing fields
              </span>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {notes.map((n, idx) => {
                const isSelected = selectedNoteForPreview?.noteId === n.noteId;

                return (
                  <div
                    key={n.noteId}
                    onClick={() => {
                      setSelectedNoteForPreview(n);
                      if (n.updatedCardData) setPreviewCard(n.updatedCardData);
                    }}
                    className={`p-2.5 border rounded-md transition-all cursor-pointer text-left ${
                      isSelected
                        ? isDark
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-blue-600 bg-blue-50/60'
                        : isDark
                        ? 'border-zinc-750 bg-zinc-900/60 hover:bg-zinc-800'
                        : 'border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold truncate">{n.word}</span>
                        <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}`}>
                          #{n.noteId}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {n.status === 'generating_ai' && (
                          <span className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Generating...</span>
                          </span>
                        )}
                        {n.status === 'success' && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </span>
                        )}
                        {n.status === 'error' && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-red-500 font-semibold flex items-center gap-0.5">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetrySingle(idx);
                              }}
                              className="p-0.5 rounded text-zinc-400 hover:text-white"
                              title="Retry this card"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {n.status === 'skipped' && (
                          <span className="text-[10px] text-zinc-400 font-medium">
                            Already Complete
                          </span>
                        )}
                        {n.status === 'idle' && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            n.needsCompletion
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {n.needsCompletion ? `${n.missingFields.length} missing` : 'Ready'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Field checklist */}
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                      {['Word', 'Meaning', 'Phonetic', 'PartOfSpeech', 'Example', 'Translation', 'Mnemonic'].map((f) => {
                        const isPresent = n.presentFields.includes(f) || (n.status === 'success');
                        return (
                          <span
                            key={f}
                            className={`px-1 py-0.2 rounded font-mono ${
                              isPresent
                                ? isDark
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isDark
                                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                            }`}
                          >
                            {f} {isPresent ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>

                    {/* Error message */}
                    {n.error && (
                      <div className="mt-1.5 text-[10px] text-red-400 font-medium">
                        Error: {n.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Right Preview Panel */}
      <section className="flex-1 flex flex-col gap-4 min-w-0">
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs flex-1 flex flex-col ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Live Anki Card Preview
              </h3>
            </div>
            {selectedNoteForPreview && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                Word: {selectedNoteForPreview.word}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[450px]">
            {previewCard ? (
              <CardPreview
                cardData={previewCard}
                themeId={settings.theme}
                appTheme={isDark ? 'anki-dark' : 'anki-light'}
              />
            ) : selectedNoteForPreview ? (
              <CardPreview
                cardData={{
                  word: selectedNoteForPreview.word,
                  phonetic: selectedNoteForPreview.fields['Phonetic'] || selectedNoteForPreview.fields['phonetic'] || '',
                  partOfSpeech: selectedNoteForPreview.fields['PartOfSpeech'] || selectedNoteForPreview.fields['partofspeech'] || '',
                  meaningFa: selectedNoteForPreview.fields['Meaning'] || selectedNoteForPreview.fields['meaning'] || '',
                  example: selectedNoteForPreview.fields['Example'] || selectedNoteForPreview.fields['example'] || '',
                  translationFa: selectedNoteForPreview.fields['Translation'] || selectedNoteForPreview.fields['translation'] || '',
                  mnemonic: selectedNoteForPreview.fields['Mnemonic'] || selectedNoteForPreview.fields['mnemonic'] || '',
                  cardType: settings.defaultCard?.cardType || 'normal',
                }}
                themeId={settings.theme}
                emptyWordPlaceholder={selectedNoteForPreview.word}
                appTheme={isDark ? 'anki-dark' : 'anki-light'}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <Tag className="w-12 h-12 text-zinc-400 mb-3 opacity-40" />
                <h4 className="text-sm font-semibold mb-1">No Tagged Card Selected</h4>
                <p className={`text-xs max-w-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Select or scan an Anki tag on the left to inspect cards and generate missing fields with AI.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
