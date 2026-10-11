import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CardData, AppTheme } from './types';
import { NavigationStrip, NavTab, NavigationStatus, ServiceState } from './components/NavigationStrip';
import { CreateCardView } from './components/CreateCardView';
import { BatchCardView } from './components/BatchCardView';
import { CompleteCardsByTagView } from './components/CompleteCardsByTagView';
import { CardBrowserView } from './components/CardBrowserView';
import { SettingsView } from './components/SettingsView';
import { fetchConfig, saveConfig, checkOllama, checkGemini, checkTTS, checkOnlineTTS, checkAnki } from './services/api';
import { AppThemeProvider, normalizeAppTheme, useAppTheme } from './context/ThemeContext';
import { I18nProvider, useTranslation, AppLanguage, AppDirection } from './i18n';

const defaultSettings: AppSettings = {
  appTheme: 'anki-light',
  language: 'en',
  direction: 'ltr',
  ai: {
    enabled: true,
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
    enabled: true,
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
    volumeWordUkNormal: 100,
    volumeWordUkSlow: 100,
    volumeWordUsNormal: 100,
    volumeWordUsSlow: 100,
    volumeExampleUkNormal: 100,
    volumeExampleUkSlow: 100,
    volumeExampleUsNormal: 100,
    volumeExampleUsSlow: 100,
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
  status,
  refreshStatuses,
  onToggleTts,
}: {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  status: NavigationStatus;
  refreshStatuses: (isManual?: boolean) => Promise<void>;
  onToggleTts: () => void;
}) {
  const { t } = useTranslation();
  const { isDark, appTheme } = useAppTheme();
  const [currentTab, setCurrentTab] = useState<NavTab>('create');

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-150 relative ${
        isDark
          ? 'bg-[#18181B] text-zinc-100 dark selection:bg-blue-600 selection:text-white'
          : 'bg-zinc-100 text-zinc-900 selection:bg-blue-500 selection:text-white'
      }`}
    >
      {/* Top Navigation Header - Permanently Visible */}
      <NavigationStrip
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        status={status}
        onRefreshStatus={() => refreshStatuses(true)}
        appTheme={appTheme}
        onToggleTts={onToggleTts}
        isVisible={true}
      />

      {/* Main Content Body - Edge-to-edge layout */}
      <main className="flex-1 w-full min-w-0 pt-14">
        <div className={currentTab === 'create' ? 'block' : 'hidden'}>
          <CreateCardView
            settings={settings}
            appTheme={appTheme}
          />
        </div>

        <div className={currentTab === 'batch' ? 'block' : 'hidden'}>
          <BatchCardView
            settings={settings}
            appTheme={appTheme}
          />
        </div>

        <div className={currentTab === 'complete-by-tag' ? 'block' : 'hidden'}>
          <CompleteCardsByTagView
            settings={settings}
            appTheme={appTheme}
          />
        </div>

        <div className={currentTab === 'browser' ? 'block' : 'hidden'}>
          <CardBrowserView
            settings={settings}
            appTheme={appTheme}
          />
        </div>

        <div className={currentTab === 'settings' ? 'block' : 'hidden'}>
          <SettingsView
            settings={settings}
            appTheme={appTheme}
            onUpdateSettings={(newCfg) => {
              settingsRef.current = newCfg;
              setSettings(newCfg);
              refreshStatuses(true, newCfg);
            }}
          />
        </div>
      </main>
    </div>
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
  const refreshStatuses = useCallback(async (isManual: boolean = false, overrideSettings?: AppSettings) => {
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

    const currentSettings = overrideSettings || settingsRef.current;

    try {
      // 1. Check AI Provider
      const checkAiPromise = (async () => {
        if (currentSettings.ai?.enabled === false) {
          return {
            connected: false,
            state: 'disabled' as ServiceState,
            label: 'AI: Off',
          };
        }

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
        if (currentSettings.tts?.enabled === false) {
          return {
            ready: false,
            connected: false,
            state: 'disabled' as ServiceState,
            label: 'TTS: Off',
          };
        }

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
          connected: ttsReady,
          state: (ttsReady ? 'connected' : 'disconnected') as ServiceState,
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

  const handleToggleTts = useCallback(async () => {
    const isCurrentlyDisabled = settings.tts?.enabled === false;
    const nextEnabled = isCurrentlyDisabled;
    const updated: AppSettings = {
      ...settings,
      tts: {
        ...settings.tts,
        enabled: nextEnabled,
        provider: 'piper',
      },
    };
    settingsRef.current = updated;
    setSettings(updated);
    try {
      await saveConfig(updated);
    } catch (err) {
      console.error('Failed to save TTS settings:', err);
    }
    refreshStatuses(true, updated);
  }, [settings, refreshStatuses]);

  return (
    <I18nProvider
      initialLanguage={settings.language || 'en'}
      initialDirection={settings.direction || 'ltr'}
      onLanguageChange={handleLanguageChange}
      onDirectionChange={handleDirectionChange}
    >
      <AppThemeProvider
        appTheme={activeAppTheme}
        setAppTheme={handleSetAppTheme}
      >
        <AppShell
          settings={settings}
          setSettings={setSettings}
          status={status}
          refreshStatuses={refreshStatuses}
          onToggleTts={handleToggleTts}
        />
      </AppThemeProvider>
    </I18nProvider>
  );
}
