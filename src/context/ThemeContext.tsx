import React, { createContext, useContext } from 'react';
import { AppTheme } from '../types';

interface AppThemeContextType {
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  isComic: boolean;
  isMinimalLight: boolean;
  isMinimalDark: boolean;
  isMinimal: boolean;
}

const AppThemeContext = createContext<AppThemeContextType>({
  appTheme: 'comic',
  setAppTheme: () => {},
  isComic: true,
  isMinimalLight: false,
  isMinimalDark: false,
  isMinimal: false,
});

export const AppThemeProvider: React.FC<{
  appTheme: AppTheme;
  setAppTheme: (theme: AppTheme) => void;
  children: React.ReactNode;
}> = ({ appTheme, setAppTheme, children }) => {
  const isComic = appTheme === 'comic';
  const isMinimalLight = appTheme === 'minimal-light';
  const isMinimalDark = appTheme === 'minimal-dark';
  const isMinimal = isMinimalLight || isMinimalDark;

  return (
    <AppThemeContext.Provider
      value={{
        appTheme,
        setAppTheme,
        isComic,
        isMinimalLight,
        isMinimalDark,
        isMinimal,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(AppThemeContext);
