import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CardData, ThemeDefinition, ThemeId, CardType, AppTheme, CustomCardBlock } from '../types';
import { THEMES, renderThemeHtml, getSpellingFrontHtml, SHARED_CARD_CSS, isRTLText, getContrastTextColor } from '../themes';
import { renderMarkdown, applyMarkdownToText, MarkdownAction } from '../utils/markdown';
import {
  Smartphone,
  Monitor,
  Edit3,
  Eye,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  Code,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  Image as ImageIcon,
  Search,
  Upload,
  Sparkles,
  Save,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  Palette,
  Highlighter,
  AlignLeft,
  AlignRight,
  ChevronRight,
  ChevronLeft,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';

export interface CardPreviewProps {
  cardData: CardData | null;
  themeId?: ThemeId;
  cardType?: CardType;
  emptyWordPlaceholder?: string;
  appTheme?: AppTheme;
  editable?: boolean;
  onCardChange?: (updatedCard: CardData) => void;
  onSaveToAnki?: () => void;
  isSavingToAnki?: boolean;
  canSaveToAnki?: boolean;
  onOpenImageSearch?: () => void;
  onUploadImage?: (file: File) => void;
  onRemoveImage?: () => void;
}

export const BOX_BG_PRESETS = [
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
];

export const TEXT_COLOR_PRESETS = [
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Slate Gray', hex: '#64748B' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Charcoal', hex: '#0F172A' },
];

export const HIGHLIGHT_PRESETS = [
  { name: 'Yellow', hex: '#FEF08A' },
  { name: 'Mint Green', hex: '#A7F3D0' },
  { name: 'Sky Blue', hex: '#BAE6FD' },
  { name: 'Rose Pink', hex: '#FBCFE8' },
  { name: 'Warm Orange', hex: '#FED7AA' },
];

function getThemeCardClasses(themeId: ThemeId) {
  if (themeId.includes('pop') || themeId === 'comic-light' || themeId === 'comic-dark') {
    return {
      wrapper: 'comic-card-wrapper theme-pop',
      card: 'comic-card',
      wordSection: 'comic-word-section',
      wordTitle: 'comic-title',
      ipaBadge: 'comic-badge badge-ipa',
      posBadge: 'comic-badge badge-pos',
      pronunciationBox: 'comic-pronunciation-box',
      meaningBox: 'comic-meaning-box',
      meaningLabel: 'box-label label-meaning',
      exampleBox: 'comic-example-box',
      exampleLabel: 'box-label label-example',
      mnemonicBox: 'comic-mnemonic-box',
      mnemonicLabel: 'box-label label-memory',
      customBox: 'comic-mnemonic-box custom-card-block',
      customLabel: 'box-label',
    };
  }
  if (themeId.includes('strip')) {
    return {
      wrapper: 'comic-card-wrapper theme-strip',
      card: 'comic-card strip-container',
      wordSection: 'strip-panel panel-header',
      wordTitle: 'strip-title',
      ipaBadge: 'strip-ipa',
      posBadge: 'strip-pos',
      pronunciationBox: 'strip-audio-grid',
      meaningBox: 'strip-panel panel-meaning',
      meaningLabel: 'panel-tag',
      exampleBox: 'strip-panel panel-dialogue',
      exampleLabel: 'panel-tag',
      mnemonicBox: 'strip-mnemonic-footer',
      mnemonicLabel: 'mnem-star',
      customBox: 'strip-panel panel-custom custom-card-block',
      customLabel: 'panel-tag',
    };
  }
  if (themeId.includes('quest') || themeId.includes('manga')) {
    return {
      wrapper: 'comic-card-wrapper theme-quest',
      card: 'comic-card quest-card',
      wordSection: 'quest-hero',
      wordTitle: 'quest-word',
      ipaBadge: 'quest-ipa',
      posBadge: 'quest-level-pill',
      pronunciationBox: 'quest-sound-dock',
      meaningBox: 'quest-meaning-banner',
      meaningLabel: 'meaning-quest-label',
      exampleBox: 'quest-example-card',
      exampleLabel: 'quest-tag',
      mnemonicBox: 'quest-mnemonic-card',
      mnemonicLabel: 'quest-tag-purple',
      customBox: 'quest-mnemonic-card custom-card-block',
      customLabel: 'quest-tag-purple',
    };
  }
  if (themeId.includes('notebook')) {
    return {
      wrapper: 'comic-card-wrapper theme-notebook',
      card: 'comic-card notebook-sheet',
      wordSection: 'notebook-header',
      wordTitle: 'notebook-title',
      ipaBadge: 'notebook-ipa',
      posBadge: 'notebook-tab-pos',
      pronunciationBox: 'comic-pronunciation-box',
      meaningBox: 'notebook-meaning-note',
      meaningLabel: 'sticky-title',
      exampleBox: 'notebook-example-ruled',
      exampleLabel: 'notebook-label',
      mnemonicBox: 'notebook-washi-mnemonic',
      mnemonicLabel: 'washi-title',
      customBox: 'notebook-washi-mnemonic custom-card-block',
      customLabel: 'washi-title',
    };
  }
  if (themeId.includes('arcade')) {
    return {
      wrapper: 'comic-card-wrapper theme-arcade',
      card: 'comic-card arcade-cabinet',
      wordSection: 'arcade-header',
      wordTitle: 'arcade-word',
      ipaBadge: 'arcade-ipa',
      posBadge: 'arcade-badge',
      pronunciationBox: 'comic-pronunciation-box',
      meaningBox: 'arcade-item-stats',
      meaningLabel: 'item-stat-header',
      exampleBox: 'arcade-dialog-box',
      exampleLabel: 'arcade-terminal-header',
      mnemonicBox: 'arcade-powerup-box',
      mnemonicLabel: 'quest-terminal-header',
      customBox: 'arcade-powerup-box custom-card-block',
      customLabel: 'quest-terminal-header',
    };
  }
  // Minimal theme
  return {
    wrapper: 'minimal-card-wrapper theme-minimal',
    card: 'comic-card minimal-card',
    wordSection: 'minimal-word-header',
    wordTitle: 'minimal-word',
    ipaBadge: 'minimal-ipa',
    posBadge: 'minimal-pos',
    pronunciationBox: 'comic-pronunciation-box',
    meaningBox: 'minimal-meaning-block',
    meaningLabel: 'minimal-meaning-label',
    exampleBox: 'minimal-example-block',
    exampleLabel: 'minimal-example-label',
    mnemonicBox: 'minimal-mnemonic-block',
    mnemonicLabel: 'minimal-mnemonic-label',
    customBox: 'minimal-mnemonic-block custom-card-block',
    customLabel: 'minimal-mnemonic-label',
  };
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  cardData,
  themeId = 'comic-pop-dark',
  cardType = 'normal',
  emptyWordPlaceholder = 'eraser',
  appTheme: propTheme,
  editable = true,
  onCardChange,
  onSaveToAnki,
  isSavingToAnki = false,
  canSaveToAnki = false,
  onOpenImageSearch,
  onUploadImage,
  onRemoveImage,
}) => {
  const themeContext = useAppTheme();
  const { t, isRTL } = useTranslation();
  const isDark = (propTheme || themeContext.appTheme) === 'anki-dark';

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCardType, setPreviewCardType] = useState<CardType>(cardType);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  // Local editable draft card data (initialized with cardData or rich placeholder)
  const [internalCard, setInternalCard] = useState<CardData>(() => {
    return (
      cardData || {
        word: emptyWordPlaceholder,
        phonetic: '/ɪˈreɪzər/',
        partOfSpeech: 'noun',
        meaningFa: 'پاک‌کن، ابزار پاک کردن',
        example: 'I made a pencil mistake and need an eraser.',
        translationFa: 'من با مداد اشتباه نوشتم و به یک پاک‌کن نیاز دارم.',
        mnemonic: '**ERASE-ER**: It **erases** errors easily on paper.',
        cardType: previewCardType,
        spellingSentence: 'I made a pencil mistake and need an ______.',
        imageBase64: undefined,
        customBlocks: [],
      }
    );
  });

  // Track the currently focused field / textarea for toolbar formatting actions
  const activeInputRef = useRef<{
    element: HTMLInputElement | HTMLTextAreaElement | null;
    fieldName: string;
    blockId?: string;
  }>({ element: null, fieldName: 'meaningFa' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop updates
  useEffect(() => {
    if (cardData) {
      setInternalCard((prev) => ({
        ...prev,
        ...cardData,
        customBlocks: cardData.customBlocks !== undefined ? cardData.customBlocks : prev.customBlocks || [],
      }));
    }
  }, [cardData]);

  // Keep selectedBoxId in sync
  useEffect(() => {
    if (internalCard.customBlocks && internalCard.customBlocks.length > 0) {
      if (!selectedBoxId || !internalCard.customBlocks.some((b) => b.id === selectedBoxId)) {
        setSelectedBoxId(internalCard.customBlocks[0].id);
      }
    } else {
      setSelectedBoxId(null);
    }
  }, [internalCard.customBlocks, selectedBoxId]);

  useEffect(() => {
    if (cardData?.cardType) {
      setPreviewCardType(cardData.cardType);
    } else if (cardType) {
      setPreviewCardType(cardType);
    }
  }, [cardData?.cardType, cardType]);

  // Notify parent of card edits
  const handleUpdate = useCallback(
    (updater: (prev: CardData) => CardData) => {
      setInternalCard((prev) => {
        const next = updater(prev);
        if (onCardChange) {
          onCardChange(next);
        }
        return next;
      });
    },
    [onCardChange]
  );

  const updateSimpleField = (field: keyof CardData, value: any) => {
    handleUpdate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // --- Toolbar Markdown & Color Formatting Action ---
  const handleMarkdownToolbarAction = (action: MarkdownAction, extraValue?: string) => {
    const active = activeInputRef.current;
    if (!active || !active.element) return;

    const el = active.element;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const fullText = el.value || '';

    const { newText, newStart, newEnd } = applyMarkdownToText(fullText, start, end, action, extraValue);

    if (active.fieldName === 'customBlock' && active.blockId) {
      handleUpdate((prev) => ({
        ...prev,
        customBlocks: (prev.customBlocks || []).map((b) =>
          b.id === active.blockId ? { ...b, content: newText } : b
        ),
      }));
    } else {
      updateSimpleField(active.fieldName as keyof CardData, newText);
    }

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  // --- Custom Blocks Management ---
  const handleAddCustomBlock = (titleOverride?: string) => {
    const newId = `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBlock: CustomCardBlock = {
      id: newId,
      title: titleOverride || 'EXTRA NOTE / SYNONYMS',
      content: '- Key point 1\n- Key point 2',
      color: BOX_BG_PRESETS[Math.floor(Math.random() * BOX_BG_PRESETS.length)].hex,
      dir: 'auto',
    };

    handleUpdate((prev) => ({
      ...prev,
      customBlocks: [...(prev.customBlocks || []), newBlock],
    }));

    setSelectedBoxId(newId);

    if (mode === 'preview') {
      setMode('edit');
    }
  };

  const handleUpdateCustomBlock = (id: string, updates: Partial<CustomCardBlock>) => {
    handleUpdate((prev) => ({
      ...prev,
      customBlocks: (prev.customBlocks || []).map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  };

  const handleMoveCustomBlock = (index: number, direction: 'up' | 'down') => {
    handleUpdate((prev) => {
      const blocks = [...(prev.customBlocks || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= blocks.length) return prev;

      const temp = blocks[index];
      blocks[index] = blocks[targetIndex];
      blocks[targetIndex] = temp;

      return { ...prev, customBlocks: blocks };
    });
  };

  const handleDeleteCustomBlock = (id: string) => {
    handleUpdate((prev) => ({
      ...prev,
      customBlocks: (prev.customBlocks || []).filter((b) => b.id !== id),
    }));
    if (selectedBoxId === id) {
      setSelectedBoxId(null);
    }
  };

  // Keyboard shortcut listener for formatting (Ctrl+B, Ctrl+I, Ctrl+U)
  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleMarkdownToolbarAction('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleMarkdownToolbarAction('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleMarkdownToolbarAction('underline');
      }
    }
  };

  // Play audio when clicking preview audio buttons
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-audio-target]');
    if (!target) return;

    const audioType = target.getAttribute('data-audio-target');
    if (audioType === 'word_us_normal' && (internalCard.wordAudioUsNormalBase64 || internalCard.wordAudioBase64)) {
      playAudio(internalCard.wordAudioUsNormalBase64 || internalCard.wordAudioBase64!);
    } else if (audioType === 'word_us_slow' && internalCard.wordAudioUsSlowBase64) {
      playAudio(internalCard.wordAudioUsSlowBase64);
    } else if (audioType === 'word_uk_normal' && internalCard.wordAudioUkNormalBase64) {
      playAudio(internalCard.wordAudioUkNormalBase64);
    } else if (audioType === 'word_uk_slow' && internalCard.wordAudioUkSlowBase64) {
      playAudio(internalCard.wordAudioUkSlowBase64);
    } else if (audioType === 'example_us_normal' && (internalCard.exampleAudioUsNormalBase64 || internalCard.exampleAudioBase64)) {
      playAudio(internalCard.exampleAudioUsNormalBase64 || internalCard.exampleAudioBase64!);
    } else if (audioType === 'example_us_slow' && internalCard.exampleAudioUsSlowBase64) {
      playAudio(internalCard.exampleAudioUsSlowBase64);
    } else if (audioType === 'example_uk_normal' && internalCard.exampleAudioUkNormalBase64) {
      playAudio(internalCard.exampleAudioUkNormalBase64);
    } else if (audioType === 'example_uk_slow' && internalCard.exampleAudioUkSlowBase64) {
      playAudio(internalCard.exampleAudioUkSlowBase64);
    } else if (audioType === 'word' && internalCard.wordAudioBase64) {
      playAudio(internalCard.wordAudioBase64);
    } else if (audioType === 'example' && internalCard.exampleAudioBase64) {
      playAudio(internalCard.exampleAudioBase64);
    }
  };

  const playAudio = (b64: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${b64}`);
      audio.play().catch((err) => console.error('Preview audio play error:', err));
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  const theme: ThemeDefinition = THEMES[themeId] || THEMES['comic-pop-dark'] || THEMES['comic-dark'];
  const themeClasses = getThemeCardClasses(theme.id);

  // Render front/back HTML for Preview Mode
  const frontRendered = useMemo(() => {
    const activeData = { ...internalCard, cardType: previewCardType };
    if (previewCardType === 'spelling') {
      return getSpellingFrontHtml(theme.id);
    }
    return renderThemeHtml(theme.frontHtml, activeData, { isPreview: true, cardType: previewCardType, themeId: theme.id });
  }, [internalCard, theme, previewCardType]);

  const backRendered = useMemo(() => {
    const activeData = { ...internalCard, cardType: previewCardType };
    return renderThemeHtml(theme.backHtml, activeData, { isPreview: true, cardType: previewCardType, themeId: theme.id });
  }, [internalCard, theme, previewCardType]);

  // Selected custom box for the sidebar
  const selectedBox = useMemo(() => {
    if (!internalCard.customBlocks || internalCard.customBlocks.length === 0) return null;
    return internalCard.customBlocks.find((b) => b.id === selectedBoxId) || internalCard.customBlocks[0];
  }, [internalCard.customBlocks, selectedBoxId]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 text-left" onKeyDown={handleEditorKeyDown}>
      {/* Inject Selected Card Theme CSS & Shared Custom Block CSS */}
      <style>{`${theme.css}\n${SHARED_CARD_CSS}`}</style>

      {/* Hidden File Input for Local Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUploadImage) {
            onUploadImage(file);
          }
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
              const res = re.target?.result as string;
              if (res) {
                const b64 = res.split(',')[1] || res;
                handleUpdate((prev) => ({
                  ...prev,
                  imageBase64: b64,
                  imageFileName: `manual_${Date.now()}_${file.name}`,
                  needsPhoto: true,
                }));
              }
            };
            reader.readAsDataURL(file);
          }
        }}
      />

      {/* TOP BAR: Mode Switch, Theme Badge & View Toggles */}
      <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b text-xs ${
        isDark ? 'border-zinc-700' : 'border-zinc-200'
      }`}>
        {/* Left: Mode (Edit vs Preview) & Theme Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {editable && (
            <div className={`inline-flex border p-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  mode === 'edit'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Direct in-place card editor (edit directly on the card)"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('preview.modeEdit') || 'Card Editor'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  mode === 'preview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="View exact Anki final rendering"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t('preview.modePreview') || 'Live Preview'}</span>
              </button>
            </div>
          )}

          <span
            className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
              isDark ? 'bg-zinc-800 text-blue-400 border-zinc-700' : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {theme.name}
          </span>
        </div>

        {/* Right: View & Side Toggles + Sidebar Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Card Type (Normal / Spelling) */}
          <div className={`inline-flex border p-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
            <button
              type="button"
              onClick={() => {
                setPreviewCardType('normal');
                updateSimpleField('cardType', 'normal');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                previewCardType === 'normal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('common.normal')}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewCardType('spelling');
                updateSimpleField('cardType', 'spelling');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                previewCardType === 'spelling'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('common.spelling')}
            </button>
          </div>

          {/* Desktop / Mobile Toggle */}
          <div className={`inline-flex border p-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              title={t('preview.desktopViewTitle')}
              className={`p-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'desktop'
                  ? isDark
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-200 text-zinc-900'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">{t('preview.desktop')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              title={t('preview.ankiDroidViewTitle')}
              className={`p-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'mobile'
                  ? isDark
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-200 text-zinc-900'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">{t('preview.ankiDroid')}</span>
            </button>
          </div>

          {/* Front / Back / Both Toggle */}
          <div className={`inline-flex border p-0.5 gap-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`text-xs px-2.5 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'front'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-750'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {t('preview.front')}
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`text-xs px-2.5 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'back'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-750'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {t('preview.back')}
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={`text-xs px-2.5 py-1 font-medium rounded transition-colors cursor-pointer ${
                activeSide === 'both'
                  ? isDark
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'bg-zinc-900 text-white font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-750'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {t('preview.both')}
            </button>
          </div>

          {/* Quick Update in Anki Button */}
          {canSaveToAnki && onSaveToAnki && (
            <button
              type="button"
              onClick={onSaveToAnki}
              disabled={isSavingToAnki}
              className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              title="Sync and update this card directly in your active Anki collection"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingToAnki ? 'Saving...' : t('preview.saveToAnki') || 'Update Note'}</span>
            </button>
          )}

          {/* Toggle Right-Side Editor Toolbar Button (Requirement 2) */}
          {editable && mode === 'edit' && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isSidebarOpen
                  ? isDark
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
              }`}
              title={isSidebarOpen ? 'Collapse Editor Toolbar' : 'Open Right-Side Editor Toolbar'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Toolbar' : 'Open Toolbar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTAINER: [ Card Preview (Inline Editor) ] [ Right-side Editor Toolbar ] */}
      <div className="w-full flex-1 flex flex-row min-h-0 gap-3 relative overflow-hidden">
        {/* LEFT / CENTER: THE CARD PREVIEW & INLINE EDITOR (Main focus, comfortable size) */}
        <div
          onClick={handleCardClick}
          className="flex-1 overflow-y-auto flex flex-col items-center justify-start py-2 px-1 sm:px-2 min-w-0 transition-all"
        >
          {/* PREVIEW MODE: EXACT ANKI RENDERING */}
          {mode === 'preview' && (
            <>
              {(activeSide === 'front' || activeSide === 'both') && (
                <div className="w-full flex flex-col items-center">
                  {activeSide === 'both' && (
                    <div
                      className={`mb-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border shadow-xs ${
                        isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      — {t('preview.frontCardBanner', { type: previewCardType.toUpperCase() })} —
                    </div>
                  )}
                  <div
                    className={`w-full transition-all duration-200 ${
                      viewMode === 'mobile'
                        ? `max-w-[360px] border-x-2 border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-300'} p-1`
                        : 'w-full max-w-3xl'
                    }`}
                    dangerouslySetInnerHTML={{ __html: frontRendered }}
                  />
                </div>
              )}

              {(activeSide === 'back' || activeSide === 'both') && (
                <div className="w-full flex flex-col items-center">
                  {activeSide === 'both' && (
                    <div
                      className={`mb-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border shadow-xs ${
                        isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      — {t('preview.backCardBanner')} —
                    </div>
                  )}
                  <div
                    className={`w-full transition-all duration-200 ${
                      viewMode === 'mobile'
                        ? `max-w-[360px] border-x-2 border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-300'} p-1`
                        : 'w-full max-w-3xl'
                    }`}
                    dangerouslySetInnerHTML={{ __html: backRendered }}
                  />
                </div>
              )}
            </>
          )}

          {/* EDIT MODE: DIRECT THEME-AWARE INTERACTIVE CARD INLINE EDITOR (Requirement 1) */}
          {mode === 'edit' && (
            <div
              className={`w-full transition-all duration-200 ${
                viewMode === 'mobile'
                  ? `max-w-[380px] border-x-2 border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-300'} p-1`
                  : 'w-full max-w-3xl'
              }`}
            >
              {/* Themed Card Wrapper matching selected Theme CSS */}
              <div className={themeClasses.wrapper}>
                <div className={`${themeClasses.card} p-4 sm:p-6`}>
                  
                  {/* 1. Header with Badges & Editable Part of Speech */}
                  <div className="card-hero-header quest-top-bar flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="hero-badge badge-pos quest-level-pill px-2 py-0.5 text-[11px] font-bold">
                        {previewCardType === 'spelling' ? '🎯 SPELLING' : '💥 VOCABULARY'}
                      </span>
                      <input
                        type="text"
                        value={internalCard.partOfSpeech || ''}
                        onChange={(e) => updateSimpleField('partOfSpeech', e.target.value)}
                        onFocus={(e) => {
                          activeInputRef.current = { element: e.target, fieldName: 'partOfSpeech' };
                        }}
                        placeholder="pos (e.g. noun)"
                        className="comic-badge badge-pos text-[11px] font-bold px-2 py-0.5 rounded border focus:ring-1 focus:ring-blue-500"
                        title="Part of speech"
                      />
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {theme.name}
                    </span>
                  </div>

                  {/* 2. Photo / Image Area with in-place controls */}
                  <div className="mb-4">
                    {internalCard.imageBase64 ? (
                      <div className="relative group rounded overflow-hidden border-2 border-black/40 shadow-sm">
                        <img
                          src={
                            internalCard.imageBase64.startsWith('data:')
                              ? internalCard.imageBase64
                              : `data:image/jpeg;base64,${internalCard.imageBase64}`
                          }
                          alt={internalCard.word}
                          className="card-illustration w-full max-h-[220px] object-cover block"
                        />
                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={onOpenImageSearch}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Search online images"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>Search Online</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-white rounded shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Upload local image"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateSimpleField('imageBase64', undefined);
                              updateSimpleField('imageFileName', undefined);
                              if (onRemoveImage) onRemoveImage();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full border-2 border-dashed border-zinc-400 dark:border-zinc-600 rounded-lg p-3 flex items-center justify-between gap-2 bg-zinc-500/5">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <ImageIcon className="w-4 h-4" />
                          <span>Card Illustration (Optional)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={onOpenImageSearch}
                            className="px-2 py-1 text-xs font-medium rounded border cursor-pointer flex items-center gap-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100"
                          >
                            <Search className="w-3 h-3 text-blue-500" />
                            <span>Search</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2 py-1 text-xs font-medium rounded border cursor-pointer flex items-center gap-1 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100"
                          >
                            <Upload className="w-3 h-3 text-emerald-500" />
                            <span>Upload</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Word Title Section & Phonetic IPA (Editable directly on card) */}
                  <div className={`${themeClasses.wordSection} p-3 rounded mb-4`}>
                    <div className="mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider block opacity-70 mb-0.5">
                        Word / Expression:
                      </label>
                      <input
                        type="text"
                        value={internalCard.word}
                        onChange={(e) => updateSimpleField('word', e.target.value)}
                        onFocus={(e) => {
                          activeInputRef.current = { element: e.target, fieldName: 'word' };
                        }}
                        placeholder="Word"
                        className={`${themeClasses.wordTitle} w-full bg-transparent border-b border-dashed border-zinc-400 focus:border-blue-500 focus:outline-none font-black text-2xl sm:text-3xl`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold opacity-70">IPA:</span>
                      <input
                        type="text"
                        value={internalCard.phonetic || ''}
                        onChange={(e) => updateSimpleField('phonetic', e.target.value)}
                        onFocus={(e) => {
                          activeInputRef.current = { element: e.target, fieldName: 'phonetic' };
                        }}
                        placeholder="/.../"
                        className={`${themeClasses.ipaBadge} text-xs px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      />
                    </div>
                  </div>

                  {/* 4. Audio Pronunciation Section */}
                  <div className={`${themeClasses.pronunciationBox} p-2.5 rounded mb-4 text-xs`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>US:</span>
                        </span>
                        <button
                          type="button"
                          data-audio-target="word_us_normal"
                          className="comic-audio-btn preview-play-btn px-2 py-0.5 rounded border text-xs font-semibold cursor-pointer hover:opacity-90"
                        >
                          ▶ Normal
                        </button>
                        <button
                          type="button"
                          data-audio-target="word_us_slow"
                          className="comic-audio-btn preview-play-btn px-2 py-0.5 rounded border text-xs font-semibold cursor-pointer hover:opacity-90"
                        >
                          ▶ Slow
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>UK:</span>
                        </span>
                        <button
                          type="button"
                          data-audio-target="word_uk_normal"
                          className="comic-audio-btn preview-play-btn px-2 py-0.5 rounded border text-xs font-semibold cursor-pointer hover:opacity-90"
                        >
                          ▶ Normal
                        </button>
                        <button
                          type="button"
                          data-audio-target="word_uk_slow"
                          className="comic-audio-btn preview-play-btn px-2 py-0.5 rounded border text-xs font-semibold cursor-pointer hover:opacity-90"
                        >
                          ▶ Slow
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5. Meaning Box (Persian Meaning) */}
                  <div className={`${themeClasses.meaningBox} p-3 rounded mb-4`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`${themeClasses.meaningLabel} text-[11px] font-bold uppercase tracking-wider`}>
                        📖 PERSIAN MEANING / معنی فارسی
                      </span>
                      <span className="text-[10px] opacity-60">Direct Editing & Markdown</span>
                    </div>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={internalCard.meaningFa || ''}
                      onChange={(e) => updateSimpleField('meaningFa', e.target.value)}
                      onFocus={(e) => {
                        activeInputRef.current = { element: e.target, fieldName: 'meaningFa' };
                      }}
                      placeholder="معنی دقیق و روان کلمه..."
                      className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-sm sm:text-base font-semibold leading-relaxed resize-y"
                    />
                  </div>

                  {/* 6. Example & Translation Box */}
                  <div className={`${themeClasses.exampleBox} p-3 rounded mb-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`${themeClasses.exampleLabel} text-[11px] font-bold uppercase tracking-wider`}>
                        💬 EXAMPLE & TRANSLATION / مثال و ترجمه
                      </span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          data-audio-target="example_us_normal"
                          className="preview-play-btn px-1.5 py-0.5 rounded border cursor-pointer"
                          title="Play example audio"
                        >
                          ▶ Sentence Audio
                        </button>
                      </div>
                    </div>

                    {/* English Example */}
                    <div className="mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider block opacity-70 mb-0.5">
                        English Sentence:
                      </label>
                      <textarea
                        rows={2}
                        dir="ltr"
                        value={internalCard.example || ''}
                        onChange={(e) => updateSimpleField('example', e.target.value)}
                        onFocus={(e) => {
                          activeInputRef.current = { element: e.target, fieldName: 'example' };
                        }}
                        placeholder="Natural English example sentence..."
                        className="example-en quest-sentence w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-sm font-medium leading-relaxed resize-y"
                      />
                    </div>

                    {/* Persian Translation */}
                    <div className="pt-2 border-t border-dashed border-current/20">
                      <label className="text-[10px] font-bold uppercase tracking-wider block opacity-70 mb-0.5">
                        ترجمه فارسی مثال:
                      </label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={internalCard.translationFa || ''}
                        onChange={(e) => updateSimpleField('translationFa', e.target.value)}
                        onFocus={(e) => {
                          activeInputRef.current = { element: e.target, fieldName: 'translationFa' };
                        }}
                        placeholder="ترجمه فارسی جمله مثال..."
                        className="example-fa quest-translation-fa w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-sm font-normal leading-relaxed resize-y"
                      />
                    </div>
                  </div>

                  {/* 7. Memory Hook Box (Root Decomposition) */}
                  <div className={`${themeClasses.mnemonicBox} p-3 rounded mb-4`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`${themeClasses.mnemonicLabel} text-[11px] font-bold uppercase tracking-wider`}>
                        🧠 MEMORY HOOK / کد یادسپاری و ریشه‌شناسی
                      </span>
                      <span className="text-[10px] opacity-60">**bold roots**</span>
                    </div>
                    <textarea
                      rows={2}
                      dir={isRTLText(internalCard.mnemonic) ? 'rtl' : 'ltr'}
                      value={internalCard.mnemonic || ''}
                      onChange={(e) => updateSimpleField('mnemonic', e.target.value)}
                      onFocus={(e) => {
                        activeInputRef.current = { element: e.target, fieldName: 'mnemonic' };
                      }}
                      placeholder="e.g. read (خواندن) + ability (توانایی) = قابلیت خوانده‌شدن"
                      className="mnemonic-text quest-mnemonic w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-sm font-medium leading-relaxed resize-y"
                    />
                  </div>

                  {/* 8. Theme-Aware Custom Boxes / Blocks (Requirements 3 & 4) */}
                  {internalCard.customBlocks && internalCard.customBlocks.length > 0 && (
                    <div className="space-y-4 mb-4">
                      {internalCard.customBlocks.map((block, idx) => {
                        const bgColor = block.color || '#1E293B';
                        const textColor = getContrastTextColor(bgColor);
                        const badgeBg = textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.2)';
                        const badgeBorder = textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)';
                        const isRTLBlock = block.dir === 'rtl' || isRTLText(block.content);
                        const isSelected = selectedBoxId === block.id;

                        return (
                          <div
                            key={block.id}
                            onClick={() => setSelectedBoxId(block.id)}
                            className={`${themeClasses.customBox} p-3.5 rounded-lg border-2 shadow-xs transition-all ${
                              isSelected ? 'ring-2 ring-blue-500/80 shadow-md' : ''
                            }`}
                            style={{
                              backgroundColor: bgColor,
                              color: textColor,
                              borderColor: textColor === '#0f172a' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)',
                              marginTop: '14px',
                            }}
                          >
                            {/* Box Header Toolbar */}
                            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                              {/* Editable Title Badge */}
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={block.title}
                                  onChange={(e) => handleUpdateCustomBlock(block.id, { title: e.target.value })}
                                  onFocus={() => {
                                    setSelectedBoxId(block.id);
                                  }}
                                  className={`${themeClasses.customLabel} font-black text-xs px-2.5 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-blue-400`}
                                  style={{
                                    backgroundColor: badgeBg,
                                    color: textColor,
                                    border: `2px solid ${badgeBorder}`,
                                  }}
                                  placeholder="BOX TITLE"
                                />
                              </div>

                              {/* Box Controls & Background Color Palette */}
                              <div className="flex items-center gap-1">
                                {/* Background Color Presets */}
                                <div className="flex items-center gap-1">
                                  {BOX_BG_PRESETS.slice(0, 5).map((preset) => (
                                    <button
                                      key={preset.hex}
                                      type="button"
                                      onClick={() => handleUpdateCustomBlock(block.id, { color: preset.hex })}
                                      className={`w-4 h-4 rounded-full border cursor-pointer transition-transform ${
                                        bgColor.toLowerCase() === preset.hex.toLowerCase()
                                          ? 'scale-125 ring-2 ring-blue-400 shadow-xs'
                                          : 'hover:scale-110 opacity-80 hover:opacity-100'
                                      }`}
                                      style={{ backgroundColor: preset.hex }}
                                      title={`Box Background: ${preset.name}`}
                                    />
                                  ))}
                                  <input
                                    type="color"
                                    value={bgColor}
                                    onChange={(e) => handleUpdateCustomBlock(block.id, { color: e.target.value })}
                                    className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
                                    title="Choose Box Background Color"
                                  />
                                </div>

                                {/* Direction Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCustomBlock(block.id, { dir: isRTLBlock ? 'ltr' : 'rtl' })}
                                  className="p-1 border rounded text-[10px] font-bold cursor-pointer hover:bg-current/10"
                                  title="Toggle Text Direction"
                                  style={{ borderColor: badgeBorder, color: textColor }}
                                >
                                  {isRTLBlock ? <AlignRight className="w-3 h-3" /> : <AlignLeft className="w-3 h-3" />}
                                </button>

                                {/* Reorder Up */}
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveCustomBlock(idx, 'up')}
                                  className="p-1 border rounded cursor-pointer disabled:opacity-30 hover:bg-current/10"
                                  title="Move Box Up"
                                  style={{ borderColor: badgeBorder, color: textColor }}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>

                                {/* Reorder Down */}
                                <button
                                  type="button"
                                  disabled={idx === (internalCard.customBlocks?.length || 0) - 1}
                                  onClick={() => handleMoveCustomBlock(idx, 'down')}
                                  className="p-1 border rounded cursor-pointer disabled:opacity-30 hover:bg-current/10"
                                  title="Move Box Down"
                                  style={{ borderColor: badgeBorder, color: textColor }}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>

                                {/* Delete Box */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomBlock(block.id)}
                                  className="p-1 text-rose-400 hover:text-rose-300 border border-rose-400/40 rounded cursor-pointer hover:bg-rose-500/20"
                                  title="Delete this Box"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Editable Box Content */}
                            <textarea
                              rows={3}
                              dir={isRTLBlock ? 'rtl' : 'ltr'}
                              value={block.content}
                              onChange={(e) => handleUpdateCustomBlock(block.id, { content: e.target.value })}
                              onFocus={(e) => {
                                activeInputRef.current = { element: e.target, fieldName: 'customBlock', blockId: block.id };
                                setSelectedBoxId(block.id);
                              }}
                              placeholder="Write box content or markdown (e.g. - item 1, **bold**, `code`)..."
                              className="custom-block-content w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-sm font-medium leading-relaxed resize-y mt-1"
                              style={{ color: textColor }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 9. Bottom "+ Add Custom Box" Trigger (Requirement 1 & 3) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleAddCustomBlock()}
                      className="w-full py-2.5 border-2 border-dashed border-blue-500/40 hover:border-blue-500 rounded-lg text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-blue-500/5 hover:bg-blue-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('preview.addBox') || '+ Add Custom Box matching this Theme'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT-SIDE EDITOR TOOLBAR / SIDEBAR (Requirement 2 & 5) */}
        {editable && mode === 'edit' && isSidebarOpen && (
          <aside
            className={`w-72 sm:w-80 shrink-0 flex flex-col border rounded-xl shadow-xs overflow-hidden transition-all text-xs ${
              isDark ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'
            }`}
          >
            {/* Toolbar Sidebar Header */}
            <div className={`p-3 border-b flex items-center justify-between gap-2 ${
              isDark ? 'border-zinc-700/80 bg-zinc-850' : 'border-zinc-200 bg-zinc-50'
            }`}>
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Editor Toolbar
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                title="Collapse toolbar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Toolbar Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              
              {/* SECTION 1: Text Formatting Tools (Requirement 2) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Text Formatting
                  </span>
                  <span className="text-[10px] text-zinc-500">Applies to selection</span>
                </div>

                {/* Primary Formatting Buttons */}
                <div className="grid grid-cols-4 gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('bold')}
                    className={`py-1.5 px-2 rounded border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Bold (**text**) - Ctrl+B"
                  >
                    <Bold className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[9px] font-semibold">Bold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('italic')}
                    className={`py-1.5 px-2 rounded border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Italic (*text*) - Ctrl+I"
                  >
                    <Italic className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[9px] font-semibold">Italic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('underline')}
                    className={`py-1.5 px-2 rounded border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Underline (<u>text</u>) - Ctrl+U"
                  >
                    <Underline className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[9px] font-semibold">Underline</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('code')}
                    className={`py-1.5 px-2 rounded border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Inline Code (`code`)"
                  >
                    <Code className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[9px] font-semibold">Code</span>
                  </button>
                </div>

                {/* Secondary List & Link Buttons */}
                <div className="grid grid-cols-3 gap-1 mb-3">
                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('bulletList')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Bullet List (- item)"
                  >
                    <List className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px] font-semibold">Bullets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('numberedList')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Numbered List (1. item)"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-semibold">Numbered</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('link')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Insert Link [text](url)"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-[10px] font-semibold">Link</span>
                  </button>
                </div>

                {/* Text Color Selector (Requirement 2) */}
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Text Color:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {TEXT_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => handleMarkdownToolbarAction('color', preset.hex)}
                        className="w-5 h-5 rounded-full border border-black/20 hover:scale-115 transition-transform cursor-pointer shadow-2xs"
                        style={{ backgroundColor: preset.hex }}
                        title={`Color: ${preset.name}`}
                      />
                    ))}
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        defaultValue="#38BDF8"
                        onChange={(e) => handleMarkdownToolbarAction('color', e.target.value)}
                        className="w-5 h-5 p-0 border-0 rounded cursor-pointer"
                        title="Custom Text Color Picker"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Highlighter / Background formatting (Requirement 2) */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Highlight / Text Background:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {HIGHLIGHT_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => handleMarkdownToolbarAction('highlight', preset.hex)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-zinc-900 border border-black/10 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                        style={{ backgroundColor: preset.hex }}
                        title={`Highlight with ${preset.name}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Custom Boxes Management (Requirement 2 & 3) */}
              <div className={`pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Custom Boxes
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400">
                    {internalCard.customBlocks?.length || 0}
                  </span>
                </div>

                {/* Add Box Trigger */}
                <button
                  type="button"
                  onClick={() => handleAddCustomBlock()}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer mb-3 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Box</span>
                </button>

                {/* Selected Box Configurator */}
                {selectedBox ? (
                  <div className={`p-2.5 rounded-lg border space-y-2.5 ${
                    isDark ? 'bg-zinc-850 border-zinc-700/80' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    {/* Box Title */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                        Box Title:
                      </label>
                      <input
                        type="text"
                        value={selectedBox.title}
                        onChange={(e) => handleUpdateCustomBlock(selectedBox.id, { title: e.target.value })}
                        className={`w-full p-1.5 rounded border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                        placeholder="Box Title..."
                      />
                    </div>

                    {/* Box Background Color (Requirement 3: The color requested means Box BACKGROUND color) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Box Background Color:
                        </label>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                          style={{
                            backgroundColor: selectedBox.color || '#1E293B',
                            color: getContrastTextColor(selectedBox.color || '#1E293B'),
                          }}
                        >
                          Contrast Text
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-1.5 mb-1.5">
                        {BOX_BG_PRESETS.map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => handleUpdateCustomBlock(selectedBox.id, { color: preset.hex })}
                            className={`h-5 rounded border cursor-pointer transition-transform ${
                              (selectedBox.color || '#1E293B').toLowerCase() === preset.hex.toLowerCase()
                                ? 'scale-110 ring-2 ring-blue-500 shadow-xs'
                                : 'hover:scale-105 opacity-85 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: preset.hex }}
                            title={`${preset.name} (${preset.hex})`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedBox.color || '#1E293B'}
                          onChange={(e) => handleUpdateCustomBlock(selectedBox.id, { color: e.target.value })}
                          className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                          title="Choose custom background color"
                        />
                        <span className="text-[10px] font-mono text-zinc-400">
                          {selectedBox.color || '#1E293B'}
                        </span>
                      </div>
                    </div>

                    {/* Box Actions: Direction & Delete */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-700/50">
                      <button
                        type="button"
                        onClick={() => handleUpdateCustomBlock(selectedBox.id, { dir: selectedBox.dir === 'rtl' ? 'ltr' : 'rtl' })}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer flex items-center gap-1 ${
                          isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'
                        }`}
                      >
                        {selectedBox.dir === 'rtl' ? <AlignRight className="w-3 h-3 text-blue-400" /> : <AlignLeft className="w-3 h-3 text-blue-400" />}
                        <span>{selectedBox.dir === 'rtl' ? 'RTL' : 'LTR'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomBlock(selectedBox.id)}
                        className="px-2 py-1 rounded text-[10px] font-semibold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Box</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic text-center py-2">
                    No custom boxes added yet. Click "+ Add Box" to create one.
                  </p>
                )}
              </div>

              {/* SECTION 3: Card Illustration Controls */}
              <div className={`pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Card Illustration
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenImageSearch}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200' : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 text-blue-400" />
                    <span>Search Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200' : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Upload Local</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Toolbar Footer Actions */}
            {canSaveToAnki && onSaveToAnki && (
              <div className={`p-3 border-t ${isDark ? 'border-zinc-700/80 bg-zinc-850' : 'border-zinc-200 bg-zinc-50'}`}>
                <button
                  type="button"
                  onClick={onSaveToAnki}
                  disabled={isSavingToAnki}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingToAnki ? 'Saving to Anki...' : 'Update Note in Anki'}</span>
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
