import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AppTheme, TaggedNoteItem, CardData, ThemeId, CardType } from '../types';
import { getAnkiTags, findNotesByTag, completeAnkiNote, checkAnki, updateAnkiNote, openInAnki } from '../services/api';
import { UnifiedCardEditor } from './UnifiedCardEditor';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { resolveThemeFromNoteType, parseCustomBlocksHtml } from '../themes';
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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

  const cardType: CardType =
    (item.modelName && /(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(item.modelName)) ||
    fields.CardType === 'spelling'
      ? 'spelling'
      : 'normal';

  const frontCustomBlocks = parseCustomBlocksHtml(fields.CustomFrontSections || '', 'front');
  const backCustomBlocks = parseCustomBlocksHtml(
    fields.CustomBackSections || fields.CustomSections || fields.Back || '',
    'back'
  );
  const customBlocks = [...frontCustomBlocks, ...backCustomBlocks];

  return {
    word,
    phonetic: phonetic || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    partOfSpeech: partOfSpeech || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    meaningFa: meaningFa || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    example: example || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    translationFa: translationFa || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    mnemonic: mnemonic || (item.needsCompletion ? '[Missing - will generate]' : undefined),
    cardType,
    modelName: item.modelName,
    noteType: item.modelName,
    tags: item.tags || [],
    frontCustomBlocks,
    backCustomBlocks,
    customBlocks,
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
  const [showFieldConfig, setShowFieldConfig] = useState<boolean>(false);
  const [fieldConfig, setFieldConfig] = useState<{
    phonetic: boolean;
    meaningFa: boolean;
    definitionEn: boolean;
    example: boolean;
    mnemonic: boolean;
  }>({
    phonetic: true,
    meaningFa: true,
    definitionEn: true,
    example: true,
    mnemonic: true,
  });

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
  const [isShowingInAnki, setIsShowingInAnki] = useState<boolean>(false);

  // Note Type & Card Theme selection (initialized from selected note, NEVER forced to settings default)
  const [selectedNoteType, setSelectedNoteType] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(settings.theme || 'comic-pop-dark');

  useEffect(() => {
    if (selectedNoteForPreview?.modelName) {
      setSelectedNoteType(selectedNoteForPreview.modelName);
      setSelectedTheme(resolveThemeFromNoteType(selectedNoteForPreview.modelName, selectedTheme));
    }
  }, [selectedNoteForPreview?.modelName]);

  const handleNoteTypeChange = (newModelName: string) => {
    setSelectedNoteType(newModelName);
    const newTheme = resolveThemeFromNoteType(newModelName, selectedTheme);
    setSelectedTheme(newTheme);
    const newCardType = /(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(newModelName) ? 'spelling' : 'normal';
    setPreviewCard((prev) => (prev ? { ...prev, modelName: newModelName, noteType: newModelName, cardType: newCardType } : null));
    if (selectedNoteForPreview) {
      setNotes((prev) =>
        prev.map((item) =>
          item.noteId === selectedNoteForPreview.noteId
            ? {
                ...item,
                isEdited: true,
                modelName: newModelName,
                cardData: item.cardData
                  ? { ...item.cardData, modelName: newModelName, noteType: newModelName, cardType: newCardType }
                  : undefined,
              }
            : item
        )
      );
    }
  };

  const isUserNavigatingRef = useRef<boolean>(false);
  const selectedNoteIdRef = useRef<number | null>(null);

  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteForPreview?.noteId || null;
  }, [selectedNoteForPreview]);

  // Compute preview index in notes
  const previewIndex = selectedNoteForPreview
    ? notes.findIndex((n) => n.noteId === selectedNoteForPreview.noteId)
    : -1;

  const handlePreviousNote = () => {
    if (previewIndex > 0) {
      const prevNote = notes[previewIndex - 1];
      isUserNavigatingRef.current = true;
      setSelectedNoteForPreview(prevNote);
      setPreviewCard(noteItemToCardData(prevNote));
      if (prevNote.modelName) {
        setSelectedNoteType(prevNote.modelName);
        setSelectedTheme(resolveThemeFromNoteType(prevNote.modelName, selectedTheme));
      }
    }
  };

  const handleNextNote = () => {
    if (previewIndex >= 0 && previewIndex < notes.length - 1) {
      const nextNote = notes[previewIndex + 1];
      isUserNavigatingRef.current = true;
      setSelectedNoteForPreview(nextNote);
      setPreviewCard(noteItemToCardData(nextNote));
      if (nextNote.modelName) {
        setSelectedNoteType(nextNote.modelName);
        setSelectedTheme(resolveThemeFromNoteType(nextNote.modelName, selectedTheme));
      }
    }
  };

  const handleSelectNote = (note: TaggedNoteItem) => {
    isUserNavigatingRef.current = true;
    setSelectedNoteForPreview(note);
    setPreviewCard(noteItemToCardData(note));
    if (note.modelName) {
      setSelectedNoteType(note.modelName);
      setSelectedTheme(resolveThemeFromNoteType(note.modelName, selectedTheme));
    }
    setSaveActionMessage(null);
  };

  // Keyboard shortcut Ctrl+Left / Ctrl+Right for note navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePreviousNote();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextNote();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, notes]);

  const handleShowInAnki = async (noteIdToOpen: number) => {
    setIsShowingInAnki(true);
    setSaveActionMessage(null);
    try {
      const res = await openInAnki({ noteId: noteIdToOpen, url: settings.anki.url });
      if (res.success) {
        setSaveActionMessage(`✓ Opened Note #${noteIdToOpen} in Anki Browser GUI`);
      } else {
        setSaveActionMessage(`✕ Could not open in Anki: ${res.error || 'Anki is not running or note not found'}`);
      }
    } catch (err: any) {
      setSaveActionMessage(`✕ Could not connect to Anki: ${err?.message}`);
    } finally {
      setIsShowingInAnki(false);
    }
  };

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
        const first = scannedNotes[0];
        setSelectedNoteForPreview(first);
        setPreviewCard(noteItemToCardData(first));
        if (first.modelName) {
          setSelectedNoteType(first.modelName);
          setSelectedTheme(resolveThemeFromNoteType(first.modelName, selectedTheme));
        }
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

    if (settings.ai?.enabled === false) {
      setScanError(t('completeByTag.aiRequiredNotice', 'Complete by Tag requires AI. Please enable AI in Settings.'));
      return;
    }

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
      if (!isUserNavigatingRef.current) {
        setSelectedNoteForPreview(item);
        setPreviewCard(noteItemToCardData(item));
      }

      const result = await processCardWithRetries(item, i, tagToProcess);

      if (abortControllerRef.current) {
        setIsCancelled(true);
        break;
      }

      // REQUIREMENT: Cards immediately available as soon as generated!
      if (result.success && result.cardData) {
        comp++;
        setCompletedCount(comp);

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

        if (!isUserNavigatingRef.current || selectedNoteIdRef.current === item.noteId) {
          setPreviewCard(result.cardData);
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
        }
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
      const noteModel = selectedNoteType || selectedNoteForPreview.modelName;
      const res = await updateAnkiNote(
        selectedNoteForPreview.noteId,
        previewCard,
        selectedTheme,
        settings.anki.url,
        undefined,
        noteModel
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
        const noteModel = n.modelName || selectedNoteType;
        const noteTheme = resolveThemeFromNoteType(noteModel, settings.theme || 'comic-pop-dark');
        const res = await updateAnkiNote(n.noteId, n.updatedCardData!, noteTheme, settings.anki.url, undefined, noteModel);
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
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row min-w-0">
      {/* LEFT COLUMN: 25% width - Minimal Tag Controls */}
      <div className="w-full md:w-1/4 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 min-w-0 flex flex-col select-none">
        <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">
          Complete by Tag
        </h2>

        {/* Tag input - NO DECK SELECTOR HERE */}
        <div className="space-y-1 mb-2">
          <label className="text-xs font-semibold block text-zinc-700 dark:text-zinc-300">
            Tag
          </label>
          <div className="relative">
            <input
              type="text"
              list="complete-by-tag-tags-list"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScanNotes();
                }
              }}
              onBlur={() => {
                if (selectedTag.trim() && !hasScanned) {
                  handleScanNotes();
                }
              }}
              disabled={isProcessing || isScanningNotes}
              placeholder="B1"
              className="w-full px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 focus:border-blue-500 bg-transparent text-xs font-medium rounded-none focus:outline-none transition-colors text-zinc-900 dark:text-zinc-100"
            />
            <datalist id="complete-by-tag-tags-list">
              {availableTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="text-xs text-zinc-500 mb-4">
          {notes.length} cards
        </div>

        {/* Field Settings: Collapsed by default */}
        <div className="mb-4 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setShowFieldConfig(!showFieldConfig)}
            className="w-full flex items-center justify-between py-1 font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-blue-500"
          >
            <span>Field Settings</span>
            <span className="text-[10px]">{showFieldConfig ? '▲' : '▼'}</span>
          </button>

          {showFieldConfig && (
            <div className="space-y-1.5 pt-2 pl-1 text-xs text-zinc-600 dark:text-zinc-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.phonetic}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, phonetic: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>Phonetic</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.meaningFa}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, meaningFa: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>Persian Meaning</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.definitionEn}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, definitionEn: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>English Definition</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.example}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, example: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>Example Sentence</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fieldConfig.mnemonic}
                  onChange={(e) => setFieldConfig((prev) => ({ ...prev, mnemonic: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded-none border border-zinc-400 dark:border-zinc-600 accent-blue-600"
                />
                <span>Mnemonic</span>
              </label>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="mb-4">
          {isProcessing ? (
            <button
              type="button"
              onClick={handleCancelProcessing}
              className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-none cursor-pointer"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStartCompletion(false)}
              disabled={notes.length === 0 || isScanningNotes}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-none cursor-pointer transition-colors"
            >
              Generate
            </button>
          )}
        </div>

        <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />

        {/* Progress Bar & Percentage */}
        <div className="space-y-1.5 mb-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Progress</span>
            <span className="font-mono text-zinc-500 font-medium">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-none overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Words List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Words
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-1 pr-1 text-xs border border-zinc-200 dark:border-zinc-800 p-1.5">
            {notes.length === 0 ? (
              <div className="text-zinc-400 text-xs py-4 text-center">
                {isScanningNotes ? 'Scanning notes with tag...' : 'Enter a tag to scan cards'}
              </div>
            ) : (
              notes.map((note, idx) => {
                const isSelected = selectedNoteForPreview?.noteId === note.noteId;
                const isCurrent = currentIndex === idx;

                return (
                  <div
                    key={note.noteId}
                    onClick={() => handleSelectNote(note)}
                    className={`px-2 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="truncate flex-1">
                      {note.word || `Note #${note.noteId}`}
                    </span>

                    {/* Status */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {note.status === 'success' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          ✓
                        </span>
                      )}
                      {(note.status === 'processing' || isCurrent) && (
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                          ...
                        </span>
                      )}
                      {note.status === 'error' && (
                        <div className="flex items-center gap-1">
                          <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            Error
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetrySingle(idx);
                            }}
                            className="text-[10px] underline text-blue-500 hover:text-blue-600 cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {note.status !== 'success' && note.status !== 'error' && !isCurrent && note.status !== 'processing' && (
                        <span className="text-zinc-400 font-mono text-[11px]">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* RIGHT COLUMN: 75% width - Shared Card Editor */}
      <div className="w-full md:w-3/4 flex-1 min-w-0 p-4 sm:p-6 flex flex-col">

          <UnifiedCardEditor
            key={`${selectedNoteForPreview?.noteId || 'tag'}_${selectedNoteType}`}
            cardData={previewCard}
            emptyWordPlaceholder={selectedNoteForPreview?.word || 'tag card'}
            themeId={selectedTheme}
            cardType={previewCard?.cardType || (settings.defaultCard?.cardType as CardType) || 'normal'}
            noteType={selectedNoteType}
            onNoteTypeChange={handleNoteTypeChange}
            deckName={selectedNoteForPreview?.deck}
            noteId={selectedNoteForPreview?.noteId}
            editable={true}
            canSaveToAnki={Boolean(selectedNoteForPreview?.noteId)}
            isSavingToAnki={isSavingCardToAnki}
            onShowInAnki={handleShowInAnki}
            isShowingInAnki={isShowingInAnki}
            onCardChange={handleCardChange}
            onSaveToAnki={handleSaveSingleNoteToAnki}
            isDirty={Boolean(selectedNoteForPreview?.isEdited)}
            saveSuccessMsg={saveActionMessage}
            availableTags={availableTags}
            ankiUrl={settings.anki?.url}
            navigation={notes.length > 0 ? {
              currentIndex: previewIndex,
              totalCount: notes.length,
              onPrevious: handlePreviousNote,
              onNext: handleNextNote,
              hasPrevious: previewIndex > 0,
              hasNext: previewIndex < notes.length - 1,
              itemNameLabel: 'Card',
            } : undefined}
          />
        </div>
      </div>
  );
};
