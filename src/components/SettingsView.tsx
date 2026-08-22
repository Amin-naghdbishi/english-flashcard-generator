import React, { useState, useEffect } from 'react';
import { AppSettings, DiagnosticsReport, AnkiCardVerificationDetails } from '../types';
import {
  saveConfig,
  checkOllama,
  getOllamaModels,
  checkTTS,
  getTTSVoices,
  getPiperServiceStatus,
  controlPiperService,
  synthesizeAudio,
  runTTSDiagnostics,
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

  // Piper TTS states
  const [piperVoices, setPiperVoices] = useState<PiperVoice[]>([]);
  const [piperDiag, setPiperDiag] = useState<PiperDiagnosticResult | null>(null);
  const [testingPiper, setTestingPiper] = useState(false);
  const [testUsWavBase64, setTestUsWavBase64] = useState<string | null>(null);
  const [testUkWavBase64, setTestUkWavBase64] = useState<string | null>(null);
  const [testSlowWavBase64, setTestSlowWavBase64] = useState<string | null>(null);

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
    refreshTTSInfo();
    refreshPiperServiceStatus();
    refreshAnkiInfo();
  }, [settings]);

  // Ollama refresh
  const refreshOllamaInfo = async () => {
    setLoadingModels(true);
    try {
      const conn = await checkOllama(form.ai.url);
      setOllamaStatus(conn);

      const modelsRes = await getOllamaModels(form.ai.url);
      if (modelsRes.success) {
        setOllamaModels(modelsRes.models);
      }
    } catch {
      setOllamaStatus({ connected: false, error: 'Connection failed' });
    } finally {
      setLoadingModels(false);
    }
  };

  // Piper Service refresh (systemctl --user is-active piper.service)
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

  // Toggle Piper Service (systemctl --user start/stop piper.service)
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
            ? '✓ piper.service started successfully (systemctl --user start piper.service)'
            : '✓ piper.service stopped successfully (systemctl --user stop piper.service)'
        );
        setTimeout(() => setServiceSuccessMsg(null), 4000);
        // Refresh TTS API diagnostics as well
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
            <span>AI (Ollama)</span>
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
            <span>TTS (Piper)</span>
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
            <span>Appearance</span>
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

      {/* SUB-TAB 1: AI (Ollama) */}
      {activeSubTab === 'ai' && (
        <div className="bg-[#38bdf8] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="flex items-center justify-between border-b-4 border-black pb-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                Ollama Local AI Configuration
              </h3>
              <p className="text-xs font-bold text-black opacity-80">
                Direct structured JSON output generation without cloud dependencies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-black border-2 border-black ${
                  ollamaStatus?.connected ? 'bg-[#4ADE80] text-black' : 'bg-[#FF4B4B] text-white'
                }`}
              >
                {ollamaStatus?.connected ? `● ${ollamaStatus.version}` : '○ Unreachable'}
              </span>
              <button
                type="button"
                onClick={refreshOllamaInfo}
                disabled={loadingModels}
                className="p-1.5 bg-white hover:bg-zinc-100 text-black border-2 border-black shadow-[2px_2px_0px_#000000] cursor-pointer"
                title="Test Connection & Refresh Models"
              >
                <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            {/* URL */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                Ollama Endpoint URL:
              </label>
              <input
                type="text"
                value={form.ai.url}
                onChange={(e) => setForm({ ...form, ai: { ...form.ai, url: e.target.value } })}
                className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono focus:outline-none"
              />
              <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                Default: http://127.0.0.1:11434
              </span>
            </div>

            {/* Model Selector */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                Selected AI Model:
              </label>
              {ollamaModels.length > 0 ? (
                <select
                  value={form.ai.model}
                  onChange={(e) => setForm({ ...form, ai: { ...form.ai, model: e.target.value } })}
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
                  value={form.ai.model}
                  onChange={(e) => setForm({ ...form, ai: { ...form.ai, model: e.target.value } })}
                  placeholder="e.g. qwen3:4b, gemma3:4b, llama3.2:3b"
                  className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-black focus:outline-none"
                />
              )}
              <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                Recommended: qwen3:4b, gemma3:4b, llama3.2:3b
              </span>
            </div>

            {/* Temperature */}
            <div className="bg-white p-4 border-4 border-black">
              <div className="flex justify-between items-center mb-1">
                <label className="text-black font-black uppercase">Temperature:</label>
                <span className="font-mono bg-black text-[#FFD93D] px-2 py-0.5 text-xs font-black">
                  {form.ai.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={form.ai.temperature}
                onChange={(e) =>
                  setForm({ ...form, ai: { ...form.ai, temperature: parseFloat(e.target.value) } })
                }
                className="w-full cursor-pointer accent-black"
              />
              <span className="text-[10px] text-zinc-600 font-bold block mt-1">
                Keep low (0.1 - 0.3) for strict JSON adherence and accurate IPA.
              </span>
            </div>

            {/* Context Length */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                Context Length (num_ctx):
              </label>
              <input
                type="number"
                value={form.ai.contextLength}
                onChange={(e) =>
                  setForm({ ...form, ai: { ...form.ai, contextLength: parseInt(e.target.value, 10) || 2048 } })
                }
                className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono font-bold focus:outline-none"
              />
              <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                Default: 2048 tokens
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TTS (Piper) */}
      {activeSubTab === 'tts' && (
        <div className="bg-[#FFD93D] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="flex items-center justify-between border-b-4 border-black pb-3">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                Piper Local Offline TTS Engine
              </h3>
              <p className="text-xs font-bold text-black opacity-80">
                Official local Piper HTTP API (<code className="bg-black text-[#FFD93D] px-1 py-0.5 font-mono">POST /synthesize</code>) with real American & British voices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-black border-2 border-black ${
                  piperDiag?.ready ? 'bg-[#4ADE80] text-black' : 'bg-[#FF4B4B] text-white'
                }`}
              >
                {piperDiag?.ready ? '● PIPER READY' : '○ PIPER OFFLINE'}
              </span>
              <button
                type="button"
                onClick={handleTestPiper}
                disabled={testingPiper}
                className="px-4 py-1.5 bg-[#FF4B4B] hover:bg-red-500 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer uppercase active:translate-y-0.5"
              >
                {testingPiper ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{testingPiper ? 'Testing Piper...' : 'Test Piper'}</span>
              </button>
            </div>
          </div>

          {/* PIPER SYSTEMD SERVICE CONTROL */}
          <div className="bg-white p-4 sm:p-5 border-4 border-black shadow-[4px_4px_0px_#000000] flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Power className="w-5 h-5 text-black" />
                  <h4 className="text-sm font-black uppercase tracking-tight">Piper Service Control</h4>
                  <code className="bg-black text-[#FFD93D] px-1.5 py-0.5 text-[11px] font-mono font-bold">piper.service</code>
                </div>
                <p className="text-[11px] text-zinc-600 font-bold mt-0.5">
                  Controls the native Linux systemd user service via <code className="bg-zinc-100 px-1 font-mono">systemctl --user</code>
                </p>
              </div>

              {/* Real-time Status Badge & Refresh */}
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
                  <span className={`w-2.5 h-2.5 rounded-full ${serviceStatus?.active ? 'bg-black animate-pulse' : 'bg-zinc-500'}`} />
                  <span>
                    {checkingService
                      ? 'CHECKING...'
                      : serviceStatus?.active
                      ? 'RUNNING (ON)'
                      : serviceStatus?.status === 'failed'
                      ? 'FAILED (OFF)'
                      : 'STOPPED (OFF)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={refreshPiperServiceStatus}
                  disabled={checkingService || togglingService}
                  className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-black border-2 border-black shadow-[2px_2px_0px_#000000] cursor-pointer disabled:opacity-50 active:translate-y-0.5"
                  title="Check actual service status with systemctl --user is-active piper.service"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingService ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Main ON / OFF Toggle Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-zinc-50 border-2 border-black">
              <div className="text-xs font-bold">
                <div className="text-black font-black uppercase flex items-center gap-2">
                  <span>Piper Service:</span>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-mono font-black border-2 border-black shadow-[1px_1px_0px_#000000] ${
                      serviceStatus?.active ? 'bg-[#4ADE80] text-black' : 'bg-[#FF4B4B] text-white'
                    }`}
                  >
                    {serviceStatus?.active ? 'ON' : 'OFF'}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    (status: {serviceStatus?.status || 'unknown'})
                  </span>
                </div>
                <div className="text-[11px] text-zinc-600 font-mono mt-1">
                  Executes: {serviceStatus?.active ? 'systemctl --user stop piper.service' : 'systemctl --user start piper.service'}
                </div>
              </div>

              {/* Toggle Switch / Button */}
              <div className="flex items-center gap-2">
                {serviceStatus?.active ? (
                  <button
                    type="button"
                    onClick={() => handleToggleService('stop')}
                    disabled={togglingService}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#FF4B4B] hover:bg-red-600 text-white font-black text-xs border-2 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer uppercase active:translate-y-0.5 disabled:opacity-50"
                  >
                    {togglingService ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Stopping Service...</span>
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-4 h-4" />
                        <span>Turn OFF (systemctl --user stop)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleService('start')}
                    disabled={togglingService}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#4ADE80] hover:bg-emerald-400 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer uppercase active:translate-y-0.5 disabled:opacity-50"
                  >
                    {togglingService ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Starting Service...</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4" />
                        <span>Turn ON (systemctl --user start)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Service Error Alert */}
            {serviceErrorMsg && (
              <div className="p-3 bg-red-100 border-2 border-[#FF4B4B] text-black text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0px_#000000]">
                <AlertTriangle className="w-4 h-4 text-[#FF4B4B] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-black text-red-700 uppercase">systemctl Error:</div>
                  <div className="font-mono text-[11px] mt-0.5 text-red-900 break-all">{serviceErrorMsg}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceErrorMsg(null)}
                  className="text-xs font-black text-red-700 hover:text-black cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Service Success Notification */}
            {serviceSuccessMsg && (
              <div className="p-2.5 bg-green-100 border-2 border-[#4ADE80] text-black text-xs font-bold flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000000]">
                <div className="flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                  <span>{serviceSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceSuccessMsg(null)}
                  className="text-xs font-black text-emerald-900 hover:text-black cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
            {/* Piper Endpoint URL */}
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
                Local Piper HTTP Server (Default: http://127.0.0.1:5000)
              </span>
            </div>

            {/* American Voice */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                American English Voice (US):
              </label>
              <input
                type="text"
                value={form.tts.americanVoice}
                onChange={(e) => setForm({ ...form, tts: { ...form.tts, americanVoice: e.target.value } })}
                className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono font-bold focus:outline-none"
                placeholder="en_US-lessac-high"
              />
              <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                Installed model: <code className="font-mono font-black">en_US-lessac-high</code>
              </span>
            </div>

            {/* British Voice */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                British English Voice (UK):
              </label>
              <input
                type="text"
                value={form.tts.britishVoice}
                onChange={(e) => setForm({ ...form, tts: { ...form.tts, britishVoice: e.target.value } })}
                className="w-full bg-zinc-100 text-black p-2 border-2 border-black font-mono font-bold focus:outline-none"
                placeholder="en_GB-cori-high"
              />
              <span className="text-[10px] text-zinc-600 font-bold mt-1 block">
                Installed model: <code className="font-mono font-black">en_GB-cori-high</code>
              </span>
            </div>

            {/* Speeds */}
            <div className="bg-white p-4 border-4 border-black">
              <div className="flex justify-between items-center mb-1">
                <label className="text-black font-black uppercase">Normal Speed (length_scale = 1.0):</label>
                <span className="font-mono bg-black text-[#4ADE80] px-2 py-0.5 text-xs font-black">
                  {form.tts.normalSpeed}x
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={form.tts.normalSpeed}
                onChange={(e) =>
                  setForm({ ...form, tts: { ...form.tts, normalSpeed: parseFloat(e.target.value) } })
                }
                className="w-full cursor-pointer accent-black mb-3"
              />

              <div className="flex justify-between items-center mb-1">
                <label className="text-black font-black uppercase">Slow Speed (length_scale = 1.25):</label>
                <span className="font-mono bg-black text-[#FFD93D] px-2 py-0.5 text-xs font-black">
                  {form.tts.slowSpeed}x
                </span>
              </div>
              <input
                type="range"
                min="1.1"
                max="1.5"
                step="0.05"
                value={form.tts.slowSpeed}
                onChange={(e) =>
                  setForm({ ...form, tts: { ...form.tts, slowSpeed: parseFloat(e.target.value) } })
                }
                className="w-full cursor-pointer accent-black"
              />
            </div>
          </div>

          {/* Pronunciation Generation Toggles */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="text-xs font-black text-black uppercase tracking-wider mb-3">
              Audio Generation Rules for Flashcards:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-2 border-2 border-black bg-zinc-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateAmerican !== false}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateAmerican: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span className="text-xs font-black">🇺🇸 American (US)</span>
              </label>

              <label className="flex items-center gap-2 p-2 border-2 border-black bg-zinc-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateBritish !== false}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateBritish: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span className="text-xs font-black">🇬🇧 British (UK)</span>
              </label>

              <label className="flex items-center gap-2 p-2 border-2 border-black bg-zinc-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tts.generateSlow !== false}
                  onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateSlow: e.target.checked } })}
                  className="w-4 h-4 accent-black"
                />
                <span className="text-xs font-black">🐢 Slow Pronunciation (1.25x)</span>
              </label>
            </div>
          </div>

          {/* Test Audio Clips & Player */}
          {(testUsWavBase64 || testUkWavBase64 || testSlowWavBase64) && (
            <div className="bg-white p-4 border-4 border-black flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-black uppercase text-black">
                Generated Piper Test Audio:
              </span>
              <div className="flex flex-wrap gap-2">
                {testUsWavBase64 && (
                  <AudioPlayer base64Wav={testUsWavBase64} label="🇺🇸 US Normal (1.0x)" size="sm" />
                )}
                {testSlowWavBase64 && (
                  <AudioPlayer base64Wav={testSlowWavBase64} label="🐢 US Slow (1.25x)" size="sm" />
                )}
                {testUkWavBase64 && (
                  <AudioPlayer base64Wav={testUkWavBase64} label="🇬🇧 UK Normal (1.0x)" size="sm" />
                )}
              </div>
            </div>
          )}

          {/* 5-Step Piper Diagnostic Report */}
          {piperDiag && (
            <div className="bg-white p-4 border-4 border-black">
              <h4 className="text-xs font-black text-black uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Piper Diagnostic Test Results:</span>
                {piperDiag.ready ? (
                  <span className="bg-[#4ADE80] text-black text-[10px] font-black px-2 py-0.5 border border-black uppercase">
                    ALL CHECKS PASSED
                  </span>
                ) : (
                  <span className="bg-[#FF4B4B] text-white text-[10px] font-black px-2 py-0.5 border border-black uppercase">
                    PIPER NOT REACHABLE
                  </span>
                )}
              </h4>
              <div className="space-y-2 text-xs">
                {piperDiag.steps.map((s) => (
                  <div key={s.step} className="flex items-center justify-between bg-zinc-50 p-2 border border-black font-mono">
                    <div className="flex items-center gap-2">
                      {s.status === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-black text-black font-sans">
                        Step {s.step}: {s.title}
                      </span>
                    </div>
                    <span className="text-zinc-700 font-sans text-xs truncate max-w-[320px]">
                      {s.message}
                    </span>
                  </div>
                ))}
              </div>
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
                Direct note injection, media storage, and automatic Comic Note Type configuration.
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
            {/* AnkiConnect URL */}
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

            {/* Default Deck */}
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

            {/* Note Type Name */}
            <div className="bg-white p-4 border-4 border-black">
              <label className="block text-black font-black uppercase mb-1">
                Note Type Name in Anki:
              </label>
              <input
                type="text"
                disabled
                value={form.anki.noteType}
                className="w-full bg-zinc-200 text-zinc-700 p-2 border-2 border-black font-bold cursor-not-allowed"
              />
            </div>

            {/* Actions Bar */}
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleTestAnkiConn}
                disabled={testingAnkiConn}
                className="flex-1 py-3 px-4 bg-white hover:bg-zinc-100 text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5"
              >
                {testingAnkiConn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-black" />
                )}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleRunAnkiPipelineTest}
                disabled={runningAnkiPipeline}
                className="flex-1 py-3 px-4 bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5"
              >
                {runningAnkiPipeline ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#4ADE80]" />
                ) : (
                  <Zap className="w-4 h-4 text-[#FFD93D]" />
                )}
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

          {/* Unreachable Notice if Anki is not connected */}
          {ankiStatus && !ankiStatus.connected && (
            <div className="p-4 bg-[#FF4B4B] text-white border-4 border-black shadow-[4px_4px_0px_#000000] text-xs font-bold space-y-2">
              <div className="flex items-center gap-2 font-black uppercase text-sm">
                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                <span>AnkiConnect is not reachable</span>
              </div>
              <p>
                Ensure Anki desktop application is running and the AnkiConnect addon (code <code className="bg-black text-[#FFD93D] px-1 py-0.5 font-mono">2055492159</code>) is installed and enabled.
              </p>
              {ankiStatus.error && (
                <div className="bg-black/30 p-2 font-mono text-[11px]">
                  Error: {ankiStatus.error}
                </div>
              )}
            </div>
          )}

          {/* Test Pipeline Diagnostic Report */}
          {ankiPipelineReport && (
            <div className="p-4 bg-white border-4 border-black text-black shadow-[4px_4px_0px_#000000] space-y-3">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <h4 className="font-black text-sm uppercase flex items-center gap-2">
                  <span>Anki Card Creation Diagnostic Pipeline</span>
                  {ankiPipelineReport.success ? (
                    <span className="text-[10px] bg-[#4ADE80] text-black px-2 py-0.5 border border-black font-black uppercase">
                      ALL CHECKS PASSED
                    </span>
                  ) : (
                    <span className="text-[10px] bg-[#FF4B4B] text-white px-2 py-0.5 border border-black font-black uppercase">
                      PIPELINE FAILED
                    </span>
                  )}
                </h4>
                {ankiPipelineReport.testNoteId && (
                  <span className="font-mono text-xs font-black bg-zinc-100 px-2 py-1 border border-black">
                    Note ID #{ankiPipelineReport.testNoteId}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {ankiPipelineReport.steps.map((st, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-zinc-50 border border-black font-mono">
                    <div className="flex items-center gap-2">
                      {st.status === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-bold text-black">{st.step}</span>
                    </div>
                    <span className="text-zinc-700 font-sans text-xs text-right truncate max-w-[320px]">
                      {st.message}
                    </span>
                  </div>
                ))}
              </div>

              {ankiPipelineReport.testCardIds && ankiPipelineReport.testCardIds.length > 0 && (
                <div className="p-2 bg-[#4ADE80]/30 border border-black text-xs font-black flex items-center justify-between">
                  <span>Generated Card IDs in Anki:</span>
                  <span className="font-mono bg-white px-2 py-0.5 border border-black">
                    {ankiPipelineReport.testCardIds.map((id) => `#${id}`).join(', ')}
                  </span>
                </div>
              )}

              {/* Open in Anki action for test note */}
              {ankiPipelineReport.testNoteId && (
                <div className="pt-2 border-t border-zinc-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenInAnkiFromSettings(ankiPipelineReport.testNoteId!)}
                    disabled={openingAnkiNoteId === ankiPipelineReport.testNoteId}
                    className="py-1.5 px-3 bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase border-2 border-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000000] cursor-pointer"
                  >
                    {openingAnkiNoteId === ankiPipelineReport.testNoteId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4ADE80]" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 text-[#FFD93D]" />
                    )}
                    <span>Open Test Note in Anki Browser</span>
                  </button>

                  <span className="text-[11px] font-mono text-zinc-600">
                    Query: nid:{ankiPipelineReport.testNoteId}
                  </span>
                </div>
              )}

              {ankiActionFeedback && (
                <div className="p-2 bg-emerald-50 border border-black text-[11px] font-mono text-black">
                  {ankiActionFeedback}
                </div>
              )}
            </div>
          )}

          {ankiModelSyncMsg && (
            <div className="p-3 bg-white border-4 border-black text-black font-black text-xs shadow-[3px_3px_0px_#000000]">
              {ankiModelSyncMsg}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: Appearance (Comic Theme) */}
      {activeSubTab === 'appearance' && (
        <div className="bg-[#c084fc] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Comic Theme Selection
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              Zero SaaS clichés, bold comic panels, sharp ink borders, and Bento style.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Comic Dark */}
            <div
              onClick={() => setForm({ ...form, theme: 'comic-dark' })}
              className={`p-5 border-4 border-black cursor-pointer transition-all ${
                form.theme === 'comic-dark'
                  ? 'bg-black text-white shadow-[6px_6px_0px_#FFD93D] -translate-y-1'
                  : 'bg-zinc-900 text-white opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-black text-[#FFD93D] uppercase">Dark Comic Theme</span>
                {form.theme === 'comic-dark' && (
                  <span className="text-xs bg-[#FFD93D] text-black font-black px-2 py-0.5 border-2 border-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300 mb-4 font-bold">
                Deep ink dark canvas, vibrant yellow & sky badges, high-contrast comic panels.
              </p>
              <div className="flex gap-2">
                <span className="w-5 h-5 bg-[#FFD93D] border-2 border-white" />
                <span className="w-5 h-5 bg-[#38bdf8] border-2 border-white" />
                <span className="w-5 h-5 bg-[#4ade80] border-2 border-white" />
                <span className="w-5 h-5 bg-[#FF4B4B] border-2 border-white" />
                <span className="w-5 h-5 bg-[#c084fc] border-2 border-white" />
              </div>
            </div>

            {/* Comic Light */}
            <div
              onClick={() => setForm({ ...form, theme: 'comic-light' })}
              className={`p-5 border-4 border-black cursor-pointer transition-all ${
                form.theme === 'comic-light'
                  ? 'bg-white text-black shadow-[6px_6px_0px_#38bdf8] -translate-y-1'
                  : 'bg-zinc-100 text-black opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-black text-black uppercase">Light Comic Theme</span>
                {form.theme === 'comic-light' && (
                  <span className="text-xs bg-[#38bdf8] text-black font-black px-2 py-0.5 border-2 border-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-700 mb-4 font-bold">
                Warm comic page paper, crisp dark ink outlines, and clean readable font hierarchy.
              </p>
              <div className="flex gap-2">
                <span className="w-5 h-5 bg-[#bae6fd] border-2 border-black" />
                <span className="w-5 h-5 bg-[#fef08a] border-2 border-black" />
                <span className="w-5 h-5 bg-[#bbf7d0] border-2 border-black" />
                <span className="w-5 h-5 bg-[#fed7aa] border-2 border-black" />
                <span className="w-5 h-5 bg-[#e9d5ff] border-2 border-black" />
              </div>
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
                Rigorous real-time check across AI, TTS, AnkiConnect, and Template renderers.
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
                  Ollama AI
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
                  Piper TTS Engine
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
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: Setup Guide */}
      {activeSubTab === 'guide' && (
        <div className="bg-[#2dd4bf] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 flex flex-col gap-5 text-black text-xs font-bold">
          <div className="border-b-4 border-black pb-3">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              Local Setup & Installation Guide
            </h3>
            <p className="text-xs font-bold text-black opacity-80">
              Zero-cloud local infrastructure commands for Linux, macOS, and Windows.
            </p>
          </div>

          {/* 1. Piper TTS Setup */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="font-black text-black uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. Piper Linux User Service (systemctl)</span>
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
            <p className="text-zinc-700 font-bold mb-2">
              Control the existing <code className="font-mono font-black">piper.service</code> user service directly with systemctl:
            </p>
            <pre className="bg-black text-[#FFD93D] p-3 font-mono text-xs overflow-x-auto border-2 border-black leading-relaxed font-bold">
{`# Start Piper service
systemctl --user start piper.service

# Check real-time service status
systemctl --user status piper.service
systemctl --user is-active piper.service

# Stop Piper service
systemctl --user stop piper.service

# Restart Piper service
systemctl --user restart piper.service`}
            </pre>
          </div>

          {/* 2. Ollama Setup */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="font-black text-black uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2. Install & Run Ollama</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    'curl -fsSL https://ollama.com/install.sh | sh\nollama serve\nollama pull qwen3:4b',
                    'ollama'
                  )
                }
                className="text-[11px] font-black bg-[#FFD93D] text-black px-2.5 py-1 border-2 border-black flex items-center gap-1 hover:bg-[#ffe066] cursor-pointer"
              >
                {copiedCmd === 'ollama' ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'ollama' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </h4>
            <pre className="bg-black text-[#4ADE80] p-3 font-mono text-xs overflow-x-auto border-2 border-black leading-relaxed font-bold">
{`# Install Ollama (Linux/macOS)
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve

# Pull recommended vocabulary model
ollama pull qwen3:4b`}
            </pre>
          </div>

          {/* 3. Anki & AnkiConnect Setup */}
          <div className="bg-white p-4 border-4 border-black">
            <h4 className="font-black text-black uppercase tracking-wider mb-2">
              3. Install Anki & AnkiConnect Addon
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-black font-bold">
              <li>Download and open <b>Anki</b> from <span className="underline">apps.ankiweb.net</span></li>
              <li>Go to <b>Tools → Add-ons → Get Add-ons...</b></li>
              <li>Enter Code: <code className="bg-[#FFD93D] text-black px-2 py-0.5 font-mono font-black border-2 border-black">2055492159</code> (AnkiConnect)</li>
              <li>Restart Anki so AnkiConnect starts listening on port <code className="font-mono font-black">8765</code>.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
