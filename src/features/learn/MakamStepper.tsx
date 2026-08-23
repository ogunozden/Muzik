/**
 * MakamStepper — makam-merkezli rehberli ogrenme ekseni.
 *
 * Her adim bir makami ogretir: baslik + karar/guclu + koma perde dizisi + otoriter
 * seyir metni + gam calimi + "ogrendim/tekrar" isaretleme. Ilerleme localStorage'da
 * (usul ekseninden ayri anahtar). Calma tek kaynaktan (useMakamPlayback, koma).
 *
 * Erisilebilirlik: klavye ok tuslariyla gezinme, aria-live, progressbar, grup
 * rolleri — usul stepper (LearningStepper) ile ayni desen.
 */

"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Badge, Button, PageSurface} from "@/shared/ui";
import {getMakamById, getMakamGuclu, getMakamKarar, getMakamScale} from "@/engines/makam/data";
import {MAKAM_CURRICULUM, MAKAM_CURRICULUM_STEPS, MAKAM_TOTAL_STEPS} from "./makam-curriculum";
import {useMakamPlayback} from "./useMakamPlayback";
import {useLearningProgress} from "./useLearningProgress";

const MAKAM_PROGRESS_KEY = "muzik.learn.makam.completed";

export function MakamStepper() {
  const [stepIndex, setStepIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const {isPlaying, play, stop} = useMakamPlayback();
  const progress = useLearningProgress(MAKAM_PROGRESS_KEY);

  const step = MAKAM_CURRICULUM_STEPS[stepIndex];
  const makam = getMakamById(step.makamId);
  const scale = makam ? getMakamScale(makam) : [];
  const seyir = makam?.seyir;
  // Kaynakli karar/guclu (D3/D4); kaynagi yoksa null -> UI'da gosterilmez.
  const karar = makam ? getMakamKarar(makam) : null;
  const guclu = makam ? getMakamGuclu(makam) : null;
  const isDone = makam ? progress.isCompleted(makam.id) : false;

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(MAKAM_TOTAL_STEPS - 1, index));
      if (clamped === stepIndex) return;
      stop();
      setStepIndex(clamped);
    },
    [stop, stepIndex],
  );

  // Effect bagimliligi degil (yalniz onPress) — duz fonksiyon; React Compiler
  // gerektiginde memoize eder (manuel useCallback burada `makam` mutasyon
  // cikarimi yuzunden preserve edilemiyordu).
  const togglePlay = () => {
    if (!makam) return;
    if (isPlaying) stop();
    else void play(makam);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, a, [contenteditable]")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(stepIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(stepIndex - 1);
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [goTo, stepIndex]);

  const percent = useMemo(
    () => Math.round((progress.completedCount / MAKAM_TOTAL_STEPS) * 100),
    [progress.completedCount],
  );

  if (!makam) {
    return <p className="text-[var(--color-text-secondary)]">Makam bulunamadi: {step.makamId}</p>;
  }

  return (
    <div ref={containerRef} tabIndex={-1} role="region" aria-label="Rehberli makam ogrenme akisi">
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
          <span>
            Adim <strong className="text-[var(--color-text-primary)]">{stepIndex + 1}</strong> / {MAKAM_TOTAL_STEPS}
            {" — "}
            <span>{step.levelTitle}</span>
          </span>
          <span>
            {progress.completedCount} / {MAKAM_TOTAL_STEPS} ogrenildi
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress.completedCount}
          aria-valuemin={0}
          aria-valuemax={MAKAM_TOTAL_STEPS}
          aria-label="Makam ogrenme ilerlemesi"
          className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-muted)]"
        >
          <div className="h-full rounded-full bg-[var(--color-primary-600)] transition-all" style={{width: `${percent}%`}} />
        </div>
      </div>

      <PageSurface className="mb-4 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{makam.name}</h2>
          {/*
            Karar ve guclu KAYNAKTAN gelir (D3/D4). Eskiden "Karar: {makam.tonic}"
            yaziliyordu; `tonic` 48 makamin HEPSINDE "C" oldugu icin Rast, Hicaz,
            Segah, Evic — hepsi icin ekranda "Karar: C" cikiyordu, hemen
            asagidaki otoriter seyir metni "dugah'ta karar kilar" derken.
            `dominant` ise elle yazilmisti ve 11/48 makamda makamin kendi
            dizisinde bile yoktu. Kaynagi olmayan makamda HICBIR SEY
            gosterilmez — bos birakmak, uydurmaya yeglenir.
          */}
          {karar ? (
            <span className="text-sm text-[var(--color-text-secondary)]">Karar: {karar.label}</span>
          ) : null}
          {guclu ? (
            <span className="text-sm text-[var(--color-text-secondary)]">Güçlü: {guclu.label}</span>
          ) : null}
          {seyir ? <Badge>Seyir: {seyir.yon}</Badge> : null}
          {isDone ? <Badge>✓ Ogrenildi</Badge> : null}
        </div>

        <p className="mb-4 text-sm text-[var(--color-text-primary)]">{step.note}</p>

        <section aria-label="Koma perde dizisi" className="mb-4 rounded-md bg-[var(--color-bg-base)] p-4">
          {/*
            `getMakamScale` NOTE_NAMES uzerinde yarim-ton yuruyusudur: sesin
            calidigi 53-EDO koma dizisi DEGIL, onun 12-TET izdusumu. Etiket
            bunu soylemezse ayni ekranda iki farkli gerceklik olur (D15).
          */}
          <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Perde dizisi (12-TET izdüşümü)</p>
          <p className="font-mono text-sm text-[var(--color-text-primary)]">{scale.join("  ")}</p>
        </section>

        {seyir && (
          <details className="mb-4 rounded-md border border-[var(--color-border-subtle)] p-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-primary)]">
              Seyir tarifi ({seyir.yon})
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{seyir.metin}</p>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            size="sm"
            ariaLabel={isPlaying ? "Durdur" : "Gamı dinle"}
            onPress={togglePlay}
          >
            {isPlaying ? "■ Durdur" : "▶ Gamı dinle"}
          </Button>
          <Button
            variant={isDone ? "outline" : "secondary"}
            size="sm"
            ariaLabel={isDone ? "Tekrar et olarak isaretle" : "Ogrendim olarak isaretle"}
            onPress={() => progress.toggle(makam.id)}
            className="ml-auto"
          >
            {isDone ? "↺ Tekrar" : "✓ Ogrendim"}
          </Button>
        </div>
      </PageSurface>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="bordered"
          size="sm"
          ariaLabel="Onceki makam"
          isDisabled={stepIndex === 0}
          onPress={() => goTo(stepIndex - 1)}
        >
          ← Onceki
        </Button>
        <span className="text-xs text-[var(--color-text-secondary)]">Ok tuslariyla da gezinebilirsin</span>
        <Button
          variant="primary"
          size="sm"
          ariaLabel="Sonraki makam"
          isDisabled={stepIndex === MAKAM_TOTAL_STEPS - 1}
          onPress={() => {
            if (makam && !isDone) progress.markCompleted(makam.id);
            goTo(stepIndex + 1);
          }}
        >
          Sonraki →
        </Button>
      </div>

      <nav aria-label="Seviye haritasi" className="mt-6 flex flex-col gap-2">
        {MAKAM_CURRICULUM.map((level) => {
          const startIndex = MAKAM_CURRICULUM_STEPS.findIndex((s) => s.levelId === level.id);
          const levelHeadingId = `makam-level-${level.id}`;
          return (
            <div
              key={level.id}
              role="group"
              aria-labelledby={levelHeadingId}
              className="flex flex-wrap items-center gap-2"
            >
              <span
                id={levelHeadingId}
                className="w-44 shrink-0 text-xs font-medium text-[var(--color-text-secondary)]"
              >
                {level.title}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {level.steps.map((s, i) => {
                  const idx = startIndex + i;
                  const active = idx === stepIndex;
                  const done = progress.isCompleted(s.makamId);
                  return (
                    <button
                      key={s.makamId}
                      type="button"
                      aria-label={`${getMakamById(s.makamId)?.name ?? s.makamId}${done ? " (ogrenildi)" : ""}`}
                      aria-current={active ? "step" : undefined}
                      onClick={() => goTo(idx)}
                      className={`h-6 w-6 rounded-full text-[10px] transition-colors ${
                        active
                          ? "bg-[var(--color-primary-600)] text-white"
                          : done
                            ? "bg-[var(--color-primary-600)]/30 text-[var(--color-text-primary)]"
                            : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)]"
                      }`}
                    >
                      {done ? "✓" : idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
