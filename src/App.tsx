/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, CardData } from './types';
import { NavigationStrip, NavTab } from './components/NavigationStrip';
import { CreateCardView } from './components/CreateCardView';
import { BatchCardView } from './components/BatchCardView';
import { SettingsView } from './components/SettingsView';
import { fetchConfig, checkOllama, checkGemini, checkTTS, checkOnlineTTS, checkAnki } from './services/api';

const defaultSettings: AppSettings = {
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

  useEffect(() => {
    refreshStatuses();
    const interval = setInterval(refreshStatuses, 15000);
    return () => clearInterval(interval);
  }, [settings.ai, settings.tts, settings.anki]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-black flex flex-col font-sans selection:bg-[#FFD93D] selection:text-black">
      {/* Top Navigation Header */}
      <NavigationStrip
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        status={status}
        onRefreshStatus={refreshStatuses}
      />

      {/* Main Content Body */}
      <main className="flex-1 w-full">
        {currentTab === 'create' && (
          <CreateCardView
            settings={settings}
          />
        )}

        {currentTab === 'batch' && (
          <BatchCardView
            settings={settings}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(newCfg) => {
              setSettings(newCfg);
              refreshStatuses();
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t-4 border-black bg-[#FFFFFF] py-3 px-4 text-center text-black text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#4ADE80] uppercase tracking-wider">Pipeline:</span>
            <span className="font-mono text-zinc-700 font-bold">
              Word → AI ({settings.ai.provider === 'gemini' ? 'Gemini' : 'Ollama'}) → TTS ({settings.tts.provider === 'online' ? 'Online' : 'Piper'}) → Comic Template → AnkiConnect
            </span>
          </div>
          <div className="text-xs text-black font-black uppercase tracking-wider">
            English Flashcard Generator • 10 Card Designs
          </div>
        </div>
      </footer>
    </div>
  );
}
