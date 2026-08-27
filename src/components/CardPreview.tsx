import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CardData, ThemeDefinition, ThemeId, CardType, AppTheme, CustomCardBlock } from '../types';
import { THEMES, renderThemeHtml, getSpellingFrontHtml, SHARED_CARD_CSS, isRTLText } from '../themes';
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

const COLOR_PRESETS = [
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Crimson', hex: '#EF4444' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Slate', hex: '#64748B' },
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

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCardType, setPreviewCardType] = useState<CardType>(cardType);

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
      color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)].hex,
      dir: 'auto',
    };

    handleUpdate((prev) => ({
      ...prev,
      customBlocks: [...(prev.customBlocks || []), newBlock],
    }));

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

      {/* TOP EDITOR & PREVIEW CONTROLS TOOLBAR */}
      <div className={`flex flex-col gap-2 pb-3 mb-3 border-b text-xs ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
        {/* ROW 1: Mode Switch & Card Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
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
                  title="Direct in-place card editor"
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

          {/* Right: View & Side Toggles */}
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

            {/* Quick Update in Anki Button if card note exists */}
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
          </div>
        </div>

        {/* ROW 2: Rich Markdown Formatting Toolbar & Add Box Button (Visible in Edit Mode) */}
        {editable && mode === 'edit' && (
          <div className={`flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-dashed ${isDark ? 'border-zinc-700/70' : 'border-zinc-200'}`}>
            {/* Formatting action buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`text-[11px] font-semibold me-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Format:
              </span>

              <button
                type="button"
                onClick={() => handleMarkdownToolbarAction('bold')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkdownToolbarAction('italic')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkdownToolbarAction('underline')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                }`}
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkdownToolbarAction('link')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                }`}
                title="Insert Link [text](url)"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkdownToolbarAction('bulletList')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                }`}
                title="Bullet List (- item)"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkdownToolbarAction('numberedList')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                }`}
                title="Numbered List (1. item)"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleMarkdownToolbarAction('code')}
                className={`p-1.5 rounded border transition-colors cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 shadow-xs'
                }`}
                title="Inline Code (`code`)"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add Custom Box Button */}
            <button
              type="button"
              onClick={handleAddCustomBlock}
              className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded border border-blue-700 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Add a new custom block matching the selected theme style"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('preview.addBox') || '+ Add Box'}</span>
            </button>
          </div>
        )}
      </div>

      {/* CANVAS CONTAINER */}
      <div
        onClick={handleCardClick}
        className="flex-1 overflow-y-auto flex flex-col items-center justify-start gap-6 py-2"
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

        {/* EDIT MODE: DIRECT THEME-AWARE INTERACTIVE CARD EDITOR */}
        {mode === 'edit' && (
          <div
            className={`w-full transition-all duration-200 ${
              viewMode === 'mobile'
                ? `max-w-[380px] border-x-2 border-dashed ${isDark ? 'border-zinc-700' : 'border-zinc-300'} p-1`
                : 'w-full max-w-3xl'
            }`}
          >
            {/* Themed Card Container */}
            <div className="comic-card-wrapper theme-pop theme-strip theme-quest theme-notebook theme-arcade theme-minimal">
              <div className="comic-card quest-card strip-container notebook-sheet arcade-cabinet minimal-card p-4 sm:p-6">
                
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

                {/* 3. Word Title Section & Phonetic IPA */}
                <div className="comic-word-section quest-hero arcade-title-box minimal-word-block p-3 rounded mb-4">
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
                      className="comic-title quest-word strip-title arcade-word minimal-word w-full bg-transparent border-b border-dashed border-zinc-400 focus:border-blue-500 focus:outline-none font-black text-2xl sm:text-3xl"
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
                      className="comic-badge badge-ipa quest-ipa minimal-phonetic text-xs px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 4. Audio Pronunciation Section */}
                <div className="comic-pronunciation-box quest-sound-dock strip-audio-grid minimal-audio-row p-2.5 rounded mb-4 text-xs">
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
                <div className="comic-meaning-box quest-meaning-banner strip-meaning-callout minimal-meaning-block p-3 rounded mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="box-label label-meaning meaning-quest-label text-[11px] font-bold uppercase tracking-wider">
                      📖 PERSIAN MEANING / معنی فارسی
                    </span>
                    <span className="text-[10px] opacity-60">Markdown Supported</span>
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
                <div className="comic-example-box quest-example-card strip-panel panel-dialogue minimal-example-block p-3 rounded mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="box-label label-example quest-tag text-[11px] font-bold uppercase tracking-wider">
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
                <div className="comic-mnemonic-box quest-mnemonic-card strip-mnemonic-footer minimal-mnemonic-block p-3 rounded mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="box-label label-memory quest-tag-purple text-[11px] font-bold uppercase tracking-wider">
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

                {/* 8. Theme-Aware Custom Boxes / Blocks */}
                {internalCard.customBlocks && internalCard.customBlocks.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {internalCard.customBlocks.map((block, idx) => {
                      const accentColor = block.color || '#38BDF8';
                      const isRTLBlock = block.dir === 'rtl' || isRTLText(block.content);

                      return (
                        <div
                          key={block.id}
                          className="custom-card-block comic-mnemonic-box quest-mnemonic-card strip-panel minimal-mnemonic-block p-3 rounded border-2"
                          style={{
                            borderLeftColor: accentColor,
                            borderLeftWidth: '6px',
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
                                className="box-label font-bold text-xs px-2 py-0.5 rounded border focus:outline-none"
                                style={{
                                  backgroundColor: accentColor,
                                  color: '#ffffff',
                                  fontWeight: 900,
                                }}
                                placeholder="BOX TITLE"
                              />
                            </div>

                            {/* Color Selector & Controls */}
                            <div className="flex items-center gap-1">
                              {/* Preset Color Badges */}
                              <div className="flex items-center gap-0.5">
                                {COLOR_PRESETS.map((preset) => (
                                  <button
                                    key={preset.hex}
                                    type="button"
                                    onClick={() => handleUpdateCustomBlock(block.id, { color: preset.hex })}
                                    className={`w-4 h-4 rounded-full border cursor-pointer transition-transform ${
                                      block.color === preset.hex ? 'scale-125 ring-2 ring-blue-400' : 'hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: preset.hex }}
                                    title={preset.name}
                                  />
                                ))}
                                <input
                                  type="color"
                                  value={block.color || '#38BDF8'}
                                  onChange={(e) => handleUpdateCustomBlock(block.id, { color: e.target.value })}
                                  className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
                                  title="Custom Color Picker"
                                />
                              </div>

                              {/* Direction Toggle */}
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomBlock(block.id, { dir: isRTLBlock ? 'ltr' : 'rtl' })}
                                className="px-1.5 py-0.5 text-[10px] font-semibold border rounded cursor-pointer opacity-70 hover:opacity-100"
                                title="Toggle RTL / LTR"
                              >
                                {isRTLBlock ? 'RTL' : 'LTR'}
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

                              {/* Delete Box */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomBlock(block.id)}
                                className="p-1 text-red-500 hover:text-red-400 border border-red-500/30 rounded cursor-pointer hover:bg-red-500/10"
                                title="Delete this box"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Editable Content */}
                          <textarea
                            rows={3}
                            dir={isRTLBlock ? 'rtl' : 'ltr'}
                            value={block.content}
                            onChange={(e) => handleUpdateCustomBlock(block.id, { content: e.target.value })}
                            onFocus={(e) => {
                              activeInputRef.current = { element: e.target, fieldName: 'customBlock', blockId: block.id };
                            }}
                            placeholder="Write box content or markdown (e.g. - item 1, **bold**, `code`)..."
                            className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-sm font-medium leading-relaxed resize-y"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 9. Bottom "+ Add Custom Box" Trigger */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleAddCustomBlock}
                    className="w-full py-2 border-2 border-dashed border-blue-500/40 hover:border-blue-500 rounded-lg text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-blue-500/5 hover:bg-blue-500/10"
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
    </div>
  );
};
