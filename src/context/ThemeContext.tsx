import React, { createContext, useContext, useEffect } from 'react';
import { AppTheme } from '../types';

interface AppThemeContextType {
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  isDark: boolean;
  isLight: boolean;
  isAnkiLight: boolean;
  isAnkiDark: boolean;
}

export function normalizeAppTheme(theme?: string): AppTheme {
  if (theme === 'anki-dark' || theme === 'minimal-dark') {
    return 'anki-dark';
  }
  return 'anki-light';
}

const AppThemeContext = createContext<AppThemeContextType>({
  appTheme: 'anki-light',
  setAppTheme: () => {},
  isDark: false,
  isLight: true,
  isAnkiLight: true,
  isAnkiDark: false,
});

export const AppThemeProvider: React.FC<{
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  children: React.ReactNode;
}> = ({ appTheme: propAppTheme, setAppTheme, children }) => {
  const appTheme = normalizeAppTheme(propAppTheme);
  const isDark = appTheme === 'anki-dark';
  const isLight = !isDark;
  const isAnkiLight = isLight;
  const isAnkiDark = isDark;

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
