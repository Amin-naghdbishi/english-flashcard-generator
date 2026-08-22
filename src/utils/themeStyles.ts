import { AppTheme } from '../types';

export function getThemeClasses(theme: AppTheme) {
  const isMinimalLight = theme === 'minimal-light';
  const isMinimalDark = theme === 'minimal-dark';
  const isMinimal = isMinimalLight || isMinimalDark;

  return {
    // Top app background
    appBg: isMinimalLight
      ? 'bg-[#F8FAFC] text-slate-900'
      : isMinimalDark
      ? 'bg-[#18181B] text-zinc-100'
      : 'bg-[#FAF8F5] text-black',

    // Main header / banner box
    banner: isMinimalLight
      ? 'bg-white p-5 border border-slate-200 rounded-lg shadow-sm'
      : isMinimalDark
      ? 'bg-[#27272A] p-5 border border-zinc-700 rounded-lg shadow-sm'
      : 'bg-[#FFD93D] p-5 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black',

    // Primary Container / Bento Panel
    panel: isMinimalLight
      ? 'bg-white p-5 sm:p-6 border border-slate-200 rounded-lg shadow-sm text-slate-800'
      : isMinimalDark
      ? 'bg-[#27272A] p-5 sm:p-6 border border-zinc-700 rounded-lg shadow-sm text-zinc-100'
      : 'bg-white p-5 sm:p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black',

    // Secondary / Accent Box
    accentPanel: isMinimalLight
      ? 'bg-slate-50 p-4 border border-slate-200 rounded-lg'
      : isMinimalDark
      ? 'bg-zinc-900/60 p-4 border border-zinc-700 rounded-lg'
      : 'bg-[#F5F2EB] p-4 border-4 border-black shadow-[4px_4px_0px_#000000]',

    // Input fields
    input: isMinimalLight
      ? 'w-full bg-white text-slate-900 text-sm font-medium p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400'
      : isMinimalDark
      ? 'w-full bg-[#18181B] text-zinc-100 text-sm font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-zinc-500'
      : 'w-full border-4 border-black p-3 bg-white text-black text-base font-bold rounded-none focus:outline-none placeholder:text-zinc-400',

    // Primary action button (e.g. Save, Build Flashcard, Execute)
    primaryBtn: isMinimalLight
      ? 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:translate-y-0'
      : isMinimalDark
      ? 'px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-md shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:translate-y-0'
      : 'px-5 py-3 bg-[#FF4B4B] hover:bg-[#ff6161] text-white font-black text-sm uppercase border-4 border-black shadow-[4px_4px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5',

    // Secondary / neutral button
    secondaryBtn: isMinimalLight
      ? 'px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-300 rounded-md shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors'
      : isMinimalDark
      ? 'px-3.5 py-1.5 bg-[#27272A] hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-600 rounded-md shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors'
      : 'px-4 py-2 bg-[#FFD93D] hover:bg-[#ffe066] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5',

    // Badge / Pill
    badge: isMinimalLight
      ? 'text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded'
      : isMinimalDark
      ? 'text-xs font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded'
      : 'text-xs font-black uppercase px-2 py-0.5 bg-black text-[#FFD93D] border border-black',

    // Section title
    sectionTitle: isMinimalLight
      ? 'text-lg font-bold text-slate-900'
      : isMinimalDark
      ? 'text-lg font-bold text-zinc-100'
      : 'text-2xl font-black uppercase italic tracking-tight text-black',

    // Sub-title / label
    label: isMinimalLight
      ? 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1'
      : isMinimalDark
      ? 'block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1'
      : 'block text-xs font-black uppercase tracking-wider text-black mb-1',

    // Divider
    divider: isMinimalLight
      ? 'border-t border-slate-200'
      : isMinimalDark
      ? 'border-t border-zinc-700'
      : 'border-t-2 border-black',
  };
}
