
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { TRANSLATIONS } from './constants';
import { Language } from './types';

const isClient = typeof window !== 'undefined';

const resources = {
  [Language.EN]: { translation: TRANSLATIONS[Language.EN] },
  [Language.ZH_TW]: { translation: TRANSLATIONS[Language.ZH_TW] },
  [Language.ZH_CN]: { translation: TRANSLATIONS[Language.ZH_CN] },
};

const convertDetectedLanguage = (lng: string) => {
  const lower = lng.toLowerCase();
  if (lower.startsWith('zh')) {
    if (lower.includes('tw') || lower.includes('hk') || lower.includes('mo')) {
      return Language.ZH_TW;
    }
    return Language.ZH_CN;
  }
  const supported = Object.values(Language) as string[];
  const found = supported.find(s => lower.startsWith(s));
  return found || lng;
};

const i18nInstance = i18n.use(initReactI18next);

// Only use LanguageDetector on client side to prevent SSR hydration mismatch
if (isClient) {
  const LanguageDetector = require('i18next-browser-languagedetector').default;
  i18nInstance.use(LanguageDetector);
}

i18nInstance.init({
  resources,
  fallbackLng: Language.EN,
  ...(isClient
    ? {
        detection: {
          order: ['localStorage', 'navigator'],
          lookupLocalStorage: 'app_lang',
          caches: ['localStorage'],
          convertDetectedLanguage,
        },
      }
    : {
        lng: Language.EN, // Force deterministic language on server
      }),
  interpolation: {
    escapeValue: false,
  },
});

// Handle RTL for Arabic - only on client where document exists
if (isClient) {
  i18n.on('languageChanged', (lng) => {
    const isRtl = lng === Language.AR;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  });
}

export default i18n;
