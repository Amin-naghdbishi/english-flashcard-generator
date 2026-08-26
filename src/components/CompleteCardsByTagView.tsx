import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AppTheme, TaggedNoteItem, CardData } from '../types';
import { getAnkiTags, findNotesByTag, completeAnkiNote, checkAnki } from '../services/api';
import { CardPreview } from './CardPreview';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
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
  List,
  PauseCircle,
} from 'lucide-react';

interface CompleteCardsByTagViewProps {
  settings: AppSettings;
  appTheme?: AppTheme;
}

const MAX_AUTO_RETRIES = 2; // Total 3 attempts (1 initial + 2 retries)

function noteItemToCardData(item: TaggedNoteItem | null): CardData | null {
  if (!item) return null;
  if (item.updatedCardData) return item.updatedCardData;

  const fields = item.fields || {};
  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (fields[k]) {
        const raw = String(fields[k]).replace(/<[^>]+>/g, '').trim();
        if (raw) return raw;
      }
    }
    return '';
  };

  const word = item.word || getVal('Word', 'word', 'Front', 'front', 'English', 'Term') || 'Preview Word';
  const meaningFa = getVal('Meaning', 'meaning', 'Persian Meaning', 'persianmeaning', 'Back', 'Translation');
  const phonetic = getVal('Phonetic', 'phonetic', 'IPA', 'ipa', 'Pronunciation');
  const partOfSpeech = getVal('PartOfSpeech', 'partofspeech', 'Part of Speech', 'pos', 'POS', 'Type');
  const example = getVal('Example', 'example', 'Example Sentence', 'examplesentence', 'Sentence');
  const translationFa = getVal('Translation', 'translation', 'Example Translation', 'exampletranslation', 'Sentence Fa');
  const mnemonic = getVal('Mnemonic', 'mnemonic', 'Memory Aid', 'memoryaid', 'Aid');

  return {
    word,
    phonetic: phonetic || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    partOfSpeech: partOfSpeech || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    meaningFa: meaningFa || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    example: example || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    translationFa: translationFa || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    mnemonic: mnemonic || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    cardType: 'normal',
  };
}

