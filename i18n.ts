
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { TRANSLATIONS } from './constants';
import { Language } from './types';

const resources = {
  [Language.EN]: { translation: TRANSLATIONS[Language.EN] },
  [Language.ZH_TW]: { translation: TRANSLATIONS[Language.ZH_TW] },
  [Language.ZH_CN]: { translation: TRANSLATIONS[Language.ZH_CN] },
  [Language.JA]: { translation: TRANSLATIONS[Language.JA] },
  [Language.KO]: { translation: TRANSLATIONS[Language.KO] },
  [Language.FR]: { translation: TRANSLATIONS[Language.FR] },
  [Language.DE]: { translation: TRANSLATIONS[Language.DE] },
  [Language.IT]: { translation: TRANSLATIONS[Language.IT] },
  [Language.ES]: { translation: TRANSLATIONS[Language.ES] },
  [Language.PT]: { translation: TRANSLATIONS[Language.PT] },
  [Language.RU]: { translation: TRANSLATIONS[Language.RU] },
  [Language.AR]: { translation: TRANSLATIONS[Language.AR] },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: Language.EN,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'app_lang',
      caches: ['localStorage'],
      convertDetectedLanguage: (lng) => {
        const lower = lng.toLowerCase();
        // Prefix matching logic
        if (lower.startsWith('zh')) {
          if (lower.includes('tw') || lower.includes('hk') || lower.includes('mo')) {
            return Language.ZH_TW;
          }
          return Language.ZH_CN;
        }
        // General matching for other codes
        const supported = Object.values(Language) as string[];
        const found = supported.find(s => lower.startsWith(s));
        return found || lng;
      }
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Handle RTL for Arabic
i18n.on('languageChanged', (lng) => {
  const isRtl = lng === Language.AR;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
