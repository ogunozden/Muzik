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

type SupportedLanguage = "tr" | "en";
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

export default i18n;
