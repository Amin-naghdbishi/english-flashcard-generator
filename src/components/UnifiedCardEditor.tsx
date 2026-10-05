import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CardData,
  CardType,
  ThemeId,
  AppTheme,
} from '../types';
import { CardPreview } from './CardPreview';
import { THEMES, resolveThemeFromNoteType } from '../themes';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { getAnkiTags, getAnkiModelNames } from '../services/api';
import {
  Layers,
  Tags,
  Save,
  Edit3,
  Eye,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  CheckCircle2,
  X,
  Plus,
  SlidersHorizontal,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const APP_THEME_NOTE_TYPES = [
  { value: 'AI Vocabulary - Comic Pop (Dark) (Normal)', label: 'Comic Pop (Dark)' },
  { value: 'AI Vocabulary - Comic Pop (Light) (Normal)', label: 'Comic Pop (Light)' },
  { value: 'AI Vocabulary - Duo Quest (Light) (Normal)', label: 'Duo Quest (Light) [Duolingo]' },
  { value: 'AI Vocabulary - Duo Quest (Dark) (Normal)', label: 'Duo Quest (Dark)' },
  { value: 'AI Vocabulary - Hero Pop (Light) (Normal)', label: 'Hero Pop (Light)' },
  { value: 'AI Vocabulary - Hero Pop (Dark) (Normal)', label: 'Hero Pop (Dark)' },
  { value: 'AI Vocabulary - Index Notebook (Light) (Normal)', label: 'Index Notebook (Light)' },
  { value: 'AI Vocabulary - Index Notebook (Dark) (Normal)', label: 'Index Notebook (Dark)' },
  { value: 'AI Vocabulary - Botanical Sage (Light) (Normal)', label: 'Botanical Sage (Light)' },
  { value: 'AI Vocabulary - Botanical Sage (Dark) (Normal)', label: 'Botanical Sage (Dark)' },
  { value: 'AI Vocabulary - Minimal (Light) (Normal)', label: 'Minimal (Light)' },
  { value: 'AI Vocabulary - Minimal (Dark) (Normal)', label: 'Minimal (Dark)' },
];

export interface CardEditorNavigation {
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  itemNameLabel?: string;
}

export interface UnifiedCardEditorProps {
  cardData: CardData | null;
  emptyWordPlaceholder?: string;
  themeId?: ThemeId;
  cardType?: CardType;
  appTheme?: AppTheme;
  editable?: boolean;

  // Note Type handling
  noteType?: string;
  onNoteTypeChange?: (newNoteType: string) => void;
  availableNoteTypes?: string[];
  isNoteTypeDetected?: boolean;

  // Deck & Note identity
  deckName?: string;
  noteId?: number;
  onShowInAnki?: (noteId: number) => void;
  isShowingInAnki?: boolean;

  // Change & Save handlers
  onCardChange?: (updatedCard: CardData) => void;
  onSaveToAnki?: () => Promise<void | boolean> | void;
  isSavingToAnki?: boolean;
  canSaveToAnki?: boolean;
  isDirty?: boolean;
  saveSuccessMsg?: string | null;

  // Image actions forwarded to CardPreview
  onOpenImageSearch?: () => void;
  onUploadImage?: (file: File) => void;
  onRemoveImage?: () => void;

  // Navigation across multiple cards (Batch, Tag Completion, Card Browser)
  navigation?: CardEditorNavigation;

  // Anki Tags
  availableTags?: string[];
  ankiUrl?: string;

  // Optional extra buttons/content
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
}

export const UnifiedCardEditor: React.FC<UnifiedCardEditorProps> = ({
  cardData,
  emptyWordPlaceholder = 'Word',
  themeId: initialThemeId = 'comic-pop-dark',
  cardType: initialCardType = 'normal',
  appTheme: propAppTheme,
  editable = true,
  noteType: propNoteType,
  onNoteTypeChange,
  availableNoteTypes: propAvailableNoteTypes,
  isNoteTypeDetected = false,
  deckName,
  noteId,
  onShowInAnki,
  isShowingInAnki = false,
  onCardChange,
  onSaveToAnki,
  isSavingToAnki = false,
  canSaveToAnki = false,
  isDirty = false,
  saveSuccessMsg = null,
  onOpenImageSearch,
  onUploadImage,
  onRemoveImage,
  navigation,
  availableTags: propAvailableTags,
  ankiUrl = 'http://127.0.0.1:8765',
  headerExtra,
  footerExtra,
}) => {
  const themeContext = useAppTheme();
  const { t } = useTranslation();
  const isDark = (propAppTheme || themeContext.appTheme) === 'anki-dark';

  // Internal editor view states
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Active theme and card type
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(initialThemeId);
  const [currentCardType, setCurrentCardType] = useState<CardType>(initialCardType);

  useEffect(() => {
    if (initialThemeId) setCurrentTheme(initialThemeId);
  }, [initialThemeId]);

  useEffect(() => {
    if (initialCardType) setCurrentCardType(initialCardType);
  }, [initialCardType]);

  // Note Types loading
  const [ankiModelNames, setAnkiModelNames] = useState<string[]>(propAvailableNoteTypes || []);
  useEffect(() => {
    if (propAvailableNoteTypes && propAvailableNoteTypes.length > 0) {
      setAnkiModelNames(propAvailableNoteTypes);
    } else {
      getAnkiModelNames(ankiUrl).then((res) => {
        if (res.success && Array.isArray(res.modelNames)) {
          setAnkiModelNames(res.modelNames);
        }
      });
    }
  }, [propAvailableNoteTypes, ankiUrl]);

  // Active Note Type
  const currentNoteType = propNoteType || cardData?.modelName || cardData?.noteType || 'AI Vocabulary - Comic Pop (Dark) (Normal)';

  const handleSelectNoteType = (newModelName: string) => {
    if (onNoteTypeChange) {
      onNoteTypeChange(newModelName);
    }

    // Resolve matching theme
    const resolvedTheme = resolveThemeFromNoteType(newModelName, currentTheme);
    setCurrentTheme(resolvedTheme);

    // Detect card type (normal vs spelling)
    let detectedType = currentCardType;
    if (/(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(newModelName)) {
      detectedType = 'spelling';
    } else if (/(\b|_|\(|-)normal(\b|_|\)|-)/i.test(newModelName)) {
      detectedType = 'normal';
    }
    setCurrentCardType(detectedType);

    if (cardData && onCardChange) {
      onCardChange({
        ...cardData,
        modelName: newModelName,
        noteType: newModelName,
        cardType: detectedType,
      });
    }
  };

  // Tags popover state & tags autocomplete
  const [isTagsOpen, setIsTagsOpen] = useState<boolean>(false);
  const [availableAnkiTags, setAvailableAnkiTags] = useState<string[]>(propAvailableTags || []);
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const tagsPopoverRef = useRef<HTMLDivElement>(null);

  const fetchTags = useCallback(async () => {
    setIsLoadingTags(true);
    try {
      const res = await getAnkiTags(ankiUrl);
      if (res.success && Array.isArray(res.tags)) {
        setAvailableAnkiTags(res.tags);
      }
    } catch (e) {
      console.warn('Failed to load Anki tags:', e);
    } finally {
      setIsLoadingTags(false);
    }
  }, [ankiUrl]);

  useEffect(() => {
    if (propAvailableTags && propAvailableTags.length > 0) {
      setAvailableAnkiTags(propAvailableTags);
    }
  }, [propAvailableTags]);

  const activeTags = useMemo(() => {
    return cardData?.tags || [];
  }, [cardData?.tags]);

  const handleAddTag = (rawTag: string) => {
    const cleanTag = rawTag.trim();
    if (!cleanTag) return;
    if (activeTags.includes(cleanTag)) {
      setNewTagInput('');
      return;
    }
    const updated = [...activeTags, cleanTag];
    if (cardData && onCardChange) {
      onCardChange({ ...cardData, tags: updated });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = activeTags.filter((t) => t !== tagToRemove);
    if (cardData && onCardChange) {
      onCardChange({ ...cardData, tags: updated });
    }
  };

  // Close tags popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagsPopoverRef.current && !tagsPopoverRef.current.contains(event.target as Node)) {
        setIsTagsOpen(false);
      }
    }
    if (isTagsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTagsOpen]);

  // Overflow menu toggle
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (canSaveToAnki && onSaveToAnki) {
          e.preventDefault();
          onSaveToAnki();
        }
      }

      if (isInput) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft' && navigation?.hasPrevious) {
          e.preventDefault();
          navigation.onPrevious();
        } else if (e.key === 'ArrowRight' && navigation?.hasNext) {
          e.preventDefault();
          navigation.onNext();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation, canSaveToAnki, onSaveToAnki]);

  const displayWord = cardData?.word || emptyWordPlaceholder;
  const isSpelling = currentCardType === 'spelling';

  return (
    <div
      className={`w-full flex-1 flex flex-col rounded-xl border shadow-xs overflow-hidden min-w-0 transition-colors ${
        isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xs'
      }`}
    >
      {/* ======================================================== */}
      {/* UNIFIED HEADER BAR: Metadata & Primary Controls         */}
      {/* ======================================================== */}
      <div
        className={`px-3.5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0 select-none ${
          isDark ? 'bg-zinc-850/80 border-zinc-800' : 'bg-zinc-50/80 border-zinc-200'
        }`}
      >
        {/* Left Section: Word Title, Identifiers, Mode Pill */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-bold text-sm tracking-tight truncate max-w-[200px] text-zinc-900 dark:text-zinc-100">
            {displayWord}
          </span>

          {noteId && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              Note #{noteId}
            </span>
          )}

          {deckName && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 truncate max-w-[140px]">
              {deckName}
            </span>
          )}

          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
              isSpelling
                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
            }`}
            title={`Card Mode: ${isSpelling ? 'Spelling Practice' : 'Normal Card'}`}
          >
            {isSpelling ? '✍️ Spelling' : '📖 Normal'}
          </span>

          {isDirty && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved
            </span>
          )}

          {saveSuccessMsg && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saveSuccessMsg}
            </span>
          )}
        </div>

        {/* Right Section: Note Type, Tags, Mode Switch, Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Note Type Selector Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium hidden md:flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              Note Type:
            </span>
            <select
              value={currentNoteType}
              onChange={(e) => handleSelectNoteType(e.target.value)}
              className={`text-xs py-1 px-2 rounded-md border font-medium cursor-pointer outline-none transition-colors max-w-[170px] sm:max-w-[210px] truncate ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-zinc-600 focus:border-blue-500'
                  : 'bg-white border-zinc-300 text-zinc-800 hover:border-zinc-400 focus:border-blue-500 shadow-2xs'
              }`}
              title={`Active Note Type: ${currentNoteType}`}
            >
              {currentNoteType &&
                !ankiModelNames.includes(currentNoteType) &&
                !APP_THEME_NOTE_TYPES.some((t) => t.value === currentNoteType || t.label === currentNoteType) && (
                  <optgroup label="Current Note Type">
                    <option value={currentNoteType}>{currentNoteType}</option>
                  </optgroup>
                )}

              {ankiModelNames.length > 0 && (
                <optgroup label="Anki Note Types">
                  {ankiModelNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Application Note Types / Themes">
                {APP_THEME_NOTE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            </select>
            {isNoteTypeDetected && (
              <span
                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono hidden xl:inline"
                title="Initialized from existing Anki note"
              >
                (detected)
              </span>
            )}
          </div>

          {/* Tags Popover Trigger */}
          <div className="relative" ref={tagsPopoverRef}>
            <button
              type="button"
              onClick={() => {
                const next = !isTagsOpen;
                setIsTagsOpen(next);
                if (next && availableAnkiTags.length === 0) {
                  fetchTags();
                }
              }}
              className={`py-1 px-2 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isTagsOpen || activeTags.length > 0
                  ? isDark
                    ? 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                    : 'bg-purple-50 text-purple-700 border-purple-300'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
              }`}
              title="Manage tags for this card"
            >
              <Tags className="w-3.5 h-3.5" />
              <span>Tags</span>
              {activeTags.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-600/30 text-purple-700 dark:text-purple-200 font-mono font-bold">
                  {activeTags.length}
                </span>
              )}
            </button>

            {/* Tags Popover Content */}
            {isTagsOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-72 p-3 rounded-lg border shadow-xl z-50 space-y-2.5 ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-700/50">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Tags className="w-3.5 h-3.5 text-purple-400" />
                    <span>Card Tags</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={fetchTags}
                      disabled={isLoadingTags}
                      className="text-zinc-400 hover:text-zinc-200 text-xs p-1"
                      title="Refresh Anki tags"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingTags ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTagsOpen(false)}
                      className="text-zinc-400 hover:text-zinc-200 text-xs p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Assigned tags */}
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                  {activeTags.length === 0 ? (
                    <span className="text-[11px] text-zinc-500 italic">No tags assigned yet</span>
                  ) : (
                    activeTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 font-medium border border-purple-500/30"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-400 cursor-pointer ml-0.5"
                          title={`Remove tag ${tag}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add new tag input */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-700/40">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(newTagInput);
                      }
                    }}
                    placeholder="Add tag and hit Enter..."
                    className={`flex-1 text-xs px-2 py-1 rounded border outline-none focus:ring-1 focus:ring-purple-500 ${
                      isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                        : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagInput)}
                    disabled={!newTagInput.trim()}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Autocomplete / Suggested Tags */}
                {availableAnkiTags.length > 0 && (
                  <div className="pt-1.5 border-t border-zinc-700/40 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-semibold block uppercase">
                      From Anki Collection:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {availableAnkiTags
                        .filter((t) => !activeTags.includes(t))
                        .slice(0, 8)
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddTag(tag)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
                          >
                            + {tag}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit / Preview Mode Switch */}
          {editable && (
            <div
              className={`inline-flex border p-0.5 rounded-md ${
                isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  mode === 'edit'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Editor Mode"
              >
                <Edit3 className="w-3 h-3" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  mode === 'preview'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Live Anki Preview"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>
          )}

          {/* Front / Back / Both Toggle */}
          <div
            className={`inline-flex border p-0.5 rounded-md ${
              isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`text-xs px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'front'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-750'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`text-xs px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'back'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-750'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={`text-xs px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'both'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-750'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Both
            </button>
          </div>

          {/* Primary Action: Save to Anki Button */}
          {canSaveToAnki && onSaveToAnki && (
            <button
              type="button"
              onClick={onSaveToAnki}
              disabled={isSavingToAnki}
              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              title="Save changes to Anki collection (Ctrl+S)"
            >
              {isSavingToAnki ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSavingToAnki ? 'Saving...' : 'Save to Anki'}</span>
            </button>
          )}

          {/* Secondary Actions Overflow Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-1 text-xs rounded border transition-colors cursor-pointer ${
                isMenuOpen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                  : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
              }`}
              title="More Editor Options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-52 p-2 rounded-lg border shadow-xl z-50 space-y-1 ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
              >
                {/* Desktop / Mobile view toggle */}
                <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase border-b border-zinc-700/40">
                  Preview Simulation
                </div>
                <div className="flex gap-1 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('desktop');
                      setIsMenuOpen(false);
                    }}
                    className={`flex-1 py-1 px-2 rounded text-xs flex items-center justify-center gap-1 ${
                      viewMode === 'desktop'
                        ? 'bg-blue-600 text-white font-semibold'
                        : isDark
                        ? 'hover:bg-zinc-800 text-zinc-300'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('mobile');
                      setIsMenuOpen(false);
                    }}
                    className={`flex-1 py-1 px-2 rounded text-xs flex items-center justify-center gap-1 ${
                      viewMode === 'mobile'
                        ? 'bg-blue-600 text-white font-semibold'
                        : isDark
                        ? 'hover:bg-zinc-800 text-zinc-300'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>

                {/* Show in Anki GUI */}
                {noteId && onShowInAnki && (
                  <button
                    type="button"
                    onClick={() => {
                      onShowInAnki(noteId);
                      setIsMenuOpen(false);
                    }}
                    disabled={isShowingInAnki}
                    className="w-full text-left p-1.5 rounded flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Open in Anki GUI</span>
                  </button>
                )}

                {/* Toggle Formatting Toolbar */}
                {editable && mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(!isSidebarOpen);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left p-1.5 rounded flex items-center gap-2 hover:bg-zinc-800 text-xs font-medium cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isSidebarOpen ? 'Hide Tool Drawer' : 'Show Tool Drawer'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {headerExtra}
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD CANVAS & EDITOR BODY                               */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto min-h-0 relative p-2 sm:p-3">
        <CardPreview
          cardData={cardData}
          themeId={currentTheme}
          cardType={currentCardType}
          emptyWordPlaceholder={displayWord}
          appTheme={isDark ? 'anki-dark' : 'anki-light'}
          editable={editable}
          mode={mode}
          onModeChange={setMode}
          activeSide={activeSide}
          onActiveSideChange={setActiveSide}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          hideTopToolbar={true}
          canSaveToAnki={canSaveToAnki}
          noteId={noteId}
          onShowInAnki={onShowInAnki}
          isShowingInAnki={isShowingInAnki}
          isSavingToAnki={isSavingToAnki}
          onCardChange={onCardChange}
          onSaveToAnki={onSaveToAnki}
          onOpenImageSearch={onOpenImageSearch}
          onUploadImage={onUploadImage}
          onRemoveImage={onRemoveImage}
        />
      </div>

      {/* ======================================================== */}
      {/* OPTIONAL BOTTOM NAVIGATION BAR                           */}
      {/* ======================================================== */}
      {(navigation || footerExtra) && (
        <div
          className={`px-3.5 py-2 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs ${
            isDark ? 'bg-zinc-850/80 border-zinc-800' : 'bg-zinc-50/80 border-zinc-200'
          }`}
        >
          {navigation ? (
            <>
              <button
                type="button"
                onClick={navigation.onPrevious}
                disabled={!navigation.hasPrevious}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700'
                    : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 shadow-2xs'
                }`}
                title="Previous card (Ctrl+Left)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">
                  {navigation.itemNameLabel || 'Card'} {navigation.currentIndex + 1} of {navigation.totalCount}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                  (Ctrl+← / Ctrl+→)
                </span>
              </div>

              <button
                type="button"
                onClick={navigation.onNext}
                disabled={!navigation.hasNext}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700'
                    : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 shadow-2xs'
                }`}
                title="Next card (Ctrl+Right)"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div />
          )}

          {footerExtra && <div className="flex items-center gap-2">{footerExtra}</div>}
        </div>
      )}
    </div>
  );
};
