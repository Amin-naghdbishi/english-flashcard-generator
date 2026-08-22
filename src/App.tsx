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
import { fetchConfig, checkOllama, checkTTS, checkAnki } from './services/api';

const defaultSettings: AppSettings = {
  ai: {
    url: 'http://127.0.0.1:11434',
    model: 'qwen3:4b',
    temperature: 0.2,
    contextLength: 2048,
  },
  tts: {
    engine: 'piper',
    endpoint: 'http://127.0.0.1:5000',
    americanVoice: 'en_US-lessac-high',
    britishVoice: 'en_GB-cori-high',
    normalSpeed: 1.0,
    slowSpeed: 1.25,
    generateSlow: true,
    generateBritish: true,
    generateAmerican: true,
    generateSlowExample: false,
  },
  anki: {
    endpoint: 'http://127.0.0.1:8765',
    deck: 'English::B1',
    model: 'English Bento Comic',
    autoSync: true,
    tags: ['ai_vocab', 'piper_tts'],
  },
  theme: 'comic-dark',
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('create');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Status for header
  const [status, setStatus] = useState<{
    ollama: { connected: boolean; version?: string; loading?: boolean };
    tts: { ready: boolean; voice?: string; loading?: boolean };
    anki: { connected: boolean; version?: number; loading?: boolean };
  }>({
    ollama: { connected: false },
    tts: { ready: true, voice: 'af_sarah' },
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
      const [aiRes, ttsRes, ankiRes] = await Promise.all([
        checkOllama(settings.ai.url).catch(() => ({ connected: false, version: undefined })),
        checkTTS(settings.tts.endpoint, settings.tts.voice).catch(() => ({ ready: true, voice: settings.tts.voice, engine: 'kokoro' as const, endpoint: settings.tts.endpoint, steps: [] })),
        checkAnki(settings.anki.url).catch(() => ({ connected: false, version: undefined })),
      ]);

      setStatus({
        ollama: {
          connected: !!aiRes.connected,
          version: aiRes.version,
        },
        tts: {
          ready: !!ttsRes.ready,
          voice: settings.tts.voice,
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
  }, [settings.ai.url, settings.tts.endpoint, settings.tts.voice, settings.anki.url]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-black flex flex-col font-sans selection:bg-[#FFD93D] selection:text-black">
      {/* Top 3-Color Strip Header */}
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

      {/* Bento Grid Tool Footer */}
      <footer className="w-full border-t-4 border-black bg-[#FFFFFF] py-3 px-4 text-center text-black text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#4ADE80] uppercase tracking-wider">Pipeline:</span>
            <span className="font-mono text-zinc-700 font-bold">Word → Ollama JSON → Kokoro WAV → Bento / Comic CSS → AnkiConnect</span>
          </div>
          <div className="text-xs text-black font-black uppercase tracking-wider">
            Local-First AI Flashcard Generator • 100% Offline
          </div>
        </div>
      </footer>
    </div>
  );
}
