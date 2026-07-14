import path from "node:path";
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import tr from "./src/i18n/locales/tr.json";
import en from "./src/i18n/locales/en.json";

// Importer'in yerel SymbTr cozumlemesi testlerde committed fixture'a
// sabitlenir: gercek `symb/` gitignore'dadir ve CI runner'da yoktur; bu
// sabitleme olmadan keySignature kaynagi makineye gore musicxml/mu2 degisir
// (2026-07-14 CI fail'inin nedeni). Fixture: SymbTr v3, CC-BY 4.0 — bkz.
// src/data/score-engine/__tests__/fixtures/symbtr/README.md
process.env.MUZIK_SYMBTR_ROOTS = path.resolve(
  process.cwd(),
  "src/data/score-engine/__tests__/fixtures/symbtr",
);

/**
 * Test i18n init'i (F5.4): `useTranslation` gercek Turkce degerleri dondurur
 * (varsayilan `tr`). Boylece bilesenler i18n'e baglanirken Turkce-metin test
 * matcher'lari kirilmaz. Suspense kapali; testler senkron render eder.
 * react-i18next'i explicit mock'layan test dosyalari kendi mock'unu korur.
 */
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: "tr",
    fallbackLng: "tr",
    resources: {
      tr: {translation: tr},
      en: {translation: en},
    },
    interpolation: {escapeValue: false},
    react: {useSuspense: false},
  });
}
