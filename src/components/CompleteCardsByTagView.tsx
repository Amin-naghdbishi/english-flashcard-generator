import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AppTheme, TaggedNoteItem, CardData } from '../types';
import { getAnkiTags, findNotesByTag, completeAnkiNote, checkAnki, updateAnkiNote } from '../services/api';
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
  Save,
  Edit3,
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

  // Anki Update sync state (Requirement 2 & 4)
  const [isSavingCardToAnki, setIsSavingCardToAnki] = useState<boolean>(false);
  const [isSavingAllEdited, setIsSavingAllEdited] = useState<boolean>(false);
  const [saveActionMessage, setSaveActionMessage] = useState<string | null>(null);

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
    setSaveActionMessage(null);

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

  // Process a single card with up to MAX_AUTO_RETRIES retries
  const processCardWithRetries = async (
    item: TaggedNoteItem,
    index: number,
    tag: string
  ): Promise<{ success: boolean; cardData?: CardData; generatedFields?: string[]; error?: string }> => {
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
      if (abortControllerRef.current) {
        return { success: false, error: 'Cancelled by user' };
      }

      if (attempt > 0) {
        setNotes((prev) =>
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  status: 'retrying' as const,
                  retryCount: attempt,
                  error: `Retrying (attempt ${attempt}/${MAX_AUTO_RETRIES}): ${lastError}`,
                }
              : it
          )
        );
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
    setSaveActionMessage(null);

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

      if (retryOnlyFailed && item.status !== 'error' && item.status !== 'waiting') {
        continue;
      }

      if (!item.needsCompletion && item.status !== 'success') {
        skip++;
        setSkippedCount(skip);
        setNotes((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'skipped' as const } : it))
        );
        continue;
      }

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

      // REQUIREMENT 4: Cards immediately available as soon as generated!
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

        setSelectedNoteForPreview((prev) =>
          prev && prev.noteId === item.noteId
            ? {
                ...prev,
                status: 'success' as const,
                updatedCardData: result.cardData,
                generatedFieldsSummary: result.generatedFields,
                missingFields: [],
                needsCompletion: false,
              }
            : prev
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
                  error: result.error || 'Failed after auto-retries',
                }
              : it
          )
        );
      }
    }

    setIsProcessing(false);
    setCurrentIndex(-1);

    if (!abortControllerRef.current) {
      setIsFinished(true);
    }
  };

  // Cancel in-progress run safely
  const handleCancelProcessing = () => {
    abortControllerRef.current = true;
    setIsCancelled(true);
    setIsProcessing(false);
  };

  // Retry a single card manually
  const handleRetrySingle = async (index: number) => {
    if (isProcessing) return;
    const item = notes[index];
    if (!item) return;

    abortControllerRef.current = false;
    setIsProcessing(true);
    setCurrentIndex(index);
    setSelectedNoteForPreview(item);

    const tagToProcess = selectedTag.trim();
    const result = await processCardWithRetries(item, index, tagToProcess);

    if (result.success && result.cardData) {
      setCompletedCount((c) => c + 1);
      setFailedCount((f) => Math.max(0, f - 1));
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
    } else {
      setNotes((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                status: 'error' as const,
                error: result.error || 'Retry failed',
              }
            : it
        )
      );
    }

    setIsProcessing(false);
    setCurrentIndex(-1);
  };

  // Select note from queue to view preview/editor
  const handleSelectNote = (item: TaggedNoteItem) => {
    setSelectedNoteForPreview(item);
    setPreviewCard(noteItemToCardData(item));
    setSaveActionMessage(null);
  };

  // REQUIREMENT 2: EDIT CARD AND SAVE IN ANKI (IN-PLACE WITHOUT DUPLICATES)
  const handleCardChange = (updatedCard: CardData) => {
    setPreviewCard(updatedCard);
    if (!selectedNoteForPreview) return;

    setNotes((prev) =>
      prev.map((n) =>
        n.noteId === selectedNoteForPreview.noteId
          ? {
              ...n,
              updatedCardData: updatedCard,
              isEdited: true,
            }
          : n
      )
    );

    setSelectedNoteForPreview((prev) =>
      prev ? { ...prev, updatedCardData: updatedCard, isEdited: true } : prev
    );
  };

  const handleSaveSingleNoteToAnki = async () => {
    if (!selectedNoteForPreview || !selectedNoteForPreview.noteId || !previewCard) return;
    setIsSavingCardToAnki(true);
    setSaveActionMessage(null);

    try {
      const res = await updateAnkiNote(
        selectedNoteForPreview.noteId,
        previewCard,
        settings.theme
      );

      if (res.success) {
        setNotes((prev) =>
          prev.map((n) =>
            n.noteId === selectedNoteForPreview.noteId
              ? { ...n, isEdited: false }
              : n
          )
        );
        setSelectedNoteForPreview((prev) => (prev ? { ...prev, isEdited: false } : prev));
        setSaveActionMessage(`✓ Note #${selectedNoteForPreview.noteId} successfully updated in Anki!`);
      } else {
        setSaveActionMessage(`✕ Failed to update in Anki: ${res.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setSaveActionMessage(`✕ Error: ${e?.message}`);
    } finally {
      setIsSavingCardToAnki(false);
    }
  };

  const handleSaveAllEditedNotes = async () => {
    const editedNotes = notes.filter((n) => n.isEdited && n.noteId && n.updatedCardData);
    if (editedNotes.length === 0) return;

    setIsSavingAllEdited(true);
    setSaveActionMessage(null);

    let savedCount = 0;
    for (const n of editedNotes) {
      try {
        const res = await updateAnkiNote(n.noteId, n.updatedCardData!, settings.theme);
        if (res.success) {
          savedCount++;
          setNotes((prev) =>
            prev.map((item) => (item.noteId === n.noteId ? { ...item, isEdited: false } : item))
          );
        }
      } catch (err) {
        console.error(`Failed to update note #${n.noteId}:`, err);
      }
    }

    setIsSavingAllEdited(false);
    setSaveActionMessage(
      t('completeByTag.allEditedSaved') || `✓ Successfully updated ${savedCount} edited notes in Anki!`
    );
  };

  // Stats calculation
  const totalNotesCount = notes.length;
  const needingCount = notes.filter((n) => n.needsCompletion).length;
  const alreadyCompleteCount = totalNotesCount - needingCount;
  const progressPercent =
    totalNotesCount > 0 ? Math.round(((completedCount + failedCount + skippedCount) / totalNotesCount) * 100) : 0;
  const currentProcessingNote = currentIndex >= 0 ? notes[currentIndex] : null;
  const editedCount = notes.filter((n) => n.isEdited && n.noteId).length;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 min-w-0">
      {/* LEFT COLUMN: Controls, Tag Scanner, Batch Queue */}
      <section className="w-full lg:w-[480px] flex flex-col gap-6 shrink-0 min-w-0">
        <div
          className={`p-4 sm:p-5 border rounded-lg shadow-xs ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Header */}
          <div className={`border-b pb-3 mb-4 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              {t('completeByTag.title')}
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {t('completeByTag.subtitle')}
            </p>
          </div>

          {/* Tag Selector & Scanner */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('completeByTag.tagLabel')}</span>
              </label>
              <button
                type="button"
                onClick={loadTags}
                disabled={isFetchingTags}
                className="text-[11px] text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 cursor-pointer"
                title={t('completeByTag.refreshTagsTooltip')}
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingTags ? 'animate-spin' : ''}`} />
                <span>{t('common.refresh')}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className={`absolute ${isRTL ? 'right-2.5' : 'left-2.5'} top-2.5 text-zinc-400 text-xs`}>
                  #
                </span>
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

            {/* Quick Tag Pills */}
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
              <input
                type="checkbox"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
                disabled={isProcessing}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Error Message Display */}
          {scanError && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 text-xs flex items-center gap-2 font-medium shadow-xs rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Scanned Summary & Start Button */}
          {hasScanned && (
            <div className="space-y-3 mb-2">
              <div
                className={`p-3 border rounded-md text-xs space-y-1.5 shadow-xs ${
                  isDark ? 'bg-zinc-900/80 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>{t('completeByTag.inspectionTitle')}</span>
                  <span className="font-mono text-[11px] text-zinc-400">#{selectedTag}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">{t('completeByTag.wordsFound')}</span>
                    <span className="font-bold">{totalNotesCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">{t('completeByTag.needingCompletion')}</span>
                    <span className="font-bold text-amber-500">{needingCount}</span>
                  </div>
                </div>
                <p className={`text-[11px] pt-1 border-t ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                  {t('completeByTag.preservationNotice')}
                </p>
              </div>

              {/* Start / Cancel / Retry Actions */}
              {!isProcessing ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartCompletion(false)}
                    disabled={needingCount === 0 && failedCount === 0}
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {needingCount > 0
                        ? t('completeByTag.completeCardsBtn', { count: needingCount })
                        : t('completeByTag.allDone')}
                    </span>
                  </button>

                  {failedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleStartCompletion(true)}
                      className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      title="Retry failed cards"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('completeByTag.retryFailedBtn', { count: failedCount })}</span>
                    </button>
                  )}
                </div>
              ) : (
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

              {/* SAVE ALL EDITED NOTES BUTTON */}
              {editedCount > 0 && (
                <button
                  type="button"
                  onClick={handleSaveAllEditedNotes}
                  disabled={isSavingAllEdited}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSavingAllEdited ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {isSavingAllEdited
                      ? t('completeByTag.savingEdited')
                      : t('completeByTag.saveAllEditedBtn', { count: editedCount })}
                  </span>
                </button>
              )}

              {/* Feedback Message */}
              {saveActionMessage && (
                <div
                  className={`p-2 rounded text-xs font-semibold flex items-center gap-1.5 ${
                    saveActionMessage.startsWith('✓')
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span>{saveActionMessage}</span>
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
                </div>
              )}
            </div>
          )}

          {/* Finished or Cancelled Banner */}
          {isFinished && !isProcessing && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs rounded-md shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{t('completeByTag.summaryTitle')}</span>
              </div>
              <p className="text-[11px]">
                {completedCount} completed, {failedCount} failed, {skippedCount} already complete.
                {failedCount > 0 && ` ${t('completeByTag.tagRetainedNotice', { tag: selectedTag })}`}
              </p>
            </div>
          )}

          {isCancelled && !isProcessing && (
            <div className="mt-4 p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-xs rounded-md shadow-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <PauseCircle className="w-4 h-4 text-amber-500" />
                <span>{t('completeByTag.cancelledTitle')}</span>
              </div>
              <p className="text-[11px]">
                {t('completeByTag.cancelledDesc', { completed: completedCount, total: totalNotesCount })}
              </p>
            </div>
          )}
        </div>

        {/* Tagged Notes List / Queue (Available immediately as they complete!) */}
        {hasScanned && (
          <div
            className={`border rounded-lg p-4 shadow-xs flex-1 flex flex-col min-h-[300px] ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className={`flex items-center justify-between pb-2 mb-2 border-b text-xs ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <h3 className="font-bold flex items-center gap-2">
                <List className="w-4 h-4 text-zinc-400" />
                <span>{t('completeByTag.queueTitle', { count: notes.length })}</span>
              </h3>
              {editedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                  {editedCount} {t('completeByTag.editedBadge') || 'Edited'}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[420px] space-y-1.5 pr-1 text-xs">
              {notes.map((n, idx) => {
                const isSelected = selectedNoteForPreview?.noteId === n.noteId;
                const isCurrentProcessing = currentIndex === idx;
                const isSuccess = n.status === 'success';
                const isFailed = n.status === 'error';
                const isGenerating = n.status === 'generating_ai' || n.status === 'generating_audio';
                const isRetrying = n.status === 'retrying';
                const isWaiting = n.status === 'waiting';

                return (
                  <div
                    key={n.noteId}
                    onClick={() => handleSelectNote(n)}
                    className={`p-2.5 rounded-md border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-950/40 border-blue-600'
                          : 'bg-blue-50 border-blue-300'
                        : isDark
                        ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750'
                        : 'bg-white hover:bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold truncate ${isSelected ? 'text-blue-500 dark:text-blue-400 font-bold' : ''}`}>
                            {n.word}
                          </span>
                          <span className={`text-[10px] font-mono px-1 rounded ${
                            isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            #{n.noteId}
                          </span>
                          {n.isEdited && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                              {t('completeByTag.editedBadge') || 'Edited'}
                            </span>
                          )}
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* RIGHT COLUMN: EXPANDED CARD PREVIEW & EDITOR PANEL (Requirement 2 & 7) */}
      <section className="flex-1 flex flex-col min-h-[580px] min-w-0">
        <div
          className={`flex-1 border rounded-lg p-4 sm:p-5 relative overflow-hidden shadow-xs flex flex-col ${
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
              <div className="text-xs flex items-center gap-2">
                {selectedNoteForPreview.isEdited && (
                  <span className="text-amber-500 font-bold flex items-center gap-1 text-[11px]">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Unsaved Changes</span>
                  </span>
                )}
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

          <div className="relative z-10 w-full flex-1 flex flex-col min-w-0">
            <CardPreview
              cardData={previewCard}
              themeId={settings.theme}
              emptyWordPlaceholder={selectedNoteForPreview?.word || 'tag card'}
              appTheme={isDark ? 'anki-dark' : 'anki-light'}
              editable={true}
              canSaveToAnki={Boolean(selectedNoteForPreview?.noteId)}
              isSavingToAnki={isSavingCardToAnki}
              onCardChange={handleCardChange}
              onSaveToAnki={handleSaveSingleNoteToAnki}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
