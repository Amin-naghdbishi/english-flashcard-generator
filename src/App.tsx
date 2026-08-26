import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings, CardData, AppTheme } from './types';
import { NavigationStrip, NavTab, NavigationStatus, ServiceState } from './components/NavigationStrip';
import { CreateCardView } from './components/CreateCardView';
import { BatchCardView } from './components/BatchCardView';
import { CompleteCardsByTagView } from './components/CompleteCardsByTagView';
import { SettingsView } from './components/SettingsView';
import { fetchConfig, saveConfig, checkOllama, checkGemini, checkTTS, checkOnlineTTS, checkAnki } from './services/api';
import { AppThemeProvider, normalizeAppTheme } from './context/ThemeContext';

const defaultSettings: AppSettings = {
  appTheme: 'anki-light',
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

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('create');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const activeAppTheme: AppTheme = normalizeAppTheme(settings.appTheme);
  const isDark = activeAppTheme === 'anki-dark';

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
          state: (aiConnected ? 'connected' : 'disconnected') as ServiceState,
          connected: aiConnected,
          label: aiLabel,
          checking: false,
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
          const res = await checkTTS(piperEndpoint).catch(() => ({ ready: false, connected: false }));
          ttsReady = !!(res.ready ?? res.connected);
        }

        return {
          state: (ttsReady ? 'connected' : 'disconnected') as ServiceState,
          ready: ttsReady,
          connected: ttsReady,
          label: ttsLabel,
          checking: false,
        };
      })();

      // 3. Check AnkiConnect
      const checkAnkiPromise = (async () => {
        const ankiUrl = currentSettings.anki?.url || 'http://127.0.0.1:8765';
        const res = await checkAnki(ankiUrl).catch(() => ({ connected: false, version: undefined }));
        const isAnkiConnected = !!res.connected;

        return {
          state: (isAnkiConnected ? 'connected' : 'disconnected') as ServiceState,
          connected: isAnkiConnected,
          version: res.version,
          checking: false,
        };
      })();

      const [aiResult, ttsResult, ankiResult] = await Promise.allSettled([
        checkAiPromise,
        checkTtsPromise,
        checkAnkiPromise,
      ]);

      setStatus((prev) => ({
        ai: aiResult.status === 'fulfilled' ? aiResult.value : { ...prev.ai, state: 'disconnected', connected: false, checking: false },
        tts: ttsResult.status === 'fulfilled' ? ttsResult.value : { ...prev.tts, state: 'disconnected', ready: false, connected: false, checking: false },
        anki: ankiResult.status === 'fulfilled' ? ankiResult.value : { ...prev.anki, state: 'disconnected', connected: false, checking: false },
        isChecking: false,
      }));
    } catch (err) {
      console.error('Service status check encountered an error:', err);
      setStatus((prev) => ({ ...prev, isChecking: false }));
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // Continuous background status polling (runs automatically every 5 seconds)
  useEffect(() => {
    // Initial check on mount
    refreshStatuses(true);

    const timer = setInterval(() => {
      refreshStatuses(false);
    }, 5000);

    return () => {
      clearInterval(timer);
      isPollingRef.current = false;
    };
  }, [refreshStatuses]);

  const handleSetAppTheme = (newTheme: AppTheme) => {
    const normalized = normalizeAppTheme(newTheme);
    setSettings((prev) => ({ ...prev, appTheme: normalized }));
    // Persist asynchronously without blocking state or throwing
    saveConfig({ appTheme: normalized }).catch((e) => {
      console.warn('Failed to persist app theme:', e);
    });
  };

  return (
    <AppThemeProvider
      appTheme={activeAppTheme}
      setAppTheme={handleSetAppTheme}
    >
      <div
        className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
          isDark
            ? 'bg-[#18181B] text-zinc-100 dark selection:bg-blue-600 selection:text-white'
            : 'bg-[#F4F4F5] text-zinc-900 selection:bg-blue-500 selection:text-white'
        }`}
      >
        {/* Top Navigation Header */}
        <NavigationStrip
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          status={status}
          onRefreshStatus={() => refreshStatuses(true)}
          appTheme={activeAppTheme}
        />

        {/* Main Content Body - Persistent tabs for instant switching & state preservation */}
        <main className="flex-1 w-full min-w-0">
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
                Pipeline:
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
