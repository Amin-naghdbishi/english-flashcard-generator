import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CardData, ThemeDefinition, ThemeId, CardType, AppTheme, CustomCardBlock } from '../types';
import {
  THEMES,
  renderThemeHtml,
  getSpellingFrontHtml,
  makeSpellingSentence,
  SHARED_CARD_CSS,
  isRTLText,
  getContrastTextColor,
} from '../themes';
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
  Volume2,
  Search,
  Upload,
  Sparkles,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  AlignLeft,
  AlignRight,
  HelpCircle,
  X,
  Zap,
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
  if (themeId.includes('pop') || themeId === 'comic-light' || themeId === 'comic-dark' || themeId.includes('strip')) {
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
  if (themeId.includes('quest') || themeId.includes('manga') || themeId.includes('arcade')) {
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

  const [mode, setMode] = useState<'edit' | 'preview'>(editable ? 'edit' : 'preview');
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('back');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCardType, setPreviewCardType] = useState<CardType>(cardType);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  // Spelling in-editor tester state
  const [testSpellingInput, setTestSpellingInput] = useState<string>('');
  const [testSpellingResult, setTestSpellingResult] = useState<'correct' | 'incorrect' | null>(null);

  // Local editable draft card data
  const [internalCard, setInternalCard] = useState<CardData>(() => {
    const initialWord = cardData?.word || emptyWordPlaceholder;
    const initialExample = cardData?.example || 'I made a pencil mistake and need an eraser.';
    return (
      cardData || {
        word: initialWord,
        phonetic: '/ɪˈreɪzər/',
        partOfSpeech: 'noun',
        meaningFa: 'پاک‌کن، ابزار پاک کردن اشتباهات نوشتاری',
        example: initialExample,
        translationFa: 'من با مداد اشتباه نوشتم و به یک پاک‌کن نیاز دارم.',
        mnemonic: '**ERASE-ER**: It **erases** errors easily on paper.',
        cardType: previewCardType,
        spellingSentence: makeSpellingSentence(initialExample, initialWord),
        imageBase64: undefined,
        customBlocks: [],
      }
    );
  });

  // Track focused field for formatting actions
  const activeInputRef = useRef<{
    element: HTMLInputElement | HTMLTextAreaElement | null;
    fieldName: string;
    blockId?: string;
  }>({ element: null, fieldName: 'meaningFa' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Callback ref
  const onCardChangeRef = useRef(onCardChange);
  useEffect(() => {
    onCardChangeRef.current = onCardChange;
  }, [onCardChange]);

  const internalCardRef = useRef<CardData>(internalCard);
  useEffect(() => {
    internalCardRef.current = internalCard;
  }, [internalCard]);

  // Sync mode when editable prop changes
  useEffect(() => {
    if (!editable && mode !== 'preview') {
      setMode('preview');
    }
  }, [editable, mode]);

  // Sync with prop updates
  useEffect(() => {
    if (cardData) {
      setInternalCard((prev) => {
        const next = {
          ...prev,
          ...cardData,
          customBlocks: cardData.customBlocks !== undefined ? cardData.customBlocks : prev.customBlocks || [],
        };
        internalCardRef.current = next;
        return next;
      });
    }
  }, [cardData]);

  useEffect(() => {
    if (cardData?.cardType) {
      setPreviewCardType(cardData.cardType);
    } else if (cardType) {
      setPreviewCardType(cardType);
    }
  }, [cardData?.cardType, cardType]);

  // Sync selectedBoxId
  useEffect(() => {
    if (internalCard.customBlocks && internalCard.customBlocks.length > 0) {
      if (!selectedBoxId || !internalCard.customBlocks.some((b) => b.id === selectedBoxId)) {
        setSelectedBoxId(internalCard.customBlocks[0].id);
      }
    } else {
      setSelectedBoxId(null);
    }
  }, [internalCard.customBlocks, selectedBoxId]);

  // Notify parent of card edits outside the render cycle
  const handleUpdate = useCallback(
    (updater: (prev: CardData) => CardData) => {
      setInternalCard((prev) => {
        const next = updater(prev);
        internalCardRef.current = next;
        return next;
      });

      queueMicrotask(() => {
        if (onCardChangeRef.current) {
          onCardChangeRef.current(internalCardRef.current);
        }
      });
    },
    []
  );

  const updateSimpleField = (field: keyof CardData, value: any) => {
    handleUpdate((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Switch card type (normal <-> spelling) and ensure proper fields
  const handleToggleCardType = (newType: CardType) => {
    setPreviewCardType(newType);
    handleUpdate((prev) => {
      let spellingSentence = prev.spellingSentence;
      if (newType === 'spelling' && (!spellingSentence || !spellingSentence.includes('______'))) {
        spellingSentence = makeSpellingSentence(prev.example || '', prev.word || '');
      }
      return {
        ...prev,
        cardType: newType,
        spellingSentence,
      };
    });
  };

  // Helper to re-generate blank sentence
  const handleAutoBlankSentence = () => {
    const blanked = makeSpellingSentence(internalCard.example || '', internalCard.word || '');
    updateSimpleField('spellingSentence', blanked);
  };

  // Check spelling tester in editor
  const handleTestSpelling = () => {
    const target = (internalCard.word || '').trim().toLowerCase();
    const typed = testSpellingInput.trim().toLowerCase();
    if (typed === target) {
      setTestSpellingResult('correct');
    } else {
      setTestSpellingResult('incorrect');
    }
  };

  // Markdown Toolbar Action
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

  // Custom Blocks Management
  const handleAddCustomBlock = (side: 'front' | 'back' = 'back', titleOverride?: string) => {
    const newId = `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBlock: CustomCardBlock = {
      id: newId,
      side,
      title: titleOverride || (side === 'front' ? 'FRONT NOTE / HINT' : 'EXTRA NOTE / SYNONYMS'),
      content: '- Key point 1\n- Key point 2',
      color: BOX_BG_PRESETS[Math.floor(Math.random() * BOX_BG_PRESETS.length)].hex,
      dir: 'auto',
    };

    handleUpdate((prev) => ({
      ...prev,
      customBlocks: [...(prev.customBlocks || []), newBlock],
    }));

    setSelectedBoxId(newId);
  };

  const handleUpdateCustomBlock = (id: string, updates: Partial<CustomCardBlock>) => {
    handleUpdate((prev) => ({
      ...prev,
      customBlocks: (prev.customBlocks || []).map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
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

  // Audio preview playback
  const playAudio = (b64: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${b64}`);
      audio.play().catch((err) => console.error('Preview audio play error:', err));
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

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
    } else if (audioType === 'word' && internalCard.wordAudioBase64) {
      playAudio(internalCard.wordAudioBase64);
    } else if (audioType === 'example' && internalCard.exampleAudioBase64) {
      playAudio(internalCard.exampleAudioBase64);
    }
  };

  const theme: ThemeDefinition = THEMES[themeId] || THEMES['comic-pop-dark'] || THEMES['comic-dark'];
  const themeClasses = getThemeCardClasses(theme.id);

  // Render front/back HTML for Preview Mode
  const frontRendered = useMemo(() => {
    const activeData = { ...internalCard, cardType: previewCardType };
    if (previewCardType === 'spelling') {
      return renderThemeHtml(getSpellingFrontHtml(theme.id), activeData, { isPreview: true, cardType: previewCardType, themeId: theme.id });
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

  // ----------------------------------------------------
  // SUB-RENDERERS FOR EDITABLE CARDS
  // ----------------------------------------------------

  // Reusable Custom Boxes Editor for Any Side (Front / Back)
  const renderCustomBoxesEditor = (side: 'front' | 'back') => {
    const blocks = (internalCard.customBlocks || []).filter((b) =>
      side === 'front' ? b.side === 'front' : (b.side === 'back' || !b.side)
    );
    const sideLabel = side === 'front' ? 'Front' : 'Back';

    return (
      <div className="space-y-2.5 pt-3 border-t border-zinc-700/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <span>📦 Custom Boxes ({sideLabel}):</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 font-mono text-zinc-300">
              {blocks.length}
            </span>
          </span>
          <button
            type="button"
            onClick={() => handleAddCustomBlock(side)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs ${
              side === 'front'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>+ Add Box ({sideLabel})</span>
          </button>
        </div>

        {blocks.length > 0 && (
          <div className="space-y-2.5">
            {blocks.map((blk) => {
              const bgColor = blk.color || '#1E293B';
              const isSelected = selectedBoxId === blk.id;
              return (
                <div
                  key={blk.id}
                  style={{ backgroundColor: bgColor }}
                  onClick={() => setSelectedBoxId(blk.id)}
                  className={`p-3 rounded-lg border transition-all duration-150 shadow-xs space-y-2 relative group ${
                    isSelected ? 'ring-2 ring-blue-400 border-white/40' : 'border-black/30 hover:border-white/20'
                  }`}
                >
                  {/* Box Header Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/40 text-white shrink-0 tracking-wider">
                        {blk.side === 'front' ? 'FRONT' : 'BACK'}
                      </span>
                      <input
                        type="text"
                        value={blk.title}
                        onChange={(e) => handleUpdateCustomBlock(blk.id, { title: e.target.value })}
                        placeholder="Box Title / Label..."
                        className="font-bold text-xs bg-black/20 px-2 py-1 rounded border border-white/20 focus:border-white focus:outline-none text-white flex-1 min-w-0"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Move Side */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateCustomBlock(blk.id, {
                            side: blk.side === 'front' ? 'back' : 'front',
                          });
                        }}
                        className="px-2 py-0.5 text-[10px] font-semibold bg-black/40 hover:bg-black/60 text-zinc-200 rounded border border-white/20 cursor-pointer"
                        title={`Move this box to ${blk.side === 'front' ? 'Back' : 'Front'}`}
                      >
                        Move to {blk.side === 'front' ? 'Back' : 'Front'}
                      </button>

                      {/* Direction */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateCustomBlock(blk.id, {
                            dir: blk.dir === 'rtl' ? 'ltr' : blk.dir === 'ltr' ? 'auto' : 'rtl',
                          });
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-black/40 hover:bg-black/60 text-zinc-200 rounded border border-white/20 cursor-pointer uppercase"
                        title="Toggle Text Direction (auto / ltr / rtl)"
                      >
                        {blk.dir || 'auto'}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomBlock(blk.id);
                        }}
                        className="p-1 text-rose-300 hover:text-white hover:bg-rose-600/60 rounded cursor-pointer transition-colors"
                        title="Delete this box"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Box Content */}
                  <textarea
                    rows={2}
                    dir={blk.dir || 'auto'}
                    value={blk.content}
                    onChange={(e) => handleUpdateCustomBlock(blk.id, { content: e.target.value })}
                    onFocus={(e) => {
                      activeInputRef.current = { element: e.target, fieldName: 'customBlock', blockId: blk.id };
                      setSelectedBoxId(blk.id);
                    }}
                    placeholder="Content (Markdown supported: **bold**, *italic*, - bullets, `code`)..."
                    className="w-full p-2 text-xs rounded bg-black/35 text-white border border-white/15 focus:outline-none focus:ring-1 focus:ring-white/50 leading-relaxed font-sans placeholder-white/40"
                  />

                  {/* Color Palette Chips */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-black/20">
                    <span className="text-[10px] text-white/70 font-semibold">Color:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {BOX_BG_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateCustomBlock(blk.id, { color: preset.hex });
                          }}
                          className={`w-4 h-4 rounded-full border border-black/30 cursor-pointer transition-transform ${
                            (blk.color || '#1E293B').toLowerCase() === preset.hex.toLowerCase()
                              ? 'scale-125 ring-2 ring-white shadow-xs'
                              : 'opacity-80 hover:opacity-100 hover:scale-110'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Shared Image Box for Editors
  const renderImageEditor = () => (
    <div className="mb-4">
      {internalCard.imageBase64 ? (
        <div className="relative group rounded-lg overflow-hidden border border-black/30 shadow-xs">
          <img
            src={
              internalCard.imageBase64.startsWith('data:')
                ? internalCard.imageBase64
                : `data:image/jpeg;base64,${internalCard.imageBase64}`
            }
            alt={internalCard.word}
            className="w-full max-h-[220px] object-cover block"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={onOpenImageSearch}
              className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Online</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-white rounded shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Local</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onRemoveImage) onRemoveImage();
                handleUpdate((prev) => ({
                  ...prev,
                  imageBase64: undefined,
                  imageUrl: undefined,
                  imageFileName: undefined,
                  needsPhoto: false,
                }));
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-zinc-700/60 rounded-lg p-3 text-center bg-black/5 hover:bg-black/10 transition-colors flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-400 font-medium">No image attached</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenImageSearch}
              className="px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3 h-3" />
              <span>Search Online</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-white rounded flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // 1. Normal Front Editor
  const renderNormalFrontEditor = () => (
    <div className={themeClasses.wrapper}>
      <div className={`${themeClasses.card} p-4 sm:p-6`}>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-600 text-white uppercase tracking-wider">
              💥 VOCABULARY (FRONT)
            </span>
            <input
              type="text"
              value={internalCard.partOfSpeech || ''}
              onChange={(e) => updateSimpleField('partOfSpeech', e.target.value)}
              onFocus={(e) => {
                activeInputRef.current = { element: e.target, fieldName: 'partOfSpeech' };
              }}
              placeholder="pos (e.g. noun)"
              className="text-[11px] font-bold px-2 py-0.5 rounded border border-zinc-700/50 bg-black/20 text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Part of speech"
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {theme.name}
          </span>
        </div>

        {/* Image */}
        {renderImageEditor()}

        {/* Word Title & IPA */}
        <div className="mb-4 text-center">
          <input
            type="text"
            value={internalCard.word || ''}
            onChange={(e) => updateSimpleField('word', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'word' };
            }}
            placeholder="Target Word..."
            className="w-full text-center text-2xl sm:text-3xl font-extrabold tracking-wide bg-transparent border-b-2 border-dashed border-blue-500/40 focus:border-blue-500 focus:outline-none py-1 mb-2"
          />
          <input
            type="text"
            value={internalCard.phonetic || ''}
            onChange={(e) => updateSimpleField('phonetic', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'phonetic' };
            }}
            placeholder="/ipa/"
            className="text-center font-mono text-sm px-3 py-1 rounded bg-black/20 border border-zinc-700/50 text-sky-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Audio Clues Dock */}
        <div className="mb-4 p-2.5 rounded-lg border border-zinc-700/50 bg-black/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Pronunciation Clues:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {internalCard.wordAudioUsNormalBase64 && (
              <button
                type="button"
                onClick={() => playAudio(internalCard.wordAudioUsNormalBase64!)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:bg-blue-600/50 cursor-pointer"
              >
                US Normal
              </button>
            )}
            {internalCard.wordAudioUsSlowBase64 && (
              <button
                type="button"
                onClick={() => playAudio(internalCard.wordAudioUsSlowBase64!)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/40 cursor-pointer"
              >
                US Slow
              </button>
            )}
            {internalCard.wordAudioUkNormalBase64 && (
              <button
                type="button"
                onClick={() => playAudio(internalCard.wordAudioUkNormalBase64!)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/50 cursor-pointer"
              >
                UK Normal
              </button>
            )}
          </div>
        </div>

        {/* Front Context / Example */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10">
          <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1.5">
            💡 Front Context / Example Prompt:
          </label>
          <textarea
            rows={2}
            value={internalCard.example || ''}
            onChange={(e) => updateSimpleField('example', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'example' };
            }}
            placeholder="Context sentence..."
            className="w-full p-2 text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Front Custom Boxes */}
        {renderCustomBoxesEditor('front')}
      </div>
    </div>
  );

  // 2. Normal Back Editor
  const renderNormalBackEditor = (showCompactHeader = false) => (
    <div className={themeClasses.wrapper}>
      <div className={`${themeClasses.card} p-4 sm:p-6 space-y-4`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-600 text-white uppercase tracking-wider">
              💥 VOCABULARY (BACK)
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/20 text-zinc-300 border border-zinc-700/50">
              {internalCard.partOfSpeech || 'noun'}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {theme.name}
          </span>
        </div>

        {/* Word Reference (if only Back is shown) */}
        {showCompactHeader && (
          <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/15 flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-blue-400">{internalCard.word}</div>
              <div className="text-xs font-mono text-zinc-400">{internalCard.phonetic}</div>
            </div>
            {internalCard.wordAudioUsNormalBase64 && (
              <button
                type="button"
                onClick={() => playAudio(internalCard.wordAudioUsNormalBase64!)}
                className="p-2 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                title="Play US pronunciation"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Persian Meaning */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              📖 Persian Meaning / معنی فارسی
            </label>
            <span className="text-[10px] text-zinc-400 font-mono">RTL</span>
          </div>
          <textarea
            rows={2}
            dir="rtl"
            value={internalCard.meaningFa || ''}
            onChange={(e) => updateSimpleField('meaningFa', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'meaningFa' };
            }}
            placeholder="معنی دقیق و روان به فارسی..."
            className="w-full p-2.5 text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Example & Persian Translation */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              💬 Example & Translation / مثال و ترجمه
            </label>
            {internalCard.exampleAudioUsNormalBase64 && (
              <button
                type="button"
                onClick={() => playAudio(internalCard.exampleAudioUsNormalBase64!)}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3 h-3" />
                <span>Play Sentence Audio</span>
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={internalCard.example || ''}
            onChange={(e) => updateSimpleField('example', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'example' };
            }}
            placeholder="English example sentence..."
            className="w-full p-2 text-xs sm:text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            rows={2}
            dir="rtl"
            value={internalCard.translationFa || ''}
            onChange={(e) => updateSimpleField('translationFa', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'translationFa' };
            }}
            placeholder="ترجمه فارسی مثال..."
            className="w-full p-2 text-xs sm:text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Memory Hook (Mnemonic) */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10">
          <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block mb-1.5">
            🧠 Memory Hook & Etymology / کد یادسپاری و ریشه‌شناسی
          </label>
          <textarea
            rows={2}
            value={internalCard.mnemonic || ''}
            onChange={(e) => updateSimpleField('mnemonic', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'mnemonic' };
            }}
            placeholder="کد صوتی، ریشه‌شناسی یا داستان تصویرسازی ذهنی..."
            className="w-full p-2 text-xs sm:text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* Back Custom Boxes */}
        {renderCustomBoxesEditor('back')}
      </div>
    </div>
  );

  // 3. Spelling Front Editor
  const renderSpellingFrontEditor = () => (
    <div className={themeClasses.wrapper}>
      <div className={`${themeClasses.card} p-4 sm:p-6 space-y-4`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-600 text-white uppercase tracking-wider">
              🎯 SPELLING CHALLENGE (FRONT)
            </span>
            <input
              type="text"
              value={internalCard.partOfSpeech || ''}
              onChange={(e) => updateSimpleField('partOfSpeech', e.target.value)}
              onFocus={(e) => {
                activeInputRef.current = { element: e.target, fieldName: 'partOfSpeech' };
              }}
              placeholder="pos (e.g. noun)"
              className="text-[11px] font-bold px-2 py-0.5 rounded border border-zinc-700/50 bg-black/20 text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {theme.name}
          </span>
        </div>

        {/* Image */}
        {renderImageEditor()}

        {/* Target Word Reference */}
        <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-950/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Target Word (Concealed on Anki Front):
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Hidden during test</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={internalCard.word || ''}
              onChange={(e) => updateSimpleField('word', e.target.value)}
              onFocus={(e) => {
                activeInputRef.current = { element: e.target, fieldName: 'word' };
              }}
              placeholder="Target Word..."
              className="p-1.5 text-sm font-bold bg-black/30 rounded border border-zinc-700 text-white"
            />
            <input
              type="text"
              value={internalCard.phonetic || ''}
              onChange={(e) => updateSimpleField('phonetic', e.target.value)}
              onFocus={(e) => {
                activeInputRef.current = { element: e.target, fieldName: 'phonetic' };
              }}
              placeholder="/ipa/"
              className="p-1.5 text-xs font-mono bg-black/30 rounded border border-zinc-700 text-sky-400"
            />
          </div>
        </div>

        {/* Spelling Gap Sentence */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              ✍️ Missing Word Gap Sentence:
            </label>
            <button
              type="button"
              onClick={handleAutoBlankSentence}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              title="Automatically replace target word in example with [ ______ ]"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Auto-Blank Word</span>
            </button>
          </div>
          <textarea
            rows={2}
            value={internalCard.spellingSentence || ''}
            onChange={(e) => updateSimpleField('spellingSentence', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'spellingSentence' };
            }}
            placeholder="Sentence with ______ blank..."
            className="w-full p-2 text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Audio Clues Dock */}
        <div className="p-2.5 rounded-lg border border-zinc-700/50 bg-black/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Audio Clues:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {internalCard.wordAudioUsNormalBase64 && (
              <button
                type="button"
                onClick={() => playAudio(internalCard.wordAudioUsNormalBase64!)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/50 cursor-pointer"
              >
                Word Audio
              </button>
            )}
            {internalCard.exampleAudioUsNormalBase64 && (
              <button
                type="button"
                onClick={() => playAudio(internalCard.exampleAudioUsNormalBase64!)}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:bg-blue-600/50 cursor-pointer"
              >
                Sentence Audio
              </button>
            )}
          </div>
        </div>

        {/* Interactive In-Editor Spelling Practice Tester */}
        <div className="p-3 rounded-lg border border-purple-500/40 bg-purple-950/25 space-y-2">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
            🎮 Interactive In-Editor Spelling Practice
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testSpellingInput}
              onChange={(e) => {
                setTestSpellingInput(e.target.value);
                setTestSpellingResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTestSpelling();
                }
              }}
              placeholder="Type word to test spelling..."
              className="flex-1 p-2 text-sm bg-black/40 rounded border border-purple-500/50 text-white focus:outline-none focus:ring-1 focus:ring-purple-400 font-bold"
            />
            <button
              type="button"
              onClick={handleTestSpelling}
              className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded shadow-xs cursor-pointer transition-colors"
            >
              Check
            </button>
          </div>
          {testSpellingResult === 'correct' && (
            <div className="p-2 rounded bg-emerald-950/50 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Correct! Perfect spelling match for "{internalCard.word}".</span>
            </div>
          )}
          {testSpellingResult === 'incorrect' && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-500/60 text-rose-300 text-xs font-medium flex items-center justify-between">
              <span>Incorrect spelling. Target word is "{internalCard.word}".</span>
              <button
                type="button"
                onClick={() => setTestSpellingInput(internalCard.word || '')}
                className="text-[10px] underline hover:text-white"
              >
                Auto-fill
              </button>
            </div>
          )}
        </div>

        {/* Front Custom Boxes for Spelling */}
        {renderCustomBoxesEditor('front')}
      </div>
    </div>
  );

  // 4. Spelling Back Editor
  const renderSpellingBackEditor = () => (
    <div className={themeClasses.wrapper}>
      <div className={`${themeClasses.card} p-4 sm:p-6 space-y-4`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-600 text-white uppercase tracking-wider">
              🎯 SPELLING SOLUTION (BACK)
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/20 text-zinc-300 border border-zinc-700/50">
              {internalCard.partOfSpeech || 'noun'}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {theme.name}
          </span>
        </div>

        {/* Revealed Word Solution */}
        <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-950/20 text-center space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Revealed Word Solution:
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            {internalCard.word}
          </div>
          <div className="text-xs font-mono text-emerald-300">{internalCard.phonetic}</div>
          {internalCard.wordAudioUsNormalBase64 && (
            <button
              type="button"
              onClick={() => playAudio(internalCard.wordAudioUsNormalBase64!)}
              className="mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Play Word Audio</span>
            </button>
          )}
        </div>

        {/* Full Context Sentence & Translation */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10 space-y-2">
          <label className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
            💬 Full Context Example & Persian Translation:
          </label>
          <textarea
            rows={2}
            value={internalCard.example || ''}
            onChange={(e) => updateSimpleField('example', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'example' };
            }}
            placeholder="Full English example sentence with word..."
            className="w-full p-2 text-xs sm:text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            rows={2}
            dir="rtl"
            value={internalCard.translationFa || ''}
            onChange={(e) => updateSimpleField('translationFa', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'translationFa' };
            }}
            placeholder="ترجمه فارسی مثال..."
            className="w-full p-2 text-xs sm:text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Persian Meaning */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10">
          <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
            📖 Persian Meaning / معنی فارسی:
          </label>
          <textarea
            rows={2}
            dir="rtl"
            value={internalCard.meaningFa || ''}
            onChange={(e) => updateSimpleField('meaningFa', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'meaningFa' };
            }}
            placeholder="معنی دقیق فارسی..."
            className="w-full p-2 text-xs sm:text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Memory Hook */}
        <div className="p-3 rounded-lg border border-zinc-700/50 bg-black/10">
          <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block mb-1.5">
            🧠 Memory Hook & Etymology:
          </label>
          <textarea
            rows={2}
            value={internalCard.mnemonic || ''}
            onChange={(e) => updateSimpleField('mnemonic', e.target.value)}
            onFocus={(e) => {
              activeInputRef.current = { element: e.target, fieldName: 'mnemonic' };
            }}
            placeholder="کد یادسپاری..."
            className="w-full p-2 text-xs sm:text-sm bg-black/20 rounded border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Back Custom Boxes for Spelling */}
        {renderCustomBoxesEditor('back')}
      </div>
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 text-left relative">
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
      <div
        className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b text-xs shrink-0 ${
          isDark ? 'border-zinc-700' : 'border-zinc-200'
        }`}
      >
        {/* Left: Mode (Edit vs Preview) & Theme Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {editable && (
            <div
              className={`inline-flex border p-0.5 rounded-md shadow-xs ${
                isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
              }`}
            >
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
                title="Direct in-place card editor (edit fields directly)"
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

        {/* Right: View & Side Toggles + Slide-out Toolbar Toggle Button */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Card Type (Normal / Spelling) */}
          <div
            className={`inline-flex border p-0.5 rounded-md shadow-xs ${
              isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => handleToggleCardType('normal')}
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
              onClick={() => handleToggleCardType('spelling')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                previewCardType === 'spelling'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {t('common.spelling')}
            </button>
          </div>

          {/* Desktop / Mobile Toggle */}
          <div
            className={`inline-flex border p-0.5 rounded-md shadow-xs ${
              isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
            }`}
          >
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
          <div
            className={`inline-flex border p-0.5 gap-0.5 rounded-md shadow-xs ${
              isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white'
            }`}
          >
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

          {/* Toggle Slide-out Editor Toolbar Button */}
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
              title={isSidebarOpen ? 'Close Toolbar Drawer' : 'Open Slide-out Toolbar Drawer'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSidebarOpen ? 'Close Toolbar' : 'Toolbar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT CANVAS & RIGHT TOOLBAR */}
      <div className="w-full flex-1 flex flex-col xl:flex-row gap-3.5 xl:gap-4 min-h-0 min-w-0">
        {/* CARD CANVAS */}
        <div
          onClick={handleCardClick}
          className="flex-1 overflow-y-auto flex flex-col items-center justify-start py-2 px-1 sm:px-2 min-w-0"
        >
          {/* PREVIEW MODE: EXACT ANKI HTML RENDERING */}
          {mode === 'preview' && (
            <>
              {/* Front Preview */}
              {(activeSide === 'front' || activeSide === 'both') && (
                <div
                  className={`w-full transition-all duration-200 mb-6 ${
                    viewMode === 'mobile'
                      ? `max-w-[380px] border-x-2 border-dashed ${
                          isDark ? 'border-zinc-700' : 'border-zinc-300'
                        } p-1`
                      : 'w-full max-w-3xl'
                  }`}
                >
                  {activeSide === 'both' && (
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-blue-500/30 text-xs font-bold text-blue-400">
                      <span>— {t('preview.frontCardBanner', { type: previewCardType.toUpperCase() }) || `FRONT CARD (${previewCardType.toUpperCase()})`} —</span>
                    </div>
                  )}
                  <div
                    className="w-full overflow-hidden select-text"
                    dangerouslySetInnerHTML={{ __html: frontRendered }}
                  />
                </div>
              )}

              {/* Back Preview */}
              {(activeSide === 'back' || activeSide === 'both') && (
                <div
                  className={`w-full transition-all duration-200 ${
                    viewMode === 'mobile'
                      ? `max-w-[380px] border-x-2 border-dashed ${
                          isDark ? 'border-zinc-700' : 'border-zinc-300'
                        } p-1`
                      : 'w-full max-w-3xl'
                  }`}
                >
                  {activeSide === 'both' && (
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-emerald-500/30 text-xs font-bold text-emerald-400">
                      <span>— {t('preview.backCardBanner') || 'BACK CARD (FULL ANSWER)'} —</span>
                    </div>
                  )}
                  <div
                    className="w-full overflow-hidden select-text"
                    dangerouslySetInnerHTML={{ __html: backRendered }}
                  />
                </div>
              )}
            </>
          )}

          {/* EDIT MODE: DIRECT THEME-AWARE INTERACTIVE CARD INLINE EDITOR */}
          {mode === 'edit' && (
            <div
              className={`w-full transition-all duration-200 space-y-6 ${
                viewMode === 'mobile'
                  ? `max-w-[380px] border-x-2 border-dashed ${
                      isDark ? 'border-zinc-700' : 'border-zinc-300'
                    } p-1`
                  : 'w-full max-w-3xl'
              }`}
            >
              {/* Normal Mode Combinations */}
              {previewCardType === 'normal' && (
                <>
                  {(activeSide === 'front' || activeSide === 'both') && (
                    <div>
                      {activeSide === 'both' && (
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-blue-500/40 text-xs font-bold text-blue-400">
                          <span>— FRONT CARD (VOCABULARY) —</span>
                        </div>
                      )}
                      {renderNormalFrontEditor()}
                    </div>
                  )}

                  {(activeSide === 'back' || activeSide === 'both') && (
                    <div>
                      {activeSide === 'both' && (
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-emerald-500/40 text-xs font-bold text-emerald-400">
                          <span>— BACK CARD (MEANING & DETAILS) —</span>
                        </div>
                      )}
                      {renderNormalBackEditor(activeSide === 'back')}
                    </div>
                  )}
                </>
              )}

              {/* Spelling Mode Combinations */}
              {previewCardType === 'spelling' && (
                <>
                  {(activeSide === 'front' || activeSide === 'both') && (
                    <div>
                      {activeSide === 'both' && (
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-purple-500/40 text-xs font-bold text-purple-400">
                          <span>— FRONT CARD (SPELLING CHALLENGE) —</span>
                        </div>
                      )}
                      {renderSpellingFrontEditor()}
                    </div>
                  )}

                  {(activeSide === 'back' || activeSide === 'both') && (
                    <div>
                      {activeSide === 'both' && (
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-emerald-500/40 text-xs font-bold text-emerald-400">
                          <span>— BACK CARD (SPELLING SOLUTION) —</span>
                        </div>
                      )}
                      {renderSpellingBackEditor()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SLIDE-OUT FORMATTING & CUSTOM BOX TOOLBAR DRAWER */}
        {editable && mode === 'edit' && isSidebarOpen && (
          <aside
            className={`w-full xl:w-72 2xl:w-80 shrink-0 border rounded-xl shadow-md overflow-hidden flex flex-col transition-all duration-200 ${
              isDark ? 'bg-[#1F1F23] border-zinc-700/80 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Drawer Header */}
            <div
              className={`p-3 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'border-zinc-700/80 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Editor Toolbar</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
                title="Close Toolbar Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Toolbar Body */}
            <div className="p-3.5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Active Focused Field Indicator */}
              <div className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                isDark ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
              }`}>
                <span className="text-zinc-400">Active Field:</span>
                <span className="font-semibold text-blue-400 capitalize">
                  {activeInputRef.current.fieldName || 'Persian Meaning'}
                </span>
              </div>

              {/* SECTION 1: Markdown Formatting */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Markdown Formatting
                </span>
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('bold')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-semibold">Bold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('italic')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Italic (*text*)"
                  >
                    <Italic className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-semibold">Italic</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('underline')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Underline (<u>text</u>)"
                  >
                    <Underline className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-semibold">Underline</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('code')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Inline Code (`code`)"
                  >
                    <Code className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-semibold">Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkdownToolbarAction('bulletList')}
                    className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
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
                      isDark ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                    title="Numbered List (1. item)"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-semibold">Numbers</span>
                  </button>
                </div>

                {/* Text Color Selector */}
                <div className="mb-2.5">
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
                  </div>
                </div>

                {/* Text Highlighter */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Highlight Background:
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

              {/* SECTION 2: Custom Boxes Management */}
              <div className={`pt-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                {(() => {
                  const allCustomBlocks = internalCard.customBlocks || [];
                  const frontBoxes = allCustomBlocks.filter((b) => b.side === 'front');
                  const backBoxes = allCustomBlocks.filter((b) => b.side === 'back' || !b.side);
                  const isFrontSide = activeSide === 'front';
                  const isBackSide = activeSide === 'back';
                  const displayedBoxes = isFrontSide ? frontBoxes : isBackSide ? backBoxes : allCustomBlocks;

                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          {isFrontSide
                            ? `Front Boxes (${frontBoxes.length})`
                            : isBackSide
                            ? `Back Boxes (${backBoxes.length})`
                            : `Boxes (F:${frontBoxes.length} / B:${backBoxes.length})`}
                        </span>
                        <div className="flex items-center gap-1">
                          {(isFrontSide || activeSide === 'both') && (
                            <button
                              type="button"
                              onClick={() => handleAddCustomBlock('front')}
                              className="py-0.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                              title="Add Box to Front side"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Add Box {activeSide === 'both' ? '(Front)' : ''}</span>
                            </button>
                          )}
                          {(isBackSide || activeSide === 'both') && (
                            <button
                              type="button"
                              onClick={() => handleAddCustomBlock('back')}
                              className="py-0.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                              title="Add Box to Back side"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Add Box {activeSide === 'both' ? '(Back)' : ''}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Box Selector Pills */}
                      {displayedBoxes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {displayedBoxes.map((blk) => {
                            const isSel = selectedBox?.id === blk.id;
                            const isFront = blk.side === 'front';
                            return (
                              <button
                                key={blk.id}
                                type="button"
                                onClick={() => setSelectedBoxId(blk.id)}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border cursor-pointer transition-all ${
                                  isSel
                                    ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                                    : isDark
                                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                                    : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isFront ? 'bg-sky-400' : 'bg-emerald-400'
                                  }`}
                                />
                                <span className="truncate max-w-[90px]">{blk.title || 'Untitled'}</span>
                                {activeSide === 'both' && (
                                  <span className="text-[8px] opacity-75 uppercase font-mono">
                                    ({isFront ? 'F' : 'B'})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-500 italic p-2 rounded bg-black/10 border border-zinc-700/30 text-center">
                          No {isFrontSide ? 'Front' : isBackSide ? 'Back' : 'Custom'} boxes yet. Click + Add Box above.
                        </div>
                      )}

                      {selectedBox && (
                        <div
                          className={`p-2.5 rounded-lg border space-y-2.5 ${
                            isDark ? 'bg-zinc-850 border-zinc-700/80' : 'bg-zinc-50 border-zinc-200'
                          }`}
                        >
                          {/* Side selector */}
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Assigned Side:
                            </label>
                            <div className="flex rounded bg-black/20 p-0.5 border border-zinc-700">
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomBlock(selectedBox.id, { side: 'front' })}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                  selectedBox.side === 'front'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                              >
                                Front Only
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomBlock(selectedBox.id, { side: 'back' })}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                  selectedBox.side === 'back' || !selectedBox.side
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                              >
                                Back Only
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                              Box Title:
                            </label>
                            <input
                              type="text"
                              value={selectedBox.title}
                              onChange={(e) => handleUpdateCustomBlock(selectedBox.id, { title: e.target.value })}
                              className={`w-full p-1.5 rounded border text-xs font-bold ${
                                isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
                              }`}
                              placeholder="Box Title..."
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                              Box Background Color:
                            </label>
                            <div className="grid grid-cols-6 gap-1 mb-1.5">
                              {BOX_BG_PRESETS.map((preset) => (
                                <button
                                  key={preset.hex}
                                  type="button"
                                  onClick={() => handleUpdateCustomBlock(selectedBox.id, { color: preset.hex })}
                                  className={`h-5 rounded border cursor-pointer transition-transform ${
                                    (selectedBox.color || '#1E293B').toLowerCase() === preset.hex.toLowerCase()
                                      ? 'scale-110 ring-2 ring-blue-500 shadow-xs'
                                      : 'opacity-85 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: preset.hex }}
                                  title={`${preset.name} (${preset.hex})`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Delete selected box */}
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomBlock(selectedBox.id)}
                              className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete Box</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
