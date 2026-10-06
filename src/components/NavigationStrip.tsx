import React from 'react';
import { Sparkles, Layers, Sliders, RefreshCw, Tags, Pin, PinOff, Search } from 'lucide-react';
import { AppTheme } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';

export type NavTab = 'create' | 'batch' | 'complete-by-tag' | 'browser' | 'settings';
export type ServiceState = 'connected' | 'checking' | 'disconnected' | 'disabled';

export interface ServiceIndicatorInfo {
  state?: ServiceState;
  connected?: boolean;
  ready?: boolean;
  label?: string;
  version?: number;
  checking?: boolean;
  error?: string;
}

export interface NavigationStatus {
  ai: ServiceIndicatorInfo;
  tts: ServiceIndicatorInfo;
  anki: ServiceIndicatorInfo;
  isChecking?: boolean;
}

interface NavigationStripProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  status: NavigationStatus;
  onRefreshStatus: () => void;
  appTheme?: AppTheme;
  isPinned?: boolean;
  onTogglePin?: () => void;
  isVisible?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function getIndicatorClasses(isChecking: boolean, isOnline: boolean, isDisabled: boolean = false): { dot: string; container: string } {
  if (isDisabled) {
    return {
      dot: 'bg-zinc-400 dark:bg-zinc-500',
      container: 'border-zinc-400/30 dark:border-zinc-600/30',
    };
  }
  if (isChecking) {
    return {
      dot: 'bg-amber-500 animate-pulse',
      container: 'border-amber-500/30',
    };
  }
  if (isOnline) {
    return {
      dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
      container: 'border-emerald-500/20',
    };
  }
  return {
    dot: 'bg-rose-500',
    container: 'border-rose-500/20',
  };
}

