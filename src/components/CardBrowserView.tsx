import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppSettings, AppTheme, CardData, ThemeId } from '../types';
import {
  searchAnkiNotes,
  updateAnkiNote,
  checkAnki,
  getAnkiDecks,
  getAnkiTags,
  openInAnki,
  getAnkiModelNames,
  AnkiBrowserNoteItem,
} from '../services/api';
import { UnifiedCardEditor } from './UnifiedCardEditor';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { THEME_GROUPS, resolveThemeFromNoteType } from '../themes';
import {
  Search,
  RotateCcw,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  ExternalLink,
  Layers,
  X,
  Tag,
  Folder,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface CardBrowserViewProps {
  settings: AppSettings;
  appTheme?: AppTheme;
}

export const CardBrowserView: React.FC<CardBrowserViewProps> = ({ settings }) => {
  const themeContext = useAppTheme();
  const { t, isRTL } = useTranslation();
  const isDark = themeContext.isDark;

  // Search state
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAnkiConnected, setIsAnkiConnected] = useState<boolean | null>(null);

  // Notes state
  const [notes, setNotes] = useState<AnkiBrowserNoteItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Available metadata for quick filter suggestions & Note Types
  const [availableDecks, setAvailableDecks] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [ankiModelNames, setAnkiModelNames] = useState<string[]>([]);

  // Current editing card in editor
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [originalCardJson, setOriginalCardJson] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Note Type & Theme source of truth for editor
  const [currentNoteType, setCurrentNoteType] = useState<string>('');
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(settings.theme || 'comic-pop-dark');

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isShowingInAnki, setIsShowingInAnki] = useState<boolean>(false);

  // Unsaved changes confirmation modal
  const [unsavedModal, setUnsavedModal] = useState<{
    isOpen: boolean;
    pendingAction: (() => void) | null;
    targetTitle?: string;
  }>({
    isOpen: false,
    pendingAction: null,
  });

  const selectedNote = selectedIndex >= 0 && selectedIndex < notes.length ? notes[selectedIndex] : null;

  // Check connection and fetch metadata on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const health = await checkAnki(settings.anki.url);
      if (!isMounted) return;
      setIsAnkiConnected(health.connected);

      if (health.connected) {
        // Fetch decks & tags for quick hints
        getAnkiDecks(settings.anki.url).then((res) => {
          if (isMounted && res.success && Array.isArray(res.decks)) {
            setAvailableDecks(res.decks);
          }
        });

        getAnkiTags(settings.anki.url).then((res) => {
          if (isMounted && res.success && Array.isArray(res.tags)) {
            setAvailableTags(res.tags);
          }
        });

        getAnkiModelNames(settings.anki.url).then((res) => {
          if (isMounted && res.success && Array.isArray(res.modelNames)) {
            setAnkiModelNames(res.modelNames);
          }
        });

        // Run default search for the default deck or all cards
        const initialQuery = settings.anki.defaultDeck ? `deck:"${settings.anki.defaultDeck}"` : '';
        setSearchInput(initialQuery);
        executeSearch(initialQuery);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [settings.anki.url, settings.anki.defaultDeck]);

  // Execute AnkiConnect search
  const executeSearch = useCallback(
    async (queryToSearch: string) => {
      setIsSearching(true);
      setSearchError(null);
      setActiveQuery(queryToSearch);

      try {
        const res = await searchAnkiNotes({
          query: queryToSearch,
          url: settings.anki.url,
          limit: 300,
        });

        if (!res.success) {
          setSearchError(res.error || 'Failed to search cards in AnkiConnect');
          setNotes([]);
          setTotalCount(0);
          setSelectedIndex(-1);
          setEditingCard(null);
          setOriginalCardJson('');
          setIsDirty(false);
          setCurrentNoteType('');
          setIsAnkiConnected(false);
        } else {
          setIsAnkiConnected(true);
          setNotes(res.notes);
          setTotalCount(res.totalCount);

          if (res.notes.length > 0) {
            // Select first card by default
            setSelectedIndex(0);
            const firstNote = res.notes[0];
            const firstCardData = { ...firstNote.cardData };
            setEditingCard(firstCardData);
            setOriginalCardJson(JSON.stringify(firstCardData));
            setIsDirty(false);
            const actualNoteType = firstNote.modelName || firstNote.noteType || 'Standard';
            setCurrentNoteType(actualNoteType);
            const initialTheme =
              firstNote.detectedTheme ||
              resolveThemeFromNoteType(actualNoteType, settings.theme || 'comic-pop-dark');
            setCurrentTheme(initialTheme);

            const foundModels = Array.from(new Set(res.notes.map((n) => n.modelName).filter(Boolean)));
            if (foundModels.length > 0) {
              setAnkiModelNames((prev) => Array.from(new Set([...prev, ...foundModels])));
            }
          } else {
            setSelectedIndex(-1);
            setEditingCard(null);
            setOriginalCardJson('');
            setIsDirty(false);
            setCurrentNoteType('');
          }
        }
      } catch (err: any) {
        setSearchError(err?.message || 'Error querying AnkiConnect');
        setIsAnkiConnected(false);
        setNotes([]);
        setTotalCount(0);
        setSelectedIndex(-1);
        setEditingCard(null);
        setOriginalCardJson('');
        setIsDirty(false);
      } finally {
        setIsSearching(false);
      }
    },
    [settings.anki.url, settings.theme]
  );

  // Safe navigation guard for unsaved changes
  const requestNavigation = useCallback(
    (action: () => void, targetTitle?: string) => {
      if (isDirty) {
        setUnsavedModal({
          isOpen: true,
          pendingAction: action,
          targetTitle,
        });
      } else {
        action();
      }
    },
    [isDirty]
  );

  const handleSelectCard = useCallback(
    (index: number) => {
      if (index === selectedIndex) return;
      if (index < 0 || index >= notes.length) return;

      const target = notes[index];
      requestNavigation(() => {
        setSelectedIndex(index);
        const cardCopy = { ...target.cardData };
        setEditingCard(cardCopy);
        setOriginalCardJson(JSON.stringify(cardCopy));
        setIsDirty(false);
        setSaveSuccessMsg(null);
        const actualNoteType = target.modelName || target.noteType || 'Standard';
        setCurrentNoteType(actualNoteType);
        const targetTheme =
          target.detectedTheme ||
          resolveThemeFromNoteType(actualNoteType, settings.theme || 'comic-pop-dark');
        setCurrentTheme(targetTheme);
      }, target.word);
    },
    [notes, selectedIndex, requestNavigation, settings.theme]
  );

  const appThemeNoteTypes = useMemo(
    () => [
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
    ],
    []
  );

  const handleNoteTypeChange = useCallback(
    (newModelName: string) => {
      setCurrentNoteType(newModelName);

      // Determine theme corresponding to the new note type
      const newTheme = resolveThemeFromNoteType(newModelName, currentTheme);
      setCurrentTheme(newTheme);

      // Distinguish spelling vs normal if new model specifies it
      let newCardType = editingCard?.cardType || selectedNote?.cardType || 'normal';
      if (/(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(newModelName)) {
        newCardType = 'spelling';
      } else if (/(\b|_|\(|-)normal(\b|_|\)|-)/i.test(newModelName)) {
        newCardType = 'normal';
      }

      setEditingCard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          modelName: newModelName,
          noteType: newModelName,
          cardType: newCardType,
        };
      });

      setIsDirty(true);
      setSaveSuccessMsg(null);
    },
    [currentTheme, editingCard, selectedNote]
  );

  const handleThemeChange = useCallback((newTheme: ThemeId) => {
    setCurrentTheme(newTheme);
    setIsDirty(true);
    setSaveSuccessMsg(null);
  }, []);

  const handlePreviousCard = useCallback(() => {
    if (selectedIndex > 0) {
      handleSelectCard(selectedIndex - 1);
    }
  }, [selectedIndex, handleSelectCard]);

  const handleNextCard = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < notes.length - 1) {
      handleSelectCard(selectedIndex + 1);
    }
  }, [selectedIndex, notes.length, handleSelectCard]);

  // Card editing change handler from CardPreview
  const handleCardChange = useCallback(
    (updated: CardData) => {
      setEditingCard(updated);
      const isChanged = JSON.stringify(updated) !== originalCardJson;
      setIsDirty(isChanged);
      setSaveSuccessMsg(null);
    },
    [originalCardJson]
  );

  // Save to Anki
  const handleSaveToAnki = useCallback(async (): Promise<boolean> => {
    if (!selectedNote || !editingCard) return false;

    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const cardToSave: CardData = {
        ...editingCard,
        modelName: currentNoteType || editingCard.modelName || selectedNote.modelName,
        noteType: currentNoteType || editingCard.noteType || selectedNote.noteType,
      };

      const res = await updateAnkiNote(
        selectedNote.noteId,
        cardToSave,
        currentTheme,
        settings.anki.url,
        selectedNote.deckName,
        currentNoteType || selectedNote.modelName
      );

      if (res.success) {
        // Update snapshot and dirty flag
        setOriginalCardJson(JSON.stringify(cardToSave));
        setIsDirty(false);
        setSaveSuccessMsg(`✓ Note #${selectedNote.noteId} saved successfully!`);

        // Update card data in notes table
        setNotes((prevNotes) =>
          prevNotes.map((n, idx) =>
            idx === selectedIndex
              ? {
                  ...n,
                  modelName: currentNoteType || n.modelName,
                  noteType: currentNoteType || n.noteType,
                  word: cardToSave.word,
                  partOfSpeech: cardToSave.partOfSpeech,
                  meaningFa: cardToSave.meaningFa,
                  definitionEn: cardToSave.definitionEn,
                  phonetic: cardToSave.phonetic,
                  example: cardToSave.example,
                  translationFa: cardToSave.translationFa,
                  mnemonic: cardToSave.mnemonic,
                  cardType: cardToSave.cardType,
                  tags: cardToSave.tags || n.tags,
                  detectedTheme: currentTheme,
                  cardData: { ...cardToSave },
                }
              : n
          )
        );

        setTimeout(() => setSaveSuccessMsg(null), 4000);
        return true;
      } else {
        alert(res.error || 'Failed to save note to Anki');
        return false;
      }
    } catch (err: any) {
      alert(`Save error: ${err?.message || 'Failed to update note'}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, editingCard, currentTheme, currentNoteType, settings.anki.url, selectedIndex]);

  // Modal actions
  const handleModalSaveAndContinue = async () => {
    const success = await handleSaveToAnki();
    if (success) {
      const action = unsavedModal.pendingAction;
      setUnsavedModal({ isOpen: false, pendingAction: null });
      if (action) action();
    }
  };

  const handleModalDiscard = () => {
    const action = unsavedModal.pendingAction;
    setIsDirty(false);
    setUnsavedModal({ isOpen: false, pendingAction: null });
    if (action) action();
  };

  const handleModalCancel = () => {
    setUnsavedModal({ isOpen: false, pendingAction: null });
  };

  // Keyboard shortcuts (Ctrl+Left / Ctrl+Right / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveToAnki();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        if (!isInput) {
          e.preventDefault();
          handlePreviousCard();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        if (!isInput) {
          e.preventDefault();
          handleNextCard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveToAnki, handlePreviousCard, handleNextCard]);

  // Open note in Anki browser GUI
  const handleShowInAnki = async (noteId: number) => {
    setIsShowingInAnki(true);
    try {
      await openInAnki({ noteId, url: settings.anki.url });
    } catch (err) {
      console.warn('Could not open in Anki GUI:', err);
    } finally {
      setIsShowingInAnki(false);
    }
  };

  // Search form submit
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    requestNavigation(() => {
      executeSearch(searchInput);
    }, 'new search');
  };

  // Quick filter chips click
  const handleQuickFilter = (syntax: string) => {
    const current = searchInput.trim();
    let nextQuery = '';
    if (!current) {
      nextQuery = syntax;
    } else if (current.includes(syntax)) {
      nextQuery = current;
    } else {
      nextQuery = `${current} ${syntax}`;
    }
    setSearchInput(nextQuery);
    requestNavigation(() => {
      executeSearch(nextQuery);
    }, 'quick filter');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 py-3 flex flex-col gap-3 min-h-[calc(100vh-8rem)]">
      {/* Top Banner / Header Bar */}
      <div
        className={`px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-xs ${
          isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <span>Card Browser</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono">
                AnkiConnect
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Browse, search, and edit your existing Anki flashcards directly in the card editor.
            </p>
          </div>
        </div>

        {/* Global Connection / Status info */}
        <div className="flex items-center gap-2 text-xs">
          {isAnkiConnected === false ? (
            <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-500 font-medium flex items-center gap-1.5 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              AnkiConnect Offline
            </span>
          ) : isAnkiConnected === true ? (
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-500 font-medium flex items-center gap-1.5 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              AnkiConnect Ready
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-zinc-500/15 text-zinc-400 font-medium flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Connecting...
            </span>
          )}

          <button
            type="button"
            onClick={() => executeSearch(searchInput)}
            disabled={isSearching}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 text-zinc-200'
                : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-700'
            }`}
            title="Refresh search results"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Two-Pane Layout: Balanced 5:7 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-w-0">
        {/* LEFT PANE: Search & Text-Based Table (5 cols / ~42% width) */}
        <div
          className={`lg:col-span-5 w-full flex flex-col rounded-xl border shadow-2xs overflow-hidden h-[780px] ${
            isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5 bg-zinc-50/50 dark:bg-zinc-950/40">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-1">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="deck:English tag:B1..."
                  className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border transition-colors outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs transition-colors shrink-0"
                title="Execute search"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </button>
            </form>

            {/* Quick Filter Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-1 text-[10px] pt-0.5">
              <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-semibold uppercase mr-0.5">
                Quick:
              </span>
              {settings.anki.defaultDeck && (
                <button
                  type="button"
                  onClick={() => handleQuickFilter(`deck:"${settings.anki.defaultDeck}"`)}
                  className={`px-1.5 py-0.5 rounded border font-mono transition-colors cursor-pointer flex items-center gap-0.5 truncate max-w-[130px] ${
                    isDark
                      ? 'bg-zinc-800/80 hover:bg-zinc-750 border-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                  }`}
                  title={`Filter by default deck: ${settings.anki.defaultDeck}`}
                >
                  <Folder className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                  <span className="truncate">{settings.anki.defaultDeck.split('::').pop()}</span>
                </button>
              )}
              {availableTags.slice(0, 2).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickFilter(`tag:"${tag}"`)}
                  className={`px-1.5 py-0.5 rounded border font-mono transition-colors cursor-pointer flex items-center gap-0.5 truncate max-w-[80px] ${
                    isDark
                      ? 'bg-zinc-800/80 hover:bg-zinc-750 border-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                  }`}
                  title={`Filter by tag ${tag}`}
                >
                  <Tag className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{tag}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  executeSearch('');
                }}
                className={`px-1.5 py-0.5 rounded border font-mono transition-colors cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 ${
                  isDark ? 'bg-zinc-800/40 border-zinc-750' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Search Result Status & Counter */}
          <div
            className={`px-2.5 py-1 text-[11px] border-b flex items-center justify-between font-mono ${
              isDark ? 'bg-zinc-850/60 border-zinc-800 text-zinc-400' : 'bg-zinc-100/70 border-zinc-200 text-zinc-600'
            }`}
          >
            <span>
              {isSearching ? (
                <span className="flex items-center gap-1 text-blue-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Searching...
                </span>
              ) : (
                <span>
                  Found <strong className="text-blue-500">{totalCount}</strong>
                </span>
              )}
            </span>
            {activeQuery && (
              <span className="truncate max-w-[120px] text-[10px] text-zinc-400" title={activeQuery}>
                {activeQuery}
              </span>
            )}
          </div>

          {/* Table Container (Strictly Text-Based, NO images/thumbnails) */}
          <div className="flex-1 overflow-y-auto min-h-0 select-none divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {/* Table Header */}
            <div
              className={`sticky top-0 z-10 grid grid-cols-12 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-100/90 border-zinc-200 text-zinc-600 backdrop-blur-xs'
              }`}
            >
              <div className="col-span-3">Note Type</div>
              <div className="col-span-4">Deck</div>
              <div className="col-span-5">Word</div>
            </div>

            {/* Offline Error State */}
            {isAnkiConnected === false && (
              <div className="p-4 text-center flex flex-col items-center justify-center gap-1.5 text-zinc-500">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  AnkiConnect Offline
                </p>
                <p className="text-[10px] max-w-xs">
                  Please ensure Anki is open with AnkiConnect.
                </p>
                <button
                  type="button"
                  onClick={() => executeSearch(searchInput)}
                  className="mt-1 py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Search Syntax or Execution Error */}
            {searchError && (
              <div className="p-3 m-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex flex-col gap-1">
                <strong className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Query Error
                </strong>
                <span className="text-[11px]">{searchError}</span>
              </div>
            )}

            {/* Empty State */}
            {!isSearching && !searchError && isAnkiConnected !== false && notes.length === 0 && (
              <div className="p-6 text-center flex flex-col items-center justify-center gap-1.5 text-zinc-400">
                <Search className="w-6 h-6 opacity-40" />
                <p className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">No cards found</p>
                <p className="text-[11px] max-w-xs text-zinc-400">
                  No notes match your query.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    executeSearch('');
                  }}
                  className="mt-1 py-0.5 px-2.5 text-[11px] rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Show All Cards
                </button>
              </div>
            )}

            {/* Rows Listing */}
            {notes.map((note, index) => {
              const isSelected = index === selectedIndex;
              const rawModel = note.modelName || note.noteType || 'Standard';
              const cleanModel = rawModel.replace(/^AI Vocabulary\s*-\s*/i, '').trim() || rawModel;
              const isSpelling = note.cardType === 'spelling';

              const cleanDeck = note.deckName.split('::').pop() || note.deckName;

              return (
                <div
                  key={note.noteId}
                  onClick={() => handleSelectCard(index)}
                  className={`grid grid-cols-12 px-2 py-1.5 text-xs transition-colors cursor-pointer items-center border-l-3 ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-950/40 border-l-blue-500 text-white font-medium'
                        : 'bg-blue-50/80 border-l-blue-600 text-blue-950 font-medium'
                      : isDark
                      ? 'border-l-transparent text-zinc-300 hover:bg-zinc-800/50'
                      : 'border-l-transparent text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {/* Note Type Column */}
                  <div className="col-span-3 truncate pr-1 flex items-center">
                    <span
                      className={`inline-block px-1 py-0.5 rounded text-[9px] font-mono leading-none truncate max-w-full ${
                        isSpelling
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold'
                          : isSelected
                          ? 'bg-blue-500/20 text-blue-400 font-medium'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-zinc-200 text-zinc-700'
                      }`}
                      title={`Note Type: ${rawModel} (${isSpelling ? 'Spelling' : 'Normal'})`}
                    >
                      {isSpelling ? `✍️ ${cleanModel}` : cleanModel}
                    </span>
                  </div>

                  {/* Deck Column */}
                  <div
                    className="col-span-4 truncate pr-1 text-zinc-500 dark:text-zinc-400 text-[10px]"
                    title={note.deckName}
                  >
                    {cleanDeck}
                  </div>

                  {/* Word Column */}
                  <div
                    className={`col-span-5 font-semibold truncate text-xs ${
                      isSelected ? 'text-blue-500 dark:text-blue-400' : ''
                    }`}
                    title={note.word}
                  >
                    {note.word}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Unified Card Editor (7 cols / ~58% width) */}
        <div className="lg:col-span-7 flex flex-col min-w-0 sticky top-16">
          {selectedNote && editingCard ? (
            <UnifiedCardEditor
              cardData={editingCard}
              noteId={selectedNote.noteId}
              deckName={selectedNote.deckName}
              noteType={currentNoteType}
              onNoteTypeChange={handleNoteTypeChange}
              availableNoteTypes={ankiModelNames}
              isNoteTypeDetected={Boolean(selectedNote.modelName && selectedNote.modelName === currentNoteType)}
              themeId={currentTheme}
              cardType={editingCard.cardType || selectedNote.cardType || 'normal'}
              emptyWordPlaceholder={selectedNote.word}
              isDirty={isDirty}
              saveSuccessMsg={saveSuccessMsg}
              isSavingToAnki={isSaving}
              canSaveToAnki={true}
              onSaveToAnki={handleSaveToAnki}
              onShowInAnki={handleShowInAnki}
              isShowingInAnki={isShowingInAnki}
              onCardChange={handleCardChange}
              availableTags={availableTags}
              ankiUrl={settings.anki.url}
              navigation={{
                currentIndex: selectedIndex,
                totalCount: notes.length,
                onPrevious: handlePreviousCard,
                onNext: handleNextCard,
                hasPrevious: selectedIndex > 0,
                hasNext: selectedIndex < notes.length - 1,
                itemNameLabel: 'Card',
              }}
            />
          ) : (
            <div
              className={`h-[780px] flex flex-col items-center justify-center p-8 text-center rounded-xl border shadow-2xs ${
                isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                No Card Selected
              </h2>
              <p className="text-xs max-w-sm text-zinc-500 dark:text-zinc-400">
                Select a flashcard from the left list to view and edit it in the full card editor.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {unsavedModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md p-5 rounded-2xl border shadow-xl flex flex-col gap-4 ${
              isDark ? 'bg-zinc-900 border-zinc-750 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold">Unsaved Changes</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  You have unsaved changes to &ldquo;{editingCard?.word || 'this card'}&rdquo;.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Do you want to save your changes before proceeding?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleModalCancel}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleModalDiscard}
                className="py-1.5 px-3 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleModalSaveAndContinue}
                disabled={isSaving}
                className="py-1.5 px-3.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save & Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