export const CompleteCardsByTagView: React.FC<CompleteCardsByTagViewProps> = ({ settings }) => {
  const themeContext = useAppTheme();
  const { t, isRTL } = useTranslation();
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
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Live preview note/card
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
    setIsCancelled(false);
    setCompletedCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    setCurrentIndex(-1);

    try {
      const ankiCheck = await checkAnki(settings.anki.url);
      if (!ankiCheck.connected) {
        throw new Error(`AnkiConnect is offline at ${settings.anki.url}. Please open Anki Desktop with AnkiConnect.`);
      }

      const res = await findNotesByTag({ tag: cleanTag, url: settings.anki.url });
      if (!res.success) {
        throw new Error(res.error || 'Failed to find notes with tag.');
      }

      const scannedNotes = res.notes || [];
      setNotes(scannedNotes);
      setHasScanned(true);
      if (scannedNotes.length > 0) {
        setSelectedNoteForPreview(scannedNotes[0]);
        setPreviewCard(noteItemToCardData(scannedNotes[0]));
      }
    } catch (err: any) {
      setScanError(err.message || 'An error occurred while scanning tagged notes.');
    } finally {
      setIsScanningNotes(false);
    }
  };

  // Process a single card with automatic retries
  const processCardWithRetries = async (
    item: TaggedNoteItem,
    index: number,
    tag: string
  ): Promise<{ success: boolean; cardData?: CardData; generatedFields?: string[]; error?: string }> => {
    let attempts = 0;
    let lastError = 'Unknown error';

    while (attempts <= MAX_AUTO_RETRIES) {
      if (abortControllerRef.current) {
        return { success: false, error: 'Cancelled by user' };
      }

      attempts++;

      // Update UI status to retrying if this is retry attempt
      if (attempts > 1) {
        setNotes((prev) =>
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  status: 'retrying' as const,
                  retryCount: attempts - 1,
                  error: `Attempt ${attempts}/${MAX_AUTO_RETRIES + 1}: Retrying...`,
                }
              : it
          )
        );
        // Small delay between retries
        await new Promise((resolve) => setTimeout(resolve, 600));
      } else {
        setNotes((prev) =>
          prev.map((it, idx) =>
            idx === index
              ? { ...it, status: 'generating_ai' as const, error: undefined, retryCount: 0 }
              : it
          )
        );
      }

      try {
        const res = await completeAnkiNote({
          noteId: item.noteId,
          selectedTag: tag,
          includeImage,
          url: settings.anki.url,
        });

        if (res.success && res.cardData) {
          return {
            success: true,
            cardData: res.cardData,
            generatedFields: res.generatedFields,
          };
        }

        lastError = res.error || 'Failed to complete note fields in Anki';
      } catch (err: any) {
        lastError = err.message || 'Network error or Anki connection failed';
      }
    }

    return { success: false, error: lastError };
  };

  // Start completion process (sequential, one by one)
  const handleStartCompletion = async (retryOnlyFailed: boolean = false) => {
    if (isProcessing || notes.length === 0) return;

    abortControllerRef.current = false;
    setIsProcessing(true);
    setIsCancelled(false);
    setIsFinished(false);

    const tagToProcess = selectedTag.trim();

    // Mark pending items as 'waiting'
    setNotes((prev) =>
      prev.map((it) => {
        if (retryOnlyFailed) {
          if (it.status === 'error') return { ...it, status: 'waiting' as const, error: undefined };
          return it;
        } else {
          if (it.needsCompletion && it.status !== 'success') return { ...it, status: 'waiting' as const, error: undefined };
          return it;
        }
      })
    );

    let comp = completedCount;
    let fail = retryOnlyFailed ? 0 : failedCount;
    let skip = skippedCount;

    for (let i = 0; i < notes.length; i++) {
      if (abortControllerRef.current) {
        setIsCancelled(true);
        break;
      }

      const item = notes[i];

      // If retryOnlyFailed mode is active, skip items that didn't fail
      if (retryOnlyFailed && item.status !== 'error' && item.status !== 'waiting') {
        continue;
      }

      // If already complete or doesn't need completion
      if (!item.needsCompletion && item.status !== 'success') {
        skip++;
        setSkippedCount(skip);
        setNotes((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'skipped' as const } : it))
        );
        continue;
      }

      // If already successfully completed previously
      if (item.status === 'success') {
        continue;
      }

      setCurrentIndex(i);
      setSelectedNoteForPreview(item);

      const result = await processCardWithRetries(item, i, tagToProcess);

      if (abortControllerRef.current) {
        setIsCancelled(true);
        break;
      }

      if (result.success && result.cardData) {
        comp++;
        setCompletedCount(comp);
        setPreviewCard(result.cardData);

        setNotes((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'success' as const,
                  updatedCardData: result.cardData,
                  generatedFieldsSummary: result.generatedFields,
                  missingFields: [],
                  needsCompletion: false,
                  error: undefined,
                }
              : it
          )
        );
      } else {
        fail++;
        setFailedCount(fail);

        setNotes((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error' as const,
                  error: result.error || 'Error completing card after retries',
                }
              : it
          )
        );
      }
    }

    // Reset remaining 'waiting' items back to idle if cancelled
    setNotes((prev) =>
      prev.map((it) => (it.status === 'waiting' ? { ...it, status: 'idle' as const } : it))
    );

    setIsProcessing(false);
    setCurrentIndex(-1);
    if (!abortControllerRef.current) {
      setIsFinished(true);
    }
  };

  // Cancel processing
  const handleCancelProcessing = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
    setIsCancelled(true);
  };

  // Retry a single card
  const handleRetrySingle = async (index: number) => {
    const itemToRetry = notes[index];
    if (!itemToRetry || isProcessing) return;

    setCurrentIndex(index);
    setSelectedNoteForPreview(itemToRetry);

    const result = await processCardWithRetries(itemToRetry, index, selectedTag.trim());

    if (result.success && result.cardData) {
      setPreviewCard(result.cardData);
      setNotes((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'success' as const,
                updatedCardData: result.cardData,
                generatedFieldsSummary: result.generatedFields,
                missingFields: [],
                needsCompletion: false,
                error: undefined,
              }
            : it
        )
      );
      setCompletedCount((c) => c + 1);
      setFailedCount((f) => Math.max(0, f - 1));
    } else {
      setNotes((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'error' as const,
                error: result.error || 'Error occurred during retry',
              }
            : it
        )
      );
    }

    setCurrentIndex(-1);
  };

  const handleSelectForPreview = (note: TaggedNoteItem) => {
    setSelectedNoteForPreview(note);
    setPreviewCard(noteItemToCardData(note));
  };

  const missingFieldsCount = notes.filter((n) => n.needsCompletion && n.status !== 'success').length;
  const currentProcessingNote = currentIndex >= 0 && currentIndex < notes.length ? notes[currentIndex] : null;
  const progressPercent = notes.length > 0 ? Math.round(((completedCount + failedCount + skippedCount) / notes.length) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 min-w-0">
      {/* Left Control & Queue Column */}
      <section className="w-full lg:w-[480px] flex flex-col gap-5 shrink-0 min-w-0">
        {/* Top Control Box */}
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <Tags className="w-5 h-5 text-blue-500" />
              <span>{t('completeByTag.title')}</span>
            </h2>
            <button
              type="button"
              onClick={loadTags}
              disabled={isFetchingTags || isProcessing}
              title={t('completeByTag.refreshTagsTooltip')}
              className={`p-1.5 rounded-md border cursor-pointer transition-colors ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTags ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tag Selection & Input */}
          <div className="mb-3">
            <label className={`block text-xs font-semibold uppercase mb-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {t('completeByTag.tagLabel')}:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className={`w-4 h-4 text-zinc-400 absolute ${isRTL ? 'right-2.5' : 'left-2.5'} top-2.5`} />
                <input
                  type="text"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  disabled={isProcessing || isScanningNotes}
                  placeholder={t('completeByTag.tagPlaceholder')}
                  className={`w-full text-xs font-medium ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
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
                    <span>{t('completeByTag.scanning')}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>{t('completeByTag.scanBtn')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Tag Pills from Anki collection */}
            {availableTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
                {availableTags.map((tTag) => (
                  <button
                    key={tTag}
                    type="button"
                    onClick={() => setSelectedTag(tTag)}
                    disabled={isProcessing || isScanningNotes}
                    className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                      selectedTag === tTag
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : isDark
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                    }`}
                  >
                    #{tTag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Option: Image Generation Toggle */}
          <div
            className={`p-3 border rounded-md mb-3 shadow-xs ${
              isDark ? 'bg-zinc-900/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs font-semibold">{t('completeByTag.attachImageLabel')}</div>
                  <div className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t('completeByTag.attachImageDesc')}
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
                  {t('common.yes')}
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
                  {t('common.no')}
                </button>
              </div>
            </div>
          </div>

          {/* Scan Error Message */}
          {scanError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-xs flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Pre-flight Inspection Summary Box */}
          {hasScanned && (
            <div
              className={`p-3.5 border rounded-lg mb-3 space-y-2 ${
                isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-blue-50/50 border-blue-200 text-zinc-900'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('completeByTag.inspectionTitle')}</span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400">#{selectedTag}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="flex flex-col">
                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{t('completeByTag.wordsFound')}</span>
                  <span className="font-bold text-sm">{notes.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{t('completeByTag.needingCompletion')}</span>
                  <span className="font-bold text-sm text-amber-500">{missingFieldsCount}</span>
                </div>
              </div>

              <div className={`text-[11px] pt-1 border-t ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                {t('completeByTag.preservationNotice')}
              </div>
            </div>
          )}

          {/* Action Buttons: [ Complete Cards ] & [ Cancel ] */}
          {hasScanned && notes.length > 0 && (
            <div className="space-y-2">
              {!isProcessing ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartCompletion(false)}
                    disabled={missingFieldsCount === 0}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>{t('completeByTag.completeCardsBtn', { count: missingFieldsCount > 0 ? missingFieldsCount : 0 })}</span>
                  </button>

                  {failedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleStartCompletion(true)}
                      className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      title="Retry only the failed cards"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('completeByTag.retryFailedBtn', { count: failedCount })}</span>
                    </button>
                  )}
                </div>
              ) : (
                /* While Processing: BLUE/NEUTRAL in-progress button + CANCEL button */
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled
                    className={`flex-1 py-2.5 px-4 rounded-md font-medium text-xs flex items-center justify-center gap-2 cursor-wait border ${
                      isDark
                        ? 'bg-blue-900/40 border-blue-700 text-blue-200'
                        : 'bg-blue-50 border-blue-300 text-blue-900'
                    }`}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="font-semibold">
                      {t('completeByTag.processingProgress', { current: currentIndex + 1, total: notes.length })}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelProcessing}
                    className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    title="Safely cancel processing and keep completed cards"
                  >
                    <Square className="w-3.5 h-3.5 text-zinc-300" />
                    <span>{t('completeByTag.cancelBtn')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live Progress & Active Item Status while Processing */}
          {isProcessing && (
            <div className="mt-4 pt-3 border-t border-zinc-700/50">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>
                    {t('completeByTag.processingProgress', { current: currentIndex + 1, total: notes.length })}
                  </span>
                </span>
                <span>{progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Currently processing word */}
              {currentProcessingNote && (
                <div className={`text-xs mt-2 font-medium flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <span className="text-zinc-500">{t('batch.currentlyProcessing')}</span>
                  <span className="font-bold text-blue-500">{currentProcessingNote.word}</span>
                  {currentProcessingNote.retryCount !== undefined && currentProcessingNote.retryCount > 0 && (
                    <span className="text-[10px] text-amber-500 font-semibold px-1.5 py-0.2 rounded bg-amber-500/10">
                      {t('batch.retryAttemptBadge', { current: currentProcessingNote.retryCount, max: MAX_AUTO_RETRIES })}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-between text-[11px] mt-2 font-medium">
                <span className="text-emerald-500">✓ {t('common.completed')}: {completedCount}</span>
                <span className="text-red-500">✕ {t('common.failed')}: {failedCount}</span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('common.skipped')}: {skippedCount}
                </span>
              </div>
            </div>
          )}

          {/* Cancellation Notification Banner */}
          {isCancelled && !isProcessing && (
            <div
              className={`mt-4 p-3.5 border rounded-lg text-xs ${
                isDark
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <PauseCircle className="w-4 h-4 text-amber-500" />
                <span>{t('completeByTag.cancelledTitle')}</span>
              </div>
              <p className="text-xs mb-2">
                {t('completeByTag.cancelledDesc', { completed: completedCount, total: notes.length })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleStartCompletion(false)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Play className="w-3 h-3" />
                  <span>{t('completeByTag.resumeBtn')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Final Completion Summary Banner */}
          {isFinished && !isProcessing && (
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
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{t('completeByTag.summaryTitle')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1 text-center font-semibold">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                  {t('common.completed')}: {completedCount}
                </div>
                <div className="p-1 rounded bg-red-500/20 text-red-400">
                  {t('common.failed')}: {failedCount}
                </div>
                <div className="p-1 rounded bg-zinc-500/20 text-zinc-400">
                  {t('common.skipped')}: {skippedCount}
                </div>
              </div>
              {failedCount > 0 && (
                <div className="mt-2 text-[11px] flex items-center justify-between">
                  <span>{t('completeByTag.tagRetainedNotice', { tag: selectedTag })}</span>
                  <button
                    type="button"
                    onClick={() => handleStartCompletion(true)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] rounded flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('completeByTag.retryFailedBtn', { count: failedCount })}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scanned Words Queue Card (`Words found: X`) */}
        {hasScanned && (
          <div
            className={`p-4 border rounded-lg shadow-xs flex-1 flex flex-col min-h-[340px] max-h-[520px] overflow-hidden ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-2.5 mb-3 shrink-0 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {t('completeByTag.queueTitle', { count: notes.length })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                {completedCount > 0 && <span className="text-emerald-600 dark:text-emerald-400">{completedCount} ✓</span>}
                {failedCount > 0 && <span className="text-red-600 dark:text-red-400">{failedCount} ✕</span>}
              </div>
            </div>

            {/* List of word items */}
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              {notes.map((n, idx) => {
                const isSelected = selectedNoteForPreview?.noteId === n.noteId;
                const isCurrentProcessing = currentIndex === idx;
                const isSuccess = n.status === 'success';
                const isFailed = n.status === 'error';
                const isWaiting = n.status === 'waiting';
                const isGenerating = n.status === 'generating_ai' || n.status === 'generating_audio' || n.status === 'updating_anki';
                const isRetrying = n.status === 'retrying';

                return (
                  <div
                    key={n.noteId}
                    onClick={() => handleSelectForPreview(n)}
                    className={`p-2.5 border rounded-md transition-all cursor-pointer flex items-center justify-between gap-2.5 text-xs ${
                      isSelected
                        ? isDark
                          ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : isSuccess
                        ? isDark
                          ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-200'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isFailed
                        ? isDark
                          ? 'bg-red-950/20 border-red-900/60 text-red-200'
                          : 'bg-red-50/70 border-red-200 text-red-950'
                        : isGenerating || isRetrying
                        ? isDark
                          ? 'bg-blue-950/30 border-blue-800 text-blue-200 animate-pulse'
                          : 'bg-blue-50 border-blue-300 text-blue-950 animate-pulse'
                        : isDark
                        ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-200'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    {/* Word info */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs text-zinc-500 w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm truncate">{n.word}</span>
                          <span className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                            isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            #{n.noteId}
                          </span>
                          {n.missingFields.length > 0 && !isSuccess && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border ${
                              isDark ? 'bg-amber-950/50 text-amber-400 border-amber-800/80' : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}>
                              {t('completeByTag.missingCountBadge', { count: n.missingFields.length })}
                            </span>
                          )}
                        </div>
                        {n.error && (
                          <span className="text-[11px] text-red-500 font-normal block truncate max-w-[220px]">
                            {n.error}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status & Preview Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isSuccess && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('common.completed')}</span>
                        </span>
                      )}
                      {(isGenerating || isCurrentProcessing) && !isRetrying && (
                        <span className="flex items-center gap-1 text-[11px] text-blue-400 font-medium px-1.5 py-0.5 rounded bg-blue-500/10">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{t('common.processing')}</span>
                        </span>
                      )}
                      {isRetrying && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-500/10">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{t('batch.retryAttemptBadge', { current: n.retryCount || 1, max: MAX_AUTO_RETRIES })}</span>
                        </span>
                      )}
                      {isWaiting && (
                        <span className="text-[11px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-700/30">
                          {t('common.waiting')}
                        </span>
                      )}
                      {isFailed && (
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 text-[11px] text-red-500 font-semibold px-1.5 py-0.5 rounded bg-red-500/10">
                            <XCircle className="w-3 h-3" />
                            <span>{t('common.failed')}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetrySingle(idx);
                            }}
                            disabled={isProcessing}
                            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer transition-colors"
                            title={t('common.retry')}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {n.status === 'skipped' && (
                        <span className="text-[11px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-700/20">
                          {t('common.skipped')}
                        </span>
                      )}

                      {/* Eye / Preview Button (👁) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectForPreview(n);
                        }}
                        className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'
                            : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                        }`}
                        title={t('common.preview')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Right Column: Live Card Preview Panel */}
      <section className="flex-1 flex flex-col min-h-[560px] min-w-0">
        <div
          className={`flex-1 border rounded-lg p-4 sm:p-6 relative overflow-hidden shadow-xs flex flex-col ${
            isDark ? 'bg-[#1F1F23] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Header over preview with selected word and status */}
          <div className={`flex items-center justify-between pb-3 mb-3 border-b shrink-0 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t('completeByTag.livePreviewTitle')}
              </span>
              {selectedNoteForPreview && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  isDark ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-700'
                }`}>
                  {selectedNoteForPreview.word} (#{selectedNoteForPreview.noteId})
                </span>
              )}
            </div>

            {selectedNoteForPreview && (
              <div className="text-xs">
                {selectedNoteForPreview.status === 'success' ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('completeByTag.completedBadge')}</span>
                  </span>
                ) : selectedNoteForPreview.needsCompletion ? (
                  <span className="text-amber-500 font-medium">
                    {t('completeByTag.draftBadge', { count: selectedNoteForPreview.missingFields.length })}
                  </span>
                ) : (
                  <span className="text-zinc-400">{t('completeByTag.completeNoteBadge')}</span>
                )}
              </div>
            )}
          </div>

          <div className="relative z-10 w-full flex-1 flex flex-col justify-center min-w-0">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder={selectedNoteForPreview?.word || 'tag card'}
              appTheme={isDark ? 'anki-dark' : 'anki-light'}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
