import React from 'react';
import { Sparkles, Layers, Sliders, RefreshCw } from 'lucide-react';
import { AppTheme } from '../types';
import { useAppTheme } from '../context/ThemeContext';

export type NavTab = 'create' | 'batch' | 'settings';

interface NavigationStripProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  status: {
    ai: { connected: boolean; label?: string };
    tts: { ready: boolean; label?: string };
    anki: { connected: boolean; version?: number };
  };
  onRefreshStatus: () => void;
  appTheme?: AppTheme;
}

export const NavigationStrip: React.FC<NavigationStripProps> = ({
  currentTab,
  onSelectTab,
  status,
  onRefreshStatus,
  appTheme: propTheme,
}) => {
  const themeContext = useAppTheme();
  const isDark = (propTheme || themeContext.appTheme) === 'anki-dark';

  return (
    <header
      className={`w-full select-none sticky top-0 z-50 p-0 m-0 border-b ${
        isDark ? 'bg-[#1F1F23] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
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
            <span>Create</span>
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
            <span>Batch</span>
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
            <span>Settings</span>
          </button>
        </nav>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 py-2">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium ${
              isDark ? 'bg-zinc-800/60 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
            }`}
            title={`${status.ai.label || 'AI'}: ${status.ai.connected ? 'Connected' : 'Offline'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.ai.connected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline">
              {status.ai.label || 'AI'}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium ${
              isDark ? 'bg-zinc-800/60 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
            }`}
            title={`${status.tts.label || 'TTS'}: ${status.tts.ready ? 'Ready' : 'Standby'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.tts.ready ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="hidden sm:inline">
              {status.tts.label || 'TTS'}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium ${
              isDark ? 'bg-zinc-800/60 text-zinc-300' : 'bg-zinc-100 text-zinc-700'
            }`}
            title={`AnkiConnect: ${status.anki.connected ? 'Connected' : 'Offline'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.anki.connected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline">
              Anki
            </span>
          </div>

          <button
            type="button"
            onClick={onRefreshStatus}
            title="Refresh Connections"
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              isDark
                ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Quick Anki Light / Anki Dark Theme Toggle */}
          <button
            type="button"
            onClick={() => themeContext.toggleTheme()}
            title={isDark ? 'Switch to Anki Light' : 'Switch to Anki Dark'}
            className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-750'
                : 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
            }`}
          >
            {isDark ? (
              <>
                <span className="text-amber-400">☀️</span>
                <span className="hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <span className="text-blue-500">🌙</span>
                <span className="hidden md:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

