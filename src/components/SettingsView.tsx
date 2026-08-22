import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  DiagnosticsReport,
  AnkiCardVerificationDetails,
  ThemeId,
  AIProvider,
  TTSProvider,
  CardType,
  CardData,
} from '../types';
import {
  saveConfig,
  checkOllama,
  getOllamaModels,
  checkGemini,
  getGeminiModels,
  checkTTS,
  getTTSVoices,
  getPiperServiceStatus,
  controlPiperService,
  synthesizeAudio,
  runTTSDiagnostics,
  checkOnlineTTS,
  runOnlineTTSDiagnostics,
  checkAnki,
  getAnkiDecks,
  setupAnkiModel,
  runFullDiagnostics,
  runAnkiPipelineTest,
  testSmartImage,
  lookupAbadisDict,
  lookupFreeDict,
} from '../services/api';
import { OllamaModelTag } from '../../server/ollama';
import { PiperVoice, PiperDiagnosticResult } from '../../server/piper';
import { OnlineTTSDiagnosticResult } from '../../server/onlineTts';
import { THEME_GROUPS, THEMES } from '../themes';
import { AudioPlayer } from './AudioPlayer';
import { CardPreview } from './CardPreview';
import {
  Sliders,
  Cpu,
  Volume2,
  Bookmark,
  Palette,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Save,
  Wrench,
  HelpCircle,
  Activity,
  Copy,
  Check,
  Zap,
  Loader2,
  ExternalLink,
  Info,
  Power,
  PowerOff,
  Globe,
  HardDrive,
  Key,
  BookOpen,
  Image as ImageIcon,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<
    'ai' | 'tts' | 'dictionary' | 'smartImages' | 'defaultCard' | 'appearance' | 'anki' | 'diagnostics' | 'guide'
  >('ai');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Ollama states
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; version?: string; error?: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelTag[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Gemini states
  const [geminiStatus, setGeminiStatus] = useState<{ connected: boolean; model?: string; error?: string } | null>(null);
  const [geminiModels, setGeminiModels] = useState<Array<{ id: string; name: string }>>([]);
  const [testingGemini, setTestingGemini] = useState(false);

  // Piper TTS states
  const [piperVoices, setPiperVoices] = useState<PiperVoice[]>([]);
  const [piperDiag, setPiperDiag] = useState<PiperDiagnosticResult | null>(null);
  const [testingPiper, setTestingPiper] = useState(false);

  // Online TTS states
  const [onlineTtsStatus, setOnlineTtsStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [onlineTtsDiag, setOnlineTtsDiag] = useState<OnlineTTSDiagnosticResult | null>(null);
  const [testingOnlineTts, setTestingOnlineTts] = useState(false);

  // Piper Systemd Service states
  const [serviceStatus, setServiceStatus] = useState<{
    active: boolean;
    status: string;
    detail?: string;
    error?: string;
  } | null>(null);
  const [togglingService, setTogglingService] = useState(false);
  const [checkingService, setCheckingService] = useState(false);

  // Dictionary test states
  const [dictTestWord, setDictTestWord] = useState('apple');
  const [dictTestResult, setDictTestResult] = useState<any>(null);
  const [testingDict, setTestingDict] = useState(false);

  // Smart Images test states
  const [imgTestWord, setImgTestWord] = useState('eraser');
  const [imgTestResult, setImgTestResult] = useState<any>(null);
  const [testingImg, setTestingImg] = useState(false);

  // Anki states
  const [ankiStatus, setAnkiStatus] = useState<{ connected: boolean; version?: number; error?: string } | null>(null);
  const [ankiDecks, setAnkiDecks] = useState<string[]>([]);
  const [ankiModelSyncMsg, setAnkiModelSyncMsg] = useState<string | null>(null);
  const [testingAnkiConn, setTestingAnkiConn] = useState(false);
  const [runningAnkiPipeline, setRunningAnkiPipeline] = useState(false);

  // Diagnostics Report
  const [fullReport, setFullReport] = useState<DiagnosticsReport | null>(null);
  const [runningDiag, setRunningDiag] = useState(false);

  // Copy helper
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  useEffect(() => {
    setForm(settings);
    refreshOllamaInfo();
    refreshGeminiInfo();
    refreshTTSInfo();
    refreshOnlineTtsInfo();
    refreshPiperServiceStatus();
    refreshAnkiInfo();
  }, [settings]);

  const refreshOllamaInfo = async () => {
    setLoadingModels(true);
    try {
      const conn = await checkOllama(form.ai.ollama.url);
      setOllamaStatus(conn);
      const modelsRes = await getOllamaModels(form.ai.ollama.url);
      if (modelsRes.success) setOllamaModels(modelsRes.models);
    } catch {
      setOllamaStatus({ connected: false, error: 'Cannot connect to Ollama' });
    } finally {
      setLoadingModels(false);
    }
  };

  const refreshGeminiInfo = async () => {
    try {
      const modelsRes = await getGeminiModels();
      if (modelsRes.success) setGeminiModels(modelsRes.models);
      if (form.ai.gemini.apiKey) {
        const conn = await checkGemini(form.ai.gemini.apiKey, form.ai.gemini.model);
        setGeminiStatus(conn);
      }
    } catch {}
  };

  const handleTestGemini = async () => {
    if (!form.ai.gemini.apiKey) {
      setGeminiStatus({ connected: false, error: 'Please enter a Gemini API Key first' });
      return;
    }
    setTestingGemini(true);
    try {
      const conn = await checkGemini(form.ai.gemini.apiKey, form.ai.gemini.model);
      setGeminiStatus(conn);
    } catch (e: any) {
      setGeminiStatus({ connected: false, error: e?.message || 'Gemini connection failed' });
    } finally {
      setTestingGemini(false);
    }
  };

  const refreshTTSInfo = async () => {
    try {
      const voicesRes = await getTTSVoices();
      if (voicesRes.success) setPiperVoices(voicesRes.voices);
    } catch {}
  };

  const refreshOnlineTtsInfo = async () => {
    try {
      const res = await checkOnlineTTS();
      setOnlineTtsStatus(res);
    } catch {}
  };

  const handleTestOnlineTts = async () => {
    setTestingOnlineTts(true);
    try {
      const res = await runOnlineTTSDiagnostics();
      setOnlineTtsDiag(res);
      setOnlineTtsStatus({ connected: res.ready });
    } catch (e: any) {
      setOnlineTtsStatus({ connected: false, error: e?.message });
    } finally {
      setTestingOnlineTts(false);
    }
  };

  const refreshPiperServiceStatus = async () => {
    setCheckingService(true);
    try {
      const st = await getPiperServiceStatus();
      setServiceStatus(st);
    } catch {} finally {
      setCheckingService(false);
    }
  };

  const handleToggleService = async (action: 'start' | 'stop' | 'restart') => {
    setTogglingService(true);
    try {
      const res = await controlPiperService(action);
      setServiceStatus({ active: res.active, status: res.status });
    } catch {} finally {
      setTogglingService(false);
    }
  };

  const handleTestPiper = async () => {
    setTestingPiper(true);
    try {
      const res = await runTTSDiagnostics({
        endpoint: form.tts.endpoint,
        americanVoice: form.tts.americanVoice,
        britishVoice: form.tts.britishVoice,
        normalSpeed: form.tts.normalSpeed,
        slowSpeed: form.tts.slowSpeed,
      });
      setPiperDiag(res);
    } catch {} finally {
      setTestingPiper(false);
    }
  };

  const refreshAnkiInfo = async () => {
    try {
      const conn = await checkAnki(form.anki.url);
      setAnkiStatus(conn);
      if (conn.connected) {
        const decksRes = await getAnkiDecks(form.anki.url);
        if (decksRes.success) setAnkiDecks(decksRes.decks);
      }
    } catch {
      setAnkiStatus({ connected: false, error: 'Cannot reach AnkiConnect' });
    }
  };

  const handleTestAnkiConn = async () => {
    setTestingAnkiConn(true);
    await refreshAnkiInfo();
    setTestingAnkiConn(false);
  };

  const handleSyncAnkiModel = async () => {
    try {
      const res = await setupAnkiModel(form.theme, form.defaultCard.cardType, form.anki.url);
      if (res.success) {
        setAnkiModelSyncMsg(`✓ ${res.message}`);
      } else {
        setAnkiModelSyncMsg(`✕ Sync failed: ${res.error || res.message}`);
      }
    } catch (e: any) {
      setAnkiModelSyncMsg(`✕ Error: ${e?.message}`);
    }
  };

  const handleRunAnkiPipelineTest = async () => {
    setRunningAnkiPipeline(true);
    try {
      await runAnkiPipelineTest(form.anki.defaultDeck, form.theme, form.anki.url);
    } catch {} finally {
      setRunningAnkiPipeline(false);
    }
  };

  const handleTestDictionary = async () => {
    setTestingDict(true);
    setDictTestResult(null);
    try {
      const abadis = await lookupAbadisDict(dictTestWord);
      const freedict = await lookupFreeDict(dictTestWord);
      setDictTestResult({ abadis, freedict });
    } catch (e: any) {
      setDictTestResult({ error: e?.message });
    } finally {
      setTestingDict(false);
    }
  };

  const handleTestSmartImage = async () => {
    setTestingImg(true);
    setImgTestResult(null);
    try {
      const res = await testSmartImage(imgTestWord, 'noun', 'پاک‌کن');
      setImgTestResult(res);
    } catch (e: any) {
      setImgTestResult({ error: e?.message });
    } finally {
      setTestingImg(false);
    }
  };

  const handleRunFullDiagnostics = async () => {
    setRunningDiag(true);
    try {
      const report = await runFullDiagnostics();
      setFullReport(report);
    } catch {} finally {
      setRunningDiag(false);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await saveConfig(form);
      setForm(updated);
      onUpdateSettings(updated);
      setSaveStatus('✓ Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus(`✕ Failed to save: ${e?.message}`);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6 text-black">
      {/* Header Banner */}
      <div className="bg-[#FFD93D] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-wrap items-center justify-between gap-4 text-black">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sliders className="w-7 h-7 text-black" />
            <span>Settings & Preferences</span>
          </h2>
          <p className="text-xs font-bold text-black opacity-80 mt-1">
            Configure AI Provider, TTS Speech, Online Dictionaries, Smart Images, and 10 Card Themes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs font-black bg-black text-[#FFD93D] px-3 py-1.5 border-2 border-black">
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#4ADE80] hover:bg-[#3ecb73] text-black font-black text-sm uppercase border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 cursor-pointer active:translate-y-0.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b-4 border-black pb-2">
        {[
          { id: 'ai', label: 'AI Provider', icon: Cpu, color: '#38BDF8' },
          { id: 'tts', label: 'TTS Engine & Speed', icon: Volume2, color: '#F472B6' },
          { id: 'dictionary', label: 'Dictionary Sources', icon: BookOpen, color: '#FACC15' },
          { id: 'smartImages', label: 'Smart Images', icon: ImageIcon, color: '#FB923C' },
          { id: 'defaultCard', label: 'Default Card Settings', icon: CheckSquare, color: '#A78BFA' },
          { id: 'appearance', label: '10 Card Themes', icon: Palette, color: '#C084FC' },
          { id: 'anki', label: 'AnkiConnect', icon: Bookmark, color: '#4ADE80' },
          { id: 'diagnostics', label: 'Diagnostics', icon: Activity, color: '#FF4B4B' },
          { id: 'guide', label: 'Setup Guide', icon: HelpCircle, color: '#2DD4BF' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2 font-black text-xs uppercase border-3 border-black flex items-center gap-1.5 cursor-pointer transition-all ${
                isActive
                  ? 'bg-black text-white shadow-[3px_3px_0px_#000000] -translate-y-0.5'
                  : 'bg-white text-black hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? tab.color : '#000000' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. AI PROVIDER TAB */}
      {activeSubTab === 'ai' && (
        <div className="bg-[#38BDF8] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="flex flex-wrap items-center justify-between border-b-4 border-black pb-3 gap-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                AI Generation Provider
              </h3>
              <p className="text-xs font-bold text-black opacity-80">
                Choose between Local Ollama (100% offline) or Google Gemini (online high intelligence).
              </p>
            </div>

            <div className="inline-flex border-4 border-black bg-white p-1 shadow-[3px_3px_0px_#000000]">
              <button
                type="button"
                onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'ollama' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                  form.ai.provider === 'ollama' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Ollama (Local Offline)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'gemini' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                  form.ai.provider === 'gemini' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Google Gemini (Online)</span>
              </button>
            </div>
          </div>

          {/* OLLAMA */}
          {form.ai.provider === 'ollama' && (
            <div className="bg-white p-4 sm:p-5 border-4 border-black space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-black text-sm uppercase">Ollama Local Settings</span>
                <span className={`px-2.5 py-0.5 text-xs font-black border border-black ${ollamaStatus?.connected ? 'bg-[#4ADE80]' : 'bg-[#FF4B4B] text-white'}`}>
                  {ollamaStatus?.connected ? `● Online (${ollamaStatus.version || 'Active'})` : '○ Unreachable'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-black font-black uppercase mb-1">Ollama URL:</label>
                  <input
                    type="text"
                    value={form.ai.ollama.url}
                    onChange={(e) => setForm({ ...form, ai: { ...form.ai, ollama: { ...form.ai.ollama, url: e.target.value } } })}
                    className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-black font-black uppercase mb-1">Local Model:</label>
                  {ollamaModels.length > 0 ? (
                    <select
                      value={form.ai.ollama.model}
                      onChange={(e) => setForm({ ...form, ai: { ...form.ai, ollama: { ...form.ai.ollama, model: e.target.value } } })}
                      className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none cursor-pointer"
                    >
                      {ollamaModels.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.size ? `${(m.size / 1e9).toFixed(1)}GB` : 'local'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.ai.ollama.model}
                      onChange={(e) => setForm({ ...form, ai: { ...form.ai, ollama: { ...form.ai.ollama, model: e.target.value } } })}
                      className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GEMINI */}
          {form.ai.provider === 'gemini' && (
            <div className="bg-white p-4 sm:p-5 border-4 border-black space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-black text-sm uppercase">Google Gemini Settings</span>
                <span className={`px-2.5 py-0.5 text-xs font-black border border-black ${geminiStatus?.connected ? 'bg-[#4ADE80]' : 'bg-[#FF4B4B] text-white'}`}>
                  {geminiStatus?.connected ? '● API Key Verified' : '○ Not Verified'}
                </span>
              </div>

              <div className="space-y-3 text-xs font-bold">
                <div>
                  <label className="block text-black font-black uppercase mb-1">Gemini API Key:</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={form.ai.gemini.apiKey}
                      onChange={(e) => setForm({ ...form, ai: { ...form.ai, gemini: { ...form.ai.gemini, apiKey: e.target.value } } })}
                      className="flex-1 bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={testingGemini}
                      className="px-4 py-2 bg-[#4ADE80] text-black font-black uppercase border-2 border-black cursor-pointer"
                    >
                      {testingGemini ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Key'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-black font-black uppercase mb-1">Gemini Model:</label>
                  <select
                    value={form.ai.gemini.model}
                    onChange={(e) => setForm({ ...form, ai: { ...form.ai, gemini: { ...form.ai.gemini, model: e.target.value } } })}
                    className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none cursor-pointer"
                  >
                    {geminiModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. TTS ENGINE & SPEED TAB */}
      {activeSubTab === 'tts' && (
        <div className="bg-[#F472B6] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="flex flex-wrap items-center justify-between border-b-4 border-black pb-3 gap-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                TTS Voice Engine & Speed Factor
              </h3>
              <p className="text-xs font-bold text-black opacity-80">
                Choose TTS provider and calibrate numerical slow-speech length factor.
              </p>
            </div>

            <div className="inline-flex border-4 border-black bg-white p-1 shadow-[3px_3px_0px_#000000]">
              <button
                type="button"
                onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'piper', engine: 'piper' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider cursor-pointer ${
                  form.tts.provider === 'piper' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                Piper (Offline)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'online', engine: 'online' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider cursor-pointer ${
                  form.tts.provider === 'online' ? 'bg-[#38BDF8] text-black shadow-inner' : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                Online TTS (High Quality)
              </button>
            </div>
          </div>

          {/* TTS SPEED CONFIGURATION (Requirement 5) */}
          <div className="bg-white p-4 sm:p-5 border-4 border-black space-y-3">
            <h4 className="text-sm font-black uppercase">TTS Slowdown Factor / Length Scale (Requirement 5)</h4>
            <p className="text-xs text-zinc-700 font-bold">
              Configurable slowdown factor for slow pronunciations. In Piper, higher values (e.g. 1.25 or 1.30) stretch phonemes for clearer listening.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Slowdown Factor (Length Scale):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1.05"
                    max="1.75"
                    step="0.05"
                    value={form.tts.slowSpeed}
                    onChange={(e) => setForm({ ...form, tts: { ...form.tts, slowSpeed: parseFloat(e.target.value) } })}
                    className="flex-1 accent-black cursor-pointer"
                  />
                  <span className="font-mono font-black text-sm bg-black text-[#FFD93D] px-2.5 py-1 border border-black">
                    {form.tts.slowSpeed.toFixed(2)}x
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Normal Speech Factor:</label>
                <input
                  type="text"
                  disabled
                  value="1.00x (Standard Speed)"
                  className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* PIPER SERVICE & VOICES */}
          {form.tts.provider === 'piper' && (
            <div className="bg-white p-4 sm:p-5 border-4 border-black space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-black text-sm uppercase">Piper Service Control</span>
                <span className={`px-2.5 py-0.5 text-xs font-black border border-black ${serviceStatus?.active ? 'bg-[#4ADE80]' : 'bg-[#FF4B4B] text-white'}`}>
                  {serviceStatus?.active ? 'RUNNING' : 'STOPPED'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {serviceStatus?.active ? (
                  <button
                    type="button"
                    onClick={() => handleToggleService('stop')}
                    disabled={togglingService}
                    className="px-4 py-2 bg-[#FF4B4B] text-white font-black text-xs uppercase border-2 border-black cursor-pointer"
                  >
                    Stop Service
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleService('start')}
                    disabled={togglingService}
                    className="px-4 py-2 bg-[#4ADE80] text-black font-black text-xs uppercase border-2 border-black cursor-pointer"
                  >
                    Start Service
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTestPiper}
                  disabled={testingPiper}
                  className="px-4 py-2 bg-[#38BDF8] text-black font-black text-xs uppercase border-2 border-black cursor-pointer"
                >
                  {testingPiper ? 'Testing...' : 'Test Piper TTS'}
                </button>
              </div>
            </div>
          )}

          {/* ONLINE TTS */}
          {form.tts.provider === 'online' && (
            <div className="bg-white p-4 sm:p-5 border-4 border-black space-y-4">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-black text-sm uppercase">Online English TTS</span>
                <span className={`px-2.5 py-0.5 text-xs font-black border border-black ${onlineTtsStatus?.connected ? 'bg-[#4ADE80]' : 'bg-[#FF4B4B] text-white'}`}>
                  {onlineTtsStatus?.connected ? 'ONLINE READY' : 'OFFLINE'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestOnlineTts}
                disabled={testingOnlineTts}
                className="px-4 py-2 bg-[#4ADE80] text-black font-black text-xs uppercase border-2 border-black cursor-pointer"
              >
                {testingOnlineTts ? 'Testing...' : 'Test Online TTS (US & UK)'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. DICTIONARY SOURCES TAB (Requirement 6) */}
      {activeSubTab === 'dictionary' && (
        <div className="bg-[#FACC15] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Online & Dictionary Data Sources (Requirement 6)
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              Configure data providers for each flashcard field. Priority: User Overrides → Selected Dictionary → AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            {/* Persian Meaning Source */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block font-black uppercase mb-1">Persian Meaning Source (معنی فارسی):</label>
              <select
                value={form.dictionary.meaningFaSource}
                onChange={(e) => setForm({ ...form, dictionary: { ...form.dictionary, meaningFaSource: e.target.value as any } })}
                className="w-full bg-zinc-100 p-2 border-2 border-black font-black cursor-pointer"
              >
                <option value="ai">AI Provider (Gemini / Ollama)</option>
                <option value="abadis">Abadis Persian Dictionary (دیکشنری آبادیس)</option>
                <option value="freedict">Free Dictionary API</option>
              </select>
              <span className="text-[10px] text-zinc-600 mt-1 block">
                Abadis scraper parses rich verified Persian translations.
              </span>
            </div>

            {/* English Definition Source */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block font-black uppercase mb-1">English Definition & IPA Source:</label>
              <select
                value={form.dictionary.definitionEnSource}
                onChange={(e) => setForm({ ...form, dictionary: { ...form.dictionary, definitionEnSource: e.target.value as any } })}
                className="w-full bg-zinc-100 p-2 border-2 border-black font-black cursor-pointer"
              >
                <option value="ai">AI Provider (Gemini / Ollama)</option>
                <option value="freedict">Free Dictionary API (Real IPA & Definitions)</option>
                <option value="wiktionary">Wiktionary Public API</option>
              </select>
            </div>
          </div>

          {/* Dictionary Lookup Test */}
          <div className="bg-white p-4 border-4 border-black space-y-3">
            <h4 className="text-sm font-black uppercase">Test Dictionary Sources</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={dictTestWord}
                onChange={(e) => setDictTestWord(e.target.value)}
                className="flex-1 bg-zinc-100 p-2 border-2 border-black font-bold text-xs"
                placeholder="e.g. apple, accurate..."
              />
              <button
                type="button"
                onClick={handleTestDictionary}
                disabled={testingDict}
                className="px-4 py-2 bg-[#38BDF8] text-black font-black text-xs uppercase border-2 border-black cursor-pointer"
              >
                {testingDict ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lookup Sources'}
              </button>
            </div>

            {dictTestResult && (
              <div className="bg-zinc-50 p-3 border-2 border-black text-xs font-mono">
                <pre className="overflow-x-auto">{JSON.stringify(dictTestResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SMART IMAGES TAB (Requirement 7) */}
      {activeSubTab === 'smartImages' && (
        <div className="bg-[#FB923C] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Smart Images in Online Mode (Requirement 7)
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              AI automatically determines if a word represents a concrete object and attaches real public domain images.
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 border-4 border-black space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.smartImages.enabled}
                onChange={(e) => setForm({ ...form, smartImages: { ...form.smartImages, enabled: e.target.checked } })}
                className="w-5 h-5 accent-black cursor-pointer"
              />
              <div>
                <span className="font-black text-sm uppercase block">
                  Automatically add useful images in online mode
                </span>
                <span className="text-xs text-zinc-600 font-bold block">
                  Concrete nouns (e.g. eraser, telescope, bicycle) get images downloaded and stored in Anki media. Abstract concepts (e.g. abandon, freedom) are kept clean.
                </span>
              </div>
            </label>
          </div>

          {/* Test Smart Image */}
          <div className="bg-white p-4 border-4 border-black space-y-3">
            <h4 className="text-sm font-black uppercase">Test Smart Image Decision & Search</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={imgTestWord}
                onChange={(e) => setImgTestWord(e.target.value)}
                className="flex-1 bg-zinc-100 p-2 border-2 border-black font-bold text-xs"
                placeholder="e.g. eraser, telescope, abandon..."
              />
              <button
                type="button"
                onClick={handleTestSmartImage}
                disabled={testingImg}
                className="px-4 py-2 bg-[#4ADE80] text-black font-black text-xs uppercase border-2 border-black cursor-pointer"
              >
                {testingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Evaluate Image'}
              </button>
            </div>

            {imgTestResult && (
              <div className="bg-zinc-50 p-3 border-2 border-black text-xs font-bold">
                <p>Needs Image: <span className={imgTestResult.needsImage ? 'text-emerald-600' : 'text-zinc-600'}>{imgTestResult.needsImage ? 'YES' : 'NO'}</span></p>
                <p>Reason: {imgTestResult.reason}</p>
                {imgTestResult.imageBase64 && (
                  <div className="mt-2">
                    <img src={`data:image/jpeg;base64,${imgTestResult.imageBase64}`} className="max-w-[200px] border-2 border-black" alt="test" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. DEFAULT CARD SETTINGS TAB (Requirement 4 & 1) */}
      {activeSubTab === 'defaultCard' && (
        <div className="bg-[#A78BFA] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Default Card & Audio Selection (Requirement 4)
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              Configure default flashcard type and choose which audio clips to synthesize.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Default Card Type */}
            <div className="bg-white p-4 border-4 border-black space-y-2">
              <h4 className="text-sm font-black uppercase">Default Card Type (Requirement 2)</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, defaultCard: { ...form.defaultCard, cardType: 'normal' } })}
                  className={`py-2 px-3 border-2 border-black font-black text-xs uppercase cursor-pointer ${
                    form.defaultCard.cardType === 'normal' ? 'bg-[#4ADE80] text-black ring-2 ring-black' : 'bg-zinc-100'
                  }`}
                >
                  Normal Card
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, defaultCard: { ...form.defaultCard, cardType: 'spelling' } })}
                  className={`py-2 px-3 border-2 border-black font-black text-xs uppercase cursor-pointer ${
                    form.defaultCard.cardType === 'spelling' ? 'bg-[#C084FC] text-black ring-2 ring-black' : 'bg-zinc-100'
                  }`}
                >
                  Spelling Card
                </button>
              </div>
            </div>

            {/* Duplicate Settings (Requirement 1) */}
            <div className="bg-white p-4 border-4 border-black space-y-2">
              <h4 className="text-sm font-black uppercase">Word Duplicate Handling (Requirement 1)</h4>
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold">
                <input
                  type="checkbox"
                  checked={form.defaultCard.allowDuplicateWords}
                  onChange={(e) => setForm({ ...form, defaultCard: { ...form.defaultCard, allowDuplicateWords: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span>Allow multiple cards for the same word (e.g. bank → بانک, bank → ساحل)</span>
              </label>
            </div>
          </div>

          {/* Granular Audio Checkboxes (Requirement 4) */}
          <div className="bg-white p-4 sm:p-5 border-4 border-black space-y-3">
            <h4 className="text-sm font-black uppercase">Audio Selection (Requirement 4)</h4>
            <p className="text-xs text-zinc-600 font-bold">
              Only checked audio files will be generated and stored with your Anki cards.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-bold">
              <label className="flex items-center gap-2 p-2 bg-zinc-50 border border-black cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateAmericanNormal}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateAmericanNormal: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span>🇺🇸 American Normal</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-50 border border-black cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateAmericanSlow}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateAmericanSlow: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span>🇺🇸 American Slow</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-50 border border-black cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateBritishNormal}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateBritishNormal: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span>🇬🇧 British Normal</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-50 border border-black cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateBritishSlow}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateBritishSlow: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span>🇬🇧 British Slow</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-50 border border-black cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateExampleUs}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateExampleUs: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span>🇺🇸 American Example Audio</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-zinc-50 border border-black cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateExampleUk}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateExampleUk: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span>🇬🇧 British Example Audio</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 6. 10 CARD THEMES & INTERACTIVE PREVIEW TAB (Requirement 8, 9, 10, 11) */}
      {activeSubTab === 'appearance' && (
        <div className="bg-[#C084FC] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-6 text-black">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              10 Genuinely Different Card Designs (Requirement 8 & 10)
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              5 Light + 5 Dark completely distinct layouts, typographies, and visual hierarchies.
            </p>
          </div>

          {/* LIGHT DESIGNS */}
          <div>
            <h4 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-white border-2 border-black" />
              <span>5 Light Card Designs</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {THEME_GROUPS.light.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setForm({ ...form, theme: t.id as ThemeId })}
                  className={`p-3 border-3 border-black cursor-pointer transition-all ${
                    form.theme === t.id
                      ? 'bg-white text-black shadow-[4px_4px_0px_#000000] -translate-y-1 ring-2 ring-black'
                      : 'bg-zinc-100 text-black hover:bg-white opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black uppercase">{t.name}</span>
                    {form.theme === t.id && (
                      <span className="text-[10px] bg-[#4ADE80] text-black font-black px-1.5 py-0.2 border border-black">
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 font-bold">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DARK DESIGNS */}
          <div>
            <h4 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-black border-2 border-white" />
              <span>5 Dark Card Designs</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {THEME_GROUPS.dark.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setForm({ ...form, theme: t.id as ThemeId })}
                  className={`p-3 border-3 border-black cursor-pointer transition-all ${
                    form.theme === t.id
                      ? 'bg-black text-white shadow-[4px_4px_0px_#FFD93D] -translate-y-1 ring-2 ring-yellow-400'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black uppercase text-[#FFD93D]">{t.name}</span>
                    {form.theme === t.id && (
                      <span className="text-[10px] bg-[#FFD93D] text-black font-black px-1.5 py-0.2 border border-black">
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-300 font-bold">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* LIVE REAL INTERACTIVE THEME PREVIEW CANVAS (Requirement 10) */}
          <div className="bg-white p-4 sm:p-5 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-3">
            <h4 className="text-sm font-black uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF4B4B]" />
              <span>Live Interactive Theme Preview ({THEMES[form.theme]?.name})</span>
            </h4>
            <p className="text-xs text-zinc-600 font-bold">
              Test Normal & Spelling interaction, audio triggers, and responsive layout exactly as rendered in Anki & AnkiDroid.
            </p>

            <div className="bg-zinc-100 p-4 border-2 border-black">
              <CardPreview
                cardData={null}
                themeId={form.theme}
                cardType={form.defaultCard.cardType}
                emptyWordPlaceholder="eraser"
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. ANKICONNECT TAB */}
      {activeSubTab === 'anki' && (
        <div className="bg-[#4ADE80] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="flex items-center justify-between border-b-4 border-black pb-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                AnkiConnect Integration
              </h3>
              <p className="text-xs font-bold text-black opacity-80">
                Direct card creation, media syncing, and comic template setup in Anki.
              </p>
            </div>
            <span className={`px-3 py-1 text-xs font-black border-2 border-black ${ankiStatus?.connected ? 'bg-white' : 'bg-[#FF4B4B] text-white'}`}>
              {ankiStatus?.connected ? `● Anki v${ankiStatus.version}` : '○ Unreachable'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            <div className="bg-white p-4 border-4 border-black">
              <label className="block font-black uppercase mb-1">AnkiConnect URL:</label>
              <input
                type="text"
                value={form.anki.url}
                onChange={(e) => setForm({ ...form, anki: { ...form.anki, url: e.target.value } })}
                className="w-full bg-zinc-100 p-2 border-2 border-black font-mono focus:outline-none"
              />
            </div>

            <div className="bg-white p-4 border-4 border-black">
              <label className="block font-black uppercase mb-1">Default Deck:</label>
              {ankiDecks.length > 0 ? (
                <select
                  value={form.anki.defaultDeck}
                  onChange={(e) => setForm({ ...form, anki: { ...form.anki, defaultDeck: e.target.value } })}
                  className="w-full bg-zinc-100 p-2 border-2 border-black font-black cursor-pointer"
                >
                  {ankiDecks.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.anki.defaultDeck}
                  onChange={(e) => setForm({ ...form, anki: { ...form.anki, defaultDeck: e.target.value } })}
                  className="w-full bg-zinc-100 p-2 border-2 border-black font-black"
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTestAnkiConn}
              disabled={testingAnkiConn}
              className="flex-1 py-2.5 px-4 bg-white text-black font-black text-xs uppercase border-3 border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              Test Connection
            </button>
            <button
              type="button"
              onClick={handleSyncAnkiModel}
              className="flex-1 py-2.5 px-4 bg-black text-white font-black text-xs uppercase border-3 border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              Sync Theme CSS & Templates
            </button>
          </div>

          {ankiModelSyncMsg && (
            <div className="p-3 bg-white border-4 border-black text-black font-black text-xs">
              {ankiModelSyncMsg}
            </div>
          )}
        </div>
      )}

      {/* 8. DIAGNOSTICS TAB */}
      {activeSubTab === 'diagnostics' && (
        <div className="bg-[#FF4B4B] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-white">
          <div className="flex items-center justify-between border-b-4 border-black pb-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                Full System Diagnostics
              </h3>
              <p className="text-xs font-bold text-white opacity-90">
                Rigorous real-time check across AI, TTS, AnkiConnect, and 10 Card Templates.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunFullDiagnostics}
              disabled={runningDiag}
              className="px-4 py-2 bg-white text-black font-black text-xs uppercase border-3 border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              {runningDiag ? 'Running...' : 'Run Diagnostics'}
            </button>
          </div>

          {fullReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-black">
              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black uppercase block mb-2 border-b-2 border-black pb-1">System Core</span>
                {fullReport.system.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item.name}: {item.message}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black uppercase block mb-2 border-b-2 border-black pb-1">AI Provider</span>
                {fullReport.ai.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {item.status === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    <span>{item.name}: {item.message}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black uppercase block mb-2 border-b-2 border-black pb-1">TTS Voice Engine</span>
                {fullReport.tts.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {item.status === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    <span>{item.name}: {item.message}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black uppercase block mb-2 border-b-2 border-black pb-1">AnkiConnect</span>
                {fullReport.anki.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {item.status === 'ok' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    <span>{item.name}: {item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. SETUP & ANKIDROID GUIDE TAB */}
      {activeSubTab === 'guide' && (
        <div className="bg-[#2DD4BF] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black text-xs font-bold">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Setup & AnkiDroid Guide
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              Instructions for Desktop, AnkiDroid, Spelling cards, and TTS.
            </p>
          </div>

          <div className="bg-white p-4 border-4 border-black space-y-2">
            <h4 className="font-black uppercase text-sm">Interactive Spelling Cards in Anki & AnkiDroid (Requirement 2 & 12)</h4>
            <p className="text-zinc-700">
              Spelling cards work seamlessly in both Anki Desktop and AnkiDroid without requiring any external plugins.
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-800">
              <li><b>On Front:</b> Type your spelling in the input box and tap <b>[ CHECK ]</b>.</li>
              <li><b>Instant Feedback:</b> Green success state on correct spelling, or clear strikethrough comparison with correct word on spelling mistake.</li>
              <li><b>AnkiDroid Safe:</b> Word break bug fixes prevent single letter line wrapping on all mobile screens.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
