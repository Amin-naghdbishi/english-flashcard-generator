import React from 'react';
import { Sparkles, Layers, Sliders, RefreshCw } from 'lucide-react';

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
}

export const NavigationStrip: React.FC<NavigationStripProps> = ({
  currentTab,
  onSelectTab,
  status,
  onRefreshStatus,
}) => {
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
