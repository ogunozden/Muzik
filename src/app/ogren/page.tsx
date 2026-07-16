/**
 * /ogren — Rehberli ogrenme akisi (F14.6).
 *
 * Iki eksen: USUL (kucukten buyuge usul) ve MAKAM (basit-murekkep makam). Kullanici
 * eksen sekmesiyle secer; her adim darp/gam dinleme + "ogrendim" isaretleme sunar.
 * Ilerleme eksene ozel localStorage'da kalir. Ansiklopediler (/rhythm, /studio) tam
 * referans; bu sayfa kurgulu ogrenme yoludur.
 */

"use client";

import {useState} from "react";
import {PageHeader, PageShell} from "@/shared/ui";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {LearningStepper} from "@/features/learn/LearningStepper";
import {MakamStepper} from "@/features/learn/MakamStepper";

type Mode = "usul" | "makam";

const MODES: ReadonlyArray<{id: Mode; label: string}> = [
  {id: "usul", label: "Usul"},
  {id: "makam", label: "Makam"},
];

export default function OgrenPage() {
  const [mode, setMode] = useState<Mode>("usul");

  return (
    <UnifiedLayout>
      <PageShell className="max-w-4xl">
        <PageHeader
          meta="Rehberli ogrenme"
          title="Usul ve makam ogren"
          description="Kucukten buyuge, adim adim. Eksen sec: her adimda darpi/gami dinle, dene, ogrendiginde isaretle."
        />

        <div role="tablist" aria-label="Ogrenme ekseni" className="mb-5 flex gap-2">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m.id)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-primary-600)] text-white"
                    : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel">{mode === "usul" ? <LearningStepper /> : <MakamStepper />}</div>
      </PageShell>
    </UnifiedLayout>
  );
}
