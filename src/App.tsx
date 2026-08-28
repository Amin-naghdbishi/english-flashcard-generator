import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CardData, AppTheme } from './types';
import { NavigationStrip, NavTab, NavigationStatus, ServiceState } from './components/NavigationStrip';
import { CreateCardView } from './components/CreateCardView';
import { BatchCardView } from './components/BatchCardView';
import { CompleteCardsByTagView } from './components/CompleteCardsByTagView';
import { SettingsView } from './components/SettingsView';
import { fetchConfig, saveConfig, checkOllama, checkGemini, checkTTS, checkOnlineTTS, checkAnki } from './services/api';
import { AppThemeProvider, normalizeAppTheme } from './context/ThemeContext';
import { I18nProvider, useTranslation, AppLanguage, AppDirection } from './i18n';

const defaultSettings: AppSettings = {
  appTheme: 'anki-light',
  language: 'en',
  direction: 'ltr',
  ai: {
    provider: 'ollama',
    ollama: {
      url: 'http://127.0.0.1:11434',
      model: 'qwen3:4b',
      temperature: 0.2,
      contextLength: 2048,
    },
    gemini: {
      apiKey: '',
      model: 'gemini-2.5-flash',
      temperature: 0.2,
    },
    url: 'http://127.0.0.1:11434',
    model: 'qwen3:4b',
    temperature: 0.2,
    contextLength: 2048,
  },
  tts: {
    provider: 'piper',
    engine: 'piper',
    endpoint: 'http://127.0.0.1:5000',
    americanVoice: 'en_US-lessac-high',
    britishVoice: 'en_GB-cori-high',
    normalSpeed: 1.0,
    slowSpeed: 1.25,
    generateAmericanNormal: true,
    generateAmericanSlow: true,
    generateBritishNormal: true,
    generateBritishSlow: true,
    generateExampleUsNormal: true,
    generateExampleUsSlow: false,
    generateExampleUkNormal: false,
    generateExampleUkSlow: false,
    generateExampleUs: true,
    generateExampleUk: false,
    generateSlow: true,
    generateBritish: true,
    generateAmerican: true,
    generateSlowExample: false,
  },
  dictionary: {
    meaningFaSource: 'ai',
    definitionEnSource: 'ai',
    exampleSource: 'ai',
    translationSource: 'ai',
    mnemonicSource: 'ai',
  },
  smartImages: {
    enabled: true,
    decisionProvider: 'heuristic',
    searchProvider: 'wikimedia',
  },
  defaultCard: {
    cardType: 'normal',
    allowDuplicateWords: true,
  },
  anki: {
    url: 'http://127.0.0.1:8765',
    defaultDeck: 'English::B1',
    noteType: 'AI Vocabulary',
  },
  theme: 'comic-pop-dark',
};