export const NavigationStrip: React.FC<NavigationStripProps> = ({
  currentTab,
  onSelectTab,
  status,
  onRefreshStatus,
  appTheme: propTheme,
  isPinned = false,
  onTogglePin,
  isVisible = true,
  onMouseEnter,
  onMouseLeave,
}) => {
  const themeContext = useAppTheme();
  const { t } = useTranslation();
  const isDark = (propTheme || themeContext.appTheme) === 'anki-dark';

  // AI state
  const isAiDisabled = status.ai.state === 'disabled';
  const isAiChecking = !isAiDisabled && (status.ai.state === 'checking' || !!status.ai.checking);
  const isAiOnline = !isAiDisabled && (status.ai.state === 'connected' || (!isAiChecking && !!status.ai.connected));
  const aiClasses = getIndicatorClasses(isAiChecking, isAiOnline, isAiDisabled);
  const aiTooltip = isAiDisabled
    ? t('nav.aiDisabled', 'AI is currently disabled (Manual mode)')
    : isAiChecking
    ? t('nav.aiChecking', { label: status.ai.label || 'AI' })
    : isAiOnline
    ? t('nav.aiConnected', { label: status.ai.label || 'AI' })
    : t('nav.aiDisconnected', { label: status.ai.label || 'AI' });

  // TTS state
  const isTtsChecking = status.tts.state === 'checking' || !!status.tts.checking;
  const isTtsOnline = status.tts.state === 'connected' || (!isTtsChecking && (!!status.tts.ready || !!status.tts.connected));
  const ttsClasses = getIndicatorClasses(isTtsChecking, isTtsOnline);
  const ttsTooltip = isTtsChecking
    ? t('nav.ttsChecking', { label: status.tts.label || 'TTS' })
    : isTtsOnline
    ? t('nav.ttsReady', { label: status.tts.label || 'TTS' })
    : t('nav.ttsDisconnected', { label: status.tts.label || 'TTS' });

  // Anki state
  const isAnkiChecking = status.anki.state === 'checking' || !!status.anki.checking;
  const isAnkiOnline = status.anki.state === 'connected' || (!isAnkiChecking && !!status.anki.connected);
  const ankiClasses = getIndicatorClasses(isAnkiChecking, isAnkiOnline);
  const ankiTooltip = isAnkiChecking
    ? t('nav.ankiChecking')
    : isAnkiOnline
    ? t('nav.ankiConnected', { version: status.anki.version ? `(v${status.anki.version})` : '' })
    : t('nav.ankiDisconnected');

  const isGlobalChecking = !!status.isChecking || isAiChecking || isTtsChecking || isAnkiChecking;

  return (
    <header
      className={`w-full select-none fixed top-0 left-0 right-0 z-50 p-0 m-0 border-b transition-colors ${
        isDark ? 'bg-[#18181B] border-zinc-800' : 'bg-[#F8FAFC] border-slate-200 shadow-xs'
      }`}
    >
      <div className="w-full flex items-center justify-between px-4 sm:px-6">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onSelectTab('create')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              currentTab === 'create'
                ? isDark
                  ? 'border-blue-500 text-blue-400 bg-blue-950/25 font-semibold'
                  : 'border-blue-600 text-blue-600 bg-blue-50/60 font-semibold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{t('nav.create')}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('batch')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              currentTab === 'batch'
                ? isDark
                  ? 'border-blue-500 text-blue-400 bg-blue-950/25 font-semibold'
                  : 'border-blue-600 text-blue-600 bg-blue-50/60 font-semibold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>{t('nav.batch')}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('complete-by-tag')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              currentTab === 'complete-by-tag'
                ? isDark
                  ? 'border-blue-500 text-blue-400 bg-blue-950/25 font-semibold'
                  : 'border-blue-600 text-blue-600 bg-blue-50/60 font-semibold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Tags className="w-4 h-4 shrink-0" />
            <span>{t('nav.completeByTag')}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('browser')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              currentTab === 'browser'
                ? isDark
                  ? 'border-blue-500 text-blue-400 bg-blue-950/25 font-semibold'
                  : 'border-blue-600 text-blue-600 bg-blue-50/60 font-semibold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>{t('nav.cardBrowser')}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              currentTab === 'settings'
                ? isDark
                  ? 'border-blue-500 text-blue-400 bg-blue-950/25 font-semibold'
                  : 'border-blue-600 text-blue-600 bg-blue-50/60 font-semibold'
                : isDark
                ? 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>{t('nav.settings')}</span>
          </button>
        </nav>

        {/* Live Status Indicators (Anki ● | AI ● | TTS ●) */}
        <div className="flex items-center gap-2 sm:gap-3 py-2">
          {/* 1. Anki Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              isDark ? 'bg-zinc-800/80 text-zinc-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            } ${ankiClasses.container}`}
            title={ankiTooltip}
          >
            <span className="hidden sm:inline font-semibold">
              Anki
            </span>
            <span className={`w-2 h-2 rounded-full transition-colors ${ankiClasses.dot}`} />
          </div>

          {/* 2. AI Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              isDark ? 'bg-zinc-800/80 text-zinc-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            } ${aiClasses.container}`}
            title={aiTooltip}
          >
            <span className="hidden sm:inline font-semibold">
              {isAiDisabled ? 'AI: Off' : 'AI'}
            </span>
            <span className={`w-2 h-2 rounded-full transition-colors ${aiClasses.dot}`} />
          </div>

          {/* 3. TTS Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              isDark ? 'bg-zinc-800/80 text-zinc-200' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            } ${ttsClasses.container}`}
            title={ttsTooltip}
          >
            <span className="hidden sm:inline font-semibold">
              TTS
            </span>
            <span className={`w-2 h-2 rounded-full transition-colors ${ttsClasses.dot}`} />
          </div>

          {/* Manual / Live Refresh Trigger */}
          <button
            type="button"
            onClick={onRefreshStatus}
            title={isGlobalChecking ? t('nav.checkingStatus') : t('nav.refreshStatus')}
            disabled={isGlobalChecking}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              isDark
                ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGlobalChecking ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Quick Anki Light / Anki Dark Theme Toggle */}
          <button
            type="button"
            onClick={() => themeContext.toggleTheme()}
            title={isDark ? t('nav.switchToLight') : t('nav.switchToDark')}
            className={`p-1.5 rounded-md border text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
            }`}
          >
            {isDark ? (
              <span className="text-amber-400 text-xs">☀️</span>
            ) : (
              <span className="text-blue-500 text-xs">🌙</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
