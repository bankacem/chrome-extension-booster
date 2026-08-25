import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import frCommon from './locales/fr/common.json';
import esCommon from './locales/es/common.json';
import ptCommon from './locales/pt/common.json';
import arCommon from './locales/ar/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt', 'ar'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const RTL_LANGUAGES: ReadonlySet<string> = new Set(['ar']);

export const LOCALE_CODES: Record<SupportedLanguage, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  es: 'es_ES',
  pt: 'pt_BR',
  ar: 'ar_SA',
};

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  ar: 'العربية',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      fr: { common: frCommon },
      es: { common: esCommon },
      pt: { common: ptCommon },
      ar: { common: arCommon },
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
