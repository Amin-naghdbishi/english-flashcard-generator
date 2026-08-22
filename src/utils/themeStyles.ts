import { AppTheme } from '../types';

export function getThemeClasses(theme?: AppTheme | string) {
  const isDark = theme === 'anki-dark' || theme === 'minimal-dark';

  return {
    // Top app background
    appBg: isDark
      ? 'bg-[#18181B] text-zinc-100 min-h-screen'
      : 'bg-[#F4F4F5] text-zinc-900 min-h-screen',

    // Main header / banner box
    banner: isDark
      ? 'bg-[#27272A] p-4 sm:p-5 border border-zinc-700 rounded-lg shadow-sm text-zinc-100'
      : 'bg-white p-4 sm:p-5 border border-zinc-200 rounded-lg shadow-sm text-zinc-900',

    // Primary Container / Panel
    panel: isDark
      ? 'bg-[#27272A] p-4 sm:p-6 border border-zinc-700 rounded-lg shadow-sm text-zinc-100'
      : 'bg-white p-4 sm:p-6 border border-zinc-200 rounded-lg shadow-sm text-zinc-900',

    // Secondary / Accent Box
    accentPanel: isDark
      ? 'bg-[#18181B] p-3.5 sm:p-4 border border-zinc-700/80 rounded-md text-zinc-200'
      : 'bg-[#FAFAFA] p-3.5 sm:p-4 border border-zinc-200 rounded-md text-zinc-800',

    // Input fields
    input: isDark
      ? 'w-full bg-[#18181B] text-zinc-100 text-sm font-medium p-2.5 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500'
      : 'w-full bg-white text-zinc-900 text-sm font-medium p-2.5 border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-400',

    // Primary action button (e.g. Save, Build Flashcard, Execute)
    primaryBtn: 'px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-md shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',

    // Secondary / neutral button
    secondaryBtn: isDark
      ? 'px-3 py-1.5 bg-[#27272A] hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-600 rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
      : 'px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs border border-zinc-300 rounded-md shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',

    // Badge / Pill
    badge: isDark
      ? 'text-xs font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded'
      : 'text-xs font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded',

    // Section title
    sectionTitle: isDark
      ? 'text-lg font-bold text-zinc-100'
      : 'text-lg font-bold text-zinc-900',

    // Sub-title / label
    label: isDark
      ? 'block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1'
      : 'block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1',

    // Divider
    divider: isDark
      ? 'border-t border-zinc-700'
      : 'border-t border-zinc-200',
  };
}
