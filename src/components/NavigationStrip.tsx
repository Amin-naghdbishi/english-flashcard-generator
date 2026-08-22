import React from 'react';
import { Sparkles, Layers, Sliders, RefreshCw } from 'lucide-react';
import { AppTheme } from '../types';

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
  appTheme = 'comic',
}) => {
  const isMinimalLight = appTheme === 'minimal-light';
  const isMinimalDark = appTheme === 'minimal-dark';
  const isMinimal = isMinimalLight || isMinimalDark;

  if (isMinimal) {
    return (
      <header
        className={`w-full select-none sticky top-0 z-50 p-0 m-0 border-b ${
          isMinimalLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#18181B] border-zinc-800 shadow-md'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-6">
          {/* Minimal Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onSelectTab('create')}
              className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                currentTab === 'create'
                  ? isMinimalLight
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-blue-500 text-blue-400 bg-blue-950/20'
                  : isMinimalLight
                  ? 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Create</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('batch')}
              className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                currentTab === 'batch'
                  ? isMinimalLight
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-blue-500 text-blue-400 bg-blue-950/20'
                  : isMinimalLight
                  ? 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Batch</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className={`py-3 sm:py-3.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? isMinimalLight
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-blue-500 text-blue-400 bg-blue-950/20'
                  : isMinimalLight
                  ? 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Minimal Status Dots */}
          <div className="flex items-center gap-2 sm:gap-3 py-2">
            <div
              className="flex items-center gap-1.5"
              title={`${status.ai.label || 'AI'}: ${status.ai.connected ? 'Connected' : 'Offline'}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status.ai.connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className={`hidden sm:inline text-[11px] font-medium ${isMinimalLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                {status.ai.label || 'AI'}
              </span>
            </div>

            <div
              className="flex items-center gap-1.5"
              title={`${status.tts.label || 'TTS'}: ${status.tts.ready ? 'Ready' : 'Standby'}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status.tts.ready ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className={`hidden sm:inline text-[11px] font-medium ${isMinimalLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                {status.tts.label || 'TTS'}
              </span>
            </div>

            <div
              className="flex items-center gap-1.5"
              title={`AnkiConnect: ${status.anki.connected ? 'Connected' : 'Offline'}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status.anki.connected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className={`hidden sm:inline text-[11px] font-medium ${isMinimalLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Anki
              </span>
            </div>

            <button
              type="button"
              onClick={onRefreshStatus}
              title="Refresh Connections"
              className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                isMinimalLight
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // COMIC CHEERFUL NAVIGATION
  return (
    <header className="w-full bg-[#FFFFFF] border-b-4 border-black select-none sticky top-0 z-50 p-0 m-0">
      <div className="w-full flex items-stretch">
        {/* CREATE TAB - #3ABEFF */}
        <button
          type="button"
          onClick={() => onSelectTab('create')}
          className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 text-base sm:text-lg md:text-xl font-black border-r-4 border-black transition-colors flex items-center justify-center gap-2 select-none cursor-pointer ${
            currentTab === 'create'
              ? 'bg-[#3ABEFF] text-black shadow-inner'
              : 'bg-[#FFFFFF] text-black hover:bg-[#e0f4ff]'
          }`}
        >
          <Sparkles className="w-5 h-5 shrink-0" />
          <span>CREATE</span>
        </button>

        {/* BATCH TAB - #4ADE80 */}
        <button
          type="button"
          onClick={() => onSelectTab('batch')}
          className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 text-base sm:text-lg md:text-xl font-black border-r-4 border-black transition-colors flex items-center justify-center gap-2 select-none cursor-pointer ${
            currentTab === 'batch'
              ? 'bg-[#4ADE80] text-black shadow-inner'
              : 'bg-[#FFFFFF] text-black hover:bg-[#e6fbf0]'
          }`}
        >
          <Layers className="w-5 h-5 shrink-0" />
          <span>BATCH</span>
        </button>

        {/* SETTINGS TAB - #A78BFA */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 text-base sm:text-lg md:text-xl font-black border-r-4 border-black transition-colors flex items-center justify-center gap-2 select-none cursor-pointer ${
            currentTab === 'settings'
              ? 'bg-[#A78BFA] text-black shadow-inner'
              : 'bg-[#FFFFFF] text-black hover:bg-[#f3efff]'
          }`}
        >
          <Sliders className="w-5 h-5 shrink-0" />
          <span>SETTINGS</span>
        </button>

        {/* Compact Live Status Dots & Refresh (Right Corner) */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 bg-[#FBF9F5] shrink-0 border-l sm:border-l-0 border-black">
          <div className="flex items-center gap-1" title={`${status.ai.label || 'AI'}: ${status.ai.connected ? 'Connected' : 'Offline'}`}>
            <span
              className={`w-2 sm:w-2.5 h-2 sm:h-2.5 border border-black ${
                status.ai.connected ? 'bg-[#4ADE80]' : 'bg-[#FF4B4B]'
              }`}
            />
            <span className="hidden sm:inline text-[10px] font-black uppercase text-black">{status.ai.label || 'AI'}</span>
          </div>

          <div className="flex items-center gap-1" title={`${status.tts.label || 'TTS'}: ${status.tts.ready ? 'Ready' : 'Standby'}`}>
            <span
              className={`w-2 sm:w-2.5 h-2 sm:h-2.5 border border-black ${
                status.tts.ready ? 'bg-[#4ADE80]' : 'bg-[#FFD93D]'
              }`}
            />
            <span className="hidden sm:inline text-[10px] font-black uppercase text-black">{status.tts.label || 'TTS'}</span>
          </div>

          <div className="flex items-center gap-1" title={`AnkiConnect: ${status.anki.connected ? 'Connected' : 'Offline'}`}>
            <span
              className={`w-2 sm:w-2.5 h-2 sm:h-2.5 border border-black ${
                status.anki.connected ? 'bg-[#4ADE80]' : 'bg-[#FF4B4B]'
              }`}
            />
            <span className="hidden sm:inline text-[10px] font-black uppercase text-black">Anki</span>
          </div>

          <button
            type="button"
            onClick={onRefreshStatus}
            title="Refresh Connections"
            className="p-1 bg-[#FFD93D] hover:bg-[#ffe066] text-black border border-black shadow-[1px_1px_0px_#000000] cursor-pointer active:translate-y-0.5 ml-0.5 sm:ml-1"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
