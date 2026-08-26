import React, { useState, useEffect } from 'react';
import { AppSettings, CardData, AppTheme } from './types';
import { NavigationStrip, NavTab } from './components/NavigationStrip';
import { CreateCardView } from './components/CreateCardView';
import { BatchCardView } from './components/BatchCardView';
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

  // Status for header
  const [status, setStatus] = useState<{
    ai: { connected: boolean; label?: string };
    tts: { ready: boolean; label?: string };
    anki: { connected: boolean; version?: number };
  }>({
    ai: { connected: false, label: 'Ollama' },
    tts: { ready: false, label: 'Piper' },
    anki: { connected: false },
  });

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

  // Check connection status
  const refreshStatuses = async () => {
    try {
      let aiConnected = false;
      let aiLabel = 'Ollama';
      if (settings.ai.provider === 'gemini') {
        aiLabel = 'Gemini';
        if (settings.ai.gemini.apiKey) {
          const geminiRes = await checkGemini(settings.ai.gemini.apiKey, settings.ai.gemini.model).catch(() => ({ connected: false }));
          aiConnected = !!geminiRes.connected;
        }
      } else if (settings.ai.provider === 'custom') {
        aiLabel = 'Custom AI';
        aiConnected = true;
      } else {
        const ollamaRes = await checkOllama(settings.ai.ollama.url).catch(() => ({ connected: false }));
        aiConnected = !!ollamaRes.connected;
        aiLabel = 'Ollama';
      }

      let ttsReady = false;
      let ttsLabel = 'Piper';
      if (settings.tts.provider === 'online') {
        ttsLabel = 'Online TTS';
        const onlineRes = await checkOnlineTTS().catch(() => ({ connected: false }));
        ttsReady = !!onlineRes.connected;
      } else if (settings.tts.provider === 'custom') {
        ttsLabel = 'Custom TTS';
        ttsReady = true;
      } else {
        const piperRes = await checkTTS(settings.tts.endpoint).catch(() => ({ ready: false }));
        ttsReady = !!piperRes.ready;
        ttsLabel = 'Piper';
      }

      const ankiRes = await checkAnki(settings.anki.url).catch(() => ({ connected: false, version: undefined }));

      setStatus({
        ai: {
          connected: aiConnected,
          label: aiLabel,
        },
        tts: {
          ready: ttsReady,
          label: ttsLabel,
        },
        anki: {
          connected: !!ankiRes.connected,
          version: ankiRes.version,
        },
      });
    } catch (e) {
      console.error('Error checking connections:', e);
    }
  };

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
          onRefreshStatus={refreshStatuses}
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
