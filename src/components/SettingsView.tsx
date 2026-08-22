import React, { useState, useEffect } from 'react';
import { AppSettings, DiagnosticsReport, AnkiCardVerificationDetails, ThemeId, AIProvider, TTSProvider } from '../types';
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
  openInAnki,
  verifyNoteInAnki,
} from '../services/api';
import { OllamaModelTag } from '../../server/ollama';
import { PiperVoice, PiperDiagnosticResult } from '../../server/piper';
import { OnlineTTSDiagnosticResult } from '../../server/onlineTts';
import { THEME_GROUPS } from '../themes';
import { AudioPlayer } from './AudioPlayer';
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
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<'ai' | 'tts' | 'anki' | 'appearance' | 'diagnostics' | 'guide'>('ai');
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
  const [testUsWavBase64, setTestUsWavBase64] = useState<string | null>(null);
  const [testUkWavBase64, setTestUkWavBase64] = useState<string | null>(null);
  const [testSlowWavBase64, setTestSlowWavBase64] = useState<string | null>(null);

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
  const [serviceErrorMsg, setServiceErrorMsg] = useState<string | null>(null);
  const [serviceSuccessMsg, setServiceSuccessMsg] = useState<string | null>(null);

  // Anki states
  const [ankiStatus, setAnkiStatus] = useState<{ connected: boolean; version?: number; error?: string } | null>(null);
  const [ankiDecks, setAnkiDecks] = useState<string[]>([]);
  const [ankiModelSyncMsg, setAnkiModelSyncMsg] = useState<string | null>(null);
  const [testingAnkiConn, setTestingAnkiConn] = useState(false);
  const [runningAnkiPipeline, setRunningAnkiPipeline] = useState(false);
  const [openingAnkiNoteId, setOpeningAnkiNoteId] = useState<number | null>(null);
  const [ankiActionFeedback, setAnkiActionFeedback] = useState<string | null>(null);
  const [ankiPipelineReport, setAnkiPipelineReport] = useState<{
    success: boolean;
    steps: Array<{ step: string; status: 'ok' | 'error'; message: string; details?: any }>;
    testNoteId?: number;
    testCardIds?: number[];
    verification?: AnkiCardVerificationDetails;
  } | null>(null);

  // System Diagnostics Report
  const [fullReport, setFullReport] = useState<DiagnosticsReport | null>(null);
  const [runningDiag, setRunningDiag] = useState(false);

  // Copy helper
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Initial loads
  useEffect(() => {
    setForm(settings);
    refreshOllamaInfo();
    refreshGeminiInfo();
    refreshTTSInfo();
    refreshOnlineTtsInfo();
    refreshPiperServiceStatus();
    refreshAnkiInfo();
  }, [settings]);

  // Ollama refresh
  const refreshOllamaInfo = async () => {
    setLoadingModels(true);
    try {
      const conn = await checkOllama(form.ai.ollama.url);
      setOllamaStatus(conn);

      const modelsRes = await getOllamaModels(form.ai.ollama.url);
      if (modelsRes.success) {
        setOllamaModels(modelsRes.models);
      }
    } catch {
      setOllamaStatus({ connected: false, error: 'Connection failed' });
    } finally {
      setLoadingModels(false);
    }
  };

  // Gemini refresh
  const refreshGeminiInfo = async () => {
    try {
      const modelsRes = await getGeminiModels();
      if (modelsRes.success) {
        setGeminiModels(modelsRes.models);
      }
      if (form.ai.gemini.apiKey) {
        const conn = await checkGemini(form.ai.gemini.apiKey, form.ai.gemini.model);
        setGeminiStatus(conn);
      }
    } catch {
      setGeminiStatus({ connected: false, error: 'Gemini check failed' });
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    try {
      const conn = await checkGemini(form.ai.gemini.apiKey, form.ai.gemini.model);
      setGeminiStatus(conn);
    } catch (e: any) {
      setGeminiStatus({ connected: false, error: e?.message });
    } finally {
      setTestingGemini(false);
    }
  };

  // Piper Service refresh
  const refreshPiperServiceStatus = async () => {
    setCheckingService(true);
    try {
      const res = await getPiperServiceStatus();
      setServiceStatus(res);
    } catch (err: any) {
      setServiceStatus({ active: false, status: 'error', error: err.message });
    } finally {
      setCheckingService(false);
    }
  };

  // Toggle Piper Service
  const handleToggleService = async (targetAction: 'start' | 'stop') => {
    setTogglingService(true);
    setServiceErrorMsg(null);
    setServiceSuccessMsg(null);
    try {
      const res = await controlPiperService(targetAction);
      setServiceStatus({
        active: res.active,
        status: res.status,
        error: res.error,
      });

      if (!res.success) {
        setServiceErrorMsg(res.error || res.message || `Failed to ${targetAction} piper.service`);
      } else {
        setServiceSuccessMsg(
          targetAction === 'start'
            ? '✓ piper.service started successfully'
            : '✓ piper.service stopped successfully'
        );
        setTimeout(() => setServiceSuccessMsg(null), 4000);
        refreshTTSInfo();
      }
    } catch (err: any) {
      setServiceErrorMsg(`systemctl error: ${err.message}`);
    } finally {
      setTogglingService(false);
    }
  };

  // Piper TTS refresh
  const refreshTTSInfo = async () => {
    try {
      const voicesRes = await getTTSVoices();
      if (voicesRes.success) {
        setPiperVoices(voicesRes.voices);
      }
      const diag = await checkTTS(form.tts.endpoint, form.tts.americanVoice);
      setPiperDiag(diag);
    } catch (e) {
      console.error(e);
    }
    refreshPiperServiceStatus();
  };

  // Online TTS refresh
  const refreshOnlineTtsInfo = async () => {
    try {
      const res = await checkOnlineTTS();
      setOnlineTtsStatus(res);
    } catch {
      setOnlineTtsStatus({ connected: false, error: 'Online TTS unreachable' });
    }
  };

  const handleTestOnlineTts = async () => {
    setTestingOnlineTts(true);
    try {
      const res = await runOnlineTTSDiagnostics();
      setOnlineTtsDiag(res);
      setOnlineTtsStatus({ connected: res.ready });
    } catch (e: any) {
      console.error('Online TTS diagnostic error:', e);
    } finally {
      setTestingOnlineTts(false);
    }
  };

  // Anki refresh
  const refreshAnkiInfo = async () => {
    try {
      const conn = await checkAnki(form.anki.url);
      setAnkiStatus(conn);

      const decksRes = await getAnkiDecks(form.anki.url);
      if (decksRes.success) {
        setAnkiDecks(decksRes.decks);
      }
    } catch {
      setAnkiStatus({ connected: false, error: 'AnkiConnect unreachable' });
    }
  };

  // Save Settings
  const handleSave = async () => {
    try {
      const updated = await saveConfig(form);
      onUpdateSettings(updated);
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Failed to save: ${err.message}`);
    }
  };

  // Test Piper TTS Audio
  const handleTestPiper = async () => {
    setTestingPiper(true);
    setTestUsWavBase64(null);
    setTestUkWavBase64(null);
    setTestSlowWavBase64(null);
    try {
      const res = await runTTSDiagnostics({
        endpoint: form.tts.endpoint,
        americanVoice: form.tts.americanVoice,
        britishVoice: form.tts.britishVoice,
        normalSpeed: form.tts.normalSpeed,
        slowSpeed: form.tts.slowSpeed,
      });
      setPiperDiag(res);
      const usClip = res.testAudios?.usNormalBase64 || res.testUsAudioBase64;
      const ukClip = res.testAudios?.ukNormalBase64 || res.testUkAudioBase64;
      const slowClip = res.testAudios?.usSlowBase64 || res.testSlowAudioBase64;
      if (usClip) setTestUsWavBase64(usClip);
      if (ukClip) setTestUkWavBase64(ukClip);
      if (slowClip) setTestSlowWavBase64(slowClip);
    } catch (e: any) {
      console.error('Test Piper failed:', e);
    } finally {
      setTestingPiper(false);
    }
  };

  // Sync Anki Note Model & Templates
  const handleSyncAnkiModel = async () => {
    setAnkiModelSyncMsg('Syncing AI Vocabulary Note Model & Theme CSS to Anki...');
    try {
      const res = await setupAnkiModel(form.theme, form.anki.url);
      if (res.success) {
        setAnkiModelSyncMsg(`✓ ${res.message}`);
      } else {
        setAnkiModelSyncMsg(`✕ Failed: ${res.error}`);
      }
    } catch (err: any) {
      setAnkiModelSyncMsg(`✕ Error: ${err.message}`);
    }
  };

  // Test Anki Connection
  const handleTestAnkiConn = async () => {
    setTestingAnkiConn(true);
    try {
      const conn = await checkAnki(form.anki.url);
      setAnkiStatus(conn);
      if (conn.connected) {
        const decksRes = await getAnkiDecks(form.anki.url);
        if (decksRes.success) {
          setAnkiDecks(decksRes.decks);
        }
      }
    } catch {
      setAnkiStatus({ connected: false, error: 'AnkiConnect unreachable at ' + form.anki.url });
    } finally {
      setTestingAnkiConn(false);
    }
  };

  // Run Test Card Pipeline in Anki
  const handleRunAnkiPipelineTest = async () => {
    setRunningAnkiPipeline(true);
    setAnkiPipelineReport(null);
    setAnkiActionFeedback(null);
    try {
      const res = await runAnkiPipelineTest(form.anki.defaultDeck, form.theme, form.anki.url);
      setAnkiPipelineReport(res);
      refreshAnkiInfo();
    } catch (e: any) {
      setAnkiPipelineReport({
        success: false,
        steps: [
          { step: 'Execution', status: 'error', message: e.message || 'Pipeline execution failed' },
        ],
      });
    } finally {
      setRunningAnkiPipeline(false);
    }
  };

  // Open in Anki from Settings
  const handleOpenInAnkiFromSettings = async (noteId: number) => {
    setOpeningAnkiNoteId(noteId);
    setAnkiActionFeedback(null);
    try {
      const query = `nid:${noteId}`;
      const res = await openInAnki({ noteId, query, url: form.anki.url });
      if (res.success) {
        setAnkiActionFeedback(`Opened Anki Browser with query: "${query}"!`);
      } else {
        setAnkiActionFeedback(`Browser query sent: "${query}". Check Anki app.`);
      }
    } catch (e: any) {
      setAnkiActionFeedback(`Could not open Anki browser: ${e?.message}`);
    } finally {
      setOpeningAnkiNoteId(null);
    }
  };

  // Run Full Diagnostics
  const handleRunFullDiagnostics = async () => {
    setRunningDiag(true);
    try {
      const report = await runFullDiagnostics();
      setFullReport(report);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningDiag(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Settings Navigation Sub-Tabs Bento Bar */}
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-3 flex flex-wrap items-center justify-between gap-3 text-black">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('ai')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'ai'
                ? 'bg-[#38bdf8] text-black shadow-[3px_3px_0px_#000000] -translate-y-0.5'
                : 'bg-zinc-100 text-black hover:bg-zinc-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI Provider ({form.ai.provider === 'gemini' ? 'Gemini' : 'Ollama'})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tts')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'tts'
                ? 'bg-[#FFD93D] text-black shadow-[3px_3px_0px_#000000] -translate-y-0.5'
                : 'bg-zinc-100 text-black hover:bg-zinc-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>TTS ({form.tts.provider === 'online' ? 'Online' : 'Piper'})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('anki')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'anki'
                ? 'bg-[#4ADE80] text-black shadow-[3px_3px_0px_#000000] -translate-y-0.5'
                : 'bg-zinc-100 text-black hover:bg-zinc-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>AnkiConnect</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('appearance')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'appearance'
                ? 'bg-[#c084fc] text-black shadow-[3px_3px_0px_#000000] -translate-y-0.5'
                : 'bg-zinc-100 text-black hover:bg-zinc-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Card Designs (10 Themes)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('diagnostics');
              handleRunFullDiagnostics();
            }}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'diagnostics'
                ? 'bg-[#FF4B4B] text-white shadow-[3px_3px_0px_#000000] -translate-y-0.5'
                : 'bg-zinc-100 text-black hover:bg-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Diagnostics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('guide')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'guide'
                ? 'bg-[#2dd4bf] text-black shadow-[3px_3px_0px_#000000] -translate-y-0.5'
                : 'bg-zinc-100 text-black hover:bg-zinc-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Setup Guide</span>
          </button>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 bg-[#4ADE80] hover:bg-[#86efac] text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 cursor-pointer active:translate-y-0.5"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Save Notification */}
      {saveStatus && (
        <div className="p-3 bg-emerald-300 border-4 border-black text-black text-xs font-black flex items-center gap-2 shadow-[4px_4px_0px_#000000]">
          <CheckCircle2 className="w-5 h-5 text-black" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* SUB-TAB 1: AI PROVIDER (Ollama & Gemini) */}
      {activeSubTab === 'ai' && (
        <div className="bg-[#38bdf8] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="flex flex-wrap items-center justify-between border-b-4 border-black pb-3 gap-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                AI Provider Configuration
              </h3>
              <p className="text-xs font-bold text-black opacity-80">
                Choose between Local Ollama (100% offline) or Google Gemini (Online cloud AI).
              </p>
            </div>

            {/* Provider Selector Switch */}
            <div className="inline-flex border-4 border-black bg-white p-1 shadow-[3px_3px_0px_#000000]">
              <button
                type="button"
                onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'ollama' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                  form.ai.provider === 'ollama'
                    ? 'bg-[#FFD93D] text-black shadow-inner'
                    : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Local Ollama</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'gemini' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                  form.ai.provider === 'gemini'
                    ? 'bg-[#FFD93D] text-black shadow-inner'
                    : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Google Gemini</span>
              </button>
            </div>
          </div>

          {/* OLLAMA SECTION */}
          {form.ai.provider === 'ollama' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white p-3 border-4 border-black">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-black" />
                  <span className="font-black text-xs uppercase">Local Ollama Status:</span>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-black border-2 border-black ${
                      ollamaStatus?.connected ? 'bg-[#4ADE80] text-black' : 'bg-[#FF4B4B] text-white'
                    }`}
                  >
                    {ollamaStatus?.connected ? `● ${ollamaStatus.version}` : '○ Offline / Unreachable'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={refreshOllamaInfo}
                  disabled={loadingModels}
                  className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-black font-black text-xs border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                  <span>Detect Local Models</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                {/* URL */}
                <div className="bg-white p-4 border-4 border-black">
                  <label className="block text-black font-black uppercase mb-1">
                    Ollama Server URL:
                  </label>
                  <input
                    type="text"
                    value={form.ai.ollama.url}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, ollama: { ...form.ai.ollama, url: e.target.value }, url: e.target.value },
                      })
                    }
                    className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                    Default: http://127.0.0.1:11434
                  </span>
                </div>

                {/* Model Selector */}
                <div className="bg-white p-4 border-4 border-black">
                  <label className="block text-black font-black uppercase mb-1">
                    Select Local Model:
                  </label>
                  {ollamaModels.length > 0 ? (
                    <select
                      value={form.ai.ollama.model}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ai: { ...form.ai, ollama: { ...form.ai.ollama, model: e.target.value }, model: e.target.value },
                        })
                      }
                      className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none cursor-pointer"
                    >
                      {ollamaModels.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({(m.size / 1024 / 1024 / 1024).toFixed(1)} GB)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.ai.ollama.model}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ai: { ...form.ai, ollama: { ...form.ai.ollama, model: e.target.value }, model: e.target.value },
                        })
                      }
                      placeholder="e.g. qwen3:4b, gemma3:4b, llama3.2:3b"
                      className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none"
                    />
                  )}
                  <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                    {ollamaModels.length} local model(s) detected.
                  </span>
                </div>

                {/* Temperature */}
                <div className="bg-white p-4 border-4 border-black">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-black font-black uppercase">Temperature:</label>
                    <span className="font-mono bg-black text-[#FFD93D] px-2 py-0.5 text-xs font-black">
                      {form.ai.ollama.temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={form.ai.ollama.temperature}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          ollama: { ...form.ai.ollama, temperature: parseFloat(e.target.value) },
                          temperature: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full cursor-pointer accent-black"
                  />
                </div>

                {/* Context Length */}
                <div className="bg-white p-4 border-4 border-black">
                  <label className="block text-black font-black uppercase mb-1">
                    Context Length (tokens):
                  </label>
                  <input
                    type="number"
                    value={form.ai.ollama.contextLength}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          ollama: { ...form.ai.ollama, contextLength: parseInt(e.target.value, 10) || 2048 },
                          contextLength: parseInt(e.target.value, 10) || 2048,
                        },
                      })
                    }
                    className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GEMINI SECTION */}
          {form.ai.provider === 'gemini' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white p-3 border-4 border-black">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-black" />
                  <span className="font-black text-xs uppercase">Google Gemini Status:</span>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-black border-2 border-black ${
                      geminiStatus?.connected ? 'bg-[#4ADE80] text-black' : 'bg-[#FF4B4B] text-white'
                    }`}
                  >
                    {geminiStatus?.connected ? '● Gemini Connected' : '○ Not Connected / Invalid Key'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={testingGemini || !form.ai.gemini.apiKey}
                  className="px-3 py-1 bg-[#FFD93D] hover:bg-[#ffe066] text-black font-black text-xs border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000000] disabled:opacity-50"
                >
                  {testingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  <span>Test Gemini Key</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                {/* API Key */}
                <div className="bg-white p-4 border-4 border-black">
                  <label className="block text-black font-black uppercase mb-1">
                    Google Gemini API Key:
                  </label>
                  <input
                    type="password"
                    value={form.ai.gemini.apiKey}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, gemini: { ...form.ai.gemini, apiKey: e.target.value } },
                      })
                    }
                    placeholder="Enter your Gemini API Key..."
                    className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                    Get an API key from Google AI Studio (aistudio.google.com).
                  </span>
                </div>

                {/* Model Selector */}
                <div className="bg-white p-4 border-4 border-black">
                  <label className="block text-black font-black uppercase mb-1">
                    Gemini Model:
                  </label>
                  <select
                    value={form.ai.gemini.model}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, gemini: { ...form.ai.gemini, model: e.target.value } },
                      })
                    }
                    className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none cursor-pointer"
                  >
                    {geminiModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                    Recommended: <code className="font-mono font-black">gemini-2.5-flash</code> (ultra fast)
                  </span>
                </div>

                {/* Temperature */}
                <div className="bg-white p-4 border-4 border-black md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-black font-black uppercase">Gemini Temperature:</label>
                    <span className="font-mono bg-black text-[#FFD93D] px-2 py-0.5 text-xs font-black">
                      {form.ai.gemini.temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={form.ai.gemini.temperature}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          gemini: { ...form.ai.gemini, temperature: parseFloat(e.target.value) },
                        },
                      })
                    }
                    className="w-full cursor-pointer accent-black"
                  />
                </div>
              </div>

              {geminiStatus && !geminiStatus.connected && (
                <div className="p-3 bg-red-100 border-2 border-red-600 text-red-900 text-xs font-bold">
                  {geminiStatus.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: TTS (Piper Offline & Online TTS) */}
      {activeSubTab === 'tts' && (
        <div className="bg-[#FFD93D] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="flex flex-wrap items-center justify-between border-b-4 border-black pb-3 gap-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                TTS Voice Engine Selection
              </h3>
              <p className="text-xs font-bold text-black opacity-80">
                Choose between Local Piper TTS (100% offline) or High-Quality Online English TTS.
              </p>
            </div>

            {/* TTS Provider Switch */}
            <div className="inline-flex border-4 border-black bg-white p-1 shadow-[3px_3px_0px_#000000]">
              <button
                type="button"
                onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'piper', engine: 'piper' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                  form.tts.provider === 'piper'
                    ? 'bg-[#38BDF8] text-black shadow-inner'
                    : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Piper (Local Offline)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'online', engine: 'online' } })}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
                  form.tts.provider === 'online'
                    ? 'bg-[#38BDF8] text-black shadow-inner'
                    : 'bg-zinc-100 text-black hover:bg-zinc-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Online TTS (High Quality)</span>
              </button>
            </div>
          </div>

          {/* ONLINE TTS CONFIGURATION */}
          {form.tts.provider === 'online' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white p-4 border-4 border-black shadow-[4px_4px_0px_#000000] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-black" />
                  <div>
                    <h4 className="text-sm font-black uppercase">Online High-Quality English TTS</h4>
                    <p className="text-[11px] text-zinc-600 font-bold">
                      Generates pristine American & British audio (Normal & Slow) with zero local dependencies.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-black border-2 border-black ${
                      onlineTtsStatus?.connected ? 'bg-[#4ADE80] text-black' : 'bg-[#FF4B4B] text-white'
                    }`}
                  >
                    {onlineTtsStatus?.connected ? '● ONLINE TTS READY' : '○ OFFLINE'}
                  </span>
                  <button
                    type="button"
                    onClick={handleTestOnlineTts}
                    disabled={testingOnlineTts}
                    className="px-4 py-1.5 bg-[#FF4B4B] hover:bg-red-500 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer uppercase active:translate-y-0.5"
                  >
                    {testingOnlineTts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{testingOnlineTts ? 'Testing...' : 'Test Online TTS'}</span>
                  </button>
                </div>
              </div>

              {/* Online TTS Diagnostic Test Results */}
              {onlineTtsDiag && (
                <div className="bg-white p-4 border-4 border-black space-y-2 text-xs">
                  <h4 className="font-black text-xs uppercase mb-2">Online TTS Test Report:</h4>
                  {onlineTtsDiag.steps.map((st) => (
                    <div key={st.step} className="flex items-center justify-between p-2 bg-zinc-50 border border-black">
                      <span className="font-bold">{st.step}. {st.title}</span>
                      <span className={st.status === 'ok' ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                        {st.message}
                      </span>
                    </div>
                  ))}
                  {onlineTtsDiag.testAudios && (
                    <div className="pt-2 border-t border-zinc-300 flex flex-wrap gap-2">
                      {onlineTtsDiag.testAudios.usNormalBase64 && (
                        <AudioPlayer base64Wav={onlineTtsDiag.testAudios.usNormalBase64} label="🇺🇸 US Normal (1.0x)" size="sm" />
                      )}
                      {onlineTtsDiag.testAudios.usSlowBase64 && (
                        <AudioPlayer base64Wav={onlineTtsDiag.testAudios.usSlowBase64} label="🇺🇸 US Slow (0.75x)" size="sm" />
                      )}
                      {onlineTtsDiag.testAudios.ukNormalBase64 && (
                        <AudioPlayer base64Wav={onlineTtsDiag.testAudios.ukNormalBase64} label="🇬🇧 UK Normal (1.0x)" size="sm" />
                      )}
                      {onlineTtsDiag.testAudios.ukSlowBase64 && (
                        <AudioPlayer base64Wav={onlineTtsDiag.testAudios.ukSlowBase64} label="🇬🇧 UK Slow (0.75x)" size="sm" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PIPER OFFLINE TTS CONFIGURATION */}
          {form.tts.provider === 'piper' && (
            <div className="flex flex-col gap-4">
              {/* PIPER SYSTEMD SERVICE CONTROL */}
              <div className="bg-white p-4 sm:p-5 border-4 border-black shadow-[4px_4px_0px_#000000] flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Power className="w-5 h-5 text-black" />
                      <h4 className="text-sm font-black uppercase tracking-tight">Piper Local Service Control</h4>
                      <code className="bg-black text-[#FFD93D] px-1.5 py-0.5 text-[11px] font-mono font-bold">piper.service</code>
                    </div>
                    <p className="text-[11px] text-zinc-600 font-bold mt-0.5">
                      Controls the Linux systemd user service via <code className="bg-zinc-100 px-1 font-mono">systemctl --user</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 text-xs font-black border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] ${
                        serviceStatus?.active
                          ? 'bg-[#4ADE80] text-black'
                          : serviceStatus?.status === 'failed'
                          ? 'bg-[#FF4B4B] text-white'
                          : 'bg-zinc-200 text-zinc-800'
                      }`}
                    >
                      <span>
                        {checkingService
                          ? 'CHECKING...'
                          : serviceStatus?.active
                          ? 'RUNNING (ON)'
                          : 'STOPPED (OFF)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={refreshPiperServiceStatus}
                      disabled={checkingService || togglingService}
                      className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-black border-2 border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
                      title="Check Service Status"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingService ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-zinc-50 border-2 border-black">
                  <div className="text-xs font-bold">
                    <div className="text-black font-black uppercase flex items-center gap-2">
                      <span>Service State:</span>
                      <span className={`px-2 py-0.5 text-xs font-black border border-black ${serviceStatus?.active ? 'bg-[#4ADE80]' : 'bg-[#FF4B4B] text-white'}`}>
                        {serviceStatus?.active ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {serviceStatus?.active ? (
                      <button
                        type="button"
                        onClick={() => handleToggleService('stop')}
                        disabled={togglingService}
                        className="px-4 py-2 bg-[#FF4B4B] hover:bg-red-600 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer uppercase active:translate-y-0.5"
                      >
                        <PowerOff className="w-4 h-4" />
                        <span>Stop Service</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleService('start')}
                        disabled={togglingService}
                        className="px-4 py-2 bg-[#4ADE80] hover:bg-emerald-400 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer uppercase active:translate-y-0.5"
                      >
                        <Power className="w-4 h-4" />
                        <span>Start Service</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                {/* Piper Endpoint */}
                <div className="bg-white p-4 border-4 border-black">
                  <label className="block text-black font-black uppercase mb-1">
                    Piper Server URL:
                  </label>
                  <input
                    type="text"
                    value={form.tts.endpoint}
                    onChange={(e) => setForm({ ...form, tts: { ...form.tts, endpoint: e.target.value } })}
                    className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                    Default: http://127.0.0.1:5000
                  </span>
                </div>

                {/* Actions */}
                <div className="bg-white p-4 border-4 border-black flex flex-col justify-between gap-2">
                  <label className="block text-black font-black uppercase">
                    Test Piper Offline TTS:
                  </label>
                  <button
                    type="button"
                    onClick={handleTestPiper}
                    disabled={testingPiper}
                    className="w-full py-2 bg-[#FF4B4B] hover:bg-red-500 text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {testingPiper ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>Run Piper Diagnostics</span>
                  </button>
                </div>
              </div>

              {piperDiag && (
                <div className="bg-white p-4 border-4 border-black space-y-2 text-xs">
                  <h4 className="font-black text-xs uppercase mb-2">Piper Test Results:</h4>
                  {piperDiag.steps.map((s) => (
                    <div key={s.step} className="flex items-center justify-between p-2 bg-zinc-50 border border-black">
                      <span className="font-bold">{s.step}. {s.title}</span>
                      <span className={s.status === 'ok' ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                        {s.message}
                      </span>
                    </div>
                  ))}
                  {(testUsWavBase64 || testUkWavBase64 || testSlowWavBase64) && (
                    <div className="pt-2 border-t border-zinc-300 flex flex-wrap gap-2">
                      {testUsWavBase64 && <AudioPlayer base64Wav={testUsWavBase64} label="🇺🇸 US Normal" size="sm" />}
                      {testSlowWavBase64 && <AudioPlayer base64Wav={testSlowWavBase64} label="🐢 US Slow" size="sm" />}
                      {testUkWavBase64 && <AudioPlayer base64Wav={testUkWavBase64} label="🇬🇧 UK Normal" size="sm" />}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: AnkiConnect */}
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
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-black border-2 border-black ${
                  ankiStatus?.connected ? 'bg-white text-black' : 'bg-[#FF4B4B] text-white'
                }`}
              >
                {ankiStatus?.connected ? `● Version ${ankiStatus.version}` : '○ Unreachable'}
              </span>
              <button
                type="button"
                onClick={refreshAnkiInfo}
                className="p-1.5 bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
                title="Refresh Anki"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            {/* URL */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                AnkiConnect URL:
              </label>
              <input
                type="text"
                value={form.anki.url}
                onChange={(e) => setForm({ ...form, anki: { ...form.anki, url: e.target.value } })}
                className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
              />
              <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                Default: http://127.0.0.1:8765
              </span>
            </div>

            {/* Deck */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                Default Deck:
              </label>
              {ankiDecks.length > 0 ? (
                <select
                  value={form.anki.defaultDeck}
                  onChange={(e) => setForm({ ...form, anki: { ...form.anki, defaultDeck: e.target.value } })}
                  className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none cursor-pointer"
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
                  className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none"
                />
              )}
            </div>

            {/* Actions Bar */}
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleTestAnkiConn}
                disabled={testingAnkiConn}
                className="flex-1 py-3 px-4 bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5"
              >
                {testingAnkiConn ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <RefreshCw className="w-4 h-4 text-black" />}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleRunAnkiPipelineTest}
                disabled={runningAnkiPipeline}
                className="flex-1 py-3 px-4 bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5"
              >
                {runningAnkiPipeline ? <Loader2 className="w-4 h-4 animate-spin text-[#4ADE80]" /> : <Zap className="w-4 h-4 text-[#FFD93D]" />}
                <span>Create Test Card in Anki</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAnkiModel}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-black text-white font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5"
              >
                <Wrench className="w-4 h-4 text-[#4ADE80]" />
                <span>Sync Model & Theme CSS</span>
              </button>
            </div>
          </div>

          {ankiModelSyncMsg && (
            <div className="p-3 bg-white border-4 border-black text-black font-black text-xs shadow-[3px_3px_0px_#000000]">
              {ankiModelSyncMsg}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: Appearance (10 Distinct Comic Themes) */}
      {activeSubTab === 'appearance' && (
        <div className="bg-[#c084fc] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-6 text-black">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Comic Card Designs (10 Templates)
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              Select one of 5 Light or 5 Dark comic styles. The exact chosen HTML/CSS is sent to Anki!
            </p>
          </div>

          {/* LIGHT DESIGNS (5 Designs) */}
          <div>
            <h4 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-white border-2 border-black"></span>
              <span>5 Light Card Designs</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {THEME_GROUPS.light.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setForm({ ...form, theme: t.id as ThemeId })}
                  className={`p-4 border-4 border-black cursor-pointer transition-all ${
                    form.theme === t.id
                      ? 'bg-white text-black shadow-[5px_5px_0px_#000000] -translate-y-1 ring-2 ring-black'
                      : 'bg-zinc-100 text-black hover:bg-white opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase">{t.name}</span>
                    {form.theme === t.id && (
                      <span className="text-[10px] bg-[#4ADE80] text-black font-black px-1.5 py-0.2 border border-black">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 font-bold mb-3">
                    {t.desc}
                  </p>
                  <div className="flex gap-1.5">
                    <span className="w-4 h-4 bg-[#FFD93D] border border-black" />
                    <span className="w-4 h-4 bg-[#38BDF8] border border-black" />
                    <span className="w-4 h-4 bg-[#4ADE80] border border-black" />
                    <span className="w-4 h-4 bg-[#FB923C] border border-black" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DARK DESIGNS (5 Designs) */}
          <div>
            <h4 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-black border-2 border-white"></span>
              <span>5 Dark Card Designs</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {THEME_GROUPS.dark.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setForm({ ...form, theme: t.id as ThemeId })}
                  className={`p-4 border-4 border-black cursor-pointer transition-all ${
                    form.theme === t.id
                      ? 'bg-black text-white shadow-[5px_5px_0px_#FFD93D] -translate-y-1 ring-2 ring-yellow-400'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-[#FFD93D]">{t.name}</span>
                    {form.theme === t.id && (
                      <span className="text-[10px] bg-[#FFD93D] text-black font-black px-1.5 py-0.2 border border-black">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-300 font-bold mb-3">
                    {t.desc}
                  </p>
                  <div className="flex gap-1.5">
                    <span className="w-4 h-4 bg-[#FFD93D] border border-white" />
                    <span className="w-4 h-4 bg-[#38BDF8] border border-white" />
                    <span className="w-4 h-4 bg-[#4ADE80] border border-white" />
                    <span className="w-4 h-4 bg-[#C084FC] border border-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: Diagnostics */}
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
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase border-3 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-2 cursor-pointer active:translate-y-0.5"
            >
              <RefreshCw className={`w-4 h-4 ${runningDiag ? 'animate-spin' : ''}`} />
              <span>{runningDiag ? 'Running...' : 'Run Diagnostics'}</span>
            </button>
          </div>

          {fullReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-black">
              {/* SYSTEM */}
              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black text-black uppercase tracking-wider block mb-2 border-b-2 border-black pb-1">
                  System Core
                </span>
                {fullReport.system.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-black font-black">{item.name}:</span>
                    <span className="text-zinc-700">{item.message}</span>
                  </div>
                ))}
              </div>

              {/* AI */}
              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black text-black uppercase tracking-wider block mb-2 border-b-2 border-black pb-1">
                  AI Provider Status
                </span>
                {fullReport.ai.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : item.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className="text-black font-black">{item.name}:</span>
                    <span className="text-zinc-700">{item.message}</span>
                  </div>
                ))}
              </div>

              {/* TTS */}
              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black text-black uppercase tracking-wider block mb-2 border-b-2 border-black pb-1">
                  TTS Voice Engine Status
                </span>
                {fullReport.tts.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className="text-black font-black">{item.name}:</span>
                    <span className="text-zinc-700">{item.message}</span>
                  </div>
                ))}
              </div>

              {/* ANKI */}
              <div className="bg-white p-4 border-4 border-black">
                <span className="font-black text-black uppercase tracking-wider block mb-2 border-b-2 border-black pb-1">
                  AnkiConnect
                </span>
                {fullReport.anki.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span className="text-black font-black">{item.name}:</span>
                    <span className="text-zinc-700">{item.message}</span>
                  </div>
                ))}
              </div>

              {/* TEMPLATES */}
              <div className="bg-white p-4 border-4 border-black md:col-span-2">
                <span className="font-black text-black uppercase tracking-wider block mb-2 border-b-2 border-black pb-1">
                  Template Renderers
                </span>
                {fullReport.templates.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-black font-black">{item.name}:</span>
                    <span className="text-zinc-700">{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: Setup Guide */}
      {activeSubTab === 'guide' && (
        <div className="bg-[#2dd4bf] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black text-xs font-bold">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Setup & Configuration Guide
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              Quick reference for setting up Ollama, Gemini API, Piper TTS, and AnkiConnect.
            </p>
          </div>

          {/* 1. Gemini Setup */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="font-black text-black uppercase tracking-wider mb-2">
              1. Google Gemini Online AI Setup
            </h4>
            <p className="text-zinc-700 font-bold mb-2">
              To use Google Gemini online mode:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-black font-bold">
              <li>Visit <span className="underline">aistudio.google.com</span> and create a free Gemini API key.</li>
              <li>In Settings → AI Provider, select <b>Google Gemini</b> and paste your API key.</li>
              <li>Click <b>Test Gemini Key</b> and <b>Save Changes</b>.</li>
            </ol>
          </div>

          {/* 2. Piper TTS Setup */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="font-black text-black uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2. Piper Offline TTS Linux Service</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    'systemctl --user start piper.service\nsystemctl --user status piper.service\nsystemctl --user stop piper.service',
                    'piper'
                  )
                }
                className="text-[11px] font-black bg-[#FFD93D] text-black px-2.5 py-1 border-2 border-black flex items-center gap-1 hover:bg-[#ffe066] cursor-pointer"
              >
                {copiedCmd === 'piper' ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'piper' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </h4>
            <pre className="bg-black text-[#FFD93D] p-3 font-mono text-xs overflow-x-auto border-2 border-black leading-relaxed font-bold">
{`# Start Piper service
systemctl --user start piper.service

# Check real-time service status
systemctl --user is-active piper.service

# Stop Piper service
systemctl --user stop piper.service`}
            </pre>
          </div>

          {/* 3. Ollama Setup */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="font-black text-black uppercase tracking-wider mb-2">
              3. Ollama Local Offline AI
            </h4>
            <pre className="bg-black text-[#4ADE80] p-3 font-mono text-xs overflow-x-auto border-2 border-black leading-relaxed font-bold">
{`# Start Ollama service
ollama serve

# Pull recommended model
ollama pull qwen3:4b`}
            </pre>
          </div>

          {/* 4. Anki & AnkiConnect */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="font-black text-black uppercase tracking-wider mb-2">
              4. Anki & AnkiConnect Setup
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-black font-bold">
              <li>Open Anki Desktop.</li>
              <li>Go to <b>Tools → Add-ons → Get Add-ons...</b></li>
              <li>Enter Code: <code className="bg-[#FFD93D] text-black px-2 py-0.5 font-mono font-black border-2 border-black">2055492159</code> (AnkiConnect)</li>
              <li>Restart Anki so AnkiConnect listens on port <code className="font-mono font-black">8765</code>.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
