import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CardData, ThemeDefinition, ThemeId, CardType, AppTheme, CustomCardBlock } from '../types';
import { THEMES, renderThemeHtml, getSpellingFrontHtml, SHARED_CARD_CSS, isRTLText } from '../themes';
import { renderMarkdown, applyMarkdownToText, MarkdownAction } from '../utils/markdown';
import {
  Smartphone,
  Monitor,
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
  X,
  Palette,
  AlignLeft,
  AlignRight,
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

// Background Color Presets for Custom Boxes
const BOX_BG_PRESETS = [
  { name: 'Dark Slate', hex: '#1E293B' },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Forest Green', hex: '#064E3B' },
  { name: 'Deep Purple', hex: '#581C87' },
  { name: 'Amber Dark', hex: '#78350F' },
  { name: 'Crimson Red', hex: '#881337' },
  { name: 'Soft Cream', hex: '#FEF3C7' },
  { name: 'Soft Sky', hex: '#E0F2FE' },
];

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

  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCardType, setPreviewCardType] = useState<CardType>(cardType);

  // Local draft card data synchronized with prop cardData
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

  // Active input ref for formatting toolbar
  const activeInputRef = useRef<{
    element: HTMLInputElement | HTMLTextAreaElement | null;
    fieldName: string;
    blockId?: string;
  }>({ element: null, fieldName: 'meaningFa' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal card with incoming props
  useEffect(() => {
    if (cardData) {
      setInternalCard((prev) => ({
        ...prev,
        ...cardData,
        customBlocks: cardData.customBlocks !== undefined ? cardData.customBlocks : prev.customBlocks || [],
      }));
    }
  }, [cardData]);

  useEffect(() => {
    if (cardData?.cardType) {
      setPreviewCardType(cardData.cardType);
    } else if (cardType) {
      setPreviewCardType(cardType);
    }
  }, [cardData?.cardType, cardType]);

  // Update card state and notify parent
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

  // --- Toolbar Markdown Formatting Action ---
  const handleMarkdownToolbarAction = (action: MarkdownAction) => {
    const active = activeInputRef.current;
    if (!active || !active.element) return;

    const el = active.element;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const fullText = el.value || '';

    const { newText, newStart, newEnd } = applyMarkdownToText(fullText, start, end, action);

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
  const handleAddCustomBlock = () => {
    const newId = `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBlock: CustomCardBlock = {
      id: newId,
      title: 'EXTRA NOTE / SYNONYMS',
      content: '- Key point 1\n- Key point 2',
      color: BOX_BG_PRESETS[Math.floor(Math.random() * BOX_BG_PRESETS.length)].hex,
      dir: 'auto',
    };

    handleUpdate((prev) => ({
      ...prev,
      customBlocks: [...(prev.customBlocks || []), newBlock],
    }));
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

  // Exact Anki HTML renderings
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

      {/* MAIN SIDE-BY-SIDE CONTAINER: [ Card Preview ] [ Editor Panel ] */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: EXACT CARD PREVIEW CANVAS */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Top Controls Bar for Preview Canvas */}
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b text-xs ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            {/* Theme Badge & Card Type Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
                  isDark ? 'bg-zinc-800 text-blue-400 border-zinc-700' : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {theme.name}
              </span>

              <div className={`inline-flex border p-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewCardType('normal');
                    updateSimpleField('cardType', 'normal');
                  }}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors cursor-pointer ${
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
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors cursor-pointer ${
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
            </div>

            {/* Desktop / Mobile & Side Toggles */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Desktop / Mobile Switcher */}
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

              {/* Front / Back / Both Switcher */}
              <div className={`inline-flex border p-0.5 gap-0.5 rounded-md shadow-xs ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'}`}>
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
                  {t('preview.front')}
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
                  {t('preview.back')}
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
                  {t('preview.both')}
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Exact Anki Rendering Canvas */}
          <div
            onClick={handleCardClick}
            className="flex-1 overflow-y-auto flex flex-col items-center justify-start gap-4 p-2 rounded bg-zinc-100/40 dark:bg-zinc-900/40"
          >
            {(activeSide === 'front' || activeSide === 'both') && (
              <div className="w-full flex flex-col items-center">
                {activeSide === 'both' && (
                  <div
                    className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border shadow-xs ${
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
                      : 'w-full max-w-2xl'
                  }`}
                  dangerouslySetInnerHTML={{ __html: frontRendered }}
                />
              </div>
            )}

            {(activeSide === 'back' || activeSide === 'both') && (
              <div className="w-full flex flex-col items-center">
                {activeSide === 'both' && (
                  <div
                    className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border shadow-xs ${
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
                      : 'w-full max-w-2xl'
                  }`}
                  dangerouslySetInnerHTML={{ __html: backRendered }}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EXPANDED CARD EDITOR PANEL */}
        {editable && (
          <div
            className={`w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-s flex flex-col min-h-0 pl-0 lg:pl-3 pt-3 lg:pt-0 ${
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            }`}
          >
            {/* Editor Panel Header */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-700/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  {t('preview.modeEdit') || 'Card Editor'}
                </h3>
              </div>

              {canSaveToAnki && onSaveToAnki && (
                <button
                  type="button"
                  onClick={onSaveToAnki}
                  disabled={isSavingToAnki}
                  className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  title="Update this card directly in your Anki collection"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingToAnki ? 'Saving...' : t('preview.saveToAnki') || 'Update Note'}</span>
                </button>
              )}
            </div>

            {/* Sticky Markdown Formatting Toolbar */}
            <div className={`p-1.5 rounded-lg border mb-3 flex items-center justify-between gap-1 flex-wrap ${
              isDark ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
            }`}>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleMarkdownToolbarAction('bold')}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600' : 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-xs'
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkdownToolbarAction('italic')}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600' : 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-xs'
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkdownToolbarAction('underline')}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600' : 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-xs'
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkdownToolbarAction('link')}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600' : 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-xs'
                  }`}
                  title="Insert Link [text](url)"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkdownToolbarAction('bulletList')}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600' : 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-xs'
                  }`}
                  title="Bullet List (- item)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkdownToolbarAction('numberedList')}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600' : 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-xs'
                  }`}
                  title="Numbered List (1. item)"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkdownToolbarAction('code')}
                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600' : 'bg-white hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-xs'
                  }`}
                  title="Inline Code (`code`)"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddCustomBlock}
                className="px-2 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                title="Add a new custom box with selectable background color"
              >
                <Plus className="w-3 h-3" />
                <span>{t('preview.addBox') || '+ Box'}</span>
              </button>
            </div>

            {/* Scrollable Fields & Custom Boxes Editor */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-4 text-xs">
              {/* Field: Word */}
              <div>
                <label className="text-[11px] font-bold block mb-1 text-zinc-700 dark:text-zinc-300">
                  Word / Term:
                </label>
                <input
                  type="text"
                  value={internalCard.word}
                  onChange={(e) => updateSimpleField('word', e.target.value)}
                  onFocus={(e) => {
                    activeInputRef.current = { element: e.target, fieldName: 'word' };
                  }}
                  className={`w-full p-2 border rounded-md font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              {/* Fields: Phonetic IPA & Part of Speech */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold block mb-1 text-zinc-700 dark:text-zinc-300">
                    Phonetic (IPA):
                  </label>
                  <input
                    type="text"
                    value={internalCard.phonetic || ''}
                    onChange={(e) => updateSimpleField('phonetic', e.target.value)}
                    onFocus={(e) => {
                      activeInputRef.current = { element: e.target, fieldName: 'phonetic' };
                    }}
                    placeholder="/.../"
                    className={`w-full p-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold block mb-1 text-zinc-700 dark:text-zinc-300">
                    Part of Speech:
                  </label>
                  <input
                    type="text"
                    value={internalCard.partOfSpeech || ''}
                    onChange={(e) => updateSimpleField('partOfSpeech', e.target.value)}
                    onFocus={(e) => {
                      activeInputRef.current = { element: e.target, fieldName: 'partOfSpeech' };
                    }}
                    placeholder="noun, verb..."
                    className={`w-full p-2 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>
              </div>

              {/* Field: Persian Meaning */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    معنی فارسی (Persian Meaning):
                  </label>
                  <span className="text-[10px] text-zinc-400">RTL • Markdown</span>
                </div>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={internalCard.meaningFa || ''}
                  onChange={(e) => updateSimpleField('meaningFa', e.target.value)}
                  onFocus={(e) => {
                    activeInputRef.current = { element: e.target, fieldName: 'meaningFa' };
                  }}
                  className={`w-full p-2 border rounded-md text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              {/* Field: Example Sentence */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    Example Sentence:
                  </label>
                  <span className="text-[10px] text-zinc-400">LTR • Markdown</span>
                </div>
                <textarea
                  rows={2}
                  dir="ltr"
                  value={internalCard.example || ''}
                  onChange={(e) => updateSimpleField('example', e.target.value)}
                  onFocus={(e) => {
                    activeInputRef.current = { element: e.target, fieldName: 'example' };
                  }}
                  className={`w-full p-2 border rounded-md text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              {/* Field: Translation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    ترجمه مثال (Translation):
                  </label>
                  <span className="text-[10px] text-zinc-400">RTL</span>
                </div>
                <textarea
                  rows={2}
                  dir="rtl"
                  value={internalCard.translationFa || ''}
                  onChange={(e) => updateSimpleField('translationFa', e.target.value)}
                  onFocus={(e) => {
                    activeInputRef.current = { element: e.target, fieldName: 'translationFa' };
                  }}
                  className={`w-full p-2 border rounded-md text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              {/* Field: Memory Hook */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    💡 کد یادسپاری و ریشه‌شناسی (Memory Hook):
                  </label>
                  <span className="text-[10px] text-zinc-400">**bold roots**</span>
                </div>
                <textarea
                  rows={2}
                  dir={isRTLText(internalCard.mnemonic) ? 'rtl' : 'ltr'}
                  value={internalCard.mnemonic || ''}
                  onChange={(e) => updateSimpleField('mnemonic', e.target.value)}
                  onFocus={(e) => {
                    activeInputRef.current = { element: e.target, fieldName: 'mnemonic' };
                  }}
                  className={`w-full p-2 border rounded-md text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              {/* Field: Card Illustration / Photo */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Card Illustration:</span>
                  </label>
                  {internalCard.imageBase64 && (
                    <button
                      type="button"
                      onClick={() => {
                        updateSimpleField('imageBase64', undefined);
                        updateSimpleField('imageFileName', undefined);
                        if (onRemoveImage) onRemoveImage();
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-400 font-semibold cursor-pointer"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {internalCard.imageBase64 ? (
                    <img
                      src={
                        internalCard.imageBase64.startsWith('data:')
                          ? internalCard.imageBase64
                          : `data:image/jpeg;base64,${internalCard.imageBase64}`
                      }
                      alt="Thumbnail"
                      className="w-12 h-12 object-cover rounded border border-zinc-300 dark:border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                      <ImageIcon className="w-5 h-5 opacity-40" />
                    </div>
                  )}

                  <div className="flex-1 flex gap-1.5">
                    <button
                      type="button"
                      onClick={onOpenImageSearch}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <Search className="w-3 h-3 text-blue-500" />
                      <span>Search Online</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <Upload className="w-3 h-3 text-emerald-500" />
                      <span>Upload Local</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme-Aware Custom Boxes Section */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-500" />
                    <span>Theme-Aware Custom Boxes:</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {(internalCard.customBlocks || []).length} active
                  </span>
                </div>

                {/* List of Custom Boxes */}
                {internalCard.customBlocks && internalCard.customBlocks.length > 0 ? (
                  <div className="space-y-3">
                    {internalCard.customBlocks.map((block, idx) => {
                      const bgColor = block.color || '#1E293B';
                      const isRTLBlock = block.dir === 'rtl' || isRTLText(block.content);

                      return (
                        <div
                          key={block.id}
                          className={`p-2.5 rounded-lg border text-xs shadow-xs space-y-2 transition-all ${
                            isDark ? 'bg-zinc-850 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                          }`}
                        >
                          {/* Box Header Controls */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <input
                              type="text"
                              value={block.title}
                              onChange={(e) => handleUpdateCustomBlock(block.id, { title: e.target.value })}
                              placeholder="BOX TITLE"
                              className={`flex-1 min-w-[140px] p-1.5 border rounded font-bold text-xs focus:outline-none ${
                                isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                              }`}
                            />

                            <div className="flex items-center gap-1">
                              {/* Direction toggle */}
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomBlock(block.id, { dir: isRTLBlock ? 'ltr' : 'rtl' })}
                                className="p-1 border rounded text-[10px] font-bold cursor-pointer hover:bg-current/10"
                                title="Toggle Text Direction"
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
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomBlock(block.id)}
                                className="p-1 text-rose-500 hover:text-rose-400 border border-rose-500/30 rounded cursor-pointer hover:bg-rose-500/10"
                                title="Delete Box"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Box Background Color Selector (Requirement 5) */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold text-zinc-500">
                              Box Background Color:
                            </span>
                            <div className="flex items-center gap-1">
                              {BOX_BG_PRESETS.map((preset) => (
                                <button
                                  key={preset.hex}
                                  type="button"
                                  onClick={() => handleUpdateCustomBlock(block.id, { color: preset.hex })}
                                  className={`w-4 h-4 rounded-full border cursor-pointer transition-transform ${
                                    bgColor.toLowerCase() === preset.hex.toLowerCase()
                                      ? 'scale-125 ring-2 ring-blue-500 shadow-xs'
                                      : 'hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: preset.hex }}
                                  title={`${preset.name} (${preset.hex})`}
                                />
                              ))}
                              <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => handleUpdateCustomBlock(block.id, { color: e.target.value })}
                                className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
                                title="Choose Custom Box Background Color"
                              />
                            </div>
                          </div>

                          {/* Box Content Textarea */}
                          <textarea
                            rows={3}
                            dir={isRTLBlock ? 'rtl' : 'ltr'}
                            value={block.content}
                            onChange={(e) => handleUpdateCustomBlock(block.id, { content: e.target.value })}
                            onFocus={(e) => {
                              activeInputRef.current = {
                                element: e.target,
                                fieldName: 'customBlock',
                                blockId: block.id,
                              };
                            }}
                            placeholder="Write box content or markdown (e.g. - point 1, **bold**, `code`)..."
                            className={`w-full p-2 border rounded text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 border border-dashed rounded-lg text-center text-zinc-400">
                    <p className="text-[11px] mb-1">No custom boxes added yet.</p>
                    <button
                      type="button"
                      onClick={handleAddCustomBlock}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer inline-flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('preview.addBox') || '+ Add Box with Background Color'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
