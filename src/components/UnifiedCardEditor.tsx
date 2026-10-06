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
import {
  THEMES,
  resolveThemeFromNoteType,
  makeSpellingSentence,
  getContrastTextColor,
  getHarmonizedBorder,
  SHARED_CARD_CSS,
  getThemeCardClasses,
  isRTLText,
  getDefaultNoteType,
} from '../themes';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { getAnkiTags, getAnkiModelNames, openInAnki } from '../services/api';
import {
  Volume2,
  Save,
  CheckCircle2,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink,
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
  align?: 'left' | 'right';
}

/**
 * ColorSwatchPicker with intelligent viewport positioning.
 * Automatically aligns left/right and flips top/bottom so it never clips outside the screen.
 */
export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  label,
  value,
  defaultValue = '#1E293B',
  onChange,
  align,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ right?: number | string; left?: number | string; top?: number | string; bottom?: number | string }>({
    left: 0,
    top: 'calc(100% + 4px)',
  });
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

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popupWidth = 220;
      const popupHeight = 190;
      const margin = 12;

      let left: number | string = 0;
      let right: number | string = 'auto';
      let top: number | string = 'calc(100% + 4px)';
      let bottom: number | string = 'auto';

      if (align === 'right' || rect.left + popupWidth + margin > window.innerWidth) {
        left = 'auto';
        right = 0;
      }

      if (rect.bottom + popupHeight + margin > window.innerHeight && rect.top > popupHeight) {
        top = 'auto';
        bottom = 'calc(100% + 4px)';
      }

      setCoords({ left, right, top, bottom });
    }
  }, [isOpen, align]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(!isOpen)}
        className="w-4 h-4 rounded-none border border-zinc-400 dark:border-zinc-600 cursor-pointer block hover:scale-105 transition-transform"
        style={{ backgroundColor: currentColor }}
        title={`${label}: ${currentColor}`}
      />

      {isOpen && (
        <div
          ref={popupRef}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== 'INPUT') {
              e.preventDefault();
            }
          }}
          className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-2xl rounded-none w-52 space-y-2 select-none"
          style={{
            position: 'absolute',
            left: coords.left,
            right: coords.right,
            top: coords.top,
            bottom: coords.bottom,
            zIndex: 9999,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            <span>{label}</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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
                onMouseDown={(e) => e.preventDefault()}
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

/**
 * Visual in-place contentEditable component.
 * Renders rich HTML visually (bold, colors, highlights) WITHOUT exposing raw tags.
 * Preserves cursor position during typing and automatically resizes with content.
 */
export const ContentEditableField: React.FC<{
  value?: string;
  onChange: (val: string) => void;
  onFocus?: (el: HTMLElement) => void;
  fieldName?: string;
  blockId?: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  dir?: 'rtl' | 'ltr' | 'auto';
  tagName?: 'div' | 'p' | 'span' | 'h1' | 'h2';
}> = ({
  value = '',
  onChange,
  onFocus,
  fieldName,
  blockId,
  placeholder = '',
  className = '',
  style = {},
  dir,
  tagName = 'div',
}) => {
  const elRef = useRef<HTMLElement>(null);
  const isComposingRef = useRef(false);

  // Sync external changes into DOM only when different from current DOM to preserve typing cursor
  useEffect(() => {
    if (elRef.current && elRef.current.innerHTML !== value) {
      elRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (!elRef.current || isComposingRef.current) return;
    const currentHtml = elRef.current.innerHTML;
    onChange(currentHtml);
  };

  const Component = tagName as any;

  return (
    <Component
      ref={elRef}
      contentEditable
      suppressContentEditableWarning
      dir={dir}
      data-field-name={fieldName}
      data-block-id={blockId}
      onInput={handleInput}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
        handleInput();
      }}
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        if (onFocus) onFocus(e.currentTarget);
      }}
      data-placeholder={placeholder}
      className={`theme-editable-field ${className}`}
      style={{
        outline: 'none',
        minHeight: '1.2em',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        cursor: 'text',
        ...style,
      }}
    />
  );
};

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
  const isAppDark = (propAppTheme || themeContext.appTheme) === 'anki-dark';

  // Card view state
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('back');
  const [activeMode, setActiveMode] = useState<CardType>(initialCardType);

  // Selected Text Color and Highlight Color state for toolbar
  const [selectedTextColor, setSelectedTextColor] = useState<string>('#EF4444');
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>('#FEF08A');

  // Sync activeMode whenever initialCardType prop changes
  useEffect(() => {
    if (initialCardType) {
      setActiveMode(initialCardType);
    }
  }, [initialCardType]);

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

  // Current note type & resolved theme definition
  const currentNoteType = propNoteType || cardData?.modelName || cardData?.noteType || 'AI Vocabulary - Comic Pop (Dark) (Normal)';

  const activeThemeId = useMemo(() => {
    return resolveThemeFromNoteType(currentNoteType, (initialThemeId as ThemeId) || 'comic-pop-dark');
  }, [currentNoteType, initialThemeId]);

  const theme = THEMES[activeThemeId] || THEMES['comic-pop-dark'];
  const themeClasses = useMemo(() => getThemeCardClasses(activeThemeId), [activeThemeId]);
  const isThemeLight = activeThemeId.endsWith('-light');

  // Compute full combined model names so currentNoteType is ALWAYS valid in the select
  const combinedModelNames = useMemo(() => {
    const set = new Set<string>();
    if (currentNoteType) set.add(currentNoteType);
    ankiModelNames.forEach((m) => set.add(m));
    APP_THEME_NOTE_TYPES.forEach((t) => set.add(t.value));
    return Array.from(set);
  }, [currentNoteType, ankiModelNames]);

  const handleSelectNoteType = (newModelName: string) => {
    if (onNoteTypeChange) {
      onNoteTypeChange(newModelName);
    }
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

  // Tags popup state & Anki collection tags
  const [isTagsOpen, setIsTagsOpen] = useState<boolean>(false);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
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

  const filteredTags = useMemo(() => {
    const q = tagSearchQuery.trim().toLowerCase();
    if (!q) return collectionTags;
    return collectionTags.filter((t) => t.toLowerCase().includes(q));
  }, [collectionTags, tagSearchQuery]);

  const handleAddTag = (rawTag: string) => {
    const cleanTag = rawTag.trim();
    if (!cleanTag) return;
    if (activeTags.includes(cleanTag)) return;
    const updated = [...activeTags, cleanTag];
    if (onCardChange) {
      onCardChange({
        ...(cardData || {
          word: '',
          phonetic: '',
          partOfSpeech: '',
          meaningFa: '',
          example: '',
          translationFa: '',
          mnemonic: '',
          cardType: activeMode,
        }),
        tags: updated,
      });
    }
    if (!collectionTags.includes(cleanTag)) {
      setCollectionTags((prev) => [...prev, cleanTag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = activeTags.filter((t) => t !== tagToRemove);
    if (onCardChange) {
      onCardChange({
        ...(cardData || {
          word: '',
          phonetic: '',
          partOfSpeech: '',
          meaningFa: '',
          example: '',
          translationFa: '',
          mnemonic: '',
          cardType: activeMode,
        }),
        tags: updated,
      });
    }
  };

  // Show Card in Anki action
  const [internalShowingInAnki, setInternalShowingInAnki] = useState(false);
  const [ankiFeedback, setAnkiFeedback] = useState<string | null>(null);

  const effectiveNoteId = noteId || (cardData as any)?.noteId;

  const handleShowInAnkiClick = async () => {
    if (!effectiveNoteId) return;
    if (onShowInAnki) {
      onShowInAnki(effectiveNoteId);
      return;
    }
    setInternalShowingInAnki(true);
    setAnkiFeedback(null);
    try {
      const res = await openInAnki({ noteId: effectiveNoteId, url: ankiUrl });
      if (res.success) {
        setAnkiFeedback('✓ Opened in Anki');
        setTimeout(() => setAnkiFeedback(null), 3000);
      } else {
        setAnkiFeedback(`✕ ${res.error || 'Failed'}`);
        setTimeout(() => setAnkiFeedback(null), 4000);
      }
    } catch (e: any) {
      setAnkiFeedback(`✕ ${e?.message || 'Error'}`);
      setTimeout(() => setAnkiFeedback(null), 4000);
    } finally {
      setInternalShowingInAnki(false);
    }
  };

  // Track active element & text selection range for toolbar commands
  const activeFieldRef = useRef<{
    element: HTMLElement;
    fieldName: string;
    blockId?: string;
  } | null>(null);

  const savedSelectionRef = useRef<{
    range: Range;
    editableEl: HTMLElement;
    fieldName: string;
    blockId?: string;
  } | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);

      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      const el = (node as HTMLElement)?.closest?.('.theme-editable-field') as HTMLElement | null;
      if (el) {
        const fieldName = el.getAttribute('data-field-name') || '';
        const blockId = el.getAttribute('data-block-id') || undefined;
        if (fieldName) {
          savedSelectionRef.current = {
            range: range.cloneRange(),
            editableEl: el,
            fieldName,
            blockId,
          };
          activeFieldRef.current = {
            element: el,
            fieldName,
            blockId,
          };
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  /**
   * Visual Rich Text Formatting.
   * Immediately applies visual formatting (bold, italic, colors, highlights)
   * while preserving selection and avoiding raw HTML markup.
   */
  const applyVisualFormat = (
    command: 'bold' | 'italic' | 'underline' | 'color' | 'highlight',
    value?: string
  ) => {
    const sel = window.getSelection();
    const saved = savedSelectionRef.current;

    // Restore saved selection range
    if (saved?.range && sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(saved.range);
        saved.editableEl.focus();
      } catch (e) {
        // Range could be detached
      }
    }

    document.execCommand('styleWithCSS', false, 'true');

    if (command === 'bold') {
      document.execCommand('bold', false);
    } else if (command === 'italic') {
      document.execCommand('italic', false);
    } else if (command === 'underline') {
      document.execCommand('underline', false);
    } else if (command === 'color' && value) {
      document.execCommand('foreColor', false, value);
    } else if (command === 'highlight' && value) {
      if (!document.execCommand('hiliteColor', false, value)) {
        document.execCommand('backColor', false, value);
      }
    }

    if (sel && sel.rangeCount > 0 && saved) {
      saved.range = sel.getRangeAt(0).cloneRange();
    }

    const targetEl = saved?.editableEl || activeFieldRef.current?.element;
    const fieldName = saved?.fieldName || activeFieldRef.current?.fieldName;
    const blockId = saved?.blockId || activeFieldRef.current?.blockId;

    if (targetEl && fieldName) {
      const newHtml = targetEl.innerHTML;

      if (fieldName === 'customBlock' && blockId && cardData && onCardChange) {
        const allBlocks = getAllCustomBlocks(cardData).map((b) =>
          b.id === blockId ? { ...b, content: newHtml } : b
        );
        onCardChange({
          ...cardData,
          customBlocks: allBlocks,
          frontCustomBlocks: allBlocks.filter((b) => b.side === 'front'),
          backCustomBlocks: allBlocks.filter((b) => b.side === 'back' || !b.side),
        });
      } else if (cardData && onCardChange) {
        onCardChange({
          ...cardData,
          [fieldName]: newHtml,
        });
      }
    }
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
      title: activeSide === 'front' ? 'Note / Context' : 'Extra Note',
      content: '',
      color: isThemeLight ? '#F1F5F9' : '#1E293B',
      borderColor: isThemeLight ? '#CBD5E1' : '#334155',
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

  // Card Background and Border Colors (MainBoxStyles)
  const cardCustomBg = cardData?.mainBoxStyles?.card?.bgColor;
  const cardCustomBorder = cardData?.mainBoxStyles?.card?.borderColor;

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
    const rawTarget = (cardData?.word || '').replace(/<[^>]+>/g, '').trim().toLowerCase();
    const typed = userSpellingInput.trim().toLowerCase();
    if (!typed) return;
    if (typed === rawTarget) {
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

  const spellingSentence = cardData?.spellingSentence || makeSpellingSentence(cardData?.example || '', cardData?.word || '');

  // Theme family detection
  const isQuest = activeThemeId.includes('quest') || activeThemeId.includes('manga') || activeThemeId.includes('arcade');
  const isPop = activeThemeId.includes('pop') || activeThemeId.includes('strip') || activeThemeId === 'comic-light' || activeThemeId === 'comic-dark';
  const isNotebook = activeThemeId.includes('notebook');
  const isBotanical = activeThemeId.includes('botanical');
  const isMinimal = activeThemeId.includes('minimal');

  return (
    <div className="w-full flex-1 flex flex-col min-w-0 select-text">
      {/* Theme CSS and In-Place Visual Editor Styles */}
      <style key={activeThemeId}>
        {`
          ${theme.css}
          ${SHARED_CARD_CSS}

          /* Editor canvas layout */
          .editor-canvas-wrapper .card {
            min-height: auto !important;
            height: auto !important;
            box-sizing: border-box !important;
          }
          .editor-canvas-wrapper .comic-card-wrapper,
          .editor-canvas-wrapper .botanical-wrapper,
          .editor-canvas-wrapper .minimal-card-wrapper {
            min-height: auto !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          }
          .editor-canvas-wrapper .quest-card,
          .editor-canvas-wrapper .comic-card,
          .editor-canvas-wrapper .notebook-sheet,
          .editor-canvas-wrapper .botanical-card,
          .editor-canvas-wrapper .minimal-card {
            min-height: auto !important;
            height: auto !important;
            box-sizing: border-box !important;
          }

          /* Light Card Theme Text Contrast - Ensure dark, crisp text */
          .editor-canvas-wrapper.theme-is-light,
          .editor-canvas-wrapper.theme-is-light .card,
          .editor-canvas-wrapper.theme-is-light .comic-card-wrapper,
          .editor-canvas-wrapper.theme-is-light .quest-card,
          .editor-canvas-wrapper.theme-is-light .comic-card,
          .editor-canvas-wrapper.theme-is-light .notebook-sheet,
          .editor-canvas-wrapper.theme-is-light .botanical-card,
          .editor-canvas-wrapper.theme-is-light .minimal-card {
            color: #0F172A !important;
          }

          .editor-canvas-wrapper.theme-is-light .theme-editable-field {
            color: inherit !important;
          }

          .editor-canvas-wrapper.theme-is-light .quest-level-pill,
          .editor-canvas-wrapper.theme-is-light .quest-btn,
          .editor-canvas-wrapper.theme-is-light .hero-badge,
          .editor-canvas-wrapper.theme-is-light .quest-level-pill .theme-editable-field {
            color: #FFFFFF !important;
          }

          /* Dark Card Theme Text Contrast */
          .editor-canvas-wrapper.theme-is-dark,
          .editor-canvas-wrapper.theme-is-dark .card,
          .editor-canvas-wrapper.theme-is-dark .comic-card-wrapper,
          .editor-canvas-wrapper.theme-is-dark .quest-card,
          .editor-canvas-wrapper.theme-is-dark .comic-card,
          .editor-canvas-wrapper.theme-is-dark .notebook-sheet,
          .editor-canvas-wrapper.theme-is-dark .botanical-card,
          .editor-canvas-wrapper.theme-is-dark .minimal-card {
            color: #F8FAFC !important;
          }

          .editor-canvas-wrapper.theme-is-dark .theme-editable-field {
            color: inherit !important;
          }

          /* Editable Field - Completely remove unwanted borders/outlines while typing */
          .theme-editable-field,
          .theme-editable-field:hover,
          .theme-editable-field:focus,
          .theme-editable-field:focus-visible,
          .theme-editable-field:active {
            outline: none !important;
            box-shadow: none !important;
            border-color: inherit;
          }
          [contenteditable]:focus,
          [contenteditable]:focus-visible,
          [contenteditable]:active {
            outline: none !important;
            box-shadow: none !important;
          }
          .theme-editable-field:empty::before {
            content: attr(data-placeholder);
            opacity: 0.45;
            cursor: text;
          }
        `}
      </style>

      {/* ======================================================== */}
      {/* 1. EDITOR HEADER                                         */}
      {/* Note Type          Tags       Show In Anki      Save     */}
      {/* ======================================================== */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        {/* Left: Note Type */}
        <div className="flex items-center gap-2 min-w-0">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
            Note Type
          </label>
          <div className="relative">
            <select
              value={currentNoteType}
              onChange={(e) => handleSelectNoteType(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-none cursor-pointer focus:outline-none focus:border-blue-500 hover:border-zinc-400 dark:hover:border-zinc-600"
            >
              {combinedModelNames.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          {(isNoteTypeDetected || Boolean(noteId)) && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-none font-semibold">
              Detected
            </span>
          )}
        </div>

        {/* Right: Tags, Show Card in Anki, and Save */}
        <div className="flex items-center gap-3">
          {/* Tags list + Add popup button */}
          <div className="relative flex items-center gap-1.5" ref={tagsPopupRef}>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Tags
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {activeTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-none font-medium"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-500 cursor-pointer ml-0.5 font-bold"
                    title={`Remove tag ${tag}`}
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

            {/* Tag Popup */}
            {isTagsOpen && (
              <div className="absolute right-0 top-7 z-50 p-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 shadow-2xl rounded-none w-72 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold border-b border-zinc-200 dark:border-zinc-800 pb-1.5 text-zinc-800 dark:text-zinc-200">
                  <span>Manage Tags</span>
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
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tagSearchQuery.trim()) {
                          handleAddTag(tagSearchQuery);
                          setTagSearchQuery('');
                        }
                      }
                    }}
                    placeholder="Search or add tag..."
                    className="flex-1 px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-none focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    disabled={!tagSearchQuery.trim()}
                    onClick={() => {
                      handleAddTag(tagSearchQuery);
                      setTagSearchQuery('');
                    }}
                    className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium rounded-none cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase">
                    <span>{tagSearchQuery.trim() ? 'Matching Tags' : 'Anki Collection Tags'}</span>
                    <span>{filteredTags.length}</span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-0.5 border border-zinc-200 dark:border-zinc-800 p-1">
                    {filteredTags.length > 0 ? (
                      filteredTags.map((t) => {
                        const isSelected = activeTags.includes(t);
                        return (
                          <div
                            key={t}
                            onClick={() => {
                              if (isSelected) handleRemoveTag(t);
                              else handleAddTag(t);
                            }}
                            className={`px-2 py-1 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <span className="truncate">{t}</span>
                            <span className="text-[11px] font-bold ml-1">{isSelected ? '✓' : '+'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2 text-center text-xs text-zinc-400">
                        {tagSearchQuery.trim() ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleAddTag(tagSearchQuery);
                              setTagSearchQuery('');
                            }}
                            className="text-blue-500 hover:underline cursor-pointer"
                          >
                            + Create tag "{tagSearchQuery.trim()}"
                          </button>
                        ) : (
                          'No tags in Anki collection'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Show Card in Anki Button */}
          <button
            type="button"
            onClick={handleShowInAnkiClick}
            disabled={!effectiveNoteId || isShowingInAnki || internalShowingInAnki}
            title={
              effectiveNoteId
                ? `Show Note #${effectiveNoteId} in Anki Browser GUI`
                : 'Card has not been created in Anki yet'
            }
            className={`px-2.5 py-1 text-xs font-medium rounded-none border flex items-center gap-1.5 transition-colors ${
              effectiveNoteId
                ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            {isShowingInAnki || internalShowingInAnki ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            <span>Show Card in Anki</span>
          </button>
          {ankiFeedback && (
            <span className="text-[11px] font-mono text-zinc-500">{ankiFeedback}</span>
          )}

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
      {/* 2. CARD SIDE & FORMATTING CONTROLS                       */}
      {/* Front   Back  | Standard Spelling | + Add Box | Formatting*/}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        {/* Front / Back Toggle & Standard / Spelling Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`px-3 py-1 font-medium rounded-none border transition-colors cursor-pointer ${
                activeSide === 'front'
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                  : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
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
                  : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              Back
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />

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
                  : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
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
                  : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              Spelling
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />

          {/* REQUIREMENT 3 & 8: + Add Box OUTSIDE the card in the Editor UI */}
          <button
            type="button"
            onClick={handleAddBox}
            className="px-2.5 py-1 text-xs font-semibold rounded-none border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
            title={`Add custom box to ${activeSide} of card`}
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>+ Add Box ({activeSide === 'front' ? 'Front' : 'Back'})</span>
          </button>
        </div>

        {/* Card Background / Border and Formatting Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">BG</span>
              <ColorSwatchPicker
                label="Card BG"
                value={cardCustomBg}
                defaultValue={isThemeLight ? '#FFFFFF' : '#18181B'}
                onChange={setCardBg}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-xs">Border</span>
              <ColorSwatchPicker
                label="Card Border"
                value={cardCustomBorder}
                defaultValue={isThemeLight ? '#000000' : '#27272A'}
                onChange={setCardBorder}
              />
            </div>
          </div>

          {/* Visual Formatting Toolbar */}
          <div className="flex items-center gap-0.5 border border-zinc-200 dark:border-zinc-800 px-1 py-0.5 bg-white dark:bg-zinc-900 rounded-none">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyVisualFormat('bold')}
              className="w-6 h-6 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center cursor-pointer rounded-none"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyVisualFormat('italic')}
              className="w-6 h-6 italic font-serif hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center cursor-pointer rounded-none"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyVisualFormat('underline')}
              className="w-6 h-6 underline hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center cursor-pointer rounded-none"
              title="Underline"
            >
              U
            </button>
            <div className="h-3.5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
            <div className="flex items-center gap-1.5 px-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyVisualFormat('color', selectedTextColor)}
                className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer px-1 py-0.5 rounded-none hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Apply selected color to highlighted text"
              >
                Color
              </button>
              <ColorSwatchPicker
                label="Text Color"
                value={selectedTextColor}
                defaultValue="#EF4444"
                onChange={setSelectedTextColor}
                align="right"
              />
            </div>
            <div className="flex items-center gap-1.5 px-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyVisualFormat('highlight', selectedHighlightColor)}
                className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer px-1 py-0.5 rounded-none hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Apply selected highlight to highlighted text"
              >
                Highlight
              </button>
              <ColorSwatchPicker
                label="Highlight"
                value={selectedHighlightColor}
                defaultValue="#FEF08A"
                onChange={setSelectedHighlightColor}
                align="right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. WORKSPACE CANVAS: REAL THEME CARD PREVIEW & EDITOR    */}
      {/* Directly renders the exact theme layout & CSS            */}
      {/* ======================================================== */}
      <div className="w-full flex-1 flex flex-col items-center justify-start min-h-0 py-4 px-2 sm:px-4 bg-zinc-100 dark:bg-zinc-900/60 overflow-y-auto">
        <div
          className={`editor-canvas-wrapper w-full max-w-2xl transition-all duration-150 ${
            isThemeLight ? 'theme-is-light' : 'theme-is-dark'
          }`}
          style={{
            ...(cardCustomBg ? { backgroundColor: cardCustomBg } : {}),
            ...(cardCustomBorder ? { borderColor: cardCustomBorder, borderStyle: 'solid', borderWidth: '2px' } : {}),
          }}
        >
          {/* ====================================================== */}
          {/* THEME A: DUOLINGO (Duo Quest Light & Dark)             */}
          {/* ====================================================== */}
          {isQuest && (
            <div className={`comic-card-wrapper theme-quest`}>
              <div className={`quest-card ${activeMode === 'spelling' ? 'spelling-quest' : ''}`}>
                {/* 1. Quest Top Bar */}
                <div className="quest-top-bar">
                  <div className={`quest-level-pill ${activeMode === 'spelling' ? 'pill-spelling' : ''} flex items-center gap-1`}>
                    {activeMode === 'spelling' ? (
                      <span>SPELLING EXERCISE</span>
                    ) : (
                      <>
                        <span>LEVEL 1 •</span>
                        <ContentEditableField
                          value={cardData?.partOfSpeech || ''}
                          onChange={(val) => updateField('partOfSpeech', val)}
                          onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'partOfSpeech' })}
                          placeholder="POS"
                          tagName="span"
                          className="font-black uppercase inline-block ml-1"
                        />
                      </>
                    )}
                  </div>
                  <div className="quest-points">
                    {activeMode === 'spelling' ? '★ 20 XP' : '★ 10 XP'}
                  </div>
                </div>

                {/* 2. Illustration */}
                {cardData?.imageBase64 ? (
                  <div className="relative group mb-3">
                    <img
                      src={cardData.imageBase64}
                      alt={cardData.word}
                      className="card-illustration"
                    />
                    {onRemoveImage && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={onRemoveImage}
                          className="px-2 py-1 text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer rounded"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  onOpenImageSearch && (
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={onOpenImageSearch}
                        className="text-[11px] font-bold text-zinc-500 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>+ Add Image</span>
                      </button>
                    </div>
                  )
                )}

                {/* 3. Normal Mode Front */}
                {activeSide === 'front' && activeMode === 'normal' && (
                  <>
                    <div className="quest-hero">
                      <ContentEditableField
                        value={cardData?.word || ''}
                        onChange={(val) => updateField('word', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'word' })}
                        placeholder={emptyWordPlaceholder}
                        tagName="h1"
                        className="quest-word text-center"
                      />
                      <ContentEditableField
                        value={cardData?.phonetic || ''}
                        onChange={(val) => updateField('phonetic', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'phonetic' })}
                        placeholder="/IPA/"
                        tagName="span"
                        className="quest-ipa text-center block"
                      />
                    </div>

                    <div className="quest-sound-dock">
                      <div className="sound-card us-card">
                        <span className="dock-flag">🇺🇸 American</span>
                        <div className="dock-actions">
                          {cardData?.wordAudioUsNormalBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                              className="px-2.5 py-1 text-xs font-black bg-[#58CC02] hover:bg-[#46A302] text-white rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Normal</span>
                            </button>
                          )}
                          {cardData?.wordAudioUsSlowBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUsSlowBase64)}
                              className="px-2 py-1 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-800 rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <span>🐢 Slow</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="sound-card uk-card">
                        <span className="dock-flag">🇬🇧 British</span>
                        <div className="dock-actions">
                          {cardData?.wordAudioUkNormalBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUkNormalBase64)}
                              className="px-2.5 py-1 text-xs font-black bg-[#38BDF8] hover:bg-[#0284C7] text-white rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Normal</span>
                            </button>
                          )}
                          {cardData?.wordAudioUkSlowBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUkSlowBase64)}
                              className="px-2 py-1 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-800 rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <span>🐢 Slow</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="quest-example-card">
                      <div className="example-quest-header">
                        <span className="quest-tag">SENTENCE CHALLENGE</span>
                      </div>
                      <ContentEditableField
                        value={cardData?.example || ''}
                        onChange={(val) => updateField('example', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                        placeholder="Context / Example Sentence..."
                        tagName="p"
                        className="quest-sentence"
                      />
                    </div>
                  </>
                )}

                {/* 4. Spelling Mode Front */}
                {activeSide === 'front' && activeMode === 'spelling' && (
                  <>
                    <div className="quest-prompt-center">
                      <div className="quest-instruction">Listen and type the missing word:</div>
                      <ContentEditableField
                        value={spellingSentence}
                        onChange={(val) => updateField('spellingSentence', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'spellingSentence' })}
                        placeholder="Listen and fill in the missing word..."
                        tagName="p"
                        className="quest-fill-sentence text-center"
                      />
                    </div>

                    <div className="quest-sound-dock-compact">
                      <span className="sound-label font-bold text-zinc-700 dark:text-zinc-300">🔊 Pronunciation:</span>
                      {cardData?.wordAudioUsNormalBase64 && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                          className="px-2.5 py-1 text-xs font-bold bg-[#58CC02] hover:bg-[#46A302] text-white rounded-lg border-2 border-black shadow-[0_2px_0_#000] cursor-pointer"
                        >
                          US Normal
                        </button>
                      )}
                      {cardData?.wordAudioUsSlowBase64 && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(cardData.wordAudioUsSlowBase64)}
                          className="px-2 py-1 text-xs font-bold bg-white text-zinc-800 rounded-lg border-2 border-black shadow-[0_2px_0_#000] cursor-pointer"
                        >
                          🐢 Slow
                        </button>
                      )}
                    </div>

                    <div className="spelling-interactive-area my-3 flex flex-col sm:flex-row gap-2">
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
                        placeholder="Type answer here..."
                        className="quest-input flex-1 px-3 py-2 border-3 border-black text-base font-black rounded-xl bg-white text-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={handleCheckSpelling}
                        className="quest-btn cursor-pointer font-black"
                      >
                        CHECK ANSWER
                      </button>
                    </div>

                    {spellingStatus === 'correct' && (
                      <div className="p-3 my-2 border-3 border-black bg-[#DCFCE7] text-[#15803D] font-black text-center rounded-xl shadow-[0_3px_0_#000]">
                        ✓ EXCELLENT! {cardData?.word?.replace(/<[^>]+>/g, '')}
                      </div>
                    )}
                    {spellingStatus === 'incorrect' && (
                      <div className="p-3 my-2 border-3 border-black bg-[#FFE4E6] text-[#BE123C] font-black text-center rounded-xl shadow-[0_3px_0_#000]">
                        ✕ TARGET WORD: {cardData?.word?.replace(/<[^>]+>/g, '')}
                      </div>
                    )}
                  </>
                )}

                {/* 5. Back Side (Both Normal & Spelling) */}
                {activeSide === 'back' && (
                  <>
                    <div className="quest-hero">
                      <ContentEditableField
                        value={cardData?.word || ''}
                        onChange={(val) => updateField('word', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'word' })}
                        placeholder={emptyWordPlaceholder}
                        tagName="h1"
                        className="quest-word text-center"
                      />
                      <ContentEditableField
                        value={cardData?.phonetic || ''}
                        onChange={(val) => updateField('phonetic', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'phonetic' })}
                        placeholder="/IPA/"
                        tagName="span"
                        className="quest-ipa text-center block"
                      />
                    </div>

                    <div className="quest-sound-dock">
                      <div className="sound-card us-card">
                        <span className="dock-flag">🇺🇸 American</span>
                        <div className="dock-actions">
                          {cardData?.wordAudioUsNormalBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                              className="px-2.5 py-1 text-xs font-black bg-[#58CC02] hover:bg-[#46A302] text-white rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Normal</span>
                            </button>
                          )}
                          {cardData?.wordAudioUsSlowBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUsSlowBase64)}
                              className="px-2 py-1 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-800 rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <span>🐢 Slow</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="sound-card uk-card">
                        <span className="dock-flag">🇬🇧 British</span>
                        <div className="dock-actions">
                          {cardData?.wordAudioUkNormalBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUkNormalBase64)}
                              className="px-2.5 py-1 text-xs font-black bg-[#38BDF8] hover:bg-[#0284C7] text-white rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Normal</span>
                            </button>
                          )}
                          {cardData?.wordAudioUkSlowBase64 && (
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cardData.wordAudioUkSlowBase64)}
                              className="px-2 py-1 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-800 rounded-lg border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1 cursor-pointer"
                            >
                              <span>🐢 Slow</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Persian Meaning Banner */}
                    <div className="quest-meaning-banner">
                      <span className="meaning-quest-label">PERSIAN MEANING</span>
                      <ContentEditableField
                        value={cardData?.meaningFa || ''}
                        onChange={(val) => updateField('meaningFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'meaningFa' })}
                        placeholder="معنی فارسی..."
                        dir="rtl"
                        tagName="p"
                        className="quest-meaning-fa"
                      />
                    </div>

                    {/* English Definition Card */}
                    <div className="quest-definition-card">
                      <span className="quest-tag-blue">ENGLISH DEFINITION</span>
                      <ContentEditableField
                        value={cardData?.definitionEn || ''}
                        onChange={(val) => updateField('definitionEn', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'definitionEn' })}
                        placeholder="English definition..."
                        tagName="p"
                        className="quest-definition-text"
                      />
                    </div>

                    {/* Example & Translation Card */}
                    <div className="quest-example-card">
                      <div className="example-quest-header">
                        <span className="quest-tag">EXAMPLE & TRANSLATION</span>
                      </div>
                      <ContentEditableField
                        value={cardData?.example || ''}
                        onChange={(val) => updateField('example', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                        placeholder="Example sentence..."
                        tagName="p"
                        className="quest-sentence"
                      />
                      <ContentEditableField
                        value={cardData?.translationFa || ''}
                        onChange={(val) => updateField('translationFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'translationFa' })}
                        placeholder="ترجمه مثال..."
                        dir="rtl"
                        tagName="p"
                        className="quest-translation-fa"
                      />
                    </div>

                    {/* Memory Hook Mnemonic Card */}
                    <div className="quest-mnemonic-card">
                      <span className="quest-tag-purple">💡 MEMORY HOOK</span>
                      <ContentEditableField
                        value={cardData?.mnemonic || ''}
                        onChange={(val) => updateField('mnemonic', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'mnemonic' })}
                        placeholder="کد یادسپاری یا نکته طلایی..."
                        tagName="p"
                        className="quest-mnemonic"
                      />
                    </div>
                  </>
                )}

                {/* 6. Custom Blocks (Front or Back) */}
                {currentSideBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="quest-mnemonic-card custom-card-block relative group mt-3"
                    style={{
                      backgroundColor: blk.color,
                      borderColor: blk.borderColor,
                      boxShadow: `0 3px 0 ${blk.borderColor || '#000'}`,
                      color: getContrastTextColor(blk.color),
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-1 mb-2">
                      <ContentEditableField
                        value={blk.title}
                        onChange={(val) => handleUpdateBox(blk.id, { title: val })}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlockTitle', blockId: blk.id })}
                        placeholder="Box Title..."
                        tagName="span"
                        className="font-black text-xs uppercase flex-1 text-inherit"
                      />
                      <div className="flex items-center gap-2">
                        <ColorSwatchPicker
                          label="Box BG"
                          value={blk.color}
                          defaultValue={isThemeLight ? '#FAF5FF' : '#1E293B'}
                          onChange={(c) => handleUpdateBox(blk.id, { color: c })}
                          align="right"
                        />
                        <ColorSwatchPicker
                          label="Box Border"
                          value={blk.borderColor}
                          defaultValue={blk.color || (isThemeLight ? '#000000' : '#334155')}
                          onChange={(c) => handleUpdateBox(blk.id, { borderColor: c })}
                          align="right"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteBox(blk.id)}
                          className="text-inherit opacity-60 hover:opacity-100 hover:text-rose-500 text-xs px-1 cursor-pointer font-bold"
                          title="Delete Box"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <ContentEditableField
                      value={blk.content}
                      onChange={(val) => handleUpdateBox(blk.id, { content: val })}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlock', blockId: blk.id })}
                      placeholder="Custom notes or details..."
                      dir={blk.dir || (isRTLText(blk.content) ? 'rtl' : 'ltr')}
                      style={{ color: getContrastTextColor(blk.color) }}
                      className="quest-mnemonic"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* THEME B: HERO POP / COMIC POP (Light & Dark)           */}
          {/* ====================================================== */}
          {isPop && (
            <div className={`comic-card-wrapper theme-pop`}>
              <div className={`comic-card ${activeMode === 'spelling' ? 'spelling-card' : ''}`}>
                {/* Header */}
                <div className="card-hero-header">
                  <span className={`hero-badge ${activeMode === 'spelling' ? 'badge-spelling' : ''}`}>
                    {activeMode === 'spelling' ? '🎯 SPELLING CHALLENGE' : '💥 VOCABULARY'}
                  </span>
                  <ContentEditableField
                    value={cardData?.partOfSpeech || ''}
                    onChange={(val) => updateField('partOfSpeech', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'partOfSpeech' })}
                    placeholder="POS"
                    tagName="span"
                    className="comic-badge badge-pos uppercase font-black"
                  />
                </div>

                {/* Illustration */}
                {cardData?.imageBase64 ? (
                  <div className="relative group mb-3">
                    <img src={cardData.imageBase64} alt={cardData.word} className="card-illustration" />
                    {onRemoveImage && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={onRemoveImage}
                          className="px-2 py-1 text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  onOpenImageSearch && (
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={onOpenImageSearch}
                        className="text-[11px] font-bold text-zinc-500 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>+ Add Image</span>
                      </button>
                    </div>
                  )
                )}

                {/* Word Section */}
                <div className="comic-word-section">
                  <div className="comic-title-row">
                    <ContentEditableField
                      value={cardData?.word || ''}
                      onChange={(val) => updateField('word', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'word' })}
                      placeholder={emptyWordPlaceholder}
                      tagName="h1"
                      className="comic-title"
                    />
                  </div>
                  <div className="comic-badges-row">
                    <ContentEditableField
                      value={cardData?.phonetic || ''}
                      onChange={(val) => updateField('phonetic', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'phonetic' })}
                      placeholder="/IPA/"
                      tagName="span"
                      className="comic-badge badge-ipa font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Audio Box */}
                <div className="comic-pronunciation-box">
                  <div className="audio-region region-us">
                    <div className="audio-region-title font-bold text-xs">🇺🇸 American English</div>
                    <div className="audio-buttons-row flex gap-2 mt-1">
                      {cardData?.wordAudioUsNormalBase64 && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                          className="px-2 py-0.5 text-xs font-bold bg-white border border-black hover:bg-zinc-100 cursor-pointer text-black"
                        >
                          Normal
                        </button>
                      )}
                      {cardData?.wordAudioUsSlowBase64 && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(cardData.wordAudioUsSlowBase64)}
                          className="px-2 py-0.5 text-xs font-bold bg-white border border-black hover:bg-zinc-100 cursor-pointer text-black"
                        >
                          Slow
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="audio-region region-uk">
                    <div className="audio-region-title font-bold text-xs">🇬🇧 British English</div>
                    <div className="audio-buttons-row flex gap-2 mt-1">
                      {cardData?.wordAudioUkNormalBase64 && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(cardData.wordAudioUkNormalBase64)}
                          className="px-2 py-0.5 text-xs font-bold bg-white border border-black hover:bg-zinc-100 cursor-pointer text-black"
                        >
                          Normal
                        </button>
                      )}
                      {cardData?.wordAudioUkSlowBase64 && (
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(cardData.wordAudioUkSlowBase64)}
                          className="px-2 py-0.5 text-xs font-bold bg-white border border-black hover:bg-zinc-100 cursor-pointer text-black"
                        >
                          Slow
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Normal Front Hint */}
                {activeSide === 'front' && activeMode === 'normal' && (
                  <div className="comic-hint-box">
                    <span className="hint-label">💡 CONTEXT / EXAMPLE</span>
                    <ContentEditableField
                      value={cardData?.example || ''}
                      onChange={(val) => updateField('example', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                      placeholder="Example sentence..."
                      tagName="p"
                      className="comic-example-en"
                    />
                  </div>
                )}

                {/* Spelling Front */}
                {activeSide === 'front' && activeMode === 'spelling' && (
                  <div className="spelling-prompt-box">
                    <div className="spelling-prompt-title">LISTEN & FILL IN THE MISSING WORD:</div>
                    <ContentEditableField
                      value={spellingSentence}
                      onChange={(val) => updateField('spellingSentence', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'spellingSentence' })}
                      placeholder="Missing word sentence..."
                      tagName="p"
                      className="spelling-sentence"
                    />
                    <div className="spelling-interactive-area my-3 flex gap-2">
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
                        placeholder="Type spelling answer..."
                        className="spelling-input flex-1 px-3 py-1.5 border-2 border-black text-sm font-bold bg-white text-black"
                      />
                      <button
                        type="button"
                        onClick={handleCheckSpelling}
                        className="spelling-check-btn px-3 py-1.5 bg-[#FF4B4B] text-white font-black border-2 border-black shadow-[2px_2px_0_#000] cursor-pointer"
                      >
                        CHECK
                      </button>
                    </div>
                    {spellingStatus === 'correct' && (
                      <div className="p-2 border-2 border-black bg-emerald-100 text-emerald-900 font-black text-center">
                        ✓ CORRECT: {cardData?.word?.replace(/<[^>]+>/g, '')}
                      </div>
                    )}
                    {spellingStatus === 'incorrect' && (
                      <div className="p-2 border-2 border-black bg-rose-100 text-rose-900 font-black text-center">
                        ✕ TARGET: {cardData?.word?.replace(/<[^>]+>/g, '')}
                      </div>
                    )}
                  </div>
                )}

                {/* Back Side */}
                {activeSide === 'back' && (
                  <>
                    <div className="comic-divider"></div>

                    <div className="comic-meaning-box">
                      <span className="box-label label-meaning">📖 PERSIAN MEANING</span>
                      <ContentEditableField
                        value={cardData?.meaningFa || ''}
                        onChange={(val) => updateField('meaningFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'meaningFa' })}
                        placeholder="معنی فارسی..."
                        dir="rtl"
                        tagName="p"
                        className="meaning-text"
                      />
                    </div>

                    <div className="comic-definition-box">
                      <span className="box-label label-definition">📖 ENGLISH DEFINITION</span>
                      <ContentEditableField
                        value={cardData?.definitionEn || ''}
                        onChange={(val) => updateField('definitionEn', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'definitionEn' })}
                        placeholder="English definition..."
                        tagName="p"
                        className="definition-text"
                      />
                    </div>

                    <div className="comic-example-box">
                      <div className="example-header">
                        <span className="box-label label-example">💬 EXAMPLE SENTENCE</span>
                      </div>
                      <ContentEditableField
                        value={cardData?.example || ''}
                        onChange={(val) => updateField('example', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                        placeholder="Example sentence..."
                        tagName="p"
                        className="example-en"
                      />
                      <ContentEditableField
                        value={cardData?.translationFa || ''}
                        onChange={(val) => updateField('translationFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'translationFa' })}
                        placeholder="ترجمه مثال..."
                        dir="rtl"
                        tagName="p"
                        className="example-fa"
                      />
                    </div>

                    <div className="comic-mnemonic-box">
                      <span className="box-label label-memory">🧠 MEMORY AID / MNEMONIC</span>
                      <ContentEditableField
                        value={cardData?.mnemonic || ''}
                        onChange={(val) => updateField('mnemonic', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'mnemonic' })}
                        placeholder="کد یادسپاری..."
                        tagName="p"
                        className="mnemonic-text"
                      />
                    </div>
                  </>
                )}

                {/* Custom Blocks */}
                {currentSideBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="comic-mnemonic-box custom-card-block relative group mt-3"
                    style={{
                      backgroundColor: blk.color,
                      borderColor: blk.borderColor,
                      borderLeftColor: blk.borderColor,
                      color: getContrastTextColor(blk.color),
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-black/10 dark:border-white/10 pb-1 mb-2">
                      <ContentEditableField
                        value={blk.title}
                        onChange={(val) => handleUpdateBox(blk.id, { title: val })}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlockTitle', blockId: blk.id })}
                        placeholder="Box Title..."
                        tagName="span"
                        className="font-black text-xs uppercase flex-1 text-inherit"
                      />
                      <div className="flex items-center gap-2">
                        <ColorSwatchPicker
                          label="Box BG"
                          value={blk.color}
                          defaultValue={isThemeLight ? '#F1F5F9' : '#1E293B'}
                          onChange={(c) => handleUpdateBox(blk.id, { color: c })}
                          align="right"
                        />
                        <ColorSwatchPicker
                          label="Box Border"
                          value={blk.borderColor}
                          defaultValue={blk.color || (isThemeLight ? '#CBD5E1' : '#334155')}
                          onChange={(c) => handleUpdateBox(blk.id, { borderColor: c })}
                          align="right"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteBox(blk.id)}
                          className="text-inherit opacity-60 hover:opacity-100 hover:text-rose-500 text-xs px-1 cursor-pointer font-bold"
                          title="Delete Box"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <ContentEditableField
                      value={blk.content}
                      onChange={(val) => handleUpdateBox(blk.id, { content: val })}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlock', blockId: blk.id })}
                      placeholder="Notes / Content..."
                      dir={blk.dir || (isRTLText(blk.content) ? 'rtl' : 'ltr')}
                      style={{ color: getContrastTextColor(blk.color) }}
                      className="custom-block-content"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* THEME C: INDEX NOTEBOOK (Light & Dark)                 */}
          {/* ====================================================== */}
          {isNotebook && (
            <div className={`comic-card-wrapper theme-notebook`}>
              <div className="notebook-sheet relative">
                <div className="notebook-holes">
                  <span className="hole"></span>
                  <span className="hole"></span>
                  <span className="hole"></span>
                </div>
                <div className={`notebook-tab-pos ${activeMode === 'spelling' ? 'tab-spelling' : ''}`}>
                  <ContentEditableField
                    value={cardData?.partOfSpeech || (activeMode === 'spelling' ? 'SPELLING' : 'POS')}
                    onChange={(val) => updateField('partOfSpeech', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'partOfSpeech' })}
                    tagName="span"
                    className="font-black text-inherit uppercase"
                  />
                </div>

                {cardData?.imageBase64 && (
                  <img src={cardData.imageBase64} alt={cardData.word} className="card-illustration" />
                )}

                <div className="notebook-header">
                  <ContentEditableField
                    value={cardData?.word || ''}
                    onChange={(val) => updateField('word', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'word' })}
                    placeholder={emptyWordPlaceholder}
                    tagName="h1"
                    className="notebook-word"
                  />
                  <ContentEditableField
                    value={cardData?.phonetic || ''}
                    onChange={(val) => updateField('phonetic', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'phonetic' })}
                    placeholder="/IPA/"
                    tagName="span"
                    className="notebook-tape-ipa"
                  />
                </div>

                <div className="notebook-margin-line"></div>

                {/* Tape audio strip */}
                <div className="notebook-audio-strip">
                  <div className="tape-clip us-tape">
                    <span>🇺🇸 US:</span>
                    {cardData?.wordAudioUsNormalBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                        className="px-2 py-0.5 text-xs font-bold border border-black bg-white hover:bg-zinc-100 cursor-pointer text-black"
                      >
                        Play
                      </button>
                    )}
                  </div>
                  <div className="tape-clip uk-tape">
                    <span>🇬🇧 UK:</span>
                    {cardData?.wordAudioUkNormalBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUkNormalBase64)}
                        className="px-2 py-0.5 text-xs font-bold border border-black bg-white hover:bg-zinc-100 cursor-pointer text-black"
                      >
                        Play
                      </button>
                    )}
                  </div>
                </div>

                {activeSide === 'front' && activeMode === 'normal' && (
                  <div className="notebook-sticky-example">
                    <span className="sticky-title font-bold text-xs block mb-1">CONTEXT</span>
                    <ContentEditableField
                      value={cardData?.example || ''}
                      onChange={(val) => updateField('example', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                      placeholder="Context sentence..."
                      tagName="p"
                      className="notebook-sentence text-sm"
                    />
                  </div>
                )}

                {activeSide === 'front' && activeMode === 'spelling' && (
                  <div className="notebook-sticky-example">
                    <span className="sticky-title font-bold text-xs block mb-1">SPELLING TEST</span>
                    <ContentEditableField
                      value={spellingSentence}
                      onChange={(val) => updateField('spellingSentence', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'spellingSentence' })}
                      placeholder="Fill sentence..."
                      tagName="p"
                      className="notebook-sentence text-sm"
                    />
                    <div className="flex gap-2 my-2">
                      <input
                        type="text"
                        value={userSpellingInput}
                        onChange={(e) => {
                          setUserSpellingInput(e.target.value);
                          setSpellingStatus('idle');
                        }}
                        placeholder="Type spelling..."
                        className="flex-1 px-2.5 py-1 text-xs border border-black bg-white font-bold text-black"
                      />
                      <button
                        type="button"
                        onClick={handleCheckSpelling}
                        className="px-3 py-1 bg-rose-500 text-white font-bold text-xs border border-black cursor-pointer"
                      >
                        Check
                      </button>
                    </div>
                  </div>
                )}

                {activeSide === 'back' && (
                  <>
                    <div className="notebook-highlighter-meaning">
                      <span className="highlighter-label">PERSIAN MEANING</span>
                      <ContentEditableField
                        value={cardData?.meaningFa || ''}
                        onChange={(val) => updateField('meaningFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'meaningFa' })}
                        placeholder="معنی فارسی..."
                        dir="rtl"
                        tagName="p"
                        className="notebook-meaning-fa"
                      />
                    </div>

                    <div className="notebook-definition-note">
                      <div className="sticky-header-row">
                        <span className="sticky-pin">📌</span>
                        <span className="sticky-title">Definition:</span>
                      </div>
                      <ContentEditableField
                        value={cardData?.definitionEn || ''}
                        onChange={(val) => updateField('definitionEn', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'definitionEn' })}
                        placeholder="Simple memorable English definition..."
                        tagName="p"
                        className="sticky-text"
                      />
                    </div>

                    <div className="notebook-sticky-example">
                      <span className="sticky-title font-bold text-xs block mb-1">EXAMPLE & TRANSLATION</span>
                      <ContentEditableField
                        value={cardData?.example || ''}
                        onChange={(val) => updateField('example', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                        placeholder="Example..."
                        tagName="p"
                        className="notebook-sentence text-xs"
                      />
                      <ContentEditableField
                        value={cardData?.translationFa || ''}
                        onChange={(val) => updateField('translationFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'translationFa' })}
                        placeholder="ترجمه..."
                        dir="rtl"
                        tagName="p"
                        className="text-xs text-zinc-600 dark:text-zinc-400 mt-1"
                      />
                    </div>

                    <div className="notebook-washi-mnemonic">
                      <span className="washi-title font-bold text-xs block mb-1">📌 MEMORY HOOK</span>
                      <ContentEditableField
                        value={cardData?.mnemonic || ''}
                        onChange={(val) => updateField('mnemonic', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'mnemonic' })}
                        placeholder="Mnemonic..."
                        tagName="p"
                        className="washi-text text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Custom Blocks */}
                {currentSideBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="notebook-washi-mnemonic custom-card-block relative group mt-3"
                    style={{
                      backgroundColor: blk.color,
                      borderColor: blk.borderColor,
                      color: getContrastTextColor(blk.color),
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-1 mb-1">
                      <ContentEditableField
                        value={blk.title}
                        onChange={(val) => handleUpdateBox(blk.id, { title: val })}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlockTitle', blockId: blk.id })}
                        placeholder="Title..."
                        tagName="span"
                        className="font-bold text-xs flex-1 text-inherit"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBox(blk.id)}
                        className="text-inherit opacity-60 hover:opacity-100 hover:text-rose-500 text-xs px-1 cursor-pointer font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <ContentEditableField
                      value={blk.content}
                      onChange={(val) => handleUpdateBox(blk.id, { content: val })}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlock', blockId: blk.id })}
                      placeholder="Notes..."
                      dir={blk.dir || (isRTLText(blk.content) ? 'rtl' : 'ltr')}
                      style={{ color: getContrastTextColor(blk.color) }}
                      className="washi-text text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* THEME D: BOTANICAL SAGE (Light & Dark)                 */}
          {/* ====================================================== */}
          {isBotanical && (
            <div className={`botanical-wrapper theme-botanical`}>
              <div className="botanical-card">
                {cardData?.imageBase64 && (
                  <img src={cardData.imageBase64} alt={cardData.word} className="card-illustration rounded-2xl" />
                )}

                <div className="botanical-box botanical-word-box">
                  <ContentEditableField
                    value={cardData?.word || ''}
                    onChange={(val) => updateField('word', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'word' })}
                    placeholder={emptyWordPlaceholder}
                    tagName="h1"
                    className="botanical-word text-center"
                  />
                  <ContentEditableField
                    value={cardData?.partOfSpeech || ''}
                    onChange={(val) => updateField('partOfSpeech', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'partOfSpeech' })}
                    placeholder="part of speech"
                    tagName="div"
                    className="botanical-pos text-center"
                  />
                  <div className="mt-3">
                    <ContentEditableField
                      value={cardData?.phonetic || ''}
                      onChange={(val) => updateField('phonetic', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'phonetic' })}
                      placeholder="/IPA/"
                      tagName="span"
                      className="botanical-ipa-pill text-center inline-block"
                    />
                  </div>
                </div>

                {/* Audio Box */}
                <div className="botanical-box botanical-audio-box">
                  <div className="flex justify-center items-center gap-3">
                    {cardData?.wordAudioUsNormalBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                        className="px-3 py-1.5 rounded-full bg-[#6E8060] text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>US Audio</span>
                      </button>
                    )}
                    {cardData?.wordAudioUkNormalBase64 && (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(cardData.wordAudioUkNormalBase64)}
                        className="px-3 py-1.5 rounded-full bg-[#5D6F4F] text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>UK Audio</span>
                      </button>
                    )}
                  </div>
                </div>

                {activeSide === 'front' && activeMode === 'normal' && (
                  <div className="botanical-box botanical-example-box">
                    <div className="botanical-example-title font-bold text-xs mb-1">EXAMPLE</div>
                    <ContentEditableField
                      value={cardData?.example || ''}
                      onChange={(val) => updateField('example', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                      placeholder="Context example..."
                      tagName="p"
                      className="botanical-sentence text-sm"
                    />
                  </div>
                )}

                {activeSide === 'front' && activeMode === 'spelling' && (
                  <div className="botanical-box">
                    <div className="botanical-example-title font-bold text-xs mb-1">SPELLING TEST</div>
                    <ContentEditableField
                      value={spellingSentence}
                      onChange={(val) => updateField('spellingSentence', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'spellingSentence' })}
                      placeholder="Spelling sentence..."
                      tagName="p"
                      className="text-center font-bold text-sm"
                    />
                    <div className="flex gap-2 my-2">
                      <input
                        type="text"
                        value={userSpellingInput}
                        onChange={(e) => {
                          setUserSpellingInput(e.target.value);
                          setSpellingStatus('idle');
                        }}
                        placeholder="Type spelling..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-400 bg-white text-zinc-900 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleCheckSpelling}
                        className="px-3 py-1.5 rounded-xl bg-[#6E8060] text-white font-bold text-xs cursor-pointer"
                      >
                        Check
                      </button>
                    </div>
                  </div>
                )}

                {activeSide === 'back' && (
                  <>
                    <div className="botanical-box botanical-meaning-box">
                      <div className="botanical-meaning-title font-bold text-xs mb-1">PERSIAN MEANING</div>
                      <ContentEditableField
                        value={cardData?.meaningFa || ''}
                        onChange={(val) => updateField('meaningFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'meaningFa' })}
                        placeholder="معنی فارسی..."
                        dir="rtl"
                        tagName="p"
                        className="botanical-meaning-fa text-xl font-bold"
                      />
                    </div>

                    <div className="botanical-definition-section botanical-definition-box mb-3">
                      <div className="botanical-definition-title font-bold text-xs mb-1">ENGLISH DEFINITION</div>
                      <ContentEditableField
                        value={cardData?.definitionEn || ''}
                        onChange={(val) => updateField('definitionEn', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'definitionEn' })}
                        placeholder="Simple memorable English definition..."
                        tagName="p"
                        className="botanical-definition-text text-sm"
                      />
                      <div className="botanical-section-divider my-2" />
                    </div>

                    <div className="botanical-box botanical-example-box">
                      <div className="botanical-example-title font-bold text-xs mb-1">EXAMPLE & TRANSLATION</div>
                      <ContentEditableField
                        value={cardData?.example || ''}
                        onChange={(val) => updateField('example', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                        placeholder="Example..."
                        tagName="p"
                        className="botanical-sentence text-xs"
                      />
                      <ContentEditableField
                        value={cardData?.translationFa || ''}
                        onChange={(val) => updateField('translationFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'translationFa' })}
                        placeholder="ترجمه مثال..."
                        dir="rtl"
                        tagName="p"
                        className="botanical-translation-fa text-xs mt-1"
                      />
                    </div>

                    <div className="botanical-box botanical-mnemonic-box">
                      <div className="botanical-mnemonic-title font-bold text-xs mb-1">MEMORY HOOK</div>
                      <ContentEditableField
                        value={cardData?.mnemonic || ''}
                        onChange={(val) => updateField('mnemonic', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'mnemonic' })}
                        placeholder="کد یادسپاری..."
                        tagName="p"
                        className="botanical-mnemonic-text text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Custom Blocks */}
                {currentSideBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="botanical-box custom-card-block relative group mt-3"
                    style={{
                      backgroundColor: blk.color,
                      borderColor: blk.borderColor,
                      color: getContrastTextColor(blk.color),
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-1 mb-1">
                      <ContentEditableField
                        value={blk.title}
                        onChange={(val) => handleUpdateBox(blk.id, { title: val })}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlockTitle', blockId: blk.id })}
                        placeholder="Title..."
                        tagName="span"
                        className="font-bold text-xs flex-1 text-inherit"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBox(blk.id)}
                        className="text-inherit opacity-60 hover:opacity-100 hover:text-rose-500 text-xs px-1 cursor-pointer font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <ContentEditableField
                      value={blk.content}
                      onChange={(val) => handleUpdateBox(blk.id, { content: val })}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlock', blockId: blk.id })}
                      placeholder="Notes..."
                      dir={blk.dir || (isRTLText(blk.content) ? 'rtl' : 'ltr')}
                      style={{ color: getContrastTextColor(blk.color) }}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* THEME E: MINIMAL (Light & Dark)                        */}
          {/* ====================================================== */}
          {isMinimal && (
            <div className={`minimal-card-wrapper theme-minimal`}>
              <div className="minimal-card">
                <div className="minimal-header flex items-center justify-between">
                  <ContentEditableField
                    value={cardData?.partOfSpeech || (activeMode === 'spelling' ? 'SPELLING' : 'PART OF SPEECH')}
                    onChange={(val) => updateField('partOfSpeech', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'partOfSpeech' })}
                    tagName="span"
                    className="minimal-pos font-bold uppercase inline-block"
                  />
                </div>

                {cardData?.imageBase64 && (
                  <img src={cardData.imageBase64} alt={cardData.word} className="card-illustration rounded-md" />
                )}

                <div className="minimal-word-block">
                  <ContentEditableField
                    value={cardData?.word || ''}
                    onChange={(val) => updateField('word', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'word' })}
                    placeholder={emptyWordPlaceholder}
                    tagName="h1"
                    className="minimal-word"
                  />
                  <ContentEditableField
                    value={cardData?.phonetic || ''}
                    onChange={(val) => updateField('phonetic', val)}
                    onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'phonetic' })}
                    placeholder="/IPA/"
                    tagName="span"
                    className="minimal-phonetic block"
                  />
                </div>

                {/* Audio row */}
                <div className="minimal-audio-row flex gap-3">
                  {cardData?.wordAudioUsNormalBase64 && (
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(cardData.wordAudioUsNormalBase64)}
                      className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1 font-medium"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>US Normal</span>
                    </button>
                  )}
                  {cardData?.wordAudioUkNormalBase64 && (
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(cardData.wordAudioUkNormalBase64)}
                      className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1 font-medium"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-sky-500" />
                      <span>UK Normal</span>
                    </button>
                  )}
                </div>

                <div className="minimal-divider"></div>

                {activeSide === 'front' && activeMode === 'normal' && (
                  <div className="minimal-example-block">
                    <div className="minimal-example-label font-bold text-xs mb-1">CONTEXT</div>
                    <ContentEditableField
                      value={cardData?.example || ''}
                      onChange={(val) => updateField('example', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                      placeholder="Context sentence..."
                      tagName="p"
                      className="minimal-sentence text-sm"
                    />
                  </div>
                )}

                {activeSide === 'front' && activeMode === 'spelling' && (
                  <div className="minimal-example-block">
                    <div className="minimal-example-label font-bold text-xs mb-1">SPELLING TEST</div>
                    <ContentEditableField
                      value={spellingSentence}
                      onChange={(val) => updateField('spellingSentence', val)}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'spellingSentence' })}
                      placeholder="Spelling sentence..."
                      tagName="p"
                      className="minimal-sentence text-sm"
                    />
                    <div className="flex gap-2 my-2">
                      <input
                        type="text"
                        value={userSpellingInput}
                        onChange={(e) => {
                          setUserSpellingInput(e.target.value);
                          setSpellingStatus('idle');
                        }}
                        placeholder="Type spelling..."
                        className="flex-1 px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleCheckSpelling}
                        className="px-3 py-1.5 bg-blue-600 text-white font-medium text-xs rounded cursor-pointer"
                      >
                        Check
                      </button>
                    </div>
                  </div>
                )}

                {activeSide === 'back' && (
                  <>
                    <div className="minimal-meaning-block">
                      <div className="minimal-meaning-label font-bold text-xs mb-1">PERSIAN MEANING</div>
                      <ContentEditableField
                        value={cardData?.meaningFa || ''}
                        onChange={(val) => updateField('meaningFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'meaningFa' })}
                        placeholder="معنی فارسی..."
                        dir="rtl"
                        tagName="p"
                        className="minimal-meaning-text text-xl font-bold"
                      />
                    </div>

                    <div className="minimal-definition-block">
                      <div className="minimal-definition-label">English Definition</div>
                      <ContentEditableField
                        value={cardData?.definitionEn || ''}
                        onChange={(val) => updateField('definitionEn', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'definitionEn' })}
                        placeholder="Simple memorable English definition..."
                        tagName="p"
                        className="minimal-definition-text"
                      />
                    </div>

                    <div className="minimal-example-block">
                      <div className="minimal-example-label font-bold text-xs mb-1">EXAMPLE & TRANSLATION</div>
                      <ContentEditableField
                        value={cardData?.example || ''}
                        onChange={(val) => updateField('example', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'example' })}
                        placeholder="Example..."
                        tagName="p"
                        className="minimal-sentence text-xs"
                      />
                      <ContentEditableField
                        value={cardData?.translationFa || ''}
                        onChange={(val) => updateField('translationFa', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'translationFa' })}
                        placeholder="ترجمه..."
                        dir="rtl"
                        tagName="p"
                        className="text-xs text-zinc-500 mt-1"
                      />
                    </div>

                    <div className="minimal-mnemonic-block">
                      <div className="minimal-mnemonic-label font-bold text-xs mb-1">MEMORY HOOK</div>
                      <ContentEditableField
                        value={cardData?.mnemonic || ''}
                        onChange={(val) => updateField('mnemonic', val)}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'mnemonic' })}
                        placeholder="Mnemonic..."
                        tagName="p"
                        className="minimal-mnemonic-text text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Custom Blocks */}
                {currentSideBlocks.map((blk) => (
                  <div
                    key={blk.id}
                    className="minimal-mnemonic-block custom-card-block relative group mt-3 p-3 border rounded"
                    style={{
                      backgroundColor: blk.color,
                      borderColor: blk.borderColor,
                      color: getContrastTextColor(blk.color),
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-1 mb-1">
                      <ContentEditableField
                        value={blk.title}
                        onChange={(val) => handleUpdateBox(blk.id, { title: val })}
                        onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlockTitle', blockId: blk.id })}
                        placeholder="Title..."
                        tagName="span"
                        className="font-bold text-xs flex-1 text-inherit"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteBox(blk.id)}
                        className="text-inherit opacity-60 hover:opacity-100 hover:text-rose-500 text-xs px-1 cursor-pointer font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <ContentEditableField
                      value={blk.content}
                      onChange={(val) => handleUpdateBox(blk.id, { content: val })}
                      onFocus={(el) => (activeFieldRef.current = { element: el, fieldName: 'customBlock', blockId: blk.id })}
                      placeholder="Notes..."
                      dir={blk.dir || (isRTLText(blk.content) ? 'rtl' : 'ltr')}
                      style={{ color: getContrastTextColor(blk.color) }}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* REQUIREMENT 3: + Add Box OUTSIDE the rendered card */}
        <div className="w-full max-w-2xl mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAddBox}
            className="w-full py-2 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 text-xs font-semibold rounded-none flex items-center justify-center gap-1.5 cursor-pointer transition-colors bg-white/40 dark:bg-zinc-900/40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Custom Box to {activeSide === 'front' ? 'Front' : 'Back'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. OPTIONAL BOTTOM NAVIGATION                            */}
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
