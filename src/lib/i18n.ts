/**
 * i18n Configuration - Optimized
 */

import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import tr from "@/i18n/locales/tr.json";
import en from "@/i18n/locales/en.json";

// ============================================
// CONSTANTS
// ============================================

const SUPPORTED_LANGUAGES = ["tr", "en"] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
const DEFAULT_LANGUAGE: SupportedLanguage = "tr";

// ============================================
// I18NEXT CONFIGURATION
// ============================================

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Resources
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    
    // Fallback
    fallbackLng: DEFAULT_LANGUAGE,
    
    // Interpolation
    interpolation: {
      escapeValue: false,
    },
    
    // React options
    react: {
      useSuspense: true,
      bindI18n: "languageChanged loaded",
    },
    
    // Debug (sadece development)
    debug: false,
  });

// ============================================
// EXPORTS
// ============================================

export type { SupportedLanguage };
export const supportedLanguages = SUPPORTED_LANGUAGES;
export const defaultLanguage = DEFAULT_LANGUAGE;

/**
 * Dil değiştir
 */
export async function changeLanguage(lang: SupportedLanguage) {
  await i18n.changeLanguage(lang);
}

/**
 * Mevcut dili al
 */
export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language || DEFAULT_LANGUAGE) as SupportedLanguage;
}

export default i18n;
