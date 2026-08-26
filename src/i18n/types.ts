export type AppLanguage = 'en' | 'fa';
export type AppDirection = 'ltr' | 'rtl';

export interface I18nContextType {
  language: AppLanguage;
  direction: AppDirection;
  setLanguage: (lang: AppLanguage) => void;
  setDirection: (dir: AppDirection) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  isFa: boolean;
}
