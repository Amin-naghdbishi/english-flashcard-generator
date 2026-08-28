import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  DiagnosticsReport,
  ThemeId,
  AppTheme,
  CardData,
  CardType,
  CustomAIProviderConfig,
  CustomTTSProviderConfig,
  AIPromptsConfig,
} from '../types';
import { CardPreview } from './CardPreview';
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
  fetchDefaultPrompts,
  restoreDefaultPrompts,
} from '../services/api';
import { DEFAULT_AI_PROMPTS } from '../../server/prompts';
import { OllamaModelTag } from '../../server/ollama';
import { PiperVoice, PiperDiagnosticResult } from '../../server/piper';
import { OnlineTTSDiagnosticResult } from '../../server/onlineTts';
import { THEME_GROUPS, THEMES } from '../themes';
import { AudioPlayer } from './AudioPlayer';
import { useAppTheme, normalizeAppTheme } from '../context/ThemeContext';
import { useTranslation, AppLanguage, AppDirection } from '../i18n';
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
  Save,
  Activity,
  Copy,
  Check,
  Zap,
  Loader2,
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
  HelpCircle,
  Languages,
  ArrowLeftRight,
  RotateCcw,
  Lightbulb,
  BrainCircuit,
  FileText,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  appTheme?: AppTheme;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const themeContext = useAppTheme();
  const { t, language, setLanguage, direction, setDirection, isRTL } = useTranslation();
  const [form, setForm] = useState<AppSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<
    'ai' | 'prompts' | 'tts' | 'dictionary' | 'smartImages' | 'defaultCard' | 'appearance' | 'anki' | 'diagnostics' | 'guide'
  >('ai');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Prompt configuration states
  const [defaultPrompts, setDefaultPrompts] = useState<AIPromptsConfig>(DEFAULT_AI_PROMPTS);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [promptSaveStatus, setPromptSaveStatus] = useState<string | null>(null);
  const [isRestoringPrompts, setIsRestoringPrompts] = useState<boolean>(false);
  const [isSavingPrompts, setIsSavingPrompts] = useState<boolean>(false);

  useEffect(() => {
    fetchDefaultPrompts()
      .then((res) => {
        if (res) setDefaultPrompts(res);
      })
      .catch(() => {});
  }, []);

  const currentPrompts: AIPromptsConfig = {
    ...defaultPrompts,
    ...(form.aiPrompts || {}),
  };

  const handlePromptChange = (field: keyof AIPromptsConfig, value: string) => {
    setForm((prev) => ({
      ...prev,
      aiPrompts: {
        ...defaultPrompts,
        ...(prev.aiPrompts || {}),
        [field]: value,
      },
    }));
  };

  const handleResetSinglePrompt = (field: keyof AIPromptsConfig) => {
    setForm((prev) => ({
      ...prev,
      aiPrompts: {
        ...(prev.aiPrompts || defaultPrompts),
        [field]: defaultPrompts[field],
      },
    }));
    setPromptSaveStatus(`${t('settings.prompts.revertPromptBtn')}`);
    setTimeout(() => setPromptSaveStatus(null), 3000);
  };

  const handleRestoreAllPrompts = async () => {
    setIsRestoringPrompts(true);
    try {
      const res = await restoreDefaultPrompts();
      const newPrompts = res.prompts || DEFAULT_AI_PROMPTS;
      const updatedForm = { ...form, aiPrompts: newPrompts };
      setForm(updatedForm);
      onUpdateSettings(updatedForm);
      setShowRestoreModal(false);
      setPromptSaveStatus(t('settings.prompts.restoredSuccess'));
      setTimeout(() => setPromptSaveStatus(null), 4000);
    } catch {
      const updatedForm = { ...form, aiPrompts: { ...defaultPrompts } };
      setForm(updatedForm);
      onUpdateSettings(updatedForm);
      saveConfig(updatedForm).catch(() => {});
      setShowRestoreModal(false);
      setPromptSaveStatus(t('settings.prompts.restoredSuccess'));
      setTimeout(() => setPromptSaveStatus(null), 4000);
    } finally {
      setIsRestoringPrompts(false);
    }
  };

  const handleSaveCustomPrompts = async () => {
    setIsSavingPrompts(true);
    try {
      const updated = {
        ...form,
        aiPrompts: currentPrompts,
      };
      await saveConfig(updated);
      onUpdateSettings(updated);
      setPromptSaveStatus(t('settings.prompts.savedSuccess'));
      setTimeout(() => setPromptSaveStatus(null), 3000);
    } catch (err: any) {
      setPromptSaveStatus(`Error saving prompts: ${err.message}`);
    } finally {
      setIsSavingPrompts(false);
    }
  };

  const isPromptModified = (field: keyof AIPromptsConfig) => {
    if (!form.aiPrompts?.[field]) return false;
    return form.aiPrompts[field].trim() !== (defaultPrompts[field] || '').trim();
  };

  const isDark = themeContext.isDark;

  // Immediate app theme selector that synchronizes context, parent, and storage
  const handleAppThemeSelect = (newTheme: AppTheme) => {
    const normalized = normalizeAppTheme(newTheme);
    const updated = { ...form, appTheme: normalized };
    setForm(updated);
    themeContext.setAppTheme(normalized);
    onUpdateSettings(updated);
    saveConfig(updated).catch(() => {});
  };

  // Immediate Language Selector
  const handleLanguageSelect = (newLang: AppLanguage) => {
    const updated = { ...form, language: newLang };
    setForm(updated);
    setLanguage(newLang);
    onUpdateSettings(updated);
    saveConfig(updated).catch(() => {});
  };

  // Immediate Direction Selector
  const handleDirectionSelect = (newDir: AppDirection) => {
    const updated = { ...form, direction: newDir };
    setForm(updated);
    setDirection(newDir);
    onUpdateSettings(updated);
    saveConfig(updated).catch(() => {});
  };

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

    // Auto-refresh service statuses in background every 10s
    const timer = setInterval(() => {
      refreshPiperServiceStatus();
      refreshTTSInfo();
      refreshAnkiInfo();
    }, 10000);

    return () => clearInterval(timer);
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

  const refreshTTSInfo = async (endpoint?: string) => {
    try {
      const targetEndpoint = endpoint || form.tts.endpoint || 'http://127.0.0.1:5000';
      const voicesRes = await getTTSVoices(targetEndpoint);
      if (voicesRes.success && Array.isArray(voicesRes.voices) && voicesRes.voices.length > 0) {
        setPiperVoices(voicesRes.voices);
      }
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

  const handleControlPiperService = async (action: 'start' | 'stop' | 'restart') => {
    setTogglingService(true);
    try {
      const res = await controlPiperService(action);
      setServiceStatus(res);
      await refreshPiperServiceStatus();
      await refreshTTSInfo();
    } catch (err: any) {
      console.error('Failed to control Piper service:', err);
    } finally {
      setTogglingService(false);
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
        className={`p-4 sm:p-5 border rounded-lg shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            <span>{t('settings.headerTitle')}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded border ${
                isDark
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{t('settings.saveBtn')}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={`flex flex-wrap gap-1.5 border-b pb-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
        {[
          { id: 'ai', label: t('settings.tabs.ai'), icon: Cpu },
          { id: 'prompts', label: t('settings.tabs.prompts'), icon: Sparkles },
          { id: 'tts', label: t('settings.tabs.tts'), icon: Volume2 },
          { id: 'dictionary', label: t('settings.tabs.dictionary'), icon: BookOpen },
          { id: 'smartImages', label: t('settings.tabs.smartImages'), icon: ImageIcon },
          { id: 'defaultCard', label: t('settings.tabs.defaultCard'), icon: CheckSquare },
          { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
          { id: 'anki', label: t('settings.tabs.anki'), icon: Bookmark },
          { id: 'diagnostics', label: t('settings.tabs.diagnostics'), icon: Activity },
          { id: 'guide', label: t('settings.tabs.guide'), icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 font-medium text-xs rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: AI PROVIDERS */}
      {activeSubTab === 'ai' && (
        <div className="space-y-6">
          {/* AI Prompts Jump Notice */}
          <div
            className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDark ? 'bg-blue-950/20 border-blue-800/50 text-blue-200' : 'bg-blue-50/80 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
              <span>
                {t('settings.prompts.jumpFromAiNotice')}{' '}
                <strong className="underline decoration-blue-400/50 cursor-pointer" onClick={() => setActiveSubTab('prompts')}>
                  {t('settings.prompts.title')}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('prompts')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded cursor-pointer shrink-0 transition-colors"
            >
              {t('settings.prompts.jumpFromAiBtn')}
            </button>
          </div>

          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ollama Option */}
            <div
              onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'ollama' } })}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                form.ai.provider === 'ollama'
                  ? isDark
                    ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                    : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                  : isDark
                  ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Local Ollama</span>
                <input
                  type="radio"
                  name="ai_provider"
                  checked={form.ai.provider === 'ollama'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                100% offline AI running locally on your computer (e.g. qwen3:4b, llama3.2).
              </p>
            </div>

            {/* Gemini Option */}
            <div
              onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'gemini' } })}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                form.ai.provider === 'gemini'
                  ? isDark
                    ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                    : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                  : isDark
                  ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Google Gemini</span>
                <input
                  type="radio"
                  name="ai_provider"
                  checked={form.ai.provider === 'gemini'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Fast, high-quality cloud AI (gemini-2.5-flash, gemini-1.5-pro).
              </p>
            </div>

            {/* Custom AI Option (9Router style) */}
            <div
              onClick={() => setForm({ ...form, ai: { ...form.ai, provider: 'custom' } })}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                form.ai.provider === 'custom' || (!['ollama', 'gemini'].includes(form.ai.provider))
                  ? isDark
                    ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                    : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                  : isDark
                  ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Custom AI / 9Router</span>
                <input
                  type="radio"
                  name="ai_provider"
                  checked={form.ai.provider === 'custom' || (!['ollama', 'gemini'].includes(form.ai.provider))}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Connect ANY OpenAI-compatible endpoint, OpenRouter, Groq, DeepSeek, vLLM, or LMStudio.
              </p>
            </div>
          </div>

          {/* OLLAMA CONFIGURATION */}
          {form.ai.provider === 'ollama' && (
            <div
              className={`p-5 border rounded-lg shadow-xs space-y-4 ${
                isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <h3 className="font-semibold text-sm uppercase">Ollama Settings</h3>
                <button
                  type="button"
                  onClick={refreshOllamaInfo}
                  className={`px-3 py-1 font-medium text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                  <span>Refresh Models</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Ollama Base URL
                  </label>
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
                    className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                        : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Model Name
                  </label>
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
                    className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                        : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  >
                    {ollamaModels.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)}GB` : 'local'})
                      </option>
                    ))}
                    {!ollamaModels.some((m) => m.name === form.ai.ollama.model) && (
                      <option value={form.ai.ollama.model}>{form.ai.ollama.model} (custom)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Status report */}
              {ollamaStatus && (
                <div
                  className={`p-3 border rounded-md text-xs flex items-center justify-between ${
                    ollamaStatus.connected
                      ? isDark
                        ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {ollamaStatus.connected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>
                      {ollamaStatus.connected
                        ? `Ollama is connected (Version: ${ollamaStatus.version || 'OK'})`
                        : `Ollama is unreachable: ${ollamaStatus.error}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GEMINI CONFIGURATION */}
          {form.ai.provider === 'gemini' && (
            <div
              className={`p-5 border rounded-lg shadow-xs space-y-4 ${
                isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <h3 className="font-semibold text-sm uppercase">Google Gemini Settings</h3>
                <button
                  type="button"
                  onClick={async () => {
                    setTestingGemini(true);
                    const res = await checkGemini(form.ai.gemini.apiKey, form.ai.gemini.model);
                    setGeminiStatus(res);
                    setTestingGemini(false);
                  }}
                  className={`px-3 py-1 font-medium text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 text-blue-500 ${testingGemini ? 'animate-spin' : ''}`} />
                  <span>Test API Connection</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={form.ai.gemini.apiKey}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          gemini: { ...form.ai.gemini, apiKey: e.target.value },
                          apiKey: e.target.value,
                        },
                      })
                    }
                    placeholder="AIzaSy..."
                    className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                        : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Gemini Model
                  </label>
                  <select
                    value={form.ai.gemini.model}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          gemini: { ...form.ai.gemini, model: e.target.value },
                          model: e.target.value,
                        },
                      })
                    }
                    className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                        : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  >
                    {geminiModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                    {!geminiModels.some((m) => m.id === form.ai.gemini.model) && (
                      <option value={form.ai.gemini.model}>{form.ai.gemini.model}</option>
                    )}
                  </select>
                </div>
              </div>

              {geminiStatus && (
                <div
                  className={`p-3 border rounded-md text-xs flex items-center justify-between ${
                    geminiStatus.connected
                      ? isDark
                        ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {geminiStatus.connected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>
                      {geminiStatus.connected
                        ? `Gemini is reachable (Model: ${geminiStatus.model || form.ai.gemini.model})`
                        : `Gemini test failed: ${geminiStatus.error}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CUSTOM AI PROVIDERS (9Router Flexibility) */}
          {(form.ai.provider === 'custom' || (!['ollama', 'gemini'].includes(form.ai.provider))) && (
            <div
              className={`p-5 border rounded-lg shadow-xs space-y-4 ${
                isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <h3 className="font-semibold text-sm uppercase flex items-center gap-2">
                  <span>Custom AI / 9Router Provider</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `custom_${Date.now()}`;
                      const newProvider: CustomAIProviderConfig = {
                        id: newId,
                        name: 'New Custom Provider',
                        protocol: 'openai-compatible',
                        baseUrl: 'https://api.openai.com/v1',
                        apiKey: '',
                        model: 'gpt-4o-mini',
                        temperature: 0.2,
                        authType: 'bearer',
                      };
                      setForm({
                        ...form,
                        ai: {
                          ...form.ai,
                          customProviders: [...(form.ai.customProviders || []), newProvider],
                        },
                      });
                      setSelectedCustomAiId(newId);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Provider</span>
                  </button>
                </div>
              </div>

              {/* Provider Selector Tabs */}
              <div className="flex flex-wrap gap-2">
                {(form.ai.customProviders || []).map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setSelectedCustomAiId(prov.id)}
                    className={`px-3 py-1 text-xs font-medium rounded border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      selectedCustomAiId === prov.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : isDark
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <span>{prov.name}</span>
                  </button>
                ))}
              </div>

              {/* Active Custom Provider Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Provider Name</label>
                  <input
                    type="text"
                    value={activeCustomAiConfig.name}
                    onChange={(e) => {
                      const updated = (form.ai.customProviders || []).map((p) =>
                        p.id === activeCustomAiConfig.id ? { ...p, name: e.target.value } : p
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                    }}
                    className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Base API URL</label>
                  <input
                    type="text"
                    value={activeCustomAiConfig.baseUrl}
                    onChange={(e) => {
                      const updated = (form.ai.customProviders || []).map((p) =>
                        p.id === activeCustomAiConfig.id ? { ...p, baseUrl: e.target.value } : p
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                    }}
                    placeholder="https://openrouter.ai/api/v1"
                    className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-semibold uppercase ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>API Key</label>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyCustomAi(!showApiKeyCustomAi)}
                      className="text-[10px] text-blue-500 hover:underline"
                    >
                      {showApiKeyCustomAi ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showApiKeyCustomAi ? 'text' : 'password'}
                    value={activeCustomAiConfig.apiKey || ''}
                    onChange={(e) => {
                      const updated = (form.ai.customProviders || []).map((p) =>
                        p.id === activeCustomAiConfig.id ? { ...p, apiKey: e.target.value } : p
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                    }}
                    placeholder="sk-..."
                    className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Model ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={activeCustomAiConfig.model}
                      onChange={(e) => {
                        const updated = (form.ai.customProviders || []).map((p) =>
                          p.id === activeCustomAiConfig.id ? { ...p, model: e.target.value } : p
                        );
                        setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                      }}
                      placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                      className={`flex-1 text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchCustomAiModels(activeCustomAiConfig)}
                      disabled={fetchingCustomAiModels}
                      className={`px-3 py-1 font-medium text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                        isDark
                          ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                      }`}
                      title="Auto-fetch available models from /models endpoint"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${fetchingCustomAiModels ? 'animate-spin' : ''}`} />
                      <span>Models</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Custom AI */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleTestCustomAi(activeCustomAiConfig)}
                  disabled={testingCustomAi}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingCustomAi ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>

                {(form.ai.customProviders || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const remaining = (form.ai.customProviders || []).filter(
                        (p) => p.id !== activeCustomAiConfig.id
                      );
                      setForm({ ...form, ai: { ...form.ai, customProviders: remaining } });
                      setSelectedCustomAiId(remaining[0]?.id || '');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-rose-950/40 text-rose-300 border-rose-800 hover:bg-rose-900/40'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Provider</span>
                  </button>
                )}
              </div>

              {/* Custom AI Test Result Banner */}
              {customAiTestResult && (
                <div
                  className={`p-3 border rounded-md text-xs space-y-1 ${
                    customAiTestResult.connected
                      ? isDark
                        ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {customAiTestResult.connected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>{customAiTestResult.message || (customAiTestResult.connected ? 'Connected' : 'Error')}</span>
                  </div>
                  {customAiTestResult.models && customAiTestResult.models.length > 0 && (
                    <div className="pt-1">
                      <span className="font-semibold block mb-1">Available Models:</span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {customAiTestResult.models.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              const updated = (form.ai.customProviders || []).map((p) =>
                                p.id === activeCustomAiConfig.id ? { ...p, model: m } : p
                              );
                              setForm({ ...form, ai: { ...form.ai, customProviders: updated } });
                            }}
                            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border cursor-pointer ${
                              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: AI DEFAULT PROMPTS */}
      {activeSubTab === 'prompts' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div
            className={`p-4 border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  isDark
                    ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                    : 'bg-purple-50 text-purple-600 border border-purple-200'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                  <span>{t('settings.prompts.title')}</span>
                </h3>
                <p className={`text-xs mt-1 max-w-2xl ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.prompts.subtitle')}
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => setShowRestoreModal(true)}
                disabled={isRestoringPrompts}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                title={t('settings.prompts.restoreConfirmMsg')}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestoringPrompts ? 'animate-spin' : ''}`} />
                <span>{isRestoringPrompts ? t('settings.prompts.restoringDefaults') : t('settings.prompts.restoreDefaultsBtn')}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveCustomPrompts}
                disabled={isSavingPrompts}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Save className={`w-3.5 h-3.5 ${isSavingPrompts ? 'animate-spin' : ''}`} />
                <span>{isSavingPrompts ? t('settings.prompts.saving') : t('settings.prompts.saveBtn')}</span>
              </button>
            </div>
          </div>

          {/* Feedback Status */}
          {promptSaveStatus && (
            <div
              className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${
                promptSaveStatus.toLowerCase().includes('error')
                  ? isDark
                    ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                  : isDark
                  ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{promptSaveStatus}</span>
            </div>
          )}

          {/* Centralized Architecture Info Notice */}
          <div
            className={`p-4 rounded-lg border text-xs ${
              isDark ? 'bg-zinc-850/60 border-zinc-700/80 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold mb-1 text-blue-600 dark:text-blue-400">
              <BrainCircuit className="w-4 h-4" />
              <span>{t('settings.prompts.howItWorksTitle')}</span>
            </div>
            <p className="leading-relaxed opacity-90">
              {t('settings.prompts.howItWorksDesc')}
            </p>
          </div>

          {/* Prompt 1: Meaning Generation */}
          <div
            className={`p-5 border rounded-xl space-y-3 transition-all ${
              isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {t('settings.prompts.meaningTitle')}
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t('settings.prompts.meaningDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isPromptModified('meaningGeneration') ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    {t('settings.prompts.customizedBadge')}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    {t('settings.prompts.defaultBadge')}
                  </span>
                )}
                {isPromptModified('meaningGeneration') && (
                  <button
                    type="button"
                    onClick={() => handleResetSinglePrompt('meaningGeneration')}
                    className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('settings.prompts.revertPromptBtn')}</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={currentPrompts.meaningGeneration}
              onChange={(e) => handlePromptChange('meaningGeneration', e.target.value)}
              className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y ${
                isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
              }`}
            />
          </div>

          {/* Prompt 2: Example Generation */}
          <div
            className={`p-5 border rounded-xl space-y-3 transition-all ${
              isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {t('settings.prompts.exampleTitle')}
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t('settings.prompts.exampleDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isPromptModified('exampleGeneration') ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    {t('settings.prompts.customizedBadge')}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    {t('settings.prompts.defaultBadge')}
                  </span>
                )}
                {isPromptModified('exampleGeneration') && (
                  <button
                    type="button"
                    onClick={() => handleResetSinglePrompt('exampleGeneration')}
                    className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('settings.prompts.revertPromptBtn')}</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={currentPrompts.exampleGeneration}
              onChange={(e) => handlePromptChange('exampleGeneration', e.target.value)}
              className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y ${
                isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
              }`}
            />
          </div>

          {/* Prompt 3: Example Translation */}
          <div
            className={`p-5 border rounded-xl space-y-3 transition-all ${
              isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {t('settings.prompts.translationTitle')}
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t('settings.prompts.translationDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isPromptModified('exampleTranslation') ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    {t('settings.prompts.customizedBadge')}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    {t('settings.prompts.defaultBadge')}
                  </span>
                )}
                {isPromptModified('exampleTranslation') && (
                  <button
                    type="button"
                    onClick={() => handleResetSinglePrompt('exampleTranslation')}
                    className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('settings.prompts.revertPromptBtn')}</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={currentPrompts.exampleTranslation}
              onChange={(e) => handlePromptChange('exampleTranslation', e.target.value)}
              className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y ${
                isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
              }`}
            />
          </div>

          {/* Prompt 4: Memory Hook (Highlighted Card with Root Decomposition) */}
          <div
            className={`p-5 border-2 rounded-xl space-y-3 transition-all ${
              isDark
                ? 'bg-[#27272A] border-blue-500/60 shadow-lg shadow-blue-950/20'
                : 'bg-white border-blue-400 shadow-md shadow-blue-100/50'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${isDark ? 'bg-blue-950/80 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {t('settings.prompts.memoryHookTitle')}
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-500 border border-blue-500/30">
                      Root & Decomposition
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t('settings.prompts.memoryHookDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isPromptModified('memoryHook') ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    {t('settings.prompts.customizedBadge')}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    {t('settings.prompts.defaultBadge')}
                  </span>
                )}
                {isPromptModified('memoryHook') && (
                  <button
                    type="button"
                    onClick={() => handleResetSinglePrompt('memoryHook')}
                    className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('settings.prompts.revertPromptBtn')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Memory Hook Decomposition Guideline Hint Box */}
            <div
              className={`p-3 rounded-lg border text-[11px] leading-relaxed ${
                isDark ? 'bg-blue-950/20 border-blue-800/40 text-blue-200' : 'bg-blue-50/70 border-blue-200 text-blue-900'
              }`}
            >
              <div className="font-semibold mb-0.5">💡 Decomposition Example:</div>
              <div>
                <strong>readability → read + ability:</strong> Explain that <code>read</code> = خواندن, <code>ability</code> = توانایی, and <code>readability</code> = قابلیت خوانده‌شدن.
              </div>
              <div className="mt-1 opacity-90 text-[10px]">
                Intelligent adaptation: Words with natural morphemes are decomposed into familiar parts. Base words without natural components (e.g. apple, chair) receive natural memorable associations without artificial splitting.
              </div>
            </div>

            <textarea
              rows={9}
              value={currentPrompts.memoryHook}
              onChange={(e) => handlePromptChange('memoryHook', e.target.value)}
              className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y ${
                isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
              }`}
            />
          </div>

          {/* Prompt 5: Missing-Field Completion */}
          <div
            className={`p-5 border rounded-xl space-y-3 transition-all ${
              isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {t('settings.prompts.completionTitle')}
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {t('settings.prompts.completionDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isPromptModified('missingFieldCompletion') ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    {t('settings.prompts.customizedBadge')}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    {t('settings.prompts.defaultBadge')}
                  </span>
                )}
                {isPromptModified('missingFieldCompletion') && (
                  <button
                    type="button"
                    onClick={() => handleResetSinglePrompt('missingFieldCompletion')}
                    className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('settings.prompts.revertPromptBtn')}</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={6}
              value={currentPrompts.missingFieldCompletion}
              onChange={(e) => handlePromptChange('missingFieldCompletion', e.target.value)}
              className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y ${
                isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
              }`}
            />
          </div>

          {/* Section: Other AI-Generated Content */}
          <div className="pt-2">
            <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {t('settings.prompts.otherTitle')}
            </h4>
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {t('settings.prompts.otherDesc')}
            </p>

            <div className="space-y-4">
              {/* Prompt 6: System Role & Persona */}
              <div
                className={`p-5 border rounded-xl space-y-3 transition-all ${
                  isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {t('settings.prompts.systemRoleTitle')}
                      </h5>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {t('settings.prompts.systemRoleDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isPromptModified('systemRole') ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        {t('settings.prompts.customizedBadge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                        {t('settings.prompts.defaultBadge')}
                      </span>
                    )}
                    {isPromptModified('systemRole') && (
                      <button
                        type="button"
                        onClick={() => handleResetSinglePrompt('systemRole')}
                        className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t('settings.prompts.revertPromptBtn')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={currentPrompts.systemRole}
                  onChange={(e) => handlePromptChange('systemRole', e.target.value)}
                  className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y ${
                    isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
                  }`}
                />
              </div>

              {/* Prompt 7: Phonetic & POS */}
              <div
                className={`p-5 border rounded-xl space-y-3 transition-all ${
                  isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {t('settings.prompts.phoneticAndPosTitle')}
                      </h5>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {t('settings.prompts.phoneticAndPosDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isPromptModified('phoneticAndPos') ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        {t('settings.prompts.customizedBadge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                        {t('settings.prompts.defaultBadge')}
                      </span>
                    )}
                    {isPromptModified('phoneticAndPos') && (
                      <button
                        type="button"
                        onClick={() => handleResetSinglePrompt('phoneticAndPos')}
                        className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t('settings.prompts.revertPromptBtn')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={currentPrompts.phoneticAndPos}
                  onChange={(e) => handlePromptChange('phoneticAndPos', e.target.value)}
                  className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y ${
                    isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
                  }`}
                />
              </div>

              {/* Prompt 8: Smart Image Decision */}
              <div
                className={`p-5 border rounded-xl space-y-3 transition-all ${
                  isDark ? 'bg-[#27272A] border-zinc-700' : 'bg-white border-zinc-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md ${isDark ? 'bg-zinc-800 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {t('settings.prompts.smartImageTitle')}
                      </h5>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {t('settings.prompts.smartImageDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isPromptModified('smartImageDecision') ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                        {t('settings.prompts.customizedBadge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                        {t('settings.prompts.defaultBadge')}
                      </span>
                    )}
                    {isPromptModified('smartImageDecision') && (
                      <button
                        type="button"
                        onClick={() => handleResetSinglePrompt('smartImageDecision')}
                        className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t('settings.prompts.revertPromptBtn')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={currentPrompts.smartImageDecision}
                  onChange={(e) => handlePromptChange('smartImageDecision', e.target.value)}
                  className={`w-full p-3 text-xs font-mono rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y ${
                    isDark ? 'bg-zinc-900 text-zinc-100 border-zinc-700' : 'bg-zinc-50 text-zinc-900 border-zinc-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setShowRestoreModal(true)}
              disabled={isRestoringPrompts}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRestoringPrompts ? 'animate-spin' : ''}`} />
              <span>{isRestoringPrompts ? t('settings.prompts.restoringDefaults') : t('settings.prompts.restoreDefaultsBtn')}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCustomPrompts}
              disabled={isSavingPrompts}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className={`w-3.5 h-3.5 ${isSavingPrompts ? 'animate-spin' : ''}`} />
              <span>{isSavingPrompts ? t('settings.prompts.saving') : t('settings.prompts.saveBtn')}</span>
            </button>
          </div>

          {/* Restore Defaults Confirmation Modal */}
          {showRestoreModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
              <div
                className={`max-w-md w-full p-6 rounded-xl border shadow-xl ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3 text-amber-500 mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold">{t('settings.prompts.restoreConfirmTitle')}</h3>
                </div>
                <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {t('settings.prompts.restoreConfirmMsg')}
                </p>
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowRestoreModal(false)}
                    className={`px-4 py-2 rounded-md text-xs font-semibold border cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700'
                    }`}
                  >
                    {t('settings.prompts.cancelBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreAllPrompts}
                    disabled={isRestoringPrompts}
                    className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRestoringPrompts ? 'animate-spin' : ''}`} />
                    <span>{isRestoringPrompts ? t('settings.prompts.restoringDefaults') : t('settings.prompts.confirmRestoreBtn')}</span>
                  </button>
                </div>
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
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                form.tts.provider === 'piper'
                  ? isDark
                    ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                    : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                  : isDark
                  ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Local Piper TTS</span>
                <input
                  type="radio"
                  name="tts_provider"
                  checked={form.tts.provider === 'piper'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                100% offline neural voice synthesis running directly on your computer.
              </p>
            </div>

            <div
              onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'online' } })}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                form.tts.provider === 'online'
                  ? isDark
                    ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                    : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                  : isDark
                  ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Online Fallback TTS</span>
                <input
                  type="radio"
                  name="tts_provider"
                  checked={form.tts.provider === 'online'}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Zero-setup online speech synthesis via Google Speech Services.
              </p>
            </div>

            <div
              onClick={() => setForm({ ...form, tts: { ...form.tts, provider: 'custom' } })}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                form.tts.provider === 'custom' || (!['piper', 'online'].includes(form.tts.provider))
                  ? isDark
                    ? 'bg-zinc-800 text-white border-blue-500 font-semibold shadow-xs'
                    : 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                  : isDark
                  ? 'bg-[#27272A] text-zinc-300 border-zinc-700 hover:border-zinc-600'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Custom TTS Provider</span>
                <input
                  type="radio"
                  name="tts_provider"
                  checked={form.tts.provider === 'custom' || (!['piper', 'online'].includes(form.tts.provider))}
                  onChange={() => {}}
                  className="w-4 h-4 accent-blue-600"
                />
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Connect OpenAI Audio Speech, ElevenLabs, Azure, or self-hosted TTS services.
              </p>
            </div>
          </div>

          {/* PIPER CONFIG */}
          {form.tts.provider === 'piper' && (
            <div
              className={`p-5 border rounded-lg shadow-xs space-y-4 ${
                isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className={`flex flex-wrap items-center justify-between gap-2 pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <h3 className="font-semibold text-sm uppercase flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-500" />
                  <span>Piper TTS Configuration & Service</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refreshTTSInfo(form.tts.endpoint)}
                    className={`px-2.5 py-1 font-medium text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                    }`}
                    title="Fetch available voices from Piper /voices endpoint"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Fetch Voices</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setTestingPiper(true);
                      const res = await runTTSDiagnostics({
                        endpoint: form.tts.endpoint,
                        americanVoice: form.tts.americanVoice,
                        britishVoice: form.tts.britishVoice,
                        normalSpeed: form.tts.normalSpeed,
                        slowSpeed: form.tts.slowSpeed,
                      });
                      setPiperDiag(res);
                      setTestingPiper(false);
                    }}
                    disabled={testingPiper}
                    className={`px-3 py-1 font-medium text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 text-blue-500 ${testingPiper ? 'animate-spin' : ''}`} />
                    <span>Run Voice Diagnostic</span>
                  </button>
                </div>
              </div>

              {/* PIPER SYSTEMD SERVICE CONTROL PANEL */}
              <div
                className={`p-4 border rounded-md space-y-3 ${
                  isDark ? 'bg-zinc-800/80 border-zinc-750' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide block">
                        Piper Linux Service (systemd --user)
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {serviceStatus?.detail || 'systemctl --user {start|stop} piper.service'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        serviceStatus?.active
                          ? isDark
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          serviceStatus?.active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                        }`}
                      />
                      <span>{serviceStatus?.active ? 'Running' : 'Stopped'}</span>
                    </span>

                    {/* Service Control Buttons */}
                    {serviceStatus?.active ? (
                      <button
                        type="button"
                        onClick={() => handleControlPiperService('stop')}
                        disabled={togglingService}
                        className={`px-3 py-1 text-xs font-semibold rounded-md border flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isDark
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/60'
                            : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                        }`}
                        title="Stop systemd user service (systemctl --user stop piper.service)"
                      >
                        {togglingService ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PowerOff className="w-3.5 h-3.5 text-rose-500" />
                        )}
                        <span>Stop Service</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleControlPiperService('start')}
                        disabled={togglingService}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Start systemd user service (systemctl --user start piper.service)"
                      >
                        {togglingService ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        <span>Start Service</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleControlPiperService('restart')}
                      disabled={togglingService}
                      className={`px-2.5 py-1 text-xs font-medium rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                        isDark
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      }`}
                      title="Restart Piper systemd service"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${togglingService ? 'animate-spin' : ''}`} />
                      <span>Restart</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ENDPOINT & VOICE SELECTORS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Piper Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={form.tts.endpoint}
                    onChange={(e) => setForm({ ...form, tts: { ...form.tts, endpoint: e.target.value } })}
                    placeholder="http://127.0.0.1:5000"
                    className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    🇺🇸 American Voice
                  </label>
                  <select
                    value={form.tts.americanVoice}
                    onChange={(e) => setForm({ ...form, tts: { ...form.tts, americanVoice: e.target.value } })}
                    className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  >
                    {piperVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.id})
                      </option>
                    ))}
                    {!piperVoices.some((v) => v.id === form.tts.americanVoice) && (
                      <option value={form.tts.americanVoice}>{form.tts.americanVoice}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    🇬🇧 British Voice
                  </label>
                  <select
                    value={form.tts.britishVoice}
                    onChange={(e) => setForm({ ...form, tts: { ...form.tts, britishVoice: e.target.value } })}
                    className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  >
                    {piperVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.id})
                      </option>
                    ))}
                    {!piperVoices.some((v) => v.id === form.tts.britishVoice) && (
                      <option value={form.tts.britishVoice}>{form.tts.britishVoice}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* DIAGNOSTIC RESULTS */}
              {piperDiag && (
                <div
                  className={`p-3 border rounded-md text-xs space-y-2 ${
                    piperDiag.ready
                      ? isDark
                        ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {piperDiag.ready ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>{piperDiag.error || (piperDiag.ready ? 'All Piper voice diagnostics passed!' : 'Piper Diagnostic Failed')}</span>
                  </div>

                  {piperDiag.testAudios && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {piperDiag.testAudios.usNormalBase64 && (
                        <AudioPlayer base64Wav={piperDiag.testAudios.usNormalBase64} label="🇺🇸 US Normal" size="sm" />
                      )}
                      {piperDiag.testAudios.usSlowBase64 && (
                        <AudioPlayer base64Wav={piperDiag.testAudios.usSlowBase64} label="🇺🇸 US Slow" size="sm" />
                      )}
                      {piperDiag.testAudios.ukNormalBase64 && (
                        <AudioPlayer base64Wav={piperDiag.testAudios.ukNormalBase64} label="🇬🇧 UK Normal" size="sm" />
                      )}
                      {piperDiag.testAudios.ukSlowBase64 && (
                        <AudioPlayer base64Wav={piperDiag.testAudios.ukSlowBase64} label="🇬🇧 UK Slow" size="sm" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ONLINE TTS CONFIG */}
          {form.tts.provider === 'online' && (
            <div
              className={`p-5 border rounded-lg shadow-xs space-y-4 ${
                isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <h3 className="font-semibold text-sm uppercase">Online Speech Services</h3>
                <button
                  type="button"
                  onClick={async () => {
                    setTestingOnlineTts(true);
                    const res = await runOnlineTTSDiagnostics();
                    setOnlineTtsDiag(res);
                    setTestingOnlineTts(false);
                  }}
                  className={`px-3 py-1 font-medium text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 text-blue-500 ${testingOnlineTts ? 'animate-spin' : ''}`} />
                  <span>Test Online Voice</span>
                </button>
              </div>

              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Online TTS automatically generates clear standard pronunciation for words and sentences without requiring local piper models.
              </p>

              {onlineTtsDiag && (
                <div
                  className={`p-3 border rounded-md text-xs space-y-1.5 ${
                    onlineTtsDiag.success
                      ? isDark
                        ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {onlineTtsDiag.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                    <span>{onlineTtsDiag.message}</span>
                  </div>
                  {onlineTtsDiag.audioBase64 && (
                    <div className="pt-1">
                      <AudioPlayer base64Wav={onlineTtsDiag.audioBase64} label="Online Sample Playback" size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CUSTOM TTS CONFIG */}
          {(form.tts.provider === 'custom' || (!['piper', 'online'].includes(form.tts.provider))) && (
            <div
              className={`p-5 border rounded-lg shadow-xs space-y-4 ${
                isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <h3 className="font-semibold text-sm uppercase">Custom TTS Endpoint</h3>
                <button
                  type="button"
                  onClick={() => handleTestCustomTts(activeCustomTtsConfig)}
                  disabled={testingCustomTts}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingCustomTts ? 'animate-spin' : ''}`} />
                  <span>Test Custom TTS</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>TTS Endpoint</label>
                  <input
                    type="text"
                    value={activeCustomTtsConfig.endpoint}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || []).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, endpoint: e.target.value } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    placeholder="https://api.openai.com/v1/audio/speech"
                    className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-semibold uppercase ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>API Key</label>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyCustomTts(!showApiKeyCustomTts)}
                      className="text-[10px] text-blue-500 hover:underline"
                    >
                      {showApiKeyCustomTts ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showApiKeyCustomTts ? 'text' : 'password'}
                    value={activeCustomTtsConfig.apiKey || ''}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || []).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, apiKey: e.target.value } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    placeholder="sk-..."
                    className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Voice Name</label>
                  <input
                    type="text"
                    value={activeCustomTtsConfig.voice || 'alloy'}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || []).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, voice: e.target.value } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    placeholder="alloy, nova, shimmer, echo"
                    className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Model</label>
                  <input
                    type="text"
                    value={activeCustomTtsConfig.model || 'tts-1'}
                    onChange={(e) => {
                      const updated = (form.tts.customProviders || []).map((p) =>
                        p.id === activeCustomTtsConfig.id ? { ...p, model: e.target.value } : p
                      );
                      setForm({ ...form, tts: { ...form.tts, customProviders: updated } });
                    }}
                    placeholder="tts-1, tts-1-hd"
                    className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                    }`}
                  />
                </div>
              </div>

              {customTtsTestResult && (
                <div
                  className={`p-3 border rounded-md text-xs space-y-1.5 ${
                    customTtsTestResult.success
                      ? isDark
                        ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {customTtsTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                    <span>{customTtsTestResult.success ? 'Custom TTS Synthesis Succeeded!' : `Error: ${customTtsTestResult.error}`}</span>
                  </div>
                  {customTtsTestResult.normalAudioBase64 && (
                    <div className="pt-1">
                      <AudioPlayer base64Wav={customTtsTestResult.normalAudioBase64} label="Custom TTS Output" size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AUDIO GENERATION VARIANTS WITH INDEPENDENT SPEED CONTROLS */}
          <div
            className={`p-5 border rounded-lg shadow-xs space-y-5 ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide">Audio Generation Variants & Independent Speeds</h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Independently enable/disable and configure the exact synthesis speed (Piper length_scale) for each audio variant.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Word Pronunciation Group */}
              <div className={`p-4 border rounded-lg space-y-3.5 ${isDark ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Word Pronunciation</span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Synthesizes individual word pronunciation with independent speeds (length_scale: 1.0 = standard, &gt;1.0 = slower).
                </p>

                <div className="space-y-3 pt-1">
                  {/* American Normal */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateAmericanNormal ?? true}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateAmericanNormal: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇺🇸 American Normal</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedAmericanNormal ?? 1.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedAmericanNormal: isNaN(val) ? 1.0 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* American Slow */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateAmericanSlow ?? true}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateAmericanSlow: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇺🇸 American Slow</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedAmericanSlow ?? 1.25}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedAmericanSlow: isNaN(val) ? 1.25 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* British Normal */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateBritishNormal ?? false}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateBritishNormal: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇬🇧 British Normal</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedBritishNormal ?? 1.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedBritishNormal: isNaN(val) ? 1.0 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* British Slow */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateBritishSlow ?? false}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateBritishSlow: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇬🇧 British Slow</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedBritishSlow ?? 1.25}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedBritishSlow: isNaN(val) ? 1.25 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Example Sentence Group */}
              <div className={`p-4 border rounded-lg space-y-3.5 ${isDark ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Example Sentence Audio</span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Synthesizes full contextual example sentences with independent speed rates.
                </p>

                <div className="space-y-3 pt-1">
                  {/* American Normal Example */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateExampleUsNormal ?? true}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateExampleUsNormal: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇺🇸 American Normal</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedExampleUsNormal ?? 1.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedExampleUsNormal: isNaN(val) ? 1.0 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* American Slow Example */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateExampleUsSlow ?? false}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateExampleUsSlow: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇺🇸 American Slow</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedExampleUsSlow ?? 1.25}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedExampleUsSlow: isNaN(val) ? 1.25 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* British Normal Example */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateExampleUkNormal ?? false}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateExampleUkNormal: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇬🇧 British Normal</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedExampleUkNormal ?? 1.0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedExampleUkNormal: isNaN(val) ? 1.0 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* British Slow Example */}
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.tts.generateExampleUkSlow ?? false}
                        onChange={(e) => setForm({ ...form, tts: { ...form.tts, generateExampleUkSlow: e.target.checked } })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">🇬🇧 British Slow</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Speed</span>
                      <input
                        type="number"
                        min="0.5"
                        max="2.5"
                        step="0.05"
                        value={form.tts.speedExampleUkSlow ?? 1.25}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setForm({ ...form, tts: { ...form.tts, speedExampleUkSlow: isNaN(val) ? 1.25 : val } });
                        }}
                        className={`w-20 text-xs font-mono font-bold text-center px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DICTIONARIES */}
      {activeSubTab === 'dictionary' && (
        <div
          className={`p-5 border rounded-lg shadow-xs space-y-4 ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h3 className="font-semibold text-sm uppercase">Dictionary Sources</h3>
            <span className="text-xs text-zinc-500 font-medium">Automatic Fallback Engine</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.dictionaries?.abadis ?? true}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dictionaries: { ...form.dictionaries, abadis: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <div>
                <span className="text-xs font-semibold block">Abadis Persian Dictionary (آبادیس)</span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Fetches verified Persian definitions and accurate phonetic transcriptions.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.dictionaries?.freeDictionary ?? true}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dictionaries: { ...form.dictionaries, freeDictionary: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <div>
                <span className="text-xs font-semibold block">FreeDictionary API (English IPA & POS)</span>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Authoritative English phonetics, parts of speech, and sample sentences.
                </span>
              </div>
            </label>
          </div>

          {/* Test Dictionary lookup */}
          <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <label className={`block text-xs font-semibold uppercase ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Test Dictionary Lookup
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={dictTestWord}
                onChange={(e) => setDictTestWord(e.target.value)}
                placeholder="e.g. abandon, diligent"
                className={`w-48 text-xs font-medium p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                }`}
              />
              <button
                type="button"
                onClick={async () => {
                  setTestingDict(true);
                  const abRes = await lookupAbadisDict(dictTestWord);
                  const freeRes = await lookupFreeDict(dictTestWord);
                  setDictTestResult({ abadis: abRes, freeDictionary: freeRes });
                  setTestingDict(false);
                }}
                disabled={testingDict || !dictTestWord.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Zap className={`w-3.5 h-3.5 ${testingDict ? 'animate-spin' : ''}`} />
                <span>Test Lookup</span>
              </button>
            </div>

            {dictTestResult && (
              <div className={`p-3 border rounded-md text-xs font-mono space-y-1 ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-800'}`}>
                <div>Abadis: {dictTestResult.abadis?.meaningFa || 'No match'}</div>
                <div>FreeDict Phonetic: {dictTestResult.freeDictionary?.phonetic || 'None'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: SMART IMAGES */}
      {activeSubTab === 'smartImages' && (
        <div
          className={`p-5 border rounded-lg shadow-xs space-y-4 ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h3 className="font-semibold text-sm uppercase">Smart Image Search</h3>
            <span className="text-xs text-zinc-500 font-medium">Automatic & Manual Photo Mode</span>
          </div>

          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Images are retrieved via high-speed Unsplash & Wikimedia APIs with offline SVG fallback generation.
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.smartImages?.enabled ?? true}
                onChange={(e) =>
                  setForm({
                    ...form,
                    smartImages: { ...form.smartImages, enabled: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <span className="text-xs font-semibold">Enable Smart Images System</span>
            </label>
          </div>

          {/* Test Image Search */}
          <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <label className={`block text-xs font-semibold uppercase ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Test Image Retrieval
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imgTestWord}
                onChange={(e) => setImgTestWord(e.target.value)}
                placeholder="e.g. apple, bicycle"
                className={`w-48 text-xs font-medium p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                }`}
              />
              <button
                type="button"
                onClick={async () => {
                  setTestingImg(true);
                  const res = await testSmartImage(imgTestWord);
                  setImgTestResult(res);
                  setTestingImg(false);
                }}
                disabled={testingImg || !imgTestWord.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Zap className={`w-3.5 h-3.5 ${testingImg ? 'animate-spin' : ''}`} />
                <span>Search Image</span>
              </button>
            </div>

            {imgTestResult && imgTestResult.imageUrl && (
              <div className={`p-3 border rounded-md flex items-center gap-3 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <img src={imgTestResult.imageUrl} alt={imgTestWord} className="w-16 h-16 object-cover rounded border" />
                <div className="text-xs">
                  <span className="font-semibold block">Found Image: {imgTestWord}</span>
                  <span className="text-zinc-500 text-[11px]">{imgTestResult.source}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: DEFAULT CARD CONFIG */}
      {activeSubTab === 'defaultCard' && (
        <div
          className={`p-5 border rounded-lg shadow-xs space-y-4 ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h3 className="font-semibold text-sm uppercase">Default Card Creation Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Default Card Type
              </label>
              <select
                value={form.defaultCard?.cardType || 'normal'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultCard: { ...form.defaultCard, cardType: e.target.value as any },
                  })
                }
                className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                  isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                }`}
              >
                <option value="normal">Normal Vocab Card</option>
                <option value="spelling">Spelling Challenge Card</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Default Deck
              </label>
              <input
                type="text"
                value={form.anki.defaultDeck || 'English::B1'}
                onChange={(e) =>
                  setForm({
                    ...form,
                    anki: { ...form.anki, defaultDeck: e.target.value },
                  })
                }
                className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: APPEARANCE & THEMES */}
      {activeSubTab === 'appearance' && (
        <div className="space-y-6">
          {/* 1. APPLICATION LANGUAGE SELECTOR */}
          <div
            className={`p-5 border rounded-lg shadow-xs ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <h3 className="font-semibold text-sm uppercase mb-1 flex items-center gap-2">
              <Languages className="w-4 h-4 text-blue-500" />
              <span>{t('settings.appearance.languageTitle')}</span>
            </h3>
            <p className={`text-xs mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {t('settings.appearance.languageDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: English */}
              <button
                type="button"
                onClick={() => handleLanguageSelect('en')}
                className={`p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                  language === 'en'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-blue-600 dark:border-blue-500 font-semibold shadow-xs'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t('settings.appearance.langEnglish')}</span>
                  {language === 'en' && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {t('settings.appearance.activeBadge')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.appearance.langEnglishDesc')}
                </div>
              </button>

              {/* Option 2: Persian (فارسی) */}
              <button
                type="button"
                onClick={() => handleLanguageSelect('fa')}
                className={`p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                  language === 'fa'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-blue-600 dark:border-blue-500 font-semibold shadow-xs'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t('settings.appearance.langPersian')}</span>
                  {language === 'fa' && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {t('settings.appearance.activeBadge')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.appearance.langPersianDesc')}
                </div>
              </button>
            </div>
          </div>

          {/* 2. APPLICATION INTERFACE DIRECTION SELECTOR */}
          <div
            className={`p-5 border rounded-lg shadow-xs ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <h3 className="font-semibold text-sm uppercase mb-1 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-blue-500" />
              <span>{t('settings.appearance.directionTitle')}</span>
            </h3>
            <p className={`text-xs mb-3 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {t('settings.appearance.directionDesc')}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* Option 1: Left-to-Right (LTR) */}
              <button
                type="button"
                onClick={() => handleDirectionSelect('ltr')}
                className={`p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                  direction === 'ltr'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-blue-600 dark:border-blue-500 font-semibold shadow-xs'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t('settings.appearance.dirLTR')}</span>
                  {direction === 'ltr' && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {t('settings.appearance.activeBadge')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.appearance.dirLTRDesc')}
                </div>
              </button>

              {/* Option 2: Right-to-Left (RTL) */}
              <button
                type="button"
                onClick={() => handleDirectionSelect('rtl')}
                className={`p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                  direction === 'rtl'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-blue-600 dark:border-blue-500 font-semibold shadow-xs'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t('settings.appearance.dirRTL')}</span>
                  {direction === 'rtl' && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {t('settings.appearance.activeBadge')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.appearance.dirRTLDesc')}
                </div>
              </button>
            </div>

            <div className={`p-3 border rounded-md text-xs ${isDark ? 'bg-zinc-900/60 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}`}>
              <div className="font-semibold text-blue-500 mb-0.5">ℹ {t('settings.appearance.independentNoticeTitle')}</div>
              <div>{t('settings.appearance.independentNoticeDesc')}</div>
            </div>
          </div>

          {/* 3. APPLICATION UI THEME SELECTOR - ONLY ANKI LIGHT AND ANKI DARK */}
          <div
            className={`p-5 border rounded-lg shadow-xs ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <h3 className="font-semibold text-sm uppercase mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>{t('settings.appearance.appThemeTitle')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Anki Light */}
              <button
                type="button"
                onClick={() => handleAppThemeSelect('anki-light')}
                className={`p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                  !isDark
                    ? 'bg-blue-50/70 text-blue-950 border-blue-600 font-semibold shadow-xs'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t('settings.appearance.themeLight')}</span>
                  {!isDark && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {t('settings.appearance.activeBadge')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.appearance.themeLightDesc')}
                </div>
              </button>

              {/* Option 2: Anki Dark */}
              <button
                type="button"
                onClick={() => handleAppThemeSelect('anki-dark')}
                className={`p-3.5 border text-left cursor-pointer transition-all rounded-md ${
                  isDark
                    ? 'bg-blue-950/40 text-blue-200 border-blue-500 font-semibold shadow-xs'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t('settings.appearance.themeDark')}</span>
                  {isDark && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      {t('settings.appearance.activeBadge')}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.appearance.themeDarkDesc')}
                </div>
              </button>
            </div>
          </div>

          {/* 4. FLASHCARD NOTE THEMES (8 Themes) */}
          <div
            className={`p-5 border rounded-lg shadow-xs ${
              isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <h3 className="font-semibold text-sm uppercase mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-500" />
              <span>{t('settings.appearance.cardThemesTitle')}</span>
            </h3>

            {/* Light Card Themes */}
            <div className="mb-5">
              <div className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {t('settings.appearance.lightThemesCategory')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {THEME_GROUPS.light.map((th) => {
                  const isSelected = form.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setForm({ ...form, theme: th.id as ThemeId })}
                      className={`p-3 border rounded-md text-left cursor-pointer transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-blue-950/40 border-blue-500 text-white shadow-xs'
                            : 'bg-blue-50 text-blue-950 border-blue-600 shadow-xs'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{th.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                            {t('settings.appearance.selectedBadge')}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {th.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark Card Themes */}
            <div>
              <div className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {t('settings.appearance.darkThemesCategory')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {THEME_GROUPS.dark.map((th) => {
                  const isSelected = form.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setForm({ ...form, theme: th.id as ThemeId })}
                      className={`p-3 border rounded-md text-left cursor-pointer transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-blue-950/40 border-blue-500 text-white shadow-xs'
                            : 'bg-blue-50 text-blue-950 border-blue-600 shadow-xs'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{th.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                            {t('settings.appearance.selectedBadge')}
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {th.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Theme Preview Panel */}
            <div className={`mt-6 pt-5 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {t('settings.appearance.liveThemePreview', { theme: THEMES[form.theme]?.name || form.theme })}
                  </span>
                </div>
                <div className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('settings.appearance.previewSubtitle')}
                </div>
              </div>

              <div
                className={`border rounded-lg p-3 sm:p-5 relative overflow-hidden shadow-xs ${
                  isDark ? 'bg-[#18181B] border-zinc-700 text-zinc-100' : 'bg-zinc-100 border-zinc-200 text-zinc-900'
                }`}
              >
                <CardPreview
                  cardData={{
                    word: 'wanderlust',
                    phonetic: '/ˈwɑːn.dɚ.lʌst/',
                    partOfSpeech: 'noun',
                    meaningFa: 'اشتیاق شدید به سفر، گشت‌وگذار و کشف ناشناخته‌ها',
                    example: 'Her wanderlust led her on an unforgettable backpacking journey across South America.',
                    translationFa: 'اشتیاق شدید او به سفر باعث شد سفری فراموش‌نشدنی را در آمریکای جنوبی آغاز کند.',
                    mnemonic: 'WANDER (گشت زدن) + LUST (میل شدید): میل و اشتیاق بی‌پایان به جهانگردی.',
                    cardType: form.defaultCard?.cardType || 'normal',
                    spellingSentence: 'Her ______ led her on an unforgettable backpacking journey across South America.',
                    wordAudioUsNormalBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
                    wordAudioUsSlowBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
                    wordAudioUkNormalBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
                    wordAudioUkSlowBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
                    exampleAudioUsNormalBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
                    exampleAudioUsSlowBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
                  }}
                  themeId={form.theme}
                  emptyWordPlaceholder="wanderlust"
                  appTheme={isDark ? 'anki-dark' : 'anki-light'}
                  editable={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: ANKI */}
      {activeSubTab === 'anki' && (
        <div
          className={`p-5 border rounded-lg shadow-xs space-y-4 ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h3 className="font-semibold text-sm uppercase">AnkiConnect Integration</h3>
            <button
              type="button"
              onClick={refreshAnkiInfo}
              className={`px-3 py-1 font-medium text-xs rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                isDark
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-750'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                AnkiConnect URL
              </label>
              <input
                type="text"
                value={form.anki.url}
                onChange={(e) => setForm({ ...form, ai: form.ai, anki: { ...form.anki, url: e.target.value } })}
                className={`w-full text-xs font-mono font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold uppercase mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Default Deck
              </label>
              <input
                type="text"
                value={form.anki.defaultDeck}
                onChange={(e) => setForm({ ...form, anki: { ...form.anki, defaultDeck: e.target.value } })}
                className={`w-full text-xs font-medium p-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'bg-white text-zinc-900 border-zinc-300'
                }`}
              />
            </div>
          </div>

          {/* Sync Note Type Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSyncAnkiModel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Sync Note Model to Anki</span>
            </button>
            {ankiModelSyncMsg && (
              <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {ankiModelSyncMsg}
              </span>
            )}
          </div>

          {ankiStatus && (
            <div
              className={`p-3 border rounded-md text-xs flex items-center justify-between ${
                ankiStatus.connected
                  ? isDark
                    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : isDark
                  ? 'bg-rose-950/40 text-rose-200 border-rose-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {ankiStatus.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
                <span>
                  {ankiStatus.connected
                    ? `AnkiConnect is connected (Version: ${ankiStatus.version})`
                    : `AnkiConnect offline: ${ankiStatus.error}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 8: DIAGNOSTICS */}
      {activeSubTab === 'diagnostics' && (
        <div
          className={`p-5 border rounded-lg shadow-xs space-y-4 ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h3 className="font-semibold text-sm uppercase">System Health & Diagnostics</h3>
            <button
              type="button"
              onClick={async () => {
                setRunningDiag(true);
                const rep = await runFullDiagnostics();
                setFullReport(rep);
                setRunningDiag(false);
              }}
              disabled={runningDiag}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Activity className={`w-3.5 h-3.5 ${runningDiag ? 'animate-spin' : ''}`} />
              <span>Run Full System Diagnostic</span>
            </button>
          </div>

          {fullReport && (
            <div className="space-y-3 text-xs">
              <div className={`p-3 border rounded-md ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="font-semibold uppercase mb-1">System Status Overview</div>
                <div>Status: <span className="font-semibold uppercase">{fullReport.status}</span></div>
                <div>Timestamp: {fullReport.timestamp}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(fullReport.services).map(([srv, info]: [string, any]) => (
                  <div
                    key={srv}
                    className={`p-3 border rounded-md ${
                      info.connected || info.ready
                        ? isDark
                          ? 'bg-emerald-950/20 border-emerald-900 text-emerald-200'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : isDark
                        ? 'bg-rose-950/20 border-rose-900 text-rose-200'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="font-semibold uppercase">{srv}</div>
                    <div className="text-[11px] opacity-80">{info.connected || info.ready ? 'Online' : 'Offline'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 9: GUIDE */}
      {activeSubTab === 'guide' && (
        <div
          className={`p-5 border rounded-lg shadow-xs space-y-4 ${
            isDark ? 'bg-[#27272A] border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          <div className={`pb-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
            <h3 className="font-semibold text-sm uppercase">Application Setup & Quick Start Guide</h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div>
              <h4 className="font-semibold mb-1">1. Anki Desktop Integration</h4>
              <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                Install the <code>AnkiConnect</code> add-on in Anki Desktop (code: <code>2055492159</code>). Make sure Anki is open whenever you generate cards.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">2. Local or Online AI</h4>
              <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                Use Ollama locally for 100% offline generation, or enter a Google Gemini / Custom AI API key for high-speed cloud generation.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">3. Card Theme Rendering</h4>
              <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                All card themes are completely embedded into Anki note styling. Cards look identical inside Anki and on mobile Anki apps.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
