/**
 * LearningStepper — usul-merkezli rehberli ogrenme akisinin ana bileseni.
 *
 * Her adim bir usulu ogretir: baslik + faktuel not + darp/velvele notasi + calim
 * (metronom) + "ogrendim/tekrar" isaretleme. Ilerleme localStorage'da (bkz.
 * useLearningProgress). Calma tek kaynaktan (useUsulPlayback).
 *
 * Erisilebilirlik: klavye ok tuslariyla adim gezinme, aria-live ile adim
 * duyurusu, progressbar rolu, tum butonlarda aria-label.
 */

"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Badge, Button, PageSurface} from "@/shared/ui";
import {UsulNotation} from "@/shared/ui/organisms/UsulNotation";
import {getUsulById, getUsulGrouping, PROVISIONAL_USUL_IDS} from "@/engines/usul/data";
import {CURRICULUM, CURRICULUM_STEPS, TOTAL_STEPS} from "./curriculum";
import {useUsulPlayback} from "./useUsulPlayback";
import {useLearningProgress} from "./useLearningProgress";

const DEFAULT_BPM = 96;
const INSTRUMENT = "kudum" as const;

export function LearningStepper() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isVelvele, setIsVelvele] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {isPlaying, currentSymbolIndex, notationRef, play, stop} = useUsulPlayback();
  const progress = useLearningProgress();

  const step = CURRICULUM_STEPS[stepIndex];
  const usul = getUsulById(step.usulId);
  const hasVelvele = Boolean(usul?.velvele?.length);
  const symbols = isVelvele && usul?.velvele?.length ? usul.velvele : usul?.symbols;
  const grouping = usul ? getUsulGrouping(usul).join("+") : "";
  const isProvisional = usul ? PROVISIONAL_USUL_IDS.has(usul.id) : false;
  const isDone = usul ? progress.isCompleted(usul.id) : false;

  // Adim degisince: calmayi durdur ve velveleyi sifirla (yeni usulun kendi
  // velvelesi baska; onceki toggle tasmasin).
  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, index));
      if (clamped === stepIndex) return;
      stop();
      setIsVelvele(false);
      setStepIndex(clamped);
    },
    [stop, stepIndex],
  );

  const togglePlay = useCallback(() => {
    if (!usul) return;
    if (isPlaying) {
      stop();
    } else {
      void play(usul, {bpm: usul.defaultBpm ?? DEFAULT_BPM, velvele: isVelvele, instrument: INSTRUMENT});
    }
  }, [usul, isVelvele, isPlaying, play, stop]);

  // Velvele degisince calarken yeniden baslat (yeni desen calinsin).
  const toggleVelvele = useCallback(() => {
    const wasPlaying = isPlaying;
    stop();
    setIsVelvele((v) => !v);
    if (wasPlaying) {
      // Bir sonraki render'da yeni desenle calmayi tekrar baslat.
      window.setTimeout(() => {
        if (usul) void play(usul, {bpm: usul.defaultBpm ?? DEFAULT_BPM, velvele: !isVelvele, instrument: INSTRUMENT});
      }, 0);
    }
  }, [isPlaying, play, stop, usul, isVelvele]);

  // Klavye ok tuslariyla adim gezinme (bir input odaginda degilken).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
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
    () => Math.round((progress.completedCount / TOTAL_STEPS) * 100),
    [progress.completedCount],
  );

  if (!usul || !symbols) {
    return <p className="text-[var(--color-text-secondary)]">Usul bulunamadi: {step.usulId}</p>;
  }

  return (
    <div ref={containerRef} tabIndex={-1} role="region" aria-label="Rehberli usul ogrenme akisi" className="outline-none">
      {/* Ilerleme ozeti */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
          <span>
            Adim <strong className="text-[var(--color-text-primary)]">{stepIndex + 1}</strong> / {TOTAL_STEPS}
            {" — "}
            <span>{step.levelTitle}</span>
          </span>
          <span>
            {progress.completedCount} / {TOTAL_STEPS} ogrenildi
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress.completedCount}
          aria-valuemin={0}
          aria-valuemax={TOTAL_STEPS}
          aria-label="Ogrenme ilerlemesi"
          className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-muted)]"
        >
          <div className="h-full rounded-full bg-[var(--color-primary-600)] transition-all" style={{width: `${percent}%`}} />
        </div>
      </div>

      {/* Aktif adim karti */}
      <PageSurface className="mb-4 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{usul.name}</h2>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {usul.beats}/{usul.unit}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">Vurgu: {grouping}</span>
          {hasVelvele ? <Badge>Velvele var</Badge> : null}
          {isDone ? <Badge>✓ Ogrenildi</Badge> : null}
        </div>

        <p className="mb-4 text-sm text-[var(--color-text-primary)]">{step.note}</p>

        <section
          aria-label="Darp gosterimi"
          className="mb-4 rounded-md bg-[var(--color-bg-base)] p-4"
        >
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>{isVelvele ? "Velvele akisi" : "Darp akisi"}</span>
            <span>
              {usul.beats}/{usul.unit}
            </span>
          </div>
          <UsulNotation
            ref={notationRef}
            symbols={symbols}
            unit={usul.unit}
            beats={usul.beats}
            isPlaying={isPlaying}
            currentBeat={currentSymbolIndex}
            size="md"
          />
        </section>

        {isProvisional && (
          <p className="mb-4 rounded-md border border-[var(--color-amber-300,#fcd34d)] bg-[var(--color-amber-50,#fffbeb)] px-3 py-2 text-xs text-[var(--color-amber-800,#92400e)]">
            ⚠ Bu usulun suresi/ritmi otoriter, ancak dum/tek vurgu dizisi henuz
            geleneksel nota kaynagiyla dogrulanmamistir.
          </p>
        )}

        {/* Calma denetimleri */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            size="sm"
            ariaLabel={isPlaying ? "Durdur" : "Calmayi baslat"}
            onPress={togglePlay}
          >
            {isPlaying ? "■ Durdur" : "▶ Dinle"}
          </Button>
          {hasVelvele && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                aria-label="Velvele calma"
                checked={isVelvele}
                onChange={toggleVelvele}
                className="h-4 w-4 accent-[var(--color-primary-600)]"
              />
              Velvele
            </label>
          )}
          <Button
            variant={isDone ? "outline" : "secondary"}
            size="sm"
            ariaLabel={isDone ? "Tekrar et olarak isaretle" : "Ogrendim olarak isaretle"}
            onPress={() => progress.toggle(usul.id)}
            className="ml-auto"
          >
            {isDone ? "↺ Tekrar" : "✓ Ogrendim"}
          </Button>
        </div>
      </PageSurface>

      {/* Adim gezinme */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="bordered"
          size="sm"
          ariaLabel="Onceki usul"
          isDisabled={stepIndex === 0}
          onPress={() => goTo(stepIndex - 1)}
        >
          ← Onceki
        </Button>
        <span className="text-xs text-[var(--color-text-secondary)]">
          Ok tuslariyla da gezinebilirsin
        </span>
        <Button
          variant="primary"
          size="sm"
          ariaLabel="Sonraki usul"
          isDisabled={stepIndex === TOTAL_STEPS - 1}
          onPress={() => {
            if (usul && !isDone) progress.markCompleted(usul.id);
            goTo(stepIndex + 1);
          }}
        >
          Sonraki →
        </Button>
      </div>

      {/* Seviye haritasi */}
      <nav aria-label="Seviye haritasi" className="mt-6 flex flex-col gap-2">
        {CURRICULUM.map((level) => {
          const startIndex = CURRICULUM_STEPS.findIndex((s) => s.levelId === level.id);
          return (
            <div key={level.id} className="flex flex-wrap items-center gap-2">
              <span className="w-40 shrink-0 text-xs font-medium text-[var(--color-text-secondary)]">
                {level.title}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {level.steps.map((s, i) => {
                  const idx = startIndex + i;
                  const active = idx === stepIndex;
                  const done = progress.isCompleted(s.usulId);
                  return (
                    <button
                      key={s.usulId}
                      type="button"
                      aria-label={`${getUsulById(s.usulId)?.name ?? s.usulId}${done ? " (ogrenildi)" : ""}`}
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
