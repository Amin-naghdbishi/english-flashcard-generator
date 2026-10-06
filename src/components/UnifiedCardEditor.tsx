import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CardData,
  CardType,
  ThemeId,
  AppTheme,
  CustomCardBlock,
  getFrontCustomBlocks,
  getBackCustomBlocks,
  getAllCustomBlocks,
} from '../types';
import { THEMES, resolveThemeFromNoteType, makeSpellingSentence, getContrastTextColor, getHarmonizedBorder } from '../themes';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { getAnkiTags, getAnkiModelNames } from '../services/api';
import { applyHtmlFormattingToText, formatCardFieldHtml, HtmlToolbarAction } from '../utils/markdown';
import {
  Volume2,
  Save,
  CheckCircle2,
  X,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Upload,
  Trash2,
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

export const COLOR_PRESETS = [
  { name: 'Slate Dark', hex: '#1E293B' },
  { name: 'Indigo Deep', hex: '#1E1B4B' },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Emerald Deep', hex: '#064E3B' },
  { name: 'Forest Green', hex: '#14532D' },
  { name: 'Amber Deep', hex: '#78350F' },
  { name: 'Wine Dark', hex: '#881337' },
  { name: 'Purple Royal', hex: '#581C87' },
  { name: 'Warm Cream', hex: '#FEF3C7' },
  { name: 'Sky Light', hex: '#E0F2FE' },
  { name: 'Mint Light', hex: '#D1FAE5' },
  { name: 'Rose Light', hex: '#FFE4E6' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Zinc Gray', hex: '#27272A' },
  { name: 'Charcoal', hex: '#0F172A' },
];

export interface ColorSwatchPickerProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onChange: (color: string) => void;
}

export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  label,
  value,
  defaultValue = '#1E293B',
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentColor = value || defaultValue;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-4 h-4 rounded-none border border-zinc-400 dark:border-zinc-600 cursor-pointer block hover:scale-105 transition-transform"
        style={{ backgroundColor: currentColor }}
        title={`${label}: ${currentColor}`}
      />

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-xl rounded-none w-52 space-y-2 select-none">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            <span>{label}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : '#1E293B'}
              onChange={(e) => onChange(e.target.value)}
              className="w-7 h-7 p-0 border border-zinc-300 dark:border-zinc-700 rounded-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={value || ''}
              placeholder={defaultValue}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (!val) onChange(defaultValue);
                else if (val.startsWith('#') || /^[0-9A-Fa-f]{1,6}$/.test(val)) {
                  onChange(val.startsWith('#') ? val : `#${val}`);
                }
              }}
              className="flex-1 px-1.5 py-1 text-xs font-mono border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 rounded-none uppercase focus:outline-none"
              maxLength={7}
            />
          </div>

          <div className="grid grid-cols-5 gap-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => {
                  onChange(p.hex);
                  setIsOpen(false);
                }}
                className="w-5 h-5 rounded-none border border-black/20 hover:scale-110 cursor-pointer transition-transform"
                style={{ backgroundColor: p.hex }}
                title={`${p.name} (${p.hex})`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Image actions
  onOpenImageSearch?: () => void;
  onUploadImage?: (file: File) => void;
  onRemoveImage?: () => void;

  // Navigation across multiple cards
  navigation?: CardEditorNavigation;

  // Anki Tags
  availableTags?: string[];
  ankiUrl?: string;
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
}) => {
  const themeContext = useAppTheme();
  const { t } = useTranslation();
  const isDark = (propAppTheme || themeContext.appTheme) === 'anki-dark';

  // Card view state
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('back');
  const [activeMode, setActiveMode] = useState<CardType>(initialCardType);
  const [isEditing, setIsEditing] = useState<boolean>(true);

  // Available Note Types
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

  // Current note type
  const currentNoteType = propNoteType || cardData?.modelName || cardData?.noteType || 'AI Vocabulary - Comic Pop (Dark) (Normal)';

  const handleSelectNoteType = (newModelName: string) => {
    if (onNoteTypeChange) {
      onNoteTypeChange(newModelName);
    }
    // Detect spelling vs normal
    let detectedMode = activeMode;
    if (/(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(newModelName)) {
      detectedMode = 'spelling';
    } else if (/(\b|_|\(|-)normal(\b|_|\)|-)/i.test(newModelName)) {
      detectedMode = 'normal';
    }
    setActiveMode(detectedMode);

    if (cardData && onCardChange) {
      onCardChange({
        ...cardData,
        modelName: newModelName,
        noteType: newModelName,
        cardType: detectedMode,
      });
    }
  };

  // Tags popup state & Anki tags
  const [isTagsOpen, setIsTagsOpen] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [collectionTags, setCollectionTags] = useState<string[]>(propAvailableTags || []);
  const tagsPopupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propAvailableTags && propAvailableTags.length > 0) {
      setCollectionTags(propAvailableTags);
    } else {
      getAnkiTags(ankiUrl).then((res) => {
        if (res.success && Array.isArray(res.tags)) {
          setCollectionTags(res.tags);
        }
      });
    }
  }, [propAvailableTags, ankiUrl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagsPopupRef.current && !tagsPopupRef.current.contains(event.target as Node)) {
        setIsTagsOpen(false);
      }
    }
    if (isTagsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTagsOpen]);

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

  // Text formatting Toolbar
  const activeInputRef = useRef<{
    element: HTMLInputElement | HTMLTextAreaElement;
    fieldName: string;
    blockId?: string;
  } | null>(null);

  const applyFormat = (action: HtmlToolbarAction, extraValue?: string) => {
    const active = activeInputRef.current;
    if (!active || !active.element || !cardData || !onCardChange) return;

    const el = active.element;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const fullText = el.value || '';

    const { newText, newStart, newEnd } = applyHtmlFormattingToText(fullText, start, end, action, extraValue);

    if (active.fieldName === 'customBlock' && active.blockId) {
      const allBlocks = getAllCustomBlocks(cardData).map((b) =>
        b.id === active.blockId ? { ...b, content: newText } : b
      );
      onCardChange({
        ...cardData,
        customBlocks: allBlocks,
        frontCustomBlocks: allBlocks.filter((b) => b.side === 'front'),
        backCustomBlocks: allBlocks.filter((b) => b.side === 'back' || !b.side),
      });
    } else {
      onCardChange({
        ...cardData,
        [active.fieldName]: newText,
      });
    }

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // Card update helper
  const updateField = (field: keyof CardData, val: any) => {
    if (!cardData || !onCardChange) return;
    onCardChange({
      ...cardData,
      [field]: val,
    });
  };

  // Custom Blocks on Front vs Back
  const frontBlocks = useMemo(() => getFrontCustomBlocks(cardData), [cardData]);
  const backBlocks = useMemo(() => getBackCustomBlocks(cardData), [cardData]);
  const currentSideBlocks = activeSide === 'front' ? frontBlocks : backBlocks;

  const handleAddBox = () => {
    if (!cardData || !onCardChange) return;
    const newBox: CustomCardBlock = {
      id: `box_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      side: activeSide,
      title: activeSide === 'front' ? 'Note / Hint' : 'Extra Note',
      content: '',
      color: isDark ? '#1E293B' : '#F1F5F9',
      borderColor: isDark ? '#334155' : '#CBD5E1',
      dir: 'auto',
    };

    const allBlocks = [...getAllCustomBlocks(cardData), newBox];
    onCardChange({
      ...cardData,
      customBlocks: allBlocks,
      frontCustomBlocks: allBlocks.filter((b) => b.side === 'front'),
      backCustomBlocks: allBlocks.filter((b) => b.side === 'back' || !b.side),
    });
  };

  const handleUpdateBox = (id: string, updates: Partial<CustomCardBlock>) => {
    if (!cardData || !onCardChange) return;
    const allBlocks = getAllCustomBlocks(cardData).map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    onCardChange({
      ...cardData,
      customBlocks: allBlocks,
      frontCustomBlocks: allBlocks.filter((b) => b.side === 'front'),
      backCustomBlocks: allBlocks.filter((b) => b.side === 'back' || !b.side),
    });
  };

  const handleDeleteBox = (id: string) => {
    if (!cardData || !onCardChange) return;
    const allBlocks = getAllCustomBlocks(cardData).filter((b) => b.id !== id);
    onCardChange({
      ...cardData,
      customBlocks: allBlocks,
      frontCustomBlocks: allBlocks.filter((b) => b.side === 'front'),
      backCustomBlocks: allBlocks.filter((b) => b.side === 'back' || !b.side),
    });
  };

  // Card Background and Border Colors
  const cardBgColor = cardData?.mainBoxStyles?.card?.bgColor || (isDark ? '#18181B' : '#FFFFFF');
  const cardBorderColor = cardData?.mainBoxStyles?.card?.borderColor || (isDark ? '#27272A' : '#E4E4E7');

  const setCardBg = (color: string) => {
    if (!cardData || !onCardChange) return;
    const currentStyles = cardData.mainBoxStyles || {};
    onCardChange({
      ...cardData,
      mainBoxStyles: {
        ...currentStyles,
        card: {
          ...currentStyles.card,
          bgColor: color,
        },
      },
    });
  };

  const setCardBorder = (color: string) => {
    if (!cardData || !onCardChange) return;
    const currentStyles = cardData.mainBoxStyles || {};
    onCardChange({
      ...cardData,
      mainBoxStyles: {
        ...currentStyles,
        card: {
          ...currentStyles.card,
          borderColor: color,
        },
      },
    });
  };

  // Spelling mode interactive check
  const [userSpellingInput, setUserSpellingInput] = useState<string>('');
  const [spellingStatus, setSpellingStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  const handleCheckSpelling = () => {
    const target = (cardData?.word || '').trim().toLowerCase();
    const typed = userSpellingInput.trim().toLowerCase();
    if (!typed) return;
    if (typed === target) {
      setSpellingStatus('correct');
    } else {
      setSpellingStatus('incorrect');
    }
  };

  // Audio Play helper
  const handlePlayAudio = (base64Audio?: string) => {
    if (!base64Audio) return;
    try {
      const src = base64Audio.startsWith('data:') ? base64Audio : `data:audio/mp3;base64,${base64Audio}`;
      const audio = new Audio(src);
      audio.play().catch((e) => console.warn('Audio playback error:', e));
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  };

  const displayWord = cardData?.word || emptyWordPlaceholder;
  const spellingSentence = cardData?.spellingSentence || makeSpellingSentence(cardData?.example || '', cardData?.word || '');

  return (
    <div className="w-full flex-1 flex flex-col min-w-0 select-text">
      {/* ======================================================== */}
      {/* 6. EDITOR HEADER                                         */}
      {/* Note Type                       Tags                      */}
      {/* [ Duolingo Card ▼ ]            B1  vocabulary  +         */}
      {/* ======================================================== */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        {/* Left: Note Type */}
        <div className="flex items-center gap-2 min-w-0">
          <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
            Note Type
          </label>
          <div className="relative">
            <select
              value={currentNoteType}
              onChange={(e) => handleSelectNoteType(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-none cursor-pointer focus:outline-none focus:border-blue-500 hover:border-zinc-400 dark:hover:border-zinc-600"
            >
              {ankiModelNames.length > 0 ? (
                ankiModelNames.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              ) : (
                APP_THEME_NOTE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))
              )}
            </select>
          </div>
          {isNoteTypeDetected && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-none">
              Detected
            </span>
          )}
        </div>

        {/* Right: Tags & Save */}
        <div className="flex items-center gap-3">
          {/* Tags list + Add popup button */}
          <div className="relative flex items-center gap-1.5" ref={tagsPopupRef}>
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Tags
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {activeTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-none"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-500 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={() => setIsTagsOpen(!isTagsOpen)}
                className="w-5 h-5 flex items-center justify-center border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-none cursor-pointer"
                title="Add or manage tags"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 14. Compact Tag Popup */}
            {isTagsOpen && (
              <div className="absolute right-0 top-7 z-50 p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-xl rounded-none w-64 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                  <span>Tags</span>
                  <button
                    type="button"
                    onClick={() => setIsTagsOpen(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-1">
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
                    placeholder="Add tag..."
                    className="flex-1 px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 rounded-none focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(newTagInput)}
                    className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-none cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {collectionTags.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                      Existing tags
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-0.5 border border-zinc-200 dark:border-zinc-800 p-1">
                      {collectionTags.slice(0, 30).map((t) => {
                        const isSelected = activeTags.includes(t);
                        return (
                          <div
                            key={t}
                            onClick={() => {
                              if (isSelected) handleRemoveTag(t);
                              else handleAddTag(t);
                            }}
                            className={`px-1.5 py-0.5 text-xs flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span>{t}</span>
                            {isSelected && <span className="text-[10px]">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary Save Action */}
          {onSaveToAnki && (
            <button
              type="button"
              onClick={() => onSaveToAnki()}
              disabled={isSavingToAnki || !canSaveToAnki}
              className={`px-3 py-1 text-xs font-semibold rounded-none flex items-center gap-1.5 transition-colors cursor-pointer ${
                canSaveToAnki
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isSavingToAnki ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save to Anki</span>
                </>
              )}
            </button>
          )}

          {saveSuccessMsg && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveSuccessMsg}</span>
            </span>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. EDIT / PREVIEW CONTROLS                               */}
      {/* Front     Back           Standard     Spelling          */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        {/* Front / Back Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSide('front')}
            className={`px-3 py-1 font-medium rounded-none border transition-colors cursor-pointer ${
              activeSide === 'front'
                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('back')}
            className={`px-3 py-1 font-medium rounded-none border transition-colors cursor-pointer ${
              activeSide === 'back'
                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Back
          </button>
        </div>

        {/* Standard / Spelling Mode */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode('normal');
              updateField('cardType', 'normal');
            }}
            className={`px-3 py-1 font-medium rounded-none border transition-colors cursor-pointer ${
              activeMode === 'normal'
                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('spelling');
              updateField('cardType', 'spelling');
            }}
            className={`px-3 py-1 font-medium rounded-none border transition-colors cursor-pointer ${
              activeMode === 'spelling'
                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Spelling
          </button>
        </div>

        {/* Edit / Preview Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={`px-3 py-1 font-medium rounded-none border transition-colors cursor-pointer ${
              isEditing
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-800 dark:border-zinc-200 font-semibold'
                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className={`px-3 py-1 font-medium rounded-none border transition-colors cursor-pointer ${
              !isEditing
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-800 dark:border-zinc-200 font-semibold'
                : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 10. TOOLBAR & 9. CARD BG & BORDER COLORS                 */}
      {/* BG ■   Border ■       B  I  U  Color ■  Highlight ■       */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-zinc-200 dark:border-zinc-800 text-xs mb-4">
        {/* Card Background and Border Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">BG</span>
            <ColorSwatchPicker
              label="Card Background"
              value={cardBgColor}
              defaultValue={isDark ? '#18181B' : '#FFFFFF'}
              onChange={setCardBg}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">Border</span>
            <ColorSwatchPicker
              label="Card Border"
              value={cardBorderColor}
              defaultValue={isDark ? '#27272A' : '#E4E4E7'}
              onChange={setCardBorder}
            />
          </div>
        </div>

        {/* Minimal Formatting Toolbar */}
        <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 px-1 py-0.5 bg-zinc-50 dark:bg-zinc-900 rounded-none">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="w-6 h-6 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer rounded-none"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="w-6 h-6 italic font-serif hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer rounded-none"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="w-6 h-6 underline hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer rounded-none"
            title="Underline (Ctrl+U)"
          >
            U
          </button>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />

          {/* Text Color */}
          <div className="flex items-center gap-1 px-1">
            <span className="text-[11px] font-semibold text-zinc-500">Color</span>
            <ColorSwatchPicker
              label="Text Color"
              defaultValue="#38BDF8"
              onChange={(c) => applyFormat('color', c)}
            />
          </div>

          {/* Highlight */}
          <div className="flex items-center gap-1 px-1">
            <span className="text-[11px] font-semibold text-zinc-500">Highlight</span>
            <ColorSwatchPicker
              label="Highlight"
              defaultValue="#FEF08A"
              onChange={(c) => applyFormat('highlight', c)}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 8. CARD WORKSPACE                                        */}
      {/* Sits directly in the workspace, no large enclosing frame */}
      {/* ======================================================== */}
      <div className="w-full flex-1 flex flex-col items-center justify-start min-h-0 py-2">
        <div
          className="w-full max-w-2xl p-6 transition-all duration-150"
          style={{
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
            borderWidth: '1.5px',
            borderStyle: 'solid',
          }}
        >
          {/* ========================================== */}
          {/* FRONT SIDE RENDERING                      */}
          {/* ========================================== */}
          {activeSide === 'front' && (
            <div className="space-y-4">
              {activeMode === 'normal' ? (
                /* Standard Front */
                <div className="space-y-3">
                  {/* Word Title */}
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={cardData?.word || ''}
                        onChange={(e) => updateField('word', e.target.value)}
                        onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'word' })}
                        placeholder="Word"
                        className="text-2xl font-black w-full bg-transparent border-0 focus:outline-none tracking-tight text-zinc-900 dark:text-zinc-100"
                      />
                    ) : (
                      <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                        {displayWord}
                      </h1>
                    )}

                    {/* Phonetic & Part of Speech */}
                    <div className="flex items-center gap-2 mt-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={cardData?.phonetic || ''}
                          onChange={(e) => updateField('phonetic', e.target.value)}
                          onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'phonetic' })}
                          placeholder="/IPA/"
                          className="text-xs font-mono italic bg-transparent border-0 focus:outline-none text-zinc-500 w-32"
                        />
                      ) : (
                        cardData?.phonetic && (
                          <span className="text-xs font-mono italic text-zinc-500">{cardData.phonetic}</span>
                        )
                      )}

                      {isEditing ? (
                        <input
                          type="text"
                          value={cardData?.partOfSpeech || ''}
                          onChange={(e) => updateField('partOfSpeech', e.target.value)}
                          onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'partOfSpeech' })}
                          placeholder="part of speech"
                          className="text-xs uppercase bg-transparent border-0 focus:outline-none text-blue-500 w-28 font-bold"
                        />
                      ) : (
                        cardData?.partOfSpeech && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {cardData.partOfSpeech}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Audio Buttons (aligned on same horizontal line, no green circle outline) */}
                  <div className="flex items-center gap-2 py-1">
                    {cardData?.wordAudioUsNormalBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                        className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>US Normal</span>
                      </button>
                    )}
                    {cardData?.wordAudioUsSlowBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUsSlowBase64)}
                        className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>US Slow</span>
                      </button>
                    )}
                    {cardData?.wordAudioUkNormalBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUkNormalBase64)}
                        className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>UK Normal</span>
                      </button>
                    )}
                  </div>

                  {/* Smart Image (if present) */}
                  {cardData?.imageBase64 && (
                    <div className="my-2 border border-zinc-200 dark:border-zinc-800 p-2 flex flex-col items-center bg-black/5 dark:bg-white/5">
                      <img
                        src={cardData.imageBase64}
                        alt={cardData.word}
                        className="max-h-48 object-contain"
                      />
                      {isEditing && onRemoveImage && (
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={onRemoveImage}
                            className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* 13. Spelling Mode Front */
                <div className="space-y-4 text-center py-4">
                  {/* Audio Buttons */}
                  <div className="flex items-center justify-center gap-2">
                    {cardData?.wordAudioUsNormalBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Play Pronunciation</span>
                      </button>
                    )}
                    {cardData?.wordAudioUsSlowBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUsSlowBase64)}
                        className="px-2.5 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer rounded-none"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Slow</span>
                      </button>
                    )}
                  </div>

                  {/* Sentence with Blank */}
                  <div className="text-base font-medium py-3 text-zinc-800 dark:text-zinc-200">
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={spellingSentence}
                        onChange={(e) => updateField('spellingSentence', e.target.value)}
                        onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'spellingSentence' })}
                        className="w-full text-center bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-blue-500 text-sm font-medium resize-none"
                      />
                    ) : (
                      <span>{spellingSentence}</span>
                    )}
                  </div>

                  {cardData?.phonetic && (
                    <div className="text-xs font-mono text-zinc-500">
                      {cardData.phonetic}
                    </div>
                  )}

                  {/* Interactive Test Input */}
                  <div className="pt-2 max-w-sm mx-auto flex items-center gap-2">
                    <input
                      type="text"
                      value={userSpellingInput}
                      onChange={(e) => {
                        setUserSpellingInput(e.target.value);
                        setSpellingStatus('idle');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCheckSpelling();
                        }
                      }}
                      placeholder="Type the spelling..."
                      className="flex-1 px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 bg-transparent rounded-none focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleCheckSpelling}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none cursor-pointer"
                    >
                      Check
                    </button>
                  </div>

                  {/* Spelling Result: Only correct word in green/red box */}
                  {spellingStatus === 'correct' && (
                    <div className="p-2 border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                      {cardData?.word}
                    </div>
                  )}
                  {spellingStatus === 'incorrect' && (
                    <div className="p-2 border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-sm">
                      {cardData?.word}
                    </div>
                  )}
                </div>
              )}

              {/* 11. Front Custom Boxes */}
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                {frontBlocks.map((blk) => {
                  const boxBg = blk.color || (isDark ? '#1E293B' : '#F1F5F9');
                  const boxBorder = blk.borderColor || blk.color || (isDark ? '#334155' : '#CBD5E1');
                  const contrastText = getContrastTextColor(boxBg);

                  return (
                    <div
                      key={blk.id}
                      style={{ backgroundColor: boxBg, borderColor: boxBorder }}
                      className="p-3 border rounded-none space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-1.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={blk.title}
                            onChange={(e) => handleUpdateBox(blk.id, { title: e.target.value })}
                            placeholder="Title"
                            className="font-bold text-xs bg-transparent border-0 focus:outline-none flex-1"
                            style={{ color: contrastText }}
                          />
                        ) : (
                          <span className="font-bold text-xs" style={{ color: contrastText }}>
                            {blk.title}
                          </span>
                        )}

                        {isEditing && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-1 text-[11px]" style={{ color: contrastText }}>
                              <span className="opacity-80">BG</span>
                              <ColorSwatchPicker
                                label="Box BG"
                                value={blk.color}
                                defaultValue={isDark ? '#1E293B' : '#F1F5F9'}
                                onChange={(c) => handleUpdateBox(blk.id, { color: c })}
                              />
                            </div>
                            <div className="flex items-center gap-1 text-[11px]" style={{ color: contrastText }}>
                              <span className="opacity-80">Border</span>
                              <ColorSwatchPicker
                                label="Box Border"
                                value={blk.borderColor}
                                defaultValue={blk.color || (isDark ? '#334155' : '#CBD5E1')}
                                onChange={(c) => handleUpdateBox(blk.id, { borderColor: c })}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBox(blk.id)}
                              className="text-zinc-400 hover:text-rose-500 text-xs px-1 cursor-pointer"
                              title="Delete Box"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={blk.content}
                          onChange={(e) => handleUpdateBox(blk.id, { content: e.target.value })}
                          onFocus={(e) =>
                            (activeInputRef.current = {
                              element: e.target,
                              fieldName: 'customBlock',
                              blockId: blk.id,
                            })
                          }
                          placeholder="Content..."
                          className="w-full text-xs bg-transparent border-0 focus:outline-none resize-y leading-relaxed"
                          style={{ color: contrastText }}
                        />
                      ) : (
                        <div
                          className="text-xs leading-relaxed"
                          style={{ color: contrastText }}
                          dangerouslySetInnerHTML={{ __html: formatCardFieldHtml(blk.content) }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* + Add Box Button */}
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddBox}
                    className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 text-xs font-semibold rounded-none flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    + Add Box
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* BACK SIDE RENDERING                       */}
          {/* ========================================== */}
          {activeSide === 'back' && (
            <div className="space-y-4">
              {/* Word & Phonetics Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {displayWord}
                </h2>
                {cardData?.phonetic && (
                  <span className="text-xs font-mono italic text-zinc-500">{cardData.phonetic}</span>
                )}
              </div>

              {/* Main Content Boxes: Meaning, Definition, Example */}
              <div className="space-y-3">
                {/* Persian Meaning Box */}
                <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 rounded-none space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Persian Meaning
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      dir="rtl"
                      value={cardData?.meaningFa || ''}
                      onChange={(e) => updateField('meaningFa', e.target.value)}
                      onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'meaningFa' })}
                      placeholder="معنی فارسی..."
                      className="w-full bg-transparent border-0 focus:outline-none text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    />
                  ) : (
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100" dir="rtl">
                      {cardData?.meaningFa || '-'}
                    </div>
                  )}
                </div>

                {/* English Definition Box */}
                <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 rounded-none space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    English Definition
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={cardData?.definitionEn || ''}
                      onChange={(e) => updateField('definitionEn', e.target.value)}
                      onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'definitionEn' })}
                      placeholder="English definition..."
                      className="w-full bg-transparent border-0 focus:outline-none text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 resize-y"
                    />
                  ) : (
                    <div
                      className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200"
                      dangerouslySetInnerHTML={{ __html: formatCardFieldHtml(cardData?.definitionEn) }}
                    />
                  )}
                </div>

                {/* Example Sentence Box */}
                <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850/60 rounded-none space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Example Sentence
                  </div>
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <textarea
                        rows={2}
                        value={cardData?.example || ''}
                        onChange={(e) => updateField('example', e.target.value)}
                        onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'example' })}
                        placeholder="Example sentence..."
                        className="w-full bg-transparent border-0 focus:outline-none text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 resize-y"
                      />
                      <input
                        type="text"
                        dir="rtl"
                        value={cardData?.translationFa || ''}
                        onChange={(e) => updateField('translationFa', e.target.value)}
                        onFocus={(e) => (activeInputRef.current = { element: e.target, fieldName: 'translationFa' })}
                        placeholder="ترجمه مثال..."
                        className="w-full bg-transparent border-0 focus:outline-none text-xs text-zinc-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div
                        className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200"
                        dangerouslySetInnerHTML={{ __html: formatCardFieldHtml(cardData?.example) }}
                      />
                      {cardData?.translationFa && (
                        <div className="text-xs text-zinc-500" dir="rtl">
                          {cardData.translationFa}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 11. Back Custom Boxes */}
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                {backBlocks.map((blk) => {
                  const boxBg = blk.color || (isDark ? '#1E293B' : '#F1F5F9');
                  const boxBorder = blk.borderColor || blk.color || (isDark ? '#334155' : '#CBD5E1');
                  const contrastText = getContrastTextColor(boxBg);

                  return (
                    <div
                      key={blk.id}
                      style={{ backgroundColor: boxBg, borderColor: boxBorder }}
                      className="p-3 border rounded-none space-y-2 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-1.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={blk.title}
                            onChange={(e) => handleUpdateBox(blk.id, { title: e.target.value })}
                            placeholder="Title"
                            className="font-bold text-xs bg-transparent border-0 focus:outline-none flex-1"
                            style={{ color: contrastText }}
                          />
                        ) : (
                          <span className="font-bold text-xs" style={{ color: contrastText }}>
                            {blk.title}
                          </span>
                        )}

                        {isEditing && (
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-1 text-[11px]" style={{ color: contrastText }}>
                              <span className="opacity-80">BG</span>
                              <ColorSwatchPicker
                                label="Box BG"
                                value={blk.color}
                                defaultValue={isDark ? '#1E293B' : '#F1F5F9'}
                                onChange={(c) => handleUpdateBox(blk.id, { color: c })}
                              />
                            </div>
                            <div className="flex items-center gap-1 text-[11px]" style={{ color: contrastText }}>
                              <span className="opacity-80">Border</span>
                              <ColorSwatchPicker
                                label="Box Border"
                                value={blk.borderColor}
                                defaultValue={blk.color || (isDark ? '#334155' : '#CBD5E1')}
                                onChange={(c) => handleUpdateBox(blk.id, { borderColor: c })}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBox(blk.id)}
                              className="text-zinc-400 hover:text-rose-500 text-xs px-1 cursor-pointer"
                              title="Delete Box"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={blk.content}
                          onChange={(e) => handleUpdateBox(blk.id, { content: e.target.value })}
                          onFocus={(e) =>
                            (activeInputRef.current = {
                              element: e.target,
                              fieldName: 'customBlock',
                              blockId: blk.id,
                            })
                          }
                          placeholder="Content..."
                          className="w-full text-xs bg-transparent border-0 focus:outline-none resize-y leading-relaxed"
                          style={{ color: contrastText }}
                        />
                      ) : (
                        <div
                          className="text-xs leading-relaxed"
                          style={{ color: contrastText }}
                          dangerouslySetInnerHTML={{ __html: formatCardFieldHtml(blk.content) }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* + Add Box Button */}
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddBox}
                    className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 text-xs font-semibold rounded-none flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    + Add Box
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* OPTIONAL BOTTOM NAVIGATION                               */}
      {/* ======================================================== */}
      {navigation && navigation.totalCount > 1 && (
        <div className="w-full flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs select-none">
          <button
            type="button"
            onClick={navigation.onPrevious}
            disabled={!navigation.hasPrevious}
            className={`px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-none flex items-center gap-1 transition-colors cursor-pointer ${
              navigation.hasPrevious
                ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                : 'opacity-40 cursor-not-allowed text-zinc-400'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <span className="font-mono text-xs text-zinc-500">
            Card {navigation.currentIndex + 1} of {navigation.totalCount}
          </span>

          <button
            type="button"
            onClick={navigation.onNext}
            disabled={!navigation.hasNext}
            className={`px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-none flex items-center gap-1 transition-colors cursor-pointer ${
              navigation.hasNext
                ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                : 'opacity-40 cursor-not-allowed text-zinc-400'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
