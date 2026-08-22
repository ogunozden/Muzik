/**
 * Studio Config — TEK MERKEZ (ENGINEERING_RULESET: "Hardcode yok")
 *
 * Studio (Nota Editor) sayfasındaki tüm sihirli sayı/metin sabitlerinin
 * tek kaynağı. `src/app/studio/page.tsx` ve hook'lar buradan beslenir;
 * sayfa içinde literal sayı/yazı yazılmaz, config üzerinden import edilir.
 */

export const SEYIR_LABELS: Record<string, string> = {
  cikici: "Çıkıcı",
  inici: "İnici",
  "cikici-inici": "Çıkıcı-inici",
} as const;

export const STUDIO_CONFIG = {
  repeat: {
    min: 1,
    max: 99,
    default: 1,
  },
  recording: {
    defaultVelocity: 100,
    minDurationSec: 0.05,
    fallbackMidi: 60,
  },
  playback: {
    tailSeconds: 0.5,
    inactivePosition: -1,
  },
  pianoRoll: {
    minWidth: 520,
    maxWidth: 940,
    widthPerNote: 80,
    height: 280,
  },
  vexFlow: {
    minWidth: 440,
    maxWidth: 820,
    widthPerNote: 60,
    baseWidth: 100,
    height: 200,
  },
  skeleton: {
    count: 21,
    width: 34,
    baseHeight: 70,
    heightStep: 18,
    steps: 5,
  },
} as const;

export const STUDIO_WORKFLOW_STEP_NUMBERS = ["01", "02", "03"] as const;
