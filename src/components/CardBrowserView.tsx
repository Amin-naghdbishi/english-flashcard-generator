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
            // Select first card by default and authoritatively apply its Note Type & Theme
            const firstNote = res.notes[0];
            const actualNoteType = firstNote.modelName || firstNote.noteType || 'Standard';
            const initialTheme =
              firstNote.detectedTheme ||
              resolveThemeFromNoteType(actualNoteType, settings.theme || 'comic-pop-dark');
            const firstCardData: CardData = {
              ...firstNote.cardData,
              modelName: actualNoteType,
              noteType: actualNoteType,
              cardType: firstNote.cardType || firstNote.cardData?.cardType || 'normal',
            };

            setSelectedIndex(0);
            setEditingCard(firstCardData);
            setOriginalCardJson(JSON.stringify(firstCardData));
            setIsDirty(false);
            setSaveSuccessMsg(null);
            setCurrentNoteType(actualNoteType);
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
        setCurrentNoteType('');
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
      if (index < 0 || index >= notes.length) return;

      const target = notes[index];
      if (!target) return;

      requestNavigation(() => {
        setSelectedIndex(index);
        const actualNoteType = target.modelName || target.noteType || 'Standard';
        const targetTheme =
          target.detectedTheme ||
          resolveThemeFromNoteType(actualNoteType, settings.theme || 'comic-pop-dark');
        const cardCopy: CardData = {
          ...target.cardData,
          modelName: actualNoteType,
          noteType: actualNoteType,
          cardType: target.cardType || target.cardData?.cardType || 'normal',
        };

        setEditingCard(cardCopy);
        setOriginalCardJson(JSON.stringify(cardCopy));
        setIsDirty(false);
        setSaveSuccessMsg(null);
        setCurrentNoteType(actualNoteType);
        setCurrentTheme(targetTheme);
      }, target.word);
    },
    [notes, requestNavigation, settings.theme]
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
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row min-w-0">
      {/* LEFT COLUMN: 25% width - Minimal Search & Compact Table */}
      <div className="w-full md:w-1/4 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 min-w-0 flex flex-col select-none bg-white dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Card Browser
          </h2>
          <div className="flex items-center gap-1.5 text-xs">
            {isAnkiConnected === false ? (
              <span className="text-amber-500 font-medium flex items-center gap-1 text-[11px]" title="AnkiConnect Offline">
                <AlertTriangle className="w-3 h-3" />
                Offline
              </span>
            ) : isAnkiConnected === true ? (
              <span className="text-emerald-500 font-medium flex items-center gap-1 text-[11px]" title="AnkiConnect Connected">
                <CheckCircle2 className="w-3 h-3" />
                Ready
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => executeSearch(searchInput)}
              disabled={isSearching}
              className="p-1 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 rounded-none text-zinc-700 dark:text-zinc-300 cursor-pointer"
              title="Refresh search results"
            >
              <RefreshCw className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-2">
          <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="deck:English tag:B1..."
                className="w-full px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 focus:border-blue-600 dark:focus:border-blue-500 bg-white dark:bg-zinc-800 text-xs font-medium rounded-none focus:outline-none transition-colors text-zinc-900 dark:text-zinc-100 font-mono"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-none cursor-pointer transition-colors shrink-0"
              title="Search"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        {/* Quick chips / card count */}
        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-3">
          <span className="font-medium">{totalCount} cards</span>
          <div className="flex items-center gap-1 text-[10px]">
            {settings.anki.defaultDeck && (
              <button
                type="button"
                onClick={() => handleQuickFilter(`deck:"${settings.anki.defaultDeck}"`)}
                className="px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-none cursor-pointer truncate max-w-[100px]"
                title={settings.anki.defaultDeck}
              >
                {settings.anki.defaultDeck.split('::').pop()}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                executeSearch('');
              }}
              className="px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-none cursor-pointer"
            >
              All
            </button>
          </div>
        </div>

        {/* Compact Column Table */}
        <div className="flex-1 flex flex-col min-h-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {/* Table Header: Word | Deck | Note Type | Tags */}
          <div className="grid grid-cols-12 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-750 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <div className="col-span-4 truncate">Word</div>
            <div className="col-span-3 truncate">Deck</div>
            <div className="col-span-3 truncate">Note Type</div>
            <div className="col-span-2 truncate">Tags</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-200 dark:divide-zinc-800">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Searching cards...</span>
              </div>
            ) : searchError ? (
              <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20">
                <p className="font-semibold">Query Error</p>
                <p className="text-[11px] mt-0.5">{searchError}</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                No cards found
              </div>
            ) : (
              notes.map((note, index) => {
                const isSelected = index === selectedIndex;
                const rawModel = note.modelName || note.noteType || 'Standard';
                const cleanModel = rawModel.replace(/^AI Vocabulary\s*-\s*/i, '').replace(/\s*\([^)]*\)/g, '').trim() || rawModel;
                const cleanDeck = note.deckName.split('::').pop() || note.deckName;
                const tagsStr = (note.tags || []).join(', ') || '-';

                return (
                  <div
                    key={note.noteId}
                    onClick={() => handleSelectCard(index)}
                    className={`grid grid-cols-12 px-2 py-1.5 text-xs transition-colors cursor-pointer items-center border-l-2 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-l-blue-600 dark:border-l-blue-500 text-blue-900 dark:text-blue-200 font-semibold'
                        : 'border-l-transparent text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {/* Word */}
                    <div className={`col-span-4 truncate pr-1 font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-900 dark:text-zinc-100'}`} title={note.word}>
                      {note.word}
                    </div>

                    {/* Deck */}
                    <div className="col-span-3 truncate pr-1 text-zinc-600 dark:text-zinc-400 text-[11px]" title={note.deckName}>
                      {cleanDeck}
                    </div>

                    {/* Note Type */}
                    <div className="col-span-3 truncate pr-1 text-zinc-600 dark:text-zinc-400 text-[10px]" title={rawModel}>
                      {cleanModel}
                    </div>

                    {/* Tags */}
                    <div className="col-span-2 truncate text-zinc-500 dark:text-zinc-400 text-[10px]" title={tagsStr}>
                      {tagsStr}
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
        {selectedNote && editingCard ? (
          <UnifiedCardEditor
            key={`${selectedNote.noteId}_${currentNoteType}`}
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
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center text-zinc-400">
            <Search className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No card selected</p>
            <p className="text-xs text-zinc-500 mt-1">Select a card from the list to view and edit</p>
          </div>
        )}
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {unsavedModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md p-5 border shadow-xl flex flex-col gap-4 rounded-none ${
              isDark ? 'bg-zinc-900 border-zinc-750 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-none bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Unsaved Changes</h3>
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
                className={`py-1.5 px-3 text-xs font-medium cursor-pointer transition-colors rounded-none ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleModalDiscard}
                className="py-1.5 px-3 text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors rounded-none"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleModalSaveAndContinue}
                disabled={isSaving}
                className="py-1.5 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors flex items-center gap-1.5 rounded-none"
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
