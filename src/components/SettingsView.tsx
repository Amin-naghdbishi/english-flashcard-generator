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
  CustomAIProviderConfig,
  CustomTTSProviderConfig,
  AppTheme,
} from '../types';
import {
  saveConfig,
  checkOllama,
  getOllamaModels,
  checkGemini,
  getGeminiModels,
  checkCustomAI,
  getCustomAIModels,
  testCustomTTS,
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
  ensureModelInAnki,
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
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Radio,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  appTheme?: AppTheme;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, appTheme = settings.appTheme || 'comic' }) => {
  const [form, setForm] = useState<AppSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<
    'ai' | 'tts' | 'dictionary' | 'smartImages' | 'defaultCard' | 'appearance' | 'anki' | 'diagnostics' | 'guide'
  >('ai');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const isMinimalLight = (form.appTheme || appTheme) === 'minimal-light';
  const isMinimalDark = (form.appTheme || appTheme) === 'minimal-dark';
  const isMinimal = isMinimalLight || isMinimalDark;

  // Ollama states
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; version?: string; error?: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelTag[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Gemini states
  const [geminiStatus, setGeminiStatus] = useState<{ connected: boolean; model?: string; error?: string } | null>(null);
  const [geminiModels, setGeminiModels] = useState<Array<{ id: string; name: string }>>([]);
  const [testingGemini, setTestingGemini] = useState(false);

  // Custom AI states
  const [selectedCustomAiId, setSelectedCustomAiId] = useState<string>(
    form.ai.customProviders?.[0]?.id || 'openrouter'
  );
  const [customAiTestResult, setCustomAiTestResult] = useState<{
    connected?: boolean;
    message?: string;
    models?: string[];
    error?: string;
  } | null>(null);
  const [testingCustomAi, setTestingCustomAi] = useState(false);
  const [fetchingCustomAiModels, setFetchingCustomAiModels] = useState(false);
  const [showApiKeyCustomAi, setShowApiKeyCustomAi] = useState(false);

  // Piper TTS states
  const [piperVoices, setPiperVoices] = useState<PiperVoice[]>([]);
  const [piperDiag, setPiperDiag] = useState<PiperDiagnosticResult | null>(null);
  const [testingPiper, setTestingPiper] = useState(false);

  // Online TTS states
  const [onlineTtsStatus, setOnlineTtsStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [onlineTtsDiag, setOnlineTtsDiag] = useState<OnlineTTSDiagnosticResult | null>(null);
  const [testingOnlineTts, setTestingOnlineTts] = useState(false);

  // Custom TTS states
  const [selectedCustomTtsId, setSelectedCustomTtsId] = useState<string>(
    form.tts.customProviders?.[0]?.id || 'openai_speech'
  );
  const [customTtsTestResult, setCustomTtsTestResult] = useState<{
    success?: boolean;
    normalAudioBase64?: string;
    slowAudioBase64?: string;
    durationSeconds?: number;
    error?: string;
  } | null>(null);
  const [testingCustomTts, setTestingCustomTts] = useState(false);
  const [showApiKeyCustomTts, setShowApiKeyCustomTts] = useState(false);

  // Piper Service states
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
    } catch {}
    setLoadingModels(false);
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

  const refreshTTSInfo = async () => {
    try {
      const voicesRes = await getTTSVoices();
      if (voicesRes.success) setPiperVoices(voicesRes.voices);
    } catch {}
  };

  const refreshOnlineTtsInfo = async () => {
    try {
      const conn = await checkOnlineTTS();
      setOnlineTtsStatus(conn);
    } catch {}
  };

  const refreshPiperServiceStatus = async () => {
    setCheckingService(true);
    try {
      const st = await getPiperServiceStatus();
      setServiceStatus(st);
    } catch {}
    setCheckingService(false);
  };

  const refreshAnkiInfo = async () => {
    try {
      const conn = await checkAnki(form.anki.url);
      setAnkiStatus(conn);
      if (conn.connected) {
        const decksRes = await getAnkiDecks(form.anki.url);
        if (decksRes.success) setAnkiDecks(decksRes.decks);
      }
    } catch {}
  };

  // Test Custom AI Connection
  const handleTestCustomAi = async (customConfig: CustomAIProviderConfig) => {
    setTestingCustomAi(true);
    setCustomAiTestResult(null);
    try {
      const res = await checkCustomAI(customConfig);
      setCustomAiTestResult(res);
    } catch (err: any) {
      setCustomAiTestResult({ connected: false, message: err.message, error: err.message });
    }
    setTestingCustomAi(false);
  };

  // Fetch Custom AI Models from endpoint
  const handleFetchCustomAiModels = async (customConfig: CustomAIProviderConfig) => {
    setFetchingCustomAiModels(true);
    try {
      const res = await getCustomAIModels(customConfig);
      if (res.success && res.models.length > 0) {
        setCustomAiTestResult({
          connected: true,
          message: `Retrieved ${res.models.length} models from endpoint.`,
          models: res.models,
        });
      } else {
        setCustomAiTestResult({
          connected: false,
          message: res.error || 'No models returned from /models endpoint.',
        });
      }
    } catch (err: any) {
      setCustomAiTestResult({ connected: false, message: err.message });
    }
    setFetchingCustomAiModels(false);
  };

  // Test Custom TTS Audio Synthesis
  const handleTestCustomTts = async (customConfig: CustomTTSProviderConfig) => {
    setTestingCustomTts(true);
    setCustomTtsTestResult(null);
    try {
      const res = await testCustomTTS(customConfig);
      setCustomTtsTestResult(res);
    } catch (err: any) {
      setCustomTtsTestResult({ success: false, error: err.message });
    }
    setTestingCustomTts(false);
  };

  // Save Settings
  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      const updated = await saveConfig(form);
      onUpdateSettings(updated);
      setSaveStatus('✓ Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`✕ Error saving: ${err.message}`);
    }
  };

  // Sync Anki Note Model
  const handleSyncAnkiModel = async () => {
    setAnkiModelSyncMsg('Syncing HTML & CSS template with Anki...');
    try {
      const res = await ensureModelInAnki(form.anki.url, form.theme, form.defaultCard?.cardType || 'normal');
      if (res.success) {
        setAnkiModelSyncMsg(`✓ ${res.message}`);
      } else {
        setAnkiModelSyncMsg(`✕ Failed: ${res.error || res.message}`);
      }
    } catch (err: any) {
      setAnkiModelSyncMsg(`✕ Error: ${err.message}`);
    }
    setTimeout(() => setAnkiModelSyncMsg(null), 5000);
  };

  const activeCustomAiConfig =
    form.ai.customProviders?.find((p) => p.id === selectedCustomAiId) ||
    form.ai.customProviders?.[0] || {
      id: 'custom_1',
      name: 'Custom OpenAI-Compatible Provider',
      protocol: 'openai-compatible' as const,
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      authType: 'bearer' as const,
    };

  const activeCustomTtsConfig =
    form.tts.customProviders?.find((p) => p.id === selectedCustomTtsId) ||
    form.tts.customProviders?.[0] || {
      id: 'custom_tts_1',
      name: 'Custom OpenAI Speech TTS',
      protocol: 'openai-speech' as const,
      endpoint: 'https://api.openai.com/v1/audio/speech',
      apiKey: '',
      voice: 'alloy',
      model: 'tts-1',
      audioFormat: 'mp3' as const,
      authType: 'bearer' as const,
      httpMethod: 'POST' as const,
    };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 min-w-0">
      {/* Header with Save Button */}
      <div
        className={
          isMinimalLight
            ? 'bg-white p-4 sm:p-5 border border-slate-200 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-800'
            : isMinimalDark
            ? 'bg-[#27272A] p-4 sm:p-5 border border-zinc-700 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-zinc-100'
            : 'bg-[#FFD93D] p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-black'
        }
      >
        <div>
          <h1 className={isMinimal ? 'text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2' : 'text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-black flex items-center gap-2'}>
            <Sliders className="w-6 h-6" />
            <span>Settings & Configuration</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className={isMinimal ? 'text-xs font-semibold px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded border border-emerald-300 dark:border-emerald-800' : 'text-xs font-black px-3 py-1.5 bg-black text-[#4ADE80] border-2 border-black'}>
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className={
              isMinimal
                ? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-sm flex items-center gap-2 cursor-pointer transition-colors'
                : 'px-5 py-2.5 bg-[#FF4B4B] hover:bg-[#ff6161] text-white font-black text-sm uppercase border-4 border-black shadow-[4px_4px_0px_#000000] flex items-center gap-2 cursor-pointer active:translate-y-0.5'
            }
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={isMinimal ? 'flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-zinc-700 pb-2' : 'flex flex-wrap gap-2 border-b-4 border-black pb-2'}>
        {[
          { id: 'ai', label: 'AI Providers', icon: Cpu },
          { id: 'tts', label: 'TTS', icon: Volume2 },
          { id: 'dictionary', label: 'Dictionaries', icon: BookOpen },
          { id: 'smartImages', label: 'Smart Images', icon: ImageIcon },
          { id: 'defaultCard', label: 'Default Card', icon: CheckSquare },
          { id: 'appearance', label: 'Card Themes', icon: Palette },
          { id: 'anki', label: 'Anki', icon: Bookmark },
          { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
          { id: 'guide', label: 'Guide', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={
                isMinimal
                  ? `px-3 py-1.5 font-medium text-xs rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : isMinimalDark
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`
                  : `px-3.5 py-2 font-black text-xs uppercase border-4 border-black flex items-center gap-1.5 transition-transform cursor-pointer ${
                      isActive
                        ? 'bg-black text-[#FFD93D] shadow-[4px_4px_0px_0px_rgba(255,217,61,1)] -translate-y-0.5'
                        : 'bg-white hover:bg-zinc-100 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: AI PROVIDERS */}
      {activeSubTab === 'ai' && (
        <div className="space-y-6">
          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ollama Option */}
            <div
              onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'ollama' } })}
              className={
                isMinimal
                  ? `p-4 border rounded-lg cursor-pointer transition-all ${
                      form.ai.provider === 'ollama'
                        ? isMinimalDark
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                          : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                        : isMinimalDark
                        ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`
                  : `p-4 border-4 border-black cursor-pointer shadow-[4px_4px_0px_#000000] transition-all ${
                      form.ai.provider === 'ollama' ? 'bg-[#4ADE80] text-black font-black' : 'bg-white text-black'
                    }`
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className={isMinimal ? 'text-sm font-bold' : 'text-base font-black uppercase'}>Local Ollama</span>
                <input
                  type="radio"
                  name="ai_provider"
                  checked={form.ai.provider === 'ollama'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={isMinimal ? 'text-xs text-slate-500 dark:text-zinc-400' : 'text-xs font-bold opacity-90'}>
                100% offline AI running locally on your computer (e.g. qwen3:4b, llama3.2).
              </p>
            </div>

            {/* Gemini Option */}
            <div
              onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'gemini' } })}
              className={
                isMinimal
                  ? `p-4 border rounded-lg cursor-pointer transition-all ${
                      form.ai.provider === 'gemini'
                        ? isMinimalDark
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                          : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                        : isMinimalDark
                        ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`
                  : `p-4 border-4 border-black cursor-pointer shadow-[4px_4px_0px_#000000] transition-all ${
                      form.ai.provider === 'gemini' ? 'bg-[#38BDF8] text-black font-black' : 'bg-white text-black'
                    }`
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className={isMinimal ? 'text-sm font-bold' : 'text-base font-black uppercase'}>Google Gemini</span>
                <input
                  type="radio"
                  name="ai_provider"
                  checked={form.ai.provider === 'gemini'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={isMinimal ? 'text-xs text-slate-500 dark:text-zinc-400' : 'text-xs font-bold opacity-90'}>
                Fast, high-quality cloud AI (gemini-2.5-flash, gemini-1.5-pro).
              </p>
            </div>

            {/* Custom AI Option (9Router style) */}
            <div
              onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'custom' } })}
              className={
                isMinimal
                  ? `p-4 border rounded-lg cursor-pointer transition-all ${
                      form.ai.provider === 'custom' || (!['ollama', 'gemini'].includes(form.ai.provider))
                        ? isMinimalDark
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                          : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                        : isMinimalDark
                        ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`
                  : `p-4 border-4 border-black cursor-pointer shadow-[4px_4px_0px_#000000] transition-all ${
                      form.ai.provider === 'custom' || (!['ollama', 'gemini'].includes(form.ai.provider))
                        ? 'bg-[#C084FC] text-black font-black'
                        : 'bg-white text-black'
                    }`
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className={isMinimal ? 'text-sm font-bold' : 'text-base font-black uppercase'}>Custom AI / 9Router</span>
                <input
                  type="radio"
                  name="ai_provider"
                  checked={form.ai.provider === 'custom' || (!['ollama', 'gemini'].includes(form.ai.provider))}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={isMinimal ? 'text-xs text-slate-500 dark:text-zinc-400' : 'text-xs font-bold opacity-90'}>
                Connect ANY OpenAI-compatible endpoint, OpenRouter, Groq, DeepSeek, vLLM, or LMStudio.
              </p>
            </div>
          </div>

          {/* OLLAMA CONFIGURATION */}
          {form.ai.provider === 'ollama' && (
            <div
              className={
                isMinimalLight
                  ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800'
                  : isMinimalDark
                  ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-zinc-100'
                  : 'bg-white p-5 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-black'
              }
            >
              <div className={`flex items-center justify-between pb-2 ${isMinimal ? 'border-b border-slate-200 dark:border-zinc-700' : 'border-b-2 border-black'}`}>
                <h3 className={isMinimal ? 'font-bold text-sm uppercase' : 'font-black text-sm uppercase'}>Ollama Settings</h3>
                <button
                  type="button"
                  onClick={refreshOllamaInfo}
                  className={
                    isMinimal
                      ? 'px-3 py-1 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-medium text-xs rounded border border-slate-300 dark:border-zinc-700 flex items-center gap-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-750 transition-colors'
                      : 'px-2.5 py-1 bg-[#FFD93D] text-black font-black text-xs border-2 border-black flex items-center gap-1 cursor-pointer'
                  }
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                  <span>Refresh Models</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Ollama Base URL</label>
                  <input
                    type="text"
                    value={form.ai.ollama.url}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          ollama: { ...form.ai.ollama, url: e.target.value },
                          url: e.target.value,
                        },
                      })
                    }
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="http://127.0.0.1:11434"
                  />
                </div>

                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Model Name</label>
                  <select
                    value={form.ai.ollama.model}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          ollama: { ...form.ai.ollama, model: e.target.value },
                          model: e.target.value,
                        },
                      })
                    }
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black cursor-pointer'
                    }
                  >
                    {ollamaModels.length > 0 ? (
                      ollamaModels.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({Math.round(m.size / 1024 / 1024 / 1024)}GB)
                        </option>
                      ))
                    ) : (
                      <option value={form.ai.ollama.model}>{form.ai.ollama.model}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* GEMINI CONFIGURATION */}
          {form.ai.provider === 'gemini' && (
            <div
              className={
                isMinimalLight
                  ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800'
                  : isMinimalDark
                  ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-zinc-100'
                  : 'bg-white p-5 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-black'
              }
            >
              <h3 className={`pb-2 ${isMinimal ? 'font-bold text-sm uppercase border-b border-slate-200 dark:border-zinc-700' : 'font-black text-sm uppercase border-b-2 border-black'}`}>Gemini API Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Gemini API Key</label>
                  <input
                    type="password"
                    value={form.ai.gemini.apiKey}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, gemini: { ...form.ai.gemini, apiKey: e.target.value } },
                      })
                    }
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="AIzaSy..."
                  />
                </div>

                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Gemini Model</label>
                  <select
                    value={form.ai.gemini.model}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, gemini: { ...form.ai.gemini, model: e.target.value } },
                      })
                    }
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black cursor-pointer'
                    }
                  >
                    {geminiModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOM AI PROVIDER (9Router Style) */}
          {(form.ai.provider === 'custom' || (!['ollama', 'gemini'].includes(form.ai.provider))) && (
            <div
              className={
                isMinimalLight
                  ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800'
                  : isMinimalDark
                  ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-zinc-100'
                  : 'bg-white p-5 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-black'
              }
            >
              <div className={`flex items-center justify-between pb-2 ${isMinimal ? 'border-b border-slate-200 dark:border-zinc-700' : 'border-b-2 border-black'}`}>
                <h3 className={`flex items-center gap-2 ${isMinimal ? 'font-bold text-sm uppercase' : 'font-black text-sm uppercase'}`}>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Custom AI Provider Configuration</span>
                </h3>
              </div>

              {/* Provider Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Provider Name / Label</label>
                  <input
                    type="text"
                    value={activeCustomAiConfig.name}
                    onChange={(e) => {
                      const updated = (form.ai.customProviders || [activeCustomAiConfig]).map((p) =>
                        p.id === activeCustomAiConfig.id ? { ...p, name: e.target.value } : p
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="e.g. OpenRouter / DeepSeek V3"
                  />
                </div>

                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Protocol / Format</label>
                  <select
                    value={activeCustomAiConfig.protocol}
                    onChange={(e) => {
                      const updated = (form.ai.customProviders || [activeCustomAiConfig]).map((p) =>
                        p.id === activeCustomAiConfig.id ? { ...p, protocol: e.target.value as any } : p
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : 'w-full bg-zinc-50 text-black text-xs font-bold p-2.5 border-2 border-black cursor-pointer'
                    }
                  >
                    <option value="openai-compatible">OpenAI-Compatible (/chat/completions)</option>
                    <option value="gemini">Gemini Compatible</option>
                    <option value="ollama">Ollama Compatible</option>
                    <option value="custom-rest">Custom REST JSON</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>
                    API Endpoint / Base URL (e.g. https://openrouter.ai/api/v1 or https://api.groq.com/openai/v1)
                  </label>
                  <input
                    type="text"
                    value={activeCustomAiConfig.baseUrl}
                    onChange={(e) => {
                      const updated = (form.ai.customProviders || [activeCustomAiConfig]).map((p) =>
                        p.id === activeCustomAiConfig.id ? { ...p, baseUrl: e.target.value } : p
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="https://openrouter.ai/api/v1"
                  />
                </div>

                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>API Key / Token</label>
                  <div className="relative">
                    <input
                      type={showApiKeyCustomAi ? 'text' : 'password'}
                      value={activeCustomAiConfig.apiKey || ''}
                      onChange={(e) => {
                        const updated = (form.ai.customProviders || [activeCustomAiConfig]).map((p) =>
                          p.id === activeCustomAiConfig.id ? { ...p, apiKey: e.target.value } : p
                        );
                        setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                      }}
                      className={
                        isMinimalLight
                          ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9'
                          : isMinimalDark
                          ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9'
                          : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black pr-9'
                      }
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeyCustomAi(!showApiKeyCustomAi)}
                      className={`absolute right-2.5 top-2.5 cursor-pointer ${isMinimal ? 'text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200' : 'text-zinc-500 hover:text-black'}`}
                    >
                      {showApiKeyCustomAi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={isMinimal ? 'text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase' : 'text-xs font-black uppercase'}>Model Identifier</label>
                    <button
                      type="button"
                      onClick={() => handleFetchCustomAiModels(activeCustomAiConfig)}
                      disabled={fetchingCustomAiModels}
                      className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${fetchingCustomAiModels ? 'animate-spin' : ''}`} />
                      <span>Fetch /models</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={activeCustomAiConfig.model}
                    onChange={(e) => {
                      const updated = (form.ai.customProviders || [activeCustomAiConfig]).map((p) =>
                        p.id === activeCustomAiConfig.id ? { ...p, model: e.target.value } : p
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="e.g. deepseek/deepseek-chat, gpt-4o-mini, llama-3.3-70b-versatile"
                  />
                </div>
              </div>

              {/* Action: Test Custom AI Connection */}
              <div className={`pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isMinimal ? 'border-t border-slate-200 dark:border-zinc-700' : 'border-t-2 border-black'}`}>
                <button
                  type="button"
                  onClick={() => handleTestCustomAi(activeCustomAiConfig)}
                  disabled={testingCustomAi}
                  className={
                    isMinimal
                      ? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors'
                      : 'px-4 py-2 bg-[#FFD93D] hover:bg-[#ffe066] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer'
                  }
                >
                  {testingCustomAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Test Connection</span>
                </button>

                {customAiTestResult && (
                  <div
                    className={
                      isMinimal
                        ? `text-xs font-medium px-3 py-1.5 rounded border ${
                            customAiTestResult.connected
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          }`
                        : `text-xs font-bold px-3 py-1.5 border-2 border-black ${
                            customAiTestResult.connected ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                          }`
                    }
                  >
                    {customAiTestResult.message || customAiTestResult.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: TTS */}
      {activeSubTab === 'tts' && (
        <div className="space-y-6">
          {/* TTS Provider Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'piper' } })}
              className={
                isMinimal
                  ? `p-4 border rounded-lg cursor-pointer transition-all ${
                      form.tts.provider === 'piper'
                        ? isMinimalDark
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                          : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                        : isMinimalDark
                        ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`
                  : `p-4 border-4 border-black cursor-pointer shadow-[4px_4px_0px_#000000] ${
                      form.tts.provider === 'piper' ? 'bg-[#4ADE80] text-black font-black' : 'bg-white text-black'
                    }`
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className={isMinimal ? 'text-sm font-bold' : 'text-base font-black uppercase'}>Local Piper TTS</span>
                <input
                  type="radio"
                  name="tts_provider"
                  checked={form.tts.provider === 'piper'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={isMinimal ? 'text-xs text-slate-500 dark:text-zinc-400' : 'text-xs font-bold opacity-90'}>Fast offline neural speech with American & British voices.</p>
            </div>

            <div
              onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'online' } })}
              className={
                isMinimal
                  ? `p-4 border rounded-lg cursor-pointer transition-all ${
                      form.tts.provider === 'online'
                        ? isMinimalDark
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                          : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                        : isMinimalDark
                        ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`
                  : `p-4 border-4 border-black cursor-pointer shadow-[4px_4px_0px_#000000] ${
                      form.tts.provider === 'online' ? 'bg-[#38BDF8] text-black font-black' : 'bg-white text-black'
                    }`
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className={isMinimal ? 'text-sm font-bold' : 'text-base font-black uppercase'}>Online TTS</span>
                <input
                  type="radio"
                  name="tts_provider"
                  checked={form.tts.provider === 'online'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={isMinimal ? 'text-xs text-slate-500 dark:text-zinc-400' : 'text-xs font-bold opacity-90'}>Cloud TTS with zero local Piper setup required.</p>
            </div>

            <div
              onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'custom' } })}
              className={
                isMinimal
                  ? `p-4 border rounded-lg cursor-pointer transition-all ${
                      form.tts.provider === 'custom' || (!['piper', 'online'].includes(form.tts.provider))
                        ? isMinimalDark
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                          : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                        : isMinimalDark
                        ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`
                  : `p-4 border-4 border-black cursor-pointer shadow-[4px_4px_0px_#000000] ${
                      form.tts.provider === 'custom' || (!['piper', 'online'].includes(form.tts.provider))
                        ? 'bg-[#C084FC] text-black font-black'
                        : 'bg-white text-black'
                    }`
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className={isMinimal ? 'text-sm font-bold' : 'text-base font-black uppercase'}>Custom TTS Provider</span>
                <input
                  type="radio"
                  name="tts_provider"
                  checked={form.tts.provider === 'custom' || (!['piper', 'online'].includes(form.tts.provider))}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={isMinimal ? 'text-xs text-slate-500 dark:text-zinc-400' : 'text-xs font-bold opacity-90'}>OpenAI Speech, ElevenLabs, or Custom Audio Endpoint.</p>
            </div>
          </div>

          {/* NUMERIC SLOW SPEED / LENGTH SCALE CONFIGURATION */}
          <div
            className={
              isMinimalLight
                ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800'
                : isMinimalDark
                ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-zinc-100'
                : 'bg-white p-5 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-black'
            }
          >
            <h3 className={`pb-2 flex items-center gap-2 ${isMinimal ? 'font-bold text-sm uppercase border-b border-slate-200 dark:border-zinc-700' : 'font-black text-sm uppercase border-b-2 border-black'}`}>
              <Volume2 className="w-4 h-4" />
              <span>Slow Audio Speed Factor / Length Scale</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>
                  Slowdown Factor (Length Scale: {form.tts.slowSpeed}x)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1.05"
                    max="1.80"
                    step="0.05"
                    value={form.tts.slowSpeed}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tts: { ...form.tts, slowSpeed: parseFloat(e.target.value) },
                      })
                    }
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1.05"
                    max="2.00"
                    step="0.05"
                    value={form.tts.slowSpeed}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tts: { ...form.tts, slowSpeed: parseFloat(e.target.value) || 1.25 },
                      })
                    }
                    className={
                      isMinimalLight
                        ? 'w-20 bg-white text-slate-900 text-xs font-mono font-medium p-2 border border-slate-300 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-20 bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2 border border-zinc-700 rounded-md text-center focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-20 bg-zinc-50 text-black text-xs font-mono font-bold p-2 border-2 border-black text-center'
                    }
                  />
                </div>
              </div>

              <div className={isMinimal ? 'bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-md border border-slate-200 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-400' : 'bg-zinc-50 p-3 border-2 border-black text-xs text-zinc-700 font-bold'}>
                💡 Higher value (e.g. 1.25 – 1.40) produces genuinely slower, clearer audio pronunciation for learning.
              </div>
            </div>
          </div>

          {/* CUSTOM TTS CONFIGURATION */}
          {(form.tts.provider === 'custom' || (!['piper', 'online'].includes(form.tts.provider))) && (
            <div
              className={
                isMinimalLight
                  ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800'
                  : isMinimalDark
                  ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-zinc-100'
                  : 'bg-white p-5 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-black'
              }
            >
              <div className={`flex items-center justify-between pb-2 ${isMinimal ? 'border-b border-slate-200 dark:border-zinc-700' : 'border-b-2 border-black'}`}>
                <h3 className={isMinimal ? 'font-bold text-sm uppercase' : 'font-black text-sm uppercase'}>Custom TTS Provider Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Provider Name</label>
                  <input
                    type="text"
                    value={activeCustomTtsConfig.name}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || [activeCustomTtsConfig]).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, name: e.target.value } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="e.g. OpenAI Speech TTS"
                  />
                </div>

                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Protocol / Format</label>
                  <select
                    value={activeCustomTtsConfig.protocol}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || [activeCustomTtsConfig]).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, protocol: e.target.value as any } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                        : 'w-full bg-zinc-50 text-black text-xs font-bold p-2.5 border-2 border-black cursor-pointer'
                    }
                  >
                    <option value="openai-speech">OpenAI Speech (/v1/audio/speech)</option>
                    <option value="elevenlabs">ElevenLabs TTS</option>
                    <option value="google-translate">Google Translate Web TTS</option>
                    <option value="piper-http">Piper HTTP Daemon</option>
                    <option value="custom-http">Custom REST POST/GET</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Endpoint URL</label>
                  <input
                    type="text"
                    value={activeCustomTtsConfig.endpoint}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || [activeCustomTtsConfig]).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, endpoint: e.target.value } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="https://api.openai.com/v1/audio/speech"
                  />
                </div>

                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKeyCustomTts ? 'text' : 'password'}
                      value={activeCustomTtsConfig.apiKey || ''}
                      onChange={(e) => {
                        const updated = (form.tts.customProviders || [activeCustomTtsConfig]).map((p) =>
                          p.id === activeCustomTtsConfig.id ? { ...p, apiKey: e.target.value } : p
                        );
                        setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                      }}
                      className={
                        isMinimalLight
                          ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9'
                          : isMinimalDark
                          ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 pr-9'
                          : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black pr-9'
                      }
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeyCustomTts(!showApiKeyCustomTts)}
                      className={`absolute right-2.5 top-2.5 cursor-pointer ${isMinimal ? 'text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200' : 'text-zinc-500 hover:text-black'}`}
                    >
                      {showApiKeyCustomTts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Voice Identifier</label>
                  <input
                    type="text"
                    value={activeCustomTtsConfig.voice}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || [activeCustomTtsConfig]).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, voice: e.target.value } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    className={
                      isMinimalLight
                        ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : isMinimalDark
                        ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                        : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black'
                    }
                    placeholder="alloy, nova, echo, rachel..."
                  />
                </div>
              </div>

              {/* TEST VOICE BUTTON */}
              <div className={`pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isMinimal ? 'border-t border-slate-200 dark:border-zinc-700' : 'border-t-2 border-black'}`}>
                <button
                  type="button"
                  onClick={() => handleTestCustomTts(activeCustomTtsConfig)}
                  disabled={testingCustomTts}
                  className={
                    isMinimal
                      ? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors'
                      : 'px-4 py-2 bg-[#FFD93D] hover:bg-[#ffe066] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer'
                  }
                >
                  {testingCustomTts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Test Voice</span>
                </button>

                {customTtsTestResult && customTtsTestResult.normalAudioBase64 && (
                  <div className={isMinimal ? 'flex items-center gap-3 bg-slate-50 dark:bg-zinc-800 p-2 rounded-md border border-slate-200 dark:border-zinc-700' : 'flex items-center gap-3 bg-zinc-100 p-2 border-2 border-black'}>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Audio Generated:</span>
                    <AudioPlayer base64={customTtsTestResult.normalAudioBase64} label="Normal" />
                    {customTtsTestResult.slowAudioBase64 && (
                      <AudioPlayer base64={customTtsTestResult.slowAudioBase64} label="Slow" />
                    )}
                  </div>
                )}
                {customTtsTestResult && customTtsTestResult.error && (
                  <div className={isMinimal ? 'text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-800' : 'text-xs font-bold text-red-600 bg-red-50 p-2 border-2 border-black'}>
                    ✕ {customTtsTestResult.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: DICTIONARIES */}
      {activeSubTab === 'dictionary' && (
        <div
          className={
            isMinimalLight
              ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm space-y-5 text-slate-800'
              : isMinimalDark
              ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm space-y-5 text-zinc-100'
              : 'bg-white p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-5 text-black'
          }
        >
          <div className={`pb-2 ${isMinimal ? 'border-b border-slate-200 dark:border-zinc-700' : 'border-b-2 border-black'}`}>
            <h3 className={`flex items-center gap-2 ${isMinimal ? 'font-bold text-sm uppercase' : 'font-black text-base uppercase'}`}>
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Multi-Source Dictionary Configuration</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isMinimal ? 'p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-md border border-slate-200 dark:border-zinc-700' : 'p-3.5 bg-zinc-50 border-2 border-black'}>
              <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Persian Meaning Source</label>
              <select
                value={form.dictionary.meaningFaSource}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dictionary: { ...form.dictionary, meaningFaSource: e.target.value as any },
                  })
                }
                className={
                  isMinimalLight
                    ? 'w-full bg-white text-slate-900 text-xs font-medium p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                    : isMinimalDark
                    ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                    : 'w-full bg-white text-black text-xs font-bold p-2 border-2 border-black cursor-pointer'
                }
              >
                <option value="ai">AI Provider (Configured AI Provider)</option>
                <option value="abadis">Abadis Persian Dictionary (دیکشنری آبادیس)</option>
                <option value="freedict">Free Dictionary API</option>
              </select>
            </div>

            <div className={isMinimal ? 'p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-md border border-slate-200 dark:border-zinc-700' : 'p-3.5 bg-zinc-50 border-2 border-black'}>
              <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>English Definition / IPA Source</label>
              <select
                value={form.dictionary.definitionEnSource}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dictionary: { ...form.dictionary, definitionEnSource: e.target.value as any },
                  })
                }
                className={
                  isMinimalLight
                    ? 'w-full bg-white text-slate-900 text-xs font-medium p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                    : isMinimalDark
                    ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                    : 'w-full bg-white text-black text-xs font-bold p-2 border-2 border-black cursor-pointer'
                }
              >
                <option value="ai">AI Provider</option>
                <option value="freedict">Free Dictionary API</option>
                <option value="wiktionary">Wiktionary API</option>
              </select>
            </div>
          </div>

          {/* Interactive Dictionary Live Test */}
          <div className={isMinimal ? 'p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-md border border-slate-200 dark:border-zinc-700 space-y-3' : 'p-4 bg-blue-50 border-2 border-black space-y-3'}>
            <span className={isMinimal ? 'text-xs font-semibold uppercase text-slate-700 dark:text-zinc-300 block' : 'text-xs font-black uppercase text-blue-900 block'}>
              Live Dictionary Source Test (Abadis & Free Dictionary)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={dictTestWord}
                onChange={(e) => setDictTestWord(e.target.value)}
                className={
                  isMinimalLight
                    ? 'bg-white text-slate-900 text-xs font-medium p-2 border border-slate-300 rounded-md w-40 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    : isMinimalDark
                    ? 'bg-zinc-800 text-zinc-100 text-xs font-medium p-2 border border-zinc-700 rounded-md w-40 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    : 'bg-white text-black text-xs font-bold p-2 border-2 border-black w-40'
                }
                placeholder="e.g. apple, bank"
              />
              <button
                type="button"
                onClick={async () => {
                  setTestingDict(true);
                  const res = await lookupAbadisDict(dictTestWord);
                  setDictTestResult(res);
                  setTestingDict(false);
                }}
                disabled={testingDict}
                className={
                  isMinimal
                    ? 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm cursor-pointer transition-colors'
                    : 'px-3 py-1.5 bg-[#FFD93D] text-black font-black text-xs uppercase border-2 border-black cursor-pointer'
                }
              >
                Test Abadis
              </button>
              <button
                type="button"
                onClick={async () => {
                  setTestingDict(true);
                  const res = await lookupFreeDict(dictTestWord);
                  setDictTestResult(res);
                  setTestingDict(false);
                }}
                disabled={testingDict}
                className={
                  isMinimal
                    ? 'px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 font-medium text-xs rounded-md border border-slate-300 dark:border-zinc-700 cursor-pointer transition-colors'
                    : 'px-3 py-1.5 bg-white text-black font-black text-xs uppercase border-2 border-black cursor-pointer'
                }
              >
                Test FreeDict
              </button>
            </div>
            {dictTestResult && (
              <pre className={isMinimal ? 'p-2.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 text-[11px] font-mono rounded border border-slate-200 dark:border-zinc-700 overflow-x-auto max-h-40' : 'p-2.5 bg-white text-black text-[11px] font-mono border-2 border-black overflow-x-auto max-h-40'}>
                {JSON.stringify(dictTestResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: SMART IMAGES */}
      {activeSubTab === 'smartImages' && (
        <div
          className={
            isMinimalLight
              ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm space-y-5 text-slate-800'
              : isMinimalDark
              ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm space-y-5 text-zinc-100'
              : 'bg-white p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-5 text-black'
          }
        >
          <div className={`pb-2 ${isMinimal ? 'border-b border-slate-200 dark:border-zinc-700' : 'border-b-2 border-black'}`}>
            <h3 className={`flex items-center gap-2 ${isMinimal ? 'font-bold text-sm uppercase' : 'font-black text-base uppercase'}`}>
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Smart Images Configuration</span>
            </h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.smartImages.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    smartImages: { ...form.smartImages, enabled: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-blue-600"
              />
              <span className={isMinimal ? 'text-xs font-semibold' : 'text-xs font-black uppercase'}>
                Automatically decide whether an image is useful for each vocabulary word
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Image Decision Provider</label>
                <select
                  value={form.smartImages.decisionProvider || 'heuristic'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smartImages: { ...form.smartImages, decisionProvider: e.target.value },
                    })
                  }
                  className={
                    isMinimalLight
                      ? 'w-full bg-white text-slate-900 text-xs font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                      : isMinimalDark
                      ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                      : 'w-full bg-zinc-50 text-black text-xs font-bold p-2.5 border-2 border-black cursor-pointer'
                  }
                >
                  <option value="heuristic">Smart Concrete/Abstract Heuristic (Fast & Reliable)</option>
                  <option value="ollama">Ollama AI Decision</option>
                  <option value="gemini">Gemini AI Decision</option>
                  <option value="custom">Custom AI Decision</option>
                </select>
              </div>

              <div>
                <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Image Search Provider</label>
                <select
                  value={form.smartImages.searchProvider || 'wikimedia'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      smartImages: { ...form.smartImages, searchProvider: e.target.value as any },
                    })
                  }
                  className={
                    isMinimalLight
                      ? 'w-full bg-white text-slate-900 text-xs font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                      : isMinimalDark
                      ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer'
                      : 'w-full bg-zinc-50 text-black text-xs font-bold p-2.5 border-2 border-black cursor-pointer'
                  }
                >
                  <option value="wikimedia">Wikimedia Commons / Wikipedia (Public Domain / CC)</option>
                  <option value="google">Google Image Search API</option>
                  <option value="custom">Custom Image Search API</option>
                </select>
              </div>
            </div>

            {/* Live Image Test */}
            <div className={isMinimal ? 'p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-md border border-slate-200 dark:border-zinc-700 space-y-3' : 'p-4 bg-emerald-50 border-2 border-black space-y-3'}>
              <span className={isMinimal ? 'text-xs font-semibold uppercase text-slate-700 dark:text-zinc-300 block' : 'text-xs font-black uppercase text-emerald-900 block'}>
                Test Smart Image Decision & Retrieval
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imgTestWord}
                  onChange={(e) => setImgTestWord(e.target.value)}
                  className={
                    isMinimalLight
                      ? 'bg-white text-slate-900 text-xs font-medium p-2 border border-slate-300 rounded-md w-44 focus:outline-none focus:ring-1 focus:ring-blue-500'
                      : isMinimalDark
                      ? 'bg-zinc-800 text-zinc-100 text-xs font-medium p-2 border border-zinc-700 rounded-md w-44 focus:outline-none focus:ring-1 focus:ring-blue-500'
                      : 'bg-white text-black text-xs font-bold p-2 border-2 border-black w-44'
                  }
                  placeholder="e.g. eraser, apple, abandon"
                />
                <button
                  type="button"
                  onClick={async () => {
                    setTestingImg(true);
                    const res = await testSmartImage(imgTestWord);
                    setImgTestResult(res);
                    setTestingImg(false);
                  }}
                  disabled={testingImg}
                  className={
                    isMinimal
                      ? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm cursor-pointer flex items-center gap-1.5 transition-colors'
                      : 'px-4 py-2 bg-[#FFD93D] text-black font-black text-xs uppercase border-2 border-black cursor-pointer flex items-center gap-1.5'
                  }
                >
                  {testingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Evaluate Word</span>
                </button>
              </div>

              {imgTestResult && (
                <div className={isMinimal ? 'bg-white dark:bg-zinc-900 p-3 rounded-md border border-slate-200 dark:border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center gap-4' : 'bg-white p-3 border-2 border-black flex flex-col sm:flex-row items-start sm:items-center gap-4'}>
                  {imgTestResult.imageBase64 && (
                    <img
                      src={`data:image/jpeg;base64,${imgTestResult.imageBase64}`}
                      alt="Preview"
                      className={isMinimal ? 'w-24 h-24 object-cover rounded border border-slate-300 dark:border-zinc-700' : 'w-24 h-24 object-cover border-2 border-black'}
                    />
                  )}
                  <div className="text-xs">
                    <div className={isMinimal ? 'font-semibold text-slate-900 dark:text-zinc-100' : 'font-black text-black'}>
                      Needs Image: {imgTestResult.needsImage ? '✓ YES (Concrete)' : '✕ NO (Abstract/Verb)'}
                    </div>
                    <div className="text-slate-500 dark:text-zinc-400 mt-1">{imgTestResult.reason}</div>
                    {imgTestResult.imageFileName && (
                      <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 mt-1">
                        Saved as: {imgTestResult.imageFileName}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: DEFAULT CARD */}
      {activeSubTab === 'defaultCard' && (
        <div
          className={
            isMinimalLight
              ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm space-y-5 text-slate-800'
              : isMinimalDark
              ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm space-y-5 text-zinc-100'
              : 'bg-white p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-5 text-black'
          }
        >
          <div className={`pb-2 ${isMinimal ? 'border-b border-slate-200 dark:border-zinc-700' : 'border-b-2 border-black'}`}>
            <h3 className={`flex items-center gap-2 ${isMinimal ? 'font-bold text-sm uppercase' : 'font-black text-base uppercase'}`}>
              <CheckSquare className="w-4 h-4" />
              <span>Default Card & Audio Selection Settings</span>
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Default Flashcard Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={isMinimal ? 'flex items-center gap-2 p-3 border rounded-md bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 cursor-pointer' : 'flex items-center gap-2 p-3 border-2 border-black bg-zinc-50 cursor-pointer'}>
                  <input
                    type="radio"
                    name="card_type"
                    checked={form.defaultCard.cardType === 'normal'}
                    onChange={() =>
                      setForm({
                        ...form,
                        defaultCard: { ...form.defaultCard, cardType: 'normal' },
                      })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className={isMinimal ? 'text-xs font-semibold' : 'text-xs font-black uppercase'}>Normal Vocabulary Card</span>
                </label>
                <label className={isMinimal ? 'flex items-center gap-2 p-3 border rounded-md bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 cursor-pointer' : 'flex items-center gap-2 p-3 border-2 border-black bg-zinc-50 cursor-pointer'}>
                  <input
                    type="radio"
                    name="card_type"
                    checked={form.defaultCard.cardType === 'spelling'}
                    onChange={() =>
                      setForm({
                        ...form,
                        defaultCard: { ...form.defaultCard, cardType: 'spelling' },
                      })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className={isMinimal ? 'text-xs font-semibold' : 'text-xs font-black uppercase'}>Interactive Spelling Challenge</span>
                </label>
              </div>
            </div>

            <div className={`pt-3 ${isMinimal ? 'border-t border-slate-200 dark:border-zinc-700' : 'border-t-2 border-black'}`}>
              <span className={isMinimal ? 'text-xs font-semibold uppercase text-slate-700 dark:text-zinc-300 block mb-2' : 'text-xs font-black uppercase block mb-2'}>
                Audio Generation Checkboxes (Only selected files are generated)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tts.generateAmericanNormal}
                    onChange={(e) =>
                      setForm({ ...form, tts: { ...form.tts, generateAmericanNormal: e.target.checked } })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-medium">🇺🇸 American Normal</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tts.generateAmericanSlow}
                    onChange={(e) =>
                      setForm({ ...form, tts: { ...form.tts, generateAmericanSlow: e.target.checked } })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-medium">🇺🇸 American Slow</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tts.generateBritishNormal}
                    onChange={(e) =>
                      setForm({ ...form, tts: { ...form.tts, generateBritishNormal: e.target.checked } })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-medium">🇬🇧 British Normal</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tts.generateBritishSlow}
                    onChange={(e) =>
                      setForm({ ...form, tts: { ...form.tts, generateBritishSlow: e.target.checked } })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-medium">🇬🇧 British Slow</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tts.generateExampleUs}
                    onChange={(e) =>
                      setForm({ ...form, tts: { ...form.tts, generateExampleUs: e.target.checked } })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-medium">🇺🇸 Sentence Audio</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tts.generateExampleUk}
                    onChange={(e) =>
                      setForm({ ...form, tts: { ...form.tts, generateExampleUk: e.target.checked } })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs font-medium">🇬🇧 UK Sentence</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: CARD THEMES */}
      {activeSubTab === 'appearance' && (
        <div className="space-y-6">
          {/* 1. APPLICATION UI THEME SELECTOR */}
          <div
            className={
              isMinimalLight
                ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm text-slate-800'
                : isMinimalDark
                ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm text-zinc-100'
                : 'bg-white p-5 border-4 border-black shadow-[6px_6px_0px_#000000] text-black'
            }
          >
            <h3 className={isMinimal ? 'font-bold text-sm uppercase mb-3 flex items-center gap-2' : 'font-black text-sm uppercase mb-3 flex items-center gap-2'}>
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>Application Theme</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Comic */}
              <button
                type="button"
                onClick={() => setForm({ ...form, appTheme: 'comic' })}
                className={
                  isMinimal
                    ? `p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                        (form.appTheme || 'comic') === 'comic'
                          ? 'bg-blue-50 text-blue-950 border-blue-600 font-semibold shadow-xs'
                          : isMinimalDark
                          ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`
                    : `p-3.5 border-2 text-left cursor-pointer transition-all ${
                        (form.appTheme || 'comic') === 'comic'
                          ? 'bg-[#FFD93D] text-black border-black font-black shadow-[3px_3px_0px_#000000]'
                          : 'bg-white text-black border-zinc-300 hover:bg-zinc-50'
                      }`
                }
              >
                <div className="flex items-center justify-between">
                  <span className={isMinimal ? 'text-xs font-bold' : 'text-xs font-black'}>Comic</span>
                  {(form.appTheme || 'comic') === 'comic' && (
                    <span className={isMinimal ? 'text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded' : 'text-[10px] font-black bg-black text-[#FFD93D] px-1.5 py-0.5'}>ACTIVE</span>
                  )}
                </div>
                <div className={isMinimal ? 'text-[11px] text-slate-500 dark:text-zinc-400 mt-1' : 'text-[11px] opacity-80 mt-1'}>Colorful comic styling with bold outlines.</div>
              </button>

              {/* Option 2: Minimal Light */}
              <button
                type="button"
                onClick={() => setForm({ ...form, appTheme: 'minimal-light' })}
                className={
                  isMinimal
                    ? `p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                        form.appTheme === 'minimal-light'
                          ? 'bg-blue-50 text-blue-950 border-blue-600 font-semibold shadow-xs dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-200'
                          : isMinimalDark
                          ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`
                    : `p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                        form.appTheme === 'minimal-light'
                          ? 'bg-blue-50 text-blue-950 border-blue-600 font-semibold shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`
                }
              >
                <div className="flex items-center justify-between">
                  <span className={isMinimal ? 'text-xs font-bold' : 'text-xs font-bold'}>Minimal Light</span>
                  {form.appTheme === 'minimal-light' && (
                    <span className={isMinimal ? 'text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded' : 'text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded'}>ACTIVE</span>
                  )}
                </div>
                <div className={isMinimal ? 'text-[11px] text-slate-500 dark:text-zinc-400 mt-1' : 'text-[11px] text-slate-500 mt-1'}>Clean light interface with restrained styling.</div>
              </button>

              {/* Option 3: Minimal Dark */}
              <button
                type="button"
                onClick={() => setForm({ ...form, appTheme: 'minimal-dark' })}
                className={
                  isMinimal
                    ? `p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                        form.appTheme === 'minimal-dark'
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                          : isMinimalDark
                          ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`
                    : `p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                        form.appTheme === 'minimal-dark'
                          ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`
                }
              >
                <div className="flex items-center justify-between">
                  <span className={isMinimal ? 'text-xs font-bold' : 'text-xs font-bold'}>Minimal Dark</span>
                  {form.appTheme === 'minimal-dark' && (
                    <span className={isMinimal ? 'text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded' : 'text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded'}>ACTIVE</span>
                  )}
                </div>
                <div className={isMinimal ? 'text-[11px] text-slate-400 dark:text-zinc-400 mt-1' : 'text-[11px] text-zinc-400 mt-1'}>Clean dark interface with restrained colors.</div>
              </button>
            </div>
          </div>

          {/* 2. FLASHCARD NOTE THEMES */}
          <div
            className={
              isMinimalLight
                ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm text-slate-800'
                : isMinimalDark
                ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm text-zinc-100'
                : 'bg-white p-5 border-4 border-black shadow-[6px_6px_0px_#000000] text-black'
            }
          >
            <h3 className={isMinimal ? 'font-bold text-sm uppercase mb-4 flex items-center gap-2' : 'font-black text-sm uppercase mb-4 flex items-center gap-2'}>
              <Palette className="w-4 h-4 text-blue-500" />
              <span>Card Themes</span>
            </h3>

            {/* Light Themes */}
            <div className="mb-5">
              <div className={isMinimal ? 'text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2' : 'text-xs font-black uppercase text-amber-800 bg-[#FEF9C3] px-3 py-1 border-2 border-black inline-block mb-3'}>
                Light Themes
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {THEME_GROUPS.light.map((th) => {
                  const isSelected = form.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setForm({ ...form, theme: th.id as ThemeId })}
                      className={
                        isMinimal
                          ? `p-3 border rounded-md text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 text-blue-950 border-blue-600 font-semibold shadow-xs dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-200'
                                : isMinimalDark
                                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`
                          : `p-3 border-3 border-black text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#FFD93D] text-black shadow-[4px_4px_0px_#000000] -translate-y-0.5'
                                : 'bg-white hover:bg-zinc-50 text-black shadow-[2px_2px_0px_#000000]'
                            }`
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className={isMinimal ? 'text-xs font-bold' : 'text-xs font-black'}>{th.name}</div>
                        {isSelected && <span className={isMinimal ? 'text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded' : 'text-[10px] font-black bg-black text-[#FFD93D] px-1.5 py-0.5'}>ACTIVE</span>}
                      </div>
                      <div className={isMinimal ? 'text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2' : 'text-[11px] text-zinc-600 font-bold mt-1 line-clamp-2'}>{th.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark Themes */}
            <div>
              <div className={isMinimal ? 'text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2' : 'text-xs font-black uppercase text-cyan-400 bg-black px-3 py-1 border-2 border-black inline-block mb-3'}>
                Dark Themes
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {THEME_GROUPS.dark.map((th) => {
                  const isSelected = form.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setForm({ ...form, theme: th.id as ThemeId })}
                      className={
                        isMinimal
                          ? `p-3 border rounded-md text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 text-blue-950 border-blue-600 font-semibold shadow-xs dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-200'
                                : isMinimalDark
                                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`
                          : `p-3 border-3 border-black text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-black text-[#38BDF8] shadow-[4px_4px_0px_#38BDF8] -translate-y-0.5'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-[2px_2px_0px_#000000]'
                            }`
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className={isMinimal ? 'text-xs font-bold' : 'text-xs font-black'}>{th.name}</div>
                        {isSelected && <span className={isMinimal ? 'text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded' : 'text-[10px] font-black bg-[#38BDF8] text-black px-1.5 py-0.5'}>ACTIVE</span>}
                      </div>
                      <div className={isMinimal ? 'text-[11px] text-slate-400 dark:text-zinc-400 mt-1 line-clamp-2' : 'text-[11px] text-zinc-400 font-bold mt-1 line-clamp-2'}>{th.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Card Preview */}
          <div
            className={
              isMinimalLight
                ? 'bg-slate-50 p-4 sm:p-6 border border-slate-200 rounded-lg shadow-sm'
                : isMinimalDark
                ? 'bg-[#1F1F23] p-4 sm:p-6 border border-zinc-700 rounded-lg shadow-sm'
                : 'bg-[#F5F2EB] p-4 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000000]'
            }
          >
            <CardPreview
              cardData={{
                word: 'abandon',
                phonetic: '/əˈbændən/',
                partOfSpeech: 'verb',
                meaningFa: 'ترک کردن، رها کردن',
                example: 'He had to abandon his car in the heavy snowstorm.',
                translationFa: 'او مجبور شد ماشین خود را در کولاک شدید رها کند.',
                mnemonic: 'A-BAND-ON: The band put their instruments on the ground and abandoned the concert.',
                cardType: form.defaultCard.cardType,
                spellingSentence: 'He had to ______ his car in the heavy snowstorm.',
              }}
              themeId={form.theme}
              appTheme={form.appTheme || appTheme}
            />
          </div>
        </div>
      )}

      {/* SUBTAB 7: ANKI */}
      {activeSubTab === 'anki' && (
        <div
          className={
            isMinimalLight
              ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800'
              : isMinimalDark
              ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-zinc-100'
              : 'bg-white p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-black'
          }
        >
          <h3 className={`pb-2 ${isMinimal ? 'font-bold text-sm uppercase border-b border-slate-200 dark:border-zinc-700' : 'font-black text-sm uppercase border-b-2 border-black'}`}>AnkiConnect Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>AnkiConnect URL</label>
              <input
                type="text"
                value={form.anki.url || 'http://127.0.0.1:8765'}
                onChange={(e) => setForm({ ...form, anki: { ...form.anki, url: e.target.value } })}
                className={
                  isMinimalLight
                    ? 'w-full bg-white text-slate-900 text-xs font-mono font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                    : isMinimalDark
                    ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-mono font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                    : 'w-full bg-zinc-50 text-black text-xs font-mono font-bold p-2.5 border-2 border-black'
                }
                placeholder="http://127.0.0.1:8765"
              />
            </div>

            <div>
              <label className={isMinimal ? 'block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase mb-1' : 'block text-xs font-black uppercase mb-1'}>Default Target Deck</label>
              <input
                type="text"
                value={form.anki.defaultDeck || 'English::B1'}
                onChange={(e) => setForm({ ...form, anki: { ...form.anki, defaultDeck: e.target.value } })}
                className={
                  isMinimalLight
                    ? 'w-full bg-white text-slate-900 text-xs font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                    : isMinimalDark
                    ? 'w-full bg-zinc-800 text-zinc-100 text-xs font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
                    : 'w-full bg-zinc-50 text-black text-xs font-bold p-2.5 border-2 border-black'
                }
                placeholder="English::B1"
              />
            </div>
          </div>

          <div className={`pt-3 flex items-center gap-3 ${isMinimal ? 'border-t border-slate-200 dark:border-zinc-700' : 'border-t-2 border-black'}`}>
            <button
              type="button"
              onClick={handleSyncAnkiModel}
              className={
                isMinimal
                  ? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors'
                  : 'px-4 py-2 bg-[#FFD93D] hover:bg-[#ffe066] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 cursor-pointer'
              }
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Note Model & Templates with Anki</span>
            </button>
            {ankiModelSyncMsg && <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{ankiModelSyncMsg}</span>}
          </div>
        </div>
      )}

      {/* SUBTAB 8: DIAGNOSTICS */}
      {activeSubTab === 'diagnostics' && (
        <div
          className={
            isMinimalLight
              ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-slate-800'
              : isMinimalDark
              ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-zinc-100'
              : 'bg-white p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-black'
          }
        >
          <div className={`flex items-center justify-between pb-2 ${isMinimal ? 'border-b border-slate-200 dark:border-zinc-700' : 'border-b-2 border-black'}`}>
            <h3 className={isMinimal ? 'font-bold text-sm uppercase' : 'font-black text-sm uppercase'}>Diagnostics</h3>
            <button
              type="button"
              onClick={async () => {
                setRunningDiag(true);
                const rep = await runFullDiagnostics();
                setFullReport(rep);
                setRunningDiag(false);
              }}
              disabled={runningDiag}
              className={
                isMinimal
                  ? 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-sm cursor-pointer flex items-center gap-1.5 transition-colors'
                  : 'px-3 py-1.5 bg-[#FFD93D] text-black font-black text-xs uppercase border-2 border-black cursor-pointer flex items-center gap-1.5'
              }
            >
              {runningDiag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Run Diagnostic Test</span>
            </button>
          </div>

          {fullReport && (
            <pre className={isMinimal ? 'p-3 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 text-xs font-mono rounded border border-slate-200 dark:border-zinc-700 overflow-x-auto max-h-72' : 'p-3 bg-zinc-50 text-black text-xs font-mono border-2 border-black overflow-x-auto max-h-72'}>
              {JSON.stringify(fullReport, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* SUBTAB 9: GUIDE */}
      {activeSubTab === 'guide' && (
        <div
          className={
            isMinimalLight
              ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm space-y-4 text-xs font-medium leading-relaxed text-slate-700'
              : isMinimalDark
              ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm space-y-4 text-xs font-medium leading-relaxed text-zinc-300'
              : 'bg-white p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_#000000] space-y-4 text-xs font-bold leading-relaxed text-black'
          }
        >
          <h3 className={`pb-2 ${isMinimal ? 'font-bold text-sm uppercase text-slate-900 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-700' : 'font-black text-sm uppercase border-b-2 border-black'}`}>User Guide</h3>
          <p>
            • <strong>AI Providers:</strong> Use local Ollama for complete privacy, Google Gemini for cloud speed, or add any custom OpenAI-compatible endpoint (OpenRouter, Groq, DeepSeek).
          </p>
          <p>
            • <strong>TTS:</strong> Piper runs offline with American & British voices. Adjust the Slowdown factor to generate genuinely slower pronunciations. Test audio using the generic pronunciation test sentence.
          </p>
          <p>
            • <strong>Smart Images:</strong> Concrete physical objects automatically receive high-quality illustrations from Wikimedia Commons/Google, while abstract concepts remain clean.
          </p>
          <p>
            • <strong>Anki:</strong> The exact HTML & CSS is directly synchronized to the Anki note model, ensuring cards in Anki Desktop and AnkiDroid match the live preview pixel-for-pixel.
          </p>
        </div>
      )}
    </div>
  );
};
