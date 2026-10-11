import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppTheme, AccentColor } from '../types';

export const ACCENT_COLORS: Array<{
  id: AccentColor;
  name: string;
  hex: string;
}> = [
  { id: 'blue', name: 'Blue', hex: '#2563EB' },
  { id: 'green', name: 'Green', hex: '#16A34A' },
  { id: 'purple', name: 'Purple', hex: '#9333EA' },
  { id: 'orange', name: 'Orange', hex: '#EA580C' },
  { id: 'pink', name: 'Pink', hex: '#DB2777' },
  { id: 'red', name: 'Red', hex: '#DC2626' },
  { id: 'teal', name: 'Teal', hex: '#0D9488' },
];

export function normalizeAccentColor(color?: string): AccentColor {
  if (color && ['blue', 'green', 'purple', 'orange', 'pink', 'red', 'teal'].includes(color)) {
    return color as AccentColor;
  }
  return 'blue';
}

interface AppThemeContextType {
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  accentColor: AccentColor;
  setAccentColor: (accent: AccentColor) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isAnkiLight: boolean;
  isAnkiDark: boolean;
}

export function normalizeAppTheme(theme?: string): AppTheme {
  if (theme === 'system') {
    return 'system';
  }
  if (theme === 'anki-dark' || theme === 'minimal-dark') {
    return 'anki-dark';
  }
  return 'anki-light';
}

const AppThemeContext = createContext<AppThemeContextType>({
  appTheme: 'anki-light',
  setAppTheme: () => {},
  accentColor: 'blue',
  setAccentColor: () => {},
  toggleTheme: () => {},
  isDark: false,
  isLight: true,
  isAnkiLight: true,
  isAnkiDark: false,
});

export const AppThemeProvider: React.FC<{
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  accentColor?: AccentColor;
  setAccentColor?: (accent: AccentColor) => void;
  children: React.ReactNode;
}> = ({
  appTheme: propAppTheme,
  setAppTheme,
  accentColor: propAccentColor,
  setAccentColor: propSetAccentColor,
  children,
}) => {
  const appTheme = normalizeAppTheme(propAppTheme);
  const [internalAccent, setInternalAccent] = useState<AccentColor>(() => {
    try {
      const stored = localStorage.getItem('anki_app_accent_color');
      if (stored) return normalizeAccentColor(stored);
    } catch {}
    return normalizeAccentColor(propAccentColor);
  });

  const accentColor = propAccentColor ? normalizeAccentColor(propAccentColor) : internalAccent;

  const handleSetAccentColor = (nextAccent: AccentColor) => {
    const valid = normalizeAccentColor(nextAccent);
    setInternalAccent(valid);
    try {
      localStorage.setItem('anki_app_accent_color', valid);
    } catch {}
    if (propSetAccentColor) {
      propSetAccentColor(valid);
    }
  };

  useEffect(() => {
    if (propAccentColor) {
      const valid = normalizeAccentColor(propAccentColor);
      setInternalAccent(valid);
      try {
        localStorage.setItem('anki_app_accent_color', valid);
      } catch {}
    }
  }, [propAccentColor]);

  // Ensure DOM html attribute data-accent reflects selected accent color
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [accentColor]);

  const [systemIsDark, setSystemIsDark] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const isDark = appTheme === 'system' ? systemIsDark : appTheme === 'anki-dark';
  const isLight = !isDark;
  const isAnkiLight = isLight;
  const isAnkiDark = isDark;

  const toggleTheme = () => {
    const next = isDark ? 'anki-light' : 'anki-dark';
    setAppTheme(next);
  };

  // Ensure DOM html class reflects dark/light mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [isDark]);

  return (
    <AppThemeContext.Provider
      value={{
        appTheme,
        setAppTheme,
        accentColor,
        setAccentColor: handleSetAccentColor,
        toggleTheme,
        isDark,
        isLight,
        isAnkiLight,
        isAnkiDark,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(AppThemeContext);
