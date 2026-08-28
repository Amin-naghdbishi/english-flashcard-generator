import React from 'react';
import { Sparkles, Layers, Sliders, RefreshCw, Tags, Pin, PinOff } from 'lucide-react';
import { AppTheme } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';

export type NavTab = 'create' | 'batch' | 'complete-by-tag' | 'settings';
export type ServiceState = 'connected' | 'checking' | 'disconnected';

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

function getIndicatorClasses(isChecking: boolean, isOnline: boolean): { dot: string; container: string } {
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
  const isAiChecking = status.ai.state === 'checking' || !!status.ai.checking;
  const isAiOnline = status.ai.state === 'connected' || (!isAiChecking && !!status.ai.connected);
  const aiClasses = getIndicatorClasses(isAiChecking, isAiOnline);
  const aiTooltip = isAiChecking
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`w-full select-none fixed top-0 left-0 right-0 z-50 p-0 m-0 border-b transition-all duration-300 ease-out transform ${
        isVisible
          ? 'translate-y-0 opacity-100 shadow-md pointer-events-auto'
          : '-translate-y-full opacity-0 pointer-events-none'
      } ${
        isDark ? 'bg-[#1F1F23]/95 backdrop-blur-md border-zinc-800' : 'bg-white/95 backdrop-blur-md border-zinc-200 shadow-xs'
      }`}
    >
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-6">
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
              isDark ? 'bg-zinc-800/80 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
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
              isDark ? 'bg-zinc-800/80 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
            } ${aiClasses.container}`}
            title={aiTooltip}
          >
            <span className="hidden sm:inline font-semibold">
              AI
            </span>
            <span className={`w-2 h-2 rounded-full transition-colors ${aiClasses.dot}`} />
          </div>

          {/* 3. TTS Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              isDark ? 'bg-zinc-800/80 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
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
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGlobalChecking ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Pin / Auto-Hide Toggle */}
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? t('nav.unpinToolbar') : t('nav.pinToolbar')}
              className={`p-1.5 rounded-md border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isPinned
                  ? isDark
                    ? 'border-blue-500/70 bg-blue-950/50 text-blue-400 font-semibold'
                    : 'border-blue-400 bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : isDark
                  ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline text-[11px]">
                {isPinned ? 'Pinned' : 'Auto-Hide'}
              </span>
            </button>
          )}

          {/* Quick Anki Light / Anki Dark Theme Toggle */}
          <button
            type="button"
            onClick={() => themeContext.toggleTheme()}
            title={isDark ? t('nav.switchToLight') : t('nav.switchToDark')}
            className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-750'
                : 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
            }`}
          >
            {isDark ? (
              <>
                <span className="text-amber-400">☀️</span>
                <span className="hidden md:inline">{t('nav.light')}</span>
              </>
            ) : (
              <>
                <span className="text-blue-500">🌙</span>
                <span className="hidden md:inline">{t('nav.dark')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