function AppShell({
  settings,
  setSettings,
  activeAppTheme,
  handleSetAppTheme,
  status,
  refreshStatuses,
}: {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  activeAppTheme: AppTheme;
  handleSetAppTheme: (newTheme: AppTheme) => void;
  status: NavigationStatus;
  refreshStatuses: (isManual?: boolean) => Promise<void>;
}) {
  const [currentTab, setCurrentTab] = useState<NavTab>('create');
  const [isNavPinned, setIsNavPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anki_toolbar_pinned') === 'true';
    } catch {
      return false;
    }
  });
  const [isNavHovered, setIsNavHovered] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { t } = useTranslation();
  const isDark = activeAppTheme === 'anki-dark';

  const handleTogglePin = useCallback(() => {
    setIsNavPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('anki_toolbar_pinned', String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsNavHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsNavHovered(false);
    }, 200);
  }, []);

  const isNavVisible = isNavPinned || isNavHovered;

  return (
    <AppThemeProvider
      appTheme={activeAppTheme}
      setAppTheme={handleSetAppTheme}
    >
      <div
        className={`min-h-screen flex flex-col font-sans transition-colors duration-150 relative ${
          isDark
            ? 'bg-[#18181B] text-zinc-100 dark selection:bg-blue-600 selection:text-white'
            : 'bg-[#F4F4F5] text-zinc-900 selection:bg-blue-500 selection:text-white'
        }`}
      >
        {/* Invisible Top Edge Hover Trigger for Auto-Hiding Toolbar */}
        <div
          onMouseEnter={handleMouseEnter}
          className="fixed top-0 left-0 right-0 h-3 z-40 cursor-default"
          aria-hidden="true"
        />

        {/* Subtle Indicator when Toolbar is Auto-Hidden */}
        {!isNavVisible && (
          <div
            onClick={handleMouseEnter}
            onMouseEnter={handleMouseEnter}
            className="fixed top-0 left-1/2 -translate-x-1/2 h-1 hover:h-2 w-28 bg-blue-500/40 hover:bg-blue-500/80 rounded-b-full transition-all duration-200 z-30 cursor-pointer shadow-xs"
            title={t('nav.toolbarHoverHint')}
          />
        )}

        {/* Top Navigation Header with Auto-Hide & Pin Support */}
        <NavigationStrip
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          status={status}
          onRefreshStatus={() => refreshStatuses(true)}
          appTheme={activeAppTheme}
          isPinned={isNavPinned}
          onTogglePin={handleTogglePin}
          isVisible={isNavVisible}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />

        {/* Main Content Body - Consistent top spacing ensures ZERO layout jumps/resizing */}
        <main className={`flex-1 w-full min-w-0 ${isNavPinned ? 'pt-14' : 'pt-4 sm:pt-6'}`}>
          <div className={currentTab === 'create' ? 'block' : 'hidden'}>
            <CreateCardView
              settings={settings}
              appTheme={activeAppTheme}
            />
          </div>

          <div className={currentTab === 'batch' ? 'block' : 'hidden'}>
            <BatchCardView
              settings={settings}
              appTheme={activeAppTheme}
            />
          </div>

          <div className={currentTab === 'complete-by-tag' ? 'block' : 'hidden'}>
            <CompleteCardsByTagView
              settings={settings}
              appTheme={activeAppTheme}
            />
          </div>

          <div className={currentTab === 'settings' ? 'block' : 'hidden'}>
            <SettingsView
              settings={settings}
              appTheme={activeAppTheme}
              onUpdateSettings={(newCfg) => {
                setSettings(newCfg);
                refreshStatuses();
              }}
            />
          </div>
        </main>

        {/* Desktop Footer */}
        <footer
          className={`w-full py-3 px-4 text-xs ${
            isDark
              ? 'border-t border-zinc-800 bg-[#1F1F23] text-zinc-400'
              : 'border-t border-zinc-200 bg-white text-zinc-600'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {t('common.pipeline')}:
              </span>
              <span className="font-mono text-xs opacity-80">
                Word → AI ({settings.ai.provider}) → TTS ({settings.tts.provider}) → 12 Note Themes → AnkiConnect
              </span>
            </div>
            <div className="text-xs font-medium opacity-80">
              English Flashcard Generator • 12 Note Designs
            </div>
          </div>
        </footer>
      </div>
    </AppThemeProvider>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const activeAppTheme: AppTheme = normalizeAppTheme(settings.appTheme);

  // Service status for header
  const [status, setStatus] = useState<NavigationStatus>({
    ai: { state: 'checking', connected: false, label: 'Ollama', checking: true },
    tts: { state: 'checking', ready: false, label: 'Piper', checking: true },
    anki: { state: 'checking', connected: false, checking: true },
    isChecking: true,
  });

  const isPollingRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Load initial settings
  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        setSettings(cfg);
      })
      .catch((err) => {
        console.error('Could not load config:', err);
      })
      .finally(() => {
        setLoadingConfig(false);
      });
  }, []);

  // Check connection status asynchronously across all services concurrently
  const refreshStatuses = useCallback(async (isManual: boolean = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    if (isManual) {
      setStatus((prev) => ({
        ...prev,
        isChecking: true,
        ai: { ...prev.ai, checking: true },
        tts: { ...prev.tts, checking: true },
        anki: { ...prev.anki, checking: true },
      }));
    }

    const currentSettings = settingsRef.current;

    try {
      // 1. Check AI Provider
      const checkAiPromise = (async () => {
        let aiConnected = false;
        let aiLabel = 'Ollama';

        if (currentSettings.ai.provider === 'gemini') {
          aiLabel = 'Gemini';
          if (currentSettings.ai.gemini?.apiKey) {
            const res = await checkGemini(currentSettings.ai.gemini.apiKey, currentSettings.ai.gemini.model).catch(() => ({ connected: false }));
            aiConnected = !!res.connected;
          }
        } else if (currentSettings.ai.provider === 'custom') {
          aiLabel = 'Custom AI';
          aiConnected = true;
        } else {
          aiLabel = 'Ollama';
          const ollamaUrl = currentSettings.ai.ollama?.url || 'http://127.0.0.1:11434';
          const res = await checkOllama(ollamaUrl).catch(() => ({ connected: false }));
          aiConnected = !!res.connected;
        }

        return {
          connected: aiConnected,
          state: (aiConnected ? 'ready' : 'offline') as ServiceState,
          label: aiLabel,
        };
      })();

      // 2. Check TTS Provider
      const checkTtsPromise = (async () => {
        let ttsReady = false;
        let ttsLabel = 'Piper';

        if (currentSettings.tts.provider === 'online') {
          ttsLabel = 'Online TTS';
          const res = await checkOnlineTTS().catch(() => ({ connected: false }));
          ttsReady = !!res.connected;
        } else if (currentSettings.tts.provider === 'custom') {
          ttsLabel = 'Custom TTS';
          ttsReady = true;
        } else {
          ttsLabel = 'Piper';
          const piperEndpoint = currentSettings.tts.endpoint || 'http://127.0.0.1:5000';
          const res = await checkTTS(piperEndpoint).catch(() => ({ ready: false }));
          ttsReady = !!res.ready;
        }

        return {
          ready: ttsReady,
          state: (ttsReady ? 'ready' : 'offline') as ServiceState,
          label: ttsLabel,
        };
      })();

      // 3. Check AnkiConnect
      const checkAnkiPromise = (async () => {
        const ankiUrl = currentSettings.anki.url || 'http://127.0.0.1:8765';
        const res = await checkAnki(ankiUrl).catch(() => ({ connected: false }));
        const ankiConnected = !!res.connected;

        return {
          connected: ankiConnected,
          state: (ankiConnected ? 'ready' : 'offline') as ServiceState,
        };
      })();

      // Execute all checks concurrently in parallel
      const [aiRes, ttsRes, ankiRes] = await Promise.all([
        checkAiPromise,
        checkTtsPromise,
        checkAnkiPromise,
      ]);

      setStatus({
        ai: { ...aiRes, checking: false },
        tts: { ...ttsRes, checking: false },
        anki: { ...ankiRes, checking: false },
        isChecking: false,
      });
    } catch (e) {
      console.error('Error during concurrent service check:', e);
      setStatus((prev) => ({
        ...prev,
        isChecking: false,
      }));
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // Initial status check on mount
  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  // Background status polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatuses(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshStatuses]);

  const handleSetAppTheme = (newTheme: AppTheme) => {
    const normalized = normalizeAppTheme(newTheme);
    setSettings((prev) => ({
      ...prev,
      appTheme: normalized,
    }));
    saveConfig({ appTheme: normalized }).catch((e) => {
      console.warn('Failed to persist app theme:', e);
    });
  };

  const handleLanguageChange = (newLang: AppLanguage) => {
    setSettings((prev) => ({
      ...prev,
      language: newLang,
    }));
    saveConfig({ language: newLang }).catch((e) => {
      console.warn('Failed to persist language:', e);
    });
  };

  const handleDirectionChange = (newDir: AppDirection) => {
    setSettings((prev) => ({
      ...prev,
      direction: newDir,
    }));
    saveConfig({ direction: newDir }).catch((e) => {
      console.warn('Failed to persist direction:', e);
    });
  };

  return (
    <I18nProvider
      initialLanguage={settings.language || 'en'}
      initialDirection={settings.direction || 'ltr'}
      onLanguageChange={handleLanguageChange}
      onDirectionChange={handleDirectionChange}
    >
      <AppShell
        settings={settings}
        setSettings={setSettings}
        activeAppTheme={activeAppTheme}
        handleSetAppTheme={handleSetAppTheme}
        status={status}
        refreshStatuses={refreshStatuses}
      />
    </I18nProvider>
  );
}
