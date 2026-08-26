import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppLanguage, AppDirection, I18nContextType } from './types';
import { en } from './locales/en';
import { fa } from './locales/fa';

const dictionaries: Record<AppLanguage, any> = {
  en,
  fa,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: AppLanguage;
  initialDirection?: AppDirection;
  onLanguageChange?: (lang: AppLanguage) => void;
  onDirectionChange?: (dir: AppDirection) => void;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLanguage = 'en',
  initialDirection = 'ltr',
  onLanguageChange,
  onDirectionChange,
}) => {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage);
  const [direction, setDirectionState] = useState<AppDirection>(initialDirection);

  // Sync with prop changes if settings load asynchronously
  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguageState(initialLanguage);
    }
  }, [initialLanguage]);

  useEffect(() => {
    if (initialDirection && initialDirection !== direction) {
      setDirectionState(initialDirection);
    }
  }, [initialDirection]);

  // Synchronize HTML document direction and lang attributes
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  const setLanguage = useCallback((newLang: AppLanguage) => {
    setLanguageState(newLang);
    document.documentElement.lang = newLang;
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  }, [onLanguageChange]);

  const setDirection = useCallback((newDir: AppDirection) => {
    setDirectionState(newDir);
    document.documentElement.dir = newDir;
    if (onDirectionChange) {
      onDirectionChange(newDir);
    }
  }, [onDirectionChange]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[language] || en;
      const keys = key.split('.');

      let value: any = dict;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Fallback to English if missing in current locale
          let fallback: any = en;
          for (const fbKey of keys) {
            if (fallback && typeof fallback === 'object' && fbKey in fallback) {
              fallback = fallback[fbKey];
            } else {
              fallback = undefined;
              break;
            }
          }
          value = fallback !== undefined ? fallback : key;
          break;
        }
      }

      if (typeof value !== 'string') {
        return key;
      }

      if (params) {
        let text = value;
        for (const [paramKey, paramVal] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        }
        return text;
      }

      return value;
    },
    [language]
  );

  const isRTL = direction === 'rtl';
  const isFa = language === 'fa';

  return (
    <I18nContext.Provider
      value={{
        language,
        direction,
        setLanguage,
        setDirection,
        t,
        isRTL,
        isFa,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

export const useI18n = useTranslation;
