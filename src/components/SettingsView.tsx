import React, { useState, useEffect, useMemo } from 'react';
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
  getTTSVoices,
  getPiperServiceStatus,
  controlPiperService,
  synthesizeAudio,
  runTTSDiagnostics,
  checkAnki,
  getAnkiDecks,
  ensureModelInAnki,
  runFullDiagnostics,
  testSmartImage,
  fetchDefaultPrompts,
  restoreDefaultPrompts,
} from '../services/api';
import { DEFAULT_AI_PROMPTS } from '../../server/prompts';
import { OllamaModelTag } from '../../server/ollama';
import { PiperVoice } from '../../server/piper';
import { THEME_GROUPS, THEMES, resolveThemeFromNoteType } from '../themes';
import { useAppTheme, normalizeAppTheme } from '../context/ThemeContext';
import { useTranslation, AppLanguage, AppDirection } from '../i18n';
import { APP_THEME_NOTE_TYPES } from './UnifiedCardEditor';
import {
  Sliders,
  Cpu,
  Volume2,
  Bookmark,
  Palette,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Activity,
  Zap,
  Loader2,
  Sparkles,
  RotateCcw,
  PanelLeft,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  appTheme?: AppTheme;
}

type SettingsTab =
  | 'general'
  | 'personalization'
  | 'ai'
  | 'tts'
  | 'anki'
  | 'prompts'
  | 'advanced';

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const themeContext = useAppTheme();
  const { t, language, setLanguage, direction, setDirection } = useTranslation();
  const [form, setForm] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Collapsible sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('anki_settings_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('anki_settings_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Prompt configuration states
  const [defaultPrompts, setDefaultPrompts] = useState<AIPromptsConfig>(DEFAULT_AI_PROMPTS);
  const [promptSaveStatus, setPromptSaveStatus] = useState<string | null>(null);
  const [isRestoringPrompts, setIsRestoringPrompts] = useState<boolean>(false);
  const [isSavingPrompts, setIsSavingPrompts] = useState<boolean>(false);
  const [personalizationSide, setPersonalizationSide] = useState<'front' | 'back'>('back');

  // Ollama states
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; version?: string; error?: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelTag[]>([]);
  const [testingOllama, setTestingOllama] = useState(false);

  // Gemini states
  const [geminiStatus, setGeminiStatus] = useState<{ connected: boolean; model?: string; error?: string } | null>(null);
  const [geminiModels, setGeminiModels] = useState<Array<{ id: string; name: string }>>([]);
  const [testingGemini, setTestingGemini] = useState(false);

  // Custom AI states
  const [customAiTestResult, setCustomAiTestResult] = useState<{
    connected?: boolean;
    message?: string;
    models?: string[];
    error?: string;
  } | null>(null);
  const [testingCustomAi, setTestingCustomAi] = useState(false);
  const [showApiKeyCustomAi, setShowApiKeyCustomAi] = useState(false);
  const [showApiKeyGemini, setShowApiKeyGemini] = useState(false);

  // TTS states
  const [piperVoices, setPiperVoices] = useState<PiperVoice[]>([]);
  const [piperTesting, setPiperTesting] = useState(false);
  const [piperTestMessage, setPiperTestMessage] = useState<string | null>(null);
  const [customTtsTestResult, setCustomTtsTestResult] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);
  const [testingCustomTts, setTestingCustomTts] = useState(false);
  const [showApiKeyCustomTts, setShowApiKeyCustomTts] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<{
    active: boolean;
    status: string;
    detail?: string;
    error?: string;
  } | null>(null);

  // Smart Images test states
  const [imgTestWord, setImgTestWord] = useState('apple');
  const [imgTestResult, setImgTestResult] = useState<any>(null);
  const [testingImg, setTestingImg] = useState(false);

  // Anki states
  const [ankiStatus, setAnkiStatus] = useState<{ connected: boolean; version?: number; error?: string } | null>(null);
  const [ankiDecks, setAnkiDecks] = useState<string[]>([]);
  const [ankiModelSyncMsg, setAnkiModelSyncMsg] = useState<string | null>(null);
  const [testingAnkiConn, setTestingAnkiConn] = useState(false);

  // Diagnostics Report
  const [fullReport, setFullReport] = useState<DiagnosticsReport | null>(null);
  const [runningDiag, setRunningDiag] = useState(false);

  const isDark = themeContext.isDark;

  // Sync incoming settings
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  // Initial data loading
  useEffect(() => {
    fetchDefaultPrompts()
      .then((res) => {
        if (res) setDefaultPrompts(res);
      })
      .catch(() => {});

    refreshOllamaInfo();
    refreshGeminiInfo();
    refreshTTSInfo();
    refreshPiperServiceStatus();
    refreshAnkiInfo();

    const timer = setInterval(() => {
      refreshAnkiInfo();
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  const refreshOllamaInfo = async () => {
    try {
      const conn = await checkOllama(form.ai.ollama.url);
      setOllamaStatus(conn);
      const modelsRes = await getOllamaModels(form.ai.ollama.url);
      if (modelsRes.success) setOllamaModels(modelsRes.models);
    } catch {}
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

  const refreshPiperServiceStatus = async () => {
    try {
      const st = await getPiperServiceStatus();
      setServiceStatus(st);
    } catch {}
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

  // Immediate setting update & persistence
  const updateAndSave = (updated: AppSettings, feedbackMessage?: string) => {
    setForm(updated);
    onUpdateSettings(updated);
    saveConfig(updated).catch(() => {});
    if (feedbackMessage) {
      setSaveStatus(feedbackMessage);
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const handleLanguageSelect = (newLang: AppLanguage) => {
    const updated = { ...form, language: newLang };
    setLanguage(newLang);
    updateAndSave(updated);
  };

  const handleDirectionSelect = (newDir: AppDirection) => {
    const updated = { ...form, direction: newDir };
    setDirection(newDir);
    updateAndSave(updated);
  };

  const handleAppThemeSelect = (newTheme: AppTheme) => {
    const normalized = normalizeAppTheme(newTheme);
    const updated = { ...form, appTheme: normalized };
    themeContext.setAppTheme(normalized);
    updateAndSave(updated);
  };

  const handleCardThemeSelect = (themeId: ThemeId) => {
    const defaultNoteType = APP_THEME_NOTE_TYPES.find((t) =>
      t.value.toLowerCase().includes(THEMES[themeId]?.name.toLowerCase() || '')
    )?.value || form.anki.defaultNoteType;

    const updated: AppSettings = {
      ...form,
      theme: themeId,
      anki: {
        ...form.anki,
        defaultNoteType: defaultNoteType || form.anki.defaultNoteType,
      },
    };
    updateAndSave(updated);
  };

  const handleDefaultCardTypeSelect = (noteTypeValue: string) => {
    const matchedTheme = resolveThemeFromNoteType(noteTypeValue, form.theme);
    const updated: AppSettings = {
      ...form,
      theme: matchedTheme,
      anki: {
        ...form.anki,
        defaultNoteType: noteTypeValue,
      },
    };
    updateAndSave(updated);
  };

  const handleDefaultDeckSelect = (deck: string) => {
    const updated = {
      ...form,
      anki: { ...form.anki, defaultDeck: deck },
    };
    updateAndSave(updated);
  };

  const handleSaveAll = async () => {
    setSaveStatus('Saving...');
    try {
      const updated = await saveConfig(form);
      onUpdateSettings(updated);
      setSaveStatus('✓ Settings saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`✕ Error: ${err.message}`);
    }
  };

  // Test Custom AI
  const handleTestCustomAi = async () => {
    setTestingCustomAi(true);
    setCustomAiTestResult(null);
    try {
      const activeCustom = form.ai.customProviders?.[0] || {
        id: 'custom_1',
        name: 'Custom Provider',
        protocol: 'openai-compatible' as const,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        temperature: 0.2,
        authType: 'bearer' as const,
      };
      const res = await checkCustomAI(activeCustom);
      setCustomAiTestResult(res);
    } catch (err: any) {
      setCustomAiTestResult({ connected: false, message: err.message, error: err.message });
    }
    setTestingCustomAi(false);
  };

  // Test Custom TTS
  const handleTestCustomTts = async () => {
    setTestingCustomTts(true);
    setCustomTtsTestResult(null);
    try {
      const activeCustom = form.tts.customProviders?.[0] || {
        id: 'custom_tts_1',
        name: 'Custom TTS',
        protocol: 'openai-speech' as const,
        endpoint: 'https://api.openai.com/v1/audio/speech',
        apiKey: '',
        voice: 'alloy',
        model: 'tts-1',
        audioFormat: 'mp3' as const,
        authType: 'bearer' as const,
        httpMethod: 'POST' as const,
      };
      const res = await testCustomTTS(activeCustom);
      setCustomTtsTestResult(res);
    } catch (err: any) {
      setCustomTtsTestResult({ success: false, error: err.message });
    }
    setTestingCustomTts(false);
  };

  // Test Local Piper TTS Voice
  const handleTestLocalPiperVoice = async () => {
    setPiperTesting(true);
    setPiperTestMessage(null);
    try {
      const res = await synthesizeAudio(
        'Welcome to English flashcard generator.',
        form.tts.americanVoice || 'en_US-lessac-high',
        form.tts.normalSpeed || 1.0,
        form.tts.endpoint
      );
      if (res.success && res.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
        audio.play().catch(() => {});
        setPiperTestMessage('✓ Voice synthesized successfully');
      } else {
        setPiperTestMessage(`✕ Synthesis failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setPiperTestMessage(`✕ Error: ${err.message}`);
    }
    setPiperTesting(false);
    setTimeout(() => setPiperTestMessage(null), 4000);
  };

  // Sync Anki Note Model
  const handleSyncAnkiModel = async () => {
    setAnkiModelSyncMsg('Syncing Note Model with Anki...');
    try {
      const res = await ensureModelInAnki(
        form.anki.url,
        form.theme,
        form.defaultCard?.cardType || 'normal'
      );
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

  // Prompt configuration handling
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

  const handleRestoreAllPrompts = async () => {
    setIsRestoringPrompts(true);
    try {
      const res = await restoreDefaultPrompts();
      const newPrompts = res.prompts || DEFAULT_AI_PROMPTS;
      const updated = { ...form, aiPrompts: newPrompts };
      updateAndSave(updated, '✓ Prompts restored to defaults');
    } catch {
      const updated = { ...form, aiPrompts: { ...defaultPrompts } };
      updateAndSave(updated, '✓ Prompts restored to defaults');
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
      setPromptSaveStatus('✓ Prompts saved');
      setTimeout(() => setPromptSaveStatus(null), 3000);
    } catch (err: any) {
      setPromptSaveStatus(`✕ Error: ${err.message}`);
    } finally {
      setIsSavingPrompts(false);
    }
  };

  // Anki Host / Port parsing
  const ankiUrlParts = useMemo(() => {
    try {
      const u = new URL(form.anki.url);
      return { host: u.hostname, port: u.port || '8765', protocol: u.protocol || 'http:' };
    } catch {
      return { host: '127.0.0.1', port: '8765', protocol: 'http:' };
    }
  }, [form.anki.url]);

  const handleAnkiHostPortChange = (host: string, port: string) => {
    const cleanHost = host.trim() || '127.0.0.1';
    const cleanPort = port.trim() || '8765';
    const newUrl = `${ankiUrlParts.protocol}//${cleanHost}:${cleanPort}`;
    setForm((prev) => ({
      ...prev,
      anki: { ...prev.anki, url: newUrl },
    }));
  };

  // Sample card data for the live Card Preview
  const sampleCardData: CardData = {
    word: 'wanderlust',
    phonetic: '/ˈwɑːn.dɚ.lʌst/',
    partOfSpeech: 'noun',
    definitionEn: 'a strong desire to travel and explore the world',
    meaningFa: 'اشتیاق شدید به سفر، گشت‌وگذار و کشف ناشناخته‌ها',
    example: 'Her wanderlust led her on an unforgettable backpacking journey across South America.',
    translationFa: 'اشتیاق شدید او به سفر باعث شد سفری فراموش‌نشدنی را آغاز کند.',
    mnemonic: 'WANDER (گشت زدن) + LUST (میل شدید): میل بی‌پایان به جهانگردی.',
    cardType: 'normal',
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'personalization', label: 'Personalization', icon: Palette },
    { id: 'ai', label: 'AI Providers', icon: Cpu },
    { id: 'tts', label: 'TTS', icon: Volume2 },
    { id: 'anki', label: 'Anki', icon: Bookmark },
    { id: 'prompts', label: 'AI Default Prompts', icon: Sparkles },
    { id: 'advanced', label: 'Advanced', icon: Activity },
  ];

  // Helper: Square selection button (mutually exclusive)
  const SquareOption = ({
    selected,
    label,
    onClick,
  }: {
    selected: boolean;
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium cursor-pointer border select-none transition-colors rounded-none ${
        selected
          ? isDark
            ? 'bg-zinc-800 text-white border-blue-500 font-semibold'
            : 'bg-blue-50 text-blue-900 border-blue-600 font-semibold'
          : isDark
          ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400'
      }`}
    >
      <span
        className={`w-3.5 h-3.5 border flex items-center justify-center transition-colors ${
          selected
            ? 'border-blue-600 bg-blue-600 text-white'
            : isDark
            ? 'border-zinc-500 bg-zinc-800'
            : 'border-zinc-400 bg-white'
        }`}
      >
        {selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
      </span>
      <span>{label}</span>
    </button>
  );

  // Helper: ON / OFF selector
  const OnOffToggle = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <div className="flex items-center gap-2">
      <SquareOption selected={enabled} label="ON" onClick={() => onChange(true)} />
      <SquareOption selected={!enabled} label="OFF" onClick={() => onChange(false)} />
    </div>
  );

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col md:flex-row min-w-0">
      {/* LEFT SIDEBAR: Minimal Navigation */}
      <aside
        className={`shrink-0 transition-all duration-200 flex flex-col border-r border-zinc-200 dark:border-zinc-800 select-none ${
          isSidebarCollapsed ? 'w-full md:w-14' : 'w-full md:w-56'
        } ${isDark ? 'bg-[#18181B] text-zinc-100' : 'bg-[#F8FAFC] text-zinc-900'}`}
      >
        {/* Header */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-500 shrink-0" />
              <span className="font-bold text-xs uppercase tracking-wider truncate">Settings</span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className={`p-1.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer rounded-none ${
              isSidebarCollapsed ? 'mx-auto' : ''
            }`}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Tab List */}
        <nav className="p-1.5 space-y-0.5 overflow-y-auto flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer rounded-none ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                } ${isSidebarCollapsed ? 'justify-center px-1.5' : ''}`}
                title={tab.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 mt-auto">
          {saveStatus && !isSidebarCollapsed && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{saveStatus}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            className={`w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-none flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              isSidebarCollapsed ? 'px-1' : 'px-3'
            }`}
            title="Save Settings"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            {!isSidebarCollapsed && <span>Save Settings</span>}
          </button>
        </div>
      </aside>

      {/* RIGHT CONTENT PANEL: Single-Column Minimal Controls */}
      <main
        className={`flex-1 min-w-0 p-5 sm:p-8 overflow-y-auto ${
          activeTab === 'personalization' ? 'w-full max-w-7xl' : 'max-w-4xl'
        }`}
      >
        {/* Section Title */}
        <div className="flex items-center justify-between pb-3 mb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          {saveStatus && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveStatus}</span>
            </span>
          )}
        </div>

        {/* 1. GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Language */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Language
              </label>
              <div className="flex flex-wrap gap-2">
                <SquareOption
                  selected={language === 'fa'}
                  label="فارسی"
                  onClick={() => handleLanguageSelect('fa')}
                />
                <SquareOption
                  selected={language === 'en'}
                  label="English"
                  onClick={() => handleLanguageSelect('en')}
                />
              </div>
            </div>

            {/* Direction */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Direction
              </label>
              <div className="flex flex-wrap gap-2">
                <SquareOption
                  selected={direction === 'rtl'}
                  label="راست به چپ (RTL)"
                  onClick={() => handleDirectionSelect('rtl')}
                />
                <SquareOption
                  selected={direction === 'ltr'}
                  label="چپ به راست (LTR)"
                  onClick={() => handleDirectionSelect('ltr')}
                />
              </div>
            </div>

            {/* Default Card Type */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Default Card Type
              </label>
              <select
                value={form.anki.defaultNoteType || APP_THEME_NOTE_TYPES[2].value}
                onChange={(e) => handleDefaultCardTypeSelect(e.target.value)}
                className="w-full max-w-md text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
              >
                {APP_THEME_NOTE_TYPES.map((nt) => (
                  <option key={nt.value} value={nt.value}>
                    {nt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Deck */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between max-w-md mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Default Deck
                </label>
                <button
                  type="button"
                  onClick={refreshAnkiInfo}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Decks</span>
                </button>
              </div>
              {ankiDecks.length > 0 ? (
                <select
                  value={form.anki.defaultDeck || 'English::B1'}
                  onChange={(e) => handleDefaultDeckSelect(e.target.value)}
                  className="w-full max-w-md text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
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
                  value={form.anki.defaultDeck || 'English::B1'}
                  onChange={(e) => handleDefaultDeckSelect(e.target.value)}
                  placeholder="e.g. English::B1"
                  className="w-full max-w-md text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                />
              )}
            </div>

            {/* Smart Image Search */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Smart Image Search
              </label>
              <div className="space-y-3">
                <SquareOption
                  selected={form.smartImages?.enabled ?? true}
                  label="Enable Smart Image Search"
                  onClick={() => {
                    const nextVal = !(form.smartImages?.enabled ?? true);
                    updateAndSave({
                      ...form,
                      smartImages: { ...form.smartImages, enabled: nextVal },
                    });
                  }}
                />

                {(form.smartImages?.enabled ?? true) && (
                  <div className="flex items-center gap-2 max-w-md pt-1">
                    <input
                      type="text"
                      value={imgTestWord}
                      onChange={(e) => setImgTestWord(e.target.value)}
                      placeholder="Enter a word to search..."
                      className="flex-1 text-xs font-medium p-2 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {testingImg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Search</span>
                    </button>
                  </div>
                )}

                {imgTestResult && imgTestResult.imageUrl && (form.smartImages?.enabled ?? true) && (
                  <div className="flex items-center gap-3 pt-2">
                    <img
                      src={imgTestResult.imageUrl}
                      alt={imgTestWord}
                      className="w-16 h-16 object-cover border border-zinc-300 dark:border-zinc-700"
                    />
                    <div className="text-xs">
                      <span className="font-semibold block text-zinc-900 dark:text-zinc-100">
                        Result: {imgTestWord}
                      </span>
                      <span className="text-zinc-500 text-[11px]">{imgTestResult.source}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. PERSONALIZATION */}
        {activeTab === 'personalization' && (
          <div className="flex flex-col lg:flex-row items-start gap-8 xl:gap-12 w-full">
            {/* Left Controls Column */}
            <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-6">
              {/* Theme */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Theme
                </label>
                <div className="flex flex-wrap gap-2">
                  <SquareOption
                    selected={form.appTheme === 'anki-dark'}
                    label="Dark"
                    onClick={() => handleAppThemeSelect('anki-dark')}
                  />
                  <SquareOption
                    selected={form.appTheme === 'anki-light' || !form.appTheme}
                    label="Light"
                    onClick={() => handleAppThemeSelect('anki-light')}
                  />
                  <SquareOption
                    selected={form.appTheme === 'system'}
                    label="System"
                    onClick={() => handleAppThemeSelect('system')}
                  />
                </div>
              </div>

              {/* Card Theme */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Card Theme
                </label>
                <select
                  value={form.theme}
                  onChange={(e) => handleCardThemeSelect(e.target.value as ThemeId)}
                  className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                >
                  <optgroup label="Light Card Themes">
                    {THEME_GROUPS.light.map((th) => (
                      <option key={th.id} value={th.id}>
                        {th.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Dark Card Themes">
                    {THEME_GROUPS.dark.map((th) => (
                      <option key={th.id} value={th.id}>
                        {th.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {THEMES[form.theme]?.description || ''}
                </p>
              </div>

              {/* Card Side Toggle */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  Card Side
                </label>
                <div className="flex flex-wrap gap-2">
                  <SquareOption
                    selected={personalizationSide === 'back'}
                    label="Back (Answer)"
                    onClick={() => setPersonalizationSide('back')}
                  />
                  <SquareOption
                    selected={personalizationSide === 'front'}
                    label="Front"
                    onClick={() => setPersonalizationSide('front')}
                  />
                </div>
              </div>
            </div>

            {/* Right: Large Unboxed Card Preview */}
            <div className="flex-1 min-w-0 w-full">
              <div className="w-full max-w-2xl xl:max-w-3xl">
                <CardPreview
                  cardData={sampleCardData}
                  themeId={form.theme}
                  appTheme={isDark ? 'anki-dark' : 'anki-light'}
                  editable={false}
                  mode="preview"
                  activeSide={personalizationSide}
                  viewMode="desktop"
                  hideTopToolbar={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. AI PROVIDERS */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Enable AI Card Generation */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Enable AI Card Generation
              </label>
              <OnOffToggle
                enabled={form.ai?.enabled !== false}
                onChange={(enabled) =>
                  updateAndSave({
                    ...form,
                    ai: { ...form.ai, enabled },
                  })
                }
              />
            </div>

            {form.ai?.enabled !== false && (
              <>
                {/* AI Provider Selection */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    AI
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <SquareOption
                      selected={form.ai.provider === 'ollama'}
                      label="Ollama"
                      onClick={() =>
                        updateAndSave({ ...form, ai: { ...form.ai, provider: 'ollama' } })
                      }
                    />
                    <SquareOption
                      selected={form.ai.provider === 'gemini'}
                      label="Gemini"
                      onClick={() =>
                        updateAndSave({ ...form, ai: { ...form.ai, provider: 'gemini' } })
                      }
                    />
                    <SquareOption
                      selected={form.ai.provider === 'custom'}
                      label="Custom"
                      onClick={() =>
                        updateAndSave({ ...form, ai: { ...form.ai, provider: 'custom' } })
                      }
                    />
                  </div>
                </div>

                {/* Ollama Configuration */}
                {form.ai.provider === 'ollama' && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Endpoint
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
                            },
                          })
                        }
                        placeholder="http://localhost:11434"
                        className="w-full text-xs font-mono p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Model
                      </label>
                      {ollamaModels.length > 0 ? (
                        <select
                          value={form.ai.ollama.model}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              ai: {
                                ...form.ai,
                                ollama: { ...form.ai.ollama, model: e.target.value },
                              },
                            })
                          }
                          className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                        >
                          {ollamaModels.map((m) => (
                            <option key={m.name} value={m.name}>
                              {m.name}
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
                              ai: {
                                ...form.ai,
                                ollama: { ...form.ai.ollama, model: e.target.value },
                              },
                            })
                          }
                          placeholder="e.g. qwen3:30b"
                          className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setTestingOllama(true);
                          await refreshOllamaInfo();
                          setTestingOllama(false);
                        }}
                        disabled={testingOllama}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {testingOllama ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>Test Connection</span>
                      </button>

                      {ollamaStatus && (
                        <span className="text-xs flex items-center gap-1">
                          {ollamaStatus.connected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          <span
                            className={
                              ollamaStatus.connected
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {ollamaStatus.connected
                              ? `Connected (${ollamaStatus.version || 'Ollama'})`
                              : ollamaStatus.error || 'Offline'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Gemini Configuration */}
                {form.ai.provider === 'gemini' && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeyGemini ? 'text' : 'password'}
                          value={form.ai.gemini.apiKey}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              ai: {
                                ...form.ai,
                                gemini: { ...form.ai.gemini, apiKey: e.target.value },
                              },
                            })
                          }
                          placeholder="AIzaSy..."
                          className="w-full text-xs font-mono p-2.5 pr-10 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeyGemini(!showApiKeyGemini)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          {showApiKeyGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Model
                      </label>
                      {geminiModels.length > 0 ? (
                        <select
                          value={form.ai.gemini.model}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              ai: {
                                ...form.ai,
                                gemini: { ...form.ai.gemini, model: e.target.value },
                              },
                            })
                          }
                          className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                        >
                          {geminiModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name || m.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={form.ai.gemini.model}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              ai: {
                                ...form.ai,
                                gemini: { ...form.ai.gemini, model: e.target.value },
                              },
                            })
                          }
                          placeholder="gemini-2.5-flash"
                          className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setTestingGemini(true);
                          try {
                            const res = await checkGemini(
                              form.ai.gemini.apiKey,
                              form.ai.gemini.model
                            );
                            setGeminiStatus(res);
                          } catch (err: any) {
                            setGeminiStatus({ connected: false, error: err.message });
                          }
                          setTestingGemini(false);
                        }}
                        disabled={testingGemini || !form.ai.gemini.apiKey}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {testingGemini ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>Test Connection</span>
                      </button>

                      {geminiStatus && (
                        <span className="text-xs flex items-center gap-1">
                          {geminiStatus.connected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          <span
                            className={
                              geminiStatus.connected
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {geminiStatus.connected ? 'Gemini API Connected' : geminiStatus.error}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Configuration */}
                {form.ai.provider === 'custom' && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        API Endpoint
                      </label>
                      <input
                        type="text"
                        value={form.ai.customProviders?.[0]?.baseUrl || 'https://api.openai.com/v1'}
                        onChange={(e) => {
                          const updatedCustom: CustomAIProviderConfig = {
                            ...(form.ai.customProviders?.[0] || {
                              id: 'custom_1',
                              name: 'Custom Provider',
                              protocol: 'openai-compatible',
                              apiKey: '',
                              model: 'gpt-4o-mini',
                            }),
                            baseUrl: e.target.value,
                          };
                          setForm({
                            ...form,
                            ai: { ...form.ai, customProviders: [updatedCustom] },
                          });
                        }}
                        placeholder="https://api.openai.com/v1"
                        className="w-full text-xs font-mono p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeyCustomAi ? 'text' : 'password'}
                          value={form.ai.customProviders?.[0]?.apiKey || ''}
                          onChange={(e) => {
                            const updatedCustom: CustomAIProviderConfig = {
                              ...(form.ai.customProviders?.[0] || {
                                id: 'custom_1',
                                name: 'Custom Provider',
                                protocol: 'openai-compatible',
                                baseUrl: 'https://api.openai.com/v1',
                                model: 'gpt-4o-mini',
                              }),
                              apiKey: e.target.value,
                            };
                            setForm({
                              ...form,
                              ai: { ...form.ai, customProviders: [updatedCustom] },
                            });
                          }}
                          placeholder="sk-..."
                          className="w-full text-xs font-mono p-2.5 pr-10 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeyCustomAi(!showApiKeyCustomAi)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          {showApiKeyCustomAi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Model
                      </label>
                      <input
                        type="text"
                        value={form.ai.customProviders?.[0]?.model || 'gpt-4o-mini'}
                        onChange={(e) => {
                          const updatedCustom: CustomAIProviderConfig = {
                            ...(form.ai.customProviders?.[0] || {
                              id: 'custom_1',
                              name: 'Custom Provider',
                              protocol: 'openai-compatible',
                              baseUrl: 'https://api.openai.com/v1',
                              apiKey: '',
                            }),
                            model: e.target.value,
                          };
                          setForm({
                            ...form,
                            ai: { ...form.ai, customProviders: [updatedCustom] },
                          });
                        }}
                        placeholder="gpt-4o-mini"
                        className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleTestCustomAi}
                        disabled={testingCustomAi}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {testingCustomAi ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>Test Connection</span>
                      </button>

                      {customAiTestResult && (
                        <span className="text-xs flex items-center gap-1">
                          {customAiTestResult.connected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          <span
                            className={
                              customAiTestResult.connected
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {customAiTestResult.connected
                              ? 'Custom AI Connected'
                              : customAiTestResult.error || customAiTestResult.message || 'Failed'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 4. TTS */}
        {activeTab === 'tts' && (
          <div className="space-y-6">
            {/* Enable TTS */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                Enable TTS
              </label>
              <OnOffToggle
                enabled={form.tts?.enabled !== false}
                onChange={(enabled) =>
                  updateAndSave({
                    ...form,
                    tts: { ...form.tts, enabled },
                  })
                }
              />
            </div>

            {form.tts?.enabled !== false && (
              <>
                {/* TTS Provider */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    TTS
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <SquareOption
                      selected={form.tts.provider === 'piper'}
                      label="Local"
                      onClick={() =>
                        updateAndSave({ ...form, tts: { ...form.tts, provider: 'piper' } })
                      }
                    />
                    <SquareOption
                      selected={form.tts.provider === 'custom'}
                      label="Custom"
                      onClick={() =>
                        updateAndSave({ ...form, tts: { ...form.tts, provider: 'custom' } })
                      }
                    />
                  </div>
                </div>

                {/* Local TTS Configuration */}
                {form.tts.provider === 'piper' && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Engine
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Piper (Offline Neural TTS)"
                        className="w-full text-xs font-medium p-2.5 border rounded-none bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 select-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Voice
                        </label>
                        <button
                          type="button"
                          onClick={() => refreshTTSInfo(form.tts.endpoint)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Fetch Voices</span>
                        </button>
                      </div>
                      {piperVoices.length > 0 ? (
                        <select
                          value={form.tts.americanVoice || 'en_US-lessac-high'}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              tts: { ...form.tts, americanVoice: e.target.value },
                            })
                          }
                          className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                        >
                          {piperVoices.map((v) => (
                            <option key={v.key} value={v.key}>
                              {v.name} ({v.quality || 'normal'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={form.tts.americanVoice || 'en_US-lessac-high'}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              tts: { ...form.tts, americanVoice: e.target.value },
                            })
                          }
                          placeholder="en_US-lessac-high"
                          className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleTestLocalPiperVoice}
                        disabled={piperTesting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {piperTesting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>Test Voice</span>
                      </button>

                      {piperTestMessage && (
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          {piperTestMessage}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom TTS Configuration */}
                {form.tts.provider === 'custom' && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Endpoint
                      </label>
                      <input
                        type="text"
                        value={
                          form.tts.customProviders?.[0]?.endpoint ||
                          'https://api.openai.com/v1/audio/speech'
                        }
                        onChange={(e) => {
                          const updatedCustom: CustomTTSProviderConfig = {
                            ...(form.tts.customProviders?.[0] || {
                              id: 'custom_tts_1',
                              name: 'Custom TTS',
                              protocol: 'openai-speech',
                              apiKey: '',
                              voice: 'alloy',
                            }),
                            endpoint: e.target.value,
                          };
                          setForm({
                            ...form,
                            tts: { ...form.tts, customProviders: [updatedCustom] },
                          });
                        }}
                        placeholder="https://api.openai.com/v1/audio/speech"
                        className="w-full text-xs font-mono p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeyCustomTts ? 'text' : 'password'}
                          value={form.tts.customProviders?.[0]?.apiKey || ''}
                          onChange={(e) => {
                            const updatedCustom: CustomTTSProviderConfig = {
                              ...(form.tts.customProviders?.[0] || {
                                id: 'custom_tts_1',
                                name: 'Custom TTS',
                                protocol: 'openai-speech',
                                endpoint: 'https://api.openai.com/v1/audio/speech',
                                voice: 'alloy',
                              }),
                              apiKey: e.target.value,
                            };
                            setForm({
                              ...form,
                              tts: { ...form.tts, customProviders: [updatedCustom] },
                            });
                          }}
                          placeholder="sk-..."
                          className="w-full text-xs font-mono p-2.5 pr-10 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeyCustomTts(!showApiKeyCustomTts)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          {showApiKeyCustomTts ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Voice
                      </label>
                      <input
                        type="text"
                        value={form.tts.customProviders?.[0]?.voice || 'alloy'}
                        onChange={(e) => {
                          const updatedCustom: CustomTTSProviderConfig = {
                            ...(form.tts.customProviders?.[0] || {
                              id: 'custom_tts_1',
                              name: 'Custom TTS',
                              protocol: 'openai-speech',
                              endpoint: 'https://api.openai.com/v1/audio/speech',
                              apiKey: '',
                            }),
                            voice: e.target.value,
                          };
                          setForm({
                            ...form,
                            tts: { ...form.tts, customProviders: [updatedCustom] },
                          });
                        }}
                        placeholder="alloy"
                        className="w-full text-xs font-medium p-2.5 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleTestCustomTts}
                        disabled={testingCustomTts}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {testingCustomTts ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>Test Voice</span>
                      </button>

                      {customTtsTestResult && (
                        <span className="text-xs flex items-center gap-1">
                          {customTtsTestResult.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                          <span
                            className={
                              customTtsTestResult.success
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {customTtsTestResult.success
                              ? 'Custom Voice Verified'
                              : customTtsTestResult.error || 'Failed'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 5. ANKI */}
        {activeTab === 'anki' && (
          <div className="space-y-4 max-w-lg">
            {/* Connection Status Row */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Connection
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    ankiStatus?.connected ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span
                  className={`font-medium ${
                    ankiStatus?.connected
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {ankiStatus?.connected
                    ? `Connected (Version: ${ankiStatus.version})`
                    : `Offline: ${ankiStatus?.error || 'Cannot reach AnkiConnect'}`}
                </span>
              </div>
            </div>

            {/* Host */}
            <div className="flex items-center justify-between gap-4">
              <label className="w-36 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Host
              </label>
              <input
                type="text"
                value={ankiUrlParts.host}
                onChange={(e) => handleAnkiHostPortChange(e.target.value, ankiUrlParts.port)}
                placeholder="127.0.0.1"
                className="flex-1 text-xs font-mono p-2 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
              />
            </div>

            {/* Port */}
            <div className="flex items-center justify-between gap-4">
              <label className="w-36 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Port
              </label>
              <input
                type="text"
                value={ankiUrlParts.port}
                onChange={(e) => handleAnkiHostPortChange(ankiUrlParts.host, e.target.value)}
                placeholder="8765"
                className="flex-1 text-xs font-mono p-2 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
              />
            </div>

            {/* Default Deck */}
            <div className="flex items-center justify-between gap-4">
              <label className="w-36 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Default Deck
              </label>
              {ankiDecks.length > 0 ? (
                <select
                  value={form.anki.defaultDeck || 'English::B1'}
                  onChange={(e) => handleDefaultDeckSelect(e.target.value)}
                  className="flex-1 text-xs font-medium p-2 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
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
                  value={form.anki.defaultDeck || 'English::B1'}
                  onChange={(e) => handleDefaultDeckSelect(e.target.value)}
                  placeholder="English::B1"
                  className="flex-1 text-xs font-medium p-2 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
                />
              )}
            </div>

            {/* Default Card Type */}
            <div className="flex items-center justify-between gap-4">
              <label className="w-36 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Default Card Type
              </label>
              <select
                value={form.anki.defaultNoteType || APP_THEME_NOTE_TYPES[2].value}
                onChange={(e) => handleDefaultCardTypeSelect(e.target.value)}
                className="flex-1 text-xs font-medium p-2 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
              >
                {APP_THEME_NOTE_TYPES.map((nt) => (
                  <option key={nt.value} value={nt.value}>
                    {nt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={async () => {
                  setTestingAnkiConn(true);
                  await refreshAnkiInfo();
                  setTestingAnkiConn(false);
                }}
                disabled={testingAnkiConn}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {testingAnkiConn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAnkiModel}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Sync Note Model</span>
              </button>
            </div>

            {ankiModelSyncMsg && (
              <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 pt-1">
                {ankiModelSyncMsg}
              </p>
            )}
          </div>
        )}

        {/* 6. AI DEFAULT PROMPTS */}
        {activeTab === 'prompts' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Card Generation Prompt (System Role)
              </label>
              <textarea
                rows={3}
                value={currentPrompts.systemRole || ''}
                onChange={(e) => handlePromptChange('systemRole', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                English Definition Prompt
              </label>
              <textarea
                rows={4}
                value={currentPrompts.definitionGeneration || ''}
                onChange={(e) => handlePromptChange('definitionGeneration', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Example Sentence Prompt
              </label>
              <textarea
                rows={3}
                value={currentPrompts.exampleGeneration || ''}
                onChange={(e) => handlePromptChange('exampleGeneration', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Persian Meaning Prompt
              </label>
              <textarea
                rows={3}
                value={currentPrompts.meaningGeneration || ''}
                onChange={(e) => handlePromptChange('meaningGeneration', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Memory Aid Prompt
              </label>
              <textarea
                rows={6}
                value={currentPrompts.memoryHook || ''}
                onChange={(e) => handlePromptChange('memoryHook', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Example Translation Prompt
              </label>
              <textarea
                rows={3}
                value={currentPrompts.exampleTranslation || ''}
                onChange={(e) => handlePromptChange('exampleTranslation', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Phonetics & Part of Speech Prompt
              </label>
              <textarea
                rows={3}
                value={currentPrompts.phoneticAndPos || ''}
                onChange={(e) => handlePromptChange('phoneticAndPos', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Missing Field Completion Prompt
              </label>
              <textarea
                rows={6}
                value={currentPrompts.missingFieldCompletion || ''}
                onChange={(e) => handlePromptChange('missingFieldCompletion', e.target.value)}
                className="w-full text-xs font-mono p-3 border rounded-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 leading-relaxed"
              />
            </div>

            {/* Prompt Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleSaveCustomPrompts}
                disabled={isSavingPrompts}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isSavingPrompts ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Prompts</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreAllPrompts}
                disabled={isRestoringPrompts}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isRestoringPrompts ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Restore Defaults</span>
              </button>

              {promptSaveStatus && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {promptSaveStatus}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 7. ADVANCED */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* System Diagnostics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  System Health & Diagnostics
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    setRunningDiag(true);
                    const rep = await runFullDiagnostics();
                    setFullReport(rep);
                    setRunningDiag(false);
                  }}
                  disabled={runningDiag}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Activity className={`w-3.5 h-3.5 ${runningDiag ? 'animate-spin' : ''}`} />
                  <span>Run Full Diagnostic</span>
                </button>
              </div>

              {fullReport && (
                <div className="space-y-3 text-xs pt-1">
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span>
                      Overall Status:{' '}
                      <strong className="uppercase font-bold text-blue-600 dark:text-blue-400">
                        {fullReport.status}
                      </strong>
                    </span>
                    <span className="text-zinc-400">|</span>
                    <span>Timestamp: {fullReport.timestamp}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(fullReport.services).map(([srv, info]: [string, any]) => {
                      const isOnline = info.connected || info.ready;
                      return (
                        <div
                          key={srv}
                          className={`p-2.5 border rounded-none flex items-center justify-between ${
                            isOnline
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          }`}
                        >
                          <span className="font-semibold uppercase text-[11px]">{srv}</span>
                          <span className="text-[11px] font-medium">
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Application Quick Start Guide */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Setup & Integration Guide
              </label>

              <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">
                    1. Anki Desktop Integration
                  </div>
                  <p>
                    Install the AnkiConnect add-on in Anki Desktop (code: <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-none">2055492159</code>). Make sure Anki Desktop is running whenever generating or syncing cards.
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">
                    2. AI Generation Setup
                  </div>
                  <p>
                    Run Ollama locally for 100% offline generation, or enter a Google Gemini API key or OpenAI-compatible custom endpoint for cloud generation.
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">
                    3. Card Theme Rendering
                  </div>
                  <p>
                    All card themes are completely embedded into the Anki note styling. Cards look identical inside this application, Anki Desktop, and AnkiMobile/AnkiDroid.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
