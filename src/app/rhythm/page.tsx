/**
 * Usul sayfasi - usul secimi ve ritim pratigi.
 *
 * Oynatma denetleyicisi (2026-07-14 yeniden yazimi):
 * - Vurus suresi OLCU BIRIMINE gore hesaplanir ve ayni birim ses motoruna da
 *   gecirilir; onceki surumde motor ceyreklik varsayip 8'lik 14 usulde
 *   gorselden 2x ayrisiyordu.
 * - Imlec sembol DIZINI degil vurus POZISYONU uzerinden ilerler (Sofyan'da
 *   Düm 2 vurus kaplar; esit-aralik varsayimi imleci kaydiriyordu).
 * - Ses hazirlanmadan (init + sample preload) gorsel sayac baslamaz.
 * - Dongu modu: kalip, durdurulana kadar drift'siz tekrarlanir (her turun
 *   baslangici mutlak baslangic zamanindan hesaplanir).
 */

"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {LabeledSelect, LabeledSlider, PageHeader, PageShell, PageSurface, UsulPanel} from "@/shared/ui";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {USUL_DATA, getUsulBeatDuration} from "@/engines/usul/data";
import type {InstrumentType} from "@/engines/ses/engine";
import {initAudio, playRhythm, preloadRhythm, stopAll} from "@/engines/ses/engine";
import {useEditorStore} from "@/store/editorStore";
import {ENSTRUMAN_LIST, PERCUSSION_INSTRUMENTS} from "@/lib/app-constants";

const CURSOR_TICK_MS = 40;
const CYCLE_TAIL_MS = 150;
const SYMBOL_LABELS: Record<string, string> = {
  dum: "Düm",
  tek: "Tek",
  te: "Te",
  ke: "Ke",
  ka: "Kâ",
  ta: "Ta",
  hek: "Hek",
};

export default function UsulPage() {
  const {t, i18n} = useTranslation();
  const {
    selectedUsulObj,
    selectedPercussionInstrument,
    bpm,
    setSelectedUsul,
    setBpm,
    setSelectedPercussionInstrument,
  } = useEditorStore();
  const [isRhythmPlaying, setIsRhythmPlaying] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(true);
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(-1);
  const [progressBeat, setProgressBeat] = useState(-1);
  const [cycleCount, setCycleCount] = useState(0);
  const isPlayingRef = useRef(false);
  const isLoopRef = useRef(true);
  const cursorTimerRef = useRef<number | null>(null);
  const audioTimerRef = useRef<number | null>(null);

  const usulItems = USUL_DATA.map((usul) => ({
    key: usul.id,
    label: usul.name,
  }));

  const symbols = selectedUsulObj?.symbols;
  const activeSymbol = currentSymbolIndex >= 0 ? symbols?.[currentSymbolIndex] : null;
  const percussionItems = ENSTRUMAN_LIST.filter((instrument) =>
    (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id as string)
  ).map((instrument) => ({
    key: instrument.id as string,
    label: i18n.language === "tr" ? instrument.nameTr : instrument.nameEn,
  }));

  const stopRhythm = useCallback(() => {
    isPlayingRef.current = false;
    if (cursorTimerRef.current) window.clearInterval(cursorTimerRef.current);
    if (audioTimerRef.current) window.clearTimeout(audioTimerRef.current);
    cursorTimerRef.current = null;
    audioTimerRef.current = null;
    stopAll();
    setIsRhythmPlaying(false);
    setCurrentSymbolIndex(-1);
    setProgressBeat(-1);
    setCycleCount(0);
  }, []);

  const playSelectedUsul = useCallback(async () => {
    const usul = selectedUsulObj;
    if (!usul || isPlayingRef.current) return;

    // Ses tamamen hazir olmadan gorsel sayac baslamaz; aksi halde ilk turda
    // imlec, sample indirme suresi kadar one geciyordu.
    const audioReady = await initAudio();
    if (!audioReady) return;
    await preloadRhythm(usul.symbols, selectedPercussionInstrument);
    if (isPlayingRef.current) return;

    const beatDuration = getUsulBeatDuration(usul, bpm);
    const cycleMs = usul.beats * beatDuration * 1000;
    const startedAt = performance.now();

    isPlayingRef.current = true;
    setIsRhythmPlaying(true);
    setProgressBeat(0);
    setCurrentSymbolIndex(0);
    setCycleCount(1);

    const scheduleCycle = (cycleIndex: number) => {
      if (!isPlayingRef.current) return;
      void playRhythm(usul.beats, usul.symbols, bpm, selectedPercussionInstrument, usul.unit).catch(stopRhythm);
      if (!isLoopRef.current) {
        audioTimerRef.current = window.setTimeout(stopRhythm, cycleMs + CYCLE_TAIL_MS);
        return;
      }
      // Drift birikmesin: bir sonraki turun ani mutlak baslangictan hesaplanir.
      const nextAt = startedAt + (cycleIndex + 1) * cycleMs;
      audioTimerRef.current = window.setTimeout(
        () => scheduleCycle(cycleIndex + 1),
        Math.max(0, nextAt - performance.now()),
      );
    };
    scheduleCycle(0);

    cursorTimerRef.current = window.setInterval(() => {
      const elapsedMs = performance.now() - startedAt;
      if (!isLoopRef.current && elapsedMs >= cycleMs + CYCLE_TAIL_MS) {
        stopRhythm();
        return;
      }
      const elapsedBeats = elapsedMs / 1000 / beatDuration;
      const beatInCycle = elapsedBeats % usul.beats;
      setProgressBeat(beatInCycle);
      setCycleCount(Math.floor(elapsedBeats / usul.beats) + 1);
      // Aktif darp = pozisyonu gecilmis SON sembol (beat kolonuna gore).
      let active = 0;
      for (let index = 0; index < usul.symbols.length; index += 1) {
        if (usul.symbols[index].beat <= beatInCycle + 1 + 1e-6) active = index;
      }
      setCurrentSymbolIndex(active);
    }, CURSOR_TICK_MS);
  }, [bpm, selectedPercussionInstrument, selectedUsulObj, stopRhythm]);

  useEffect(() => {
    if (!selectedUsulObj) setSelectedUsul("sofyan");
  }, [selectedUsulObj, setSelectedUsul]);

  useEffect(() => stopRhythm, [stopRhythm]);

  return (
    <UnifiedLayout>
      <PageShell className="max-w-4xl">
        <PageHeader
          meta="Ritim motoru"
          title={t("usul.title")}
          description={t("usul.subtitle")}
        />

        <UsulPanel
          usulSelectAriaLabel={t("usul.selectUsul")}
          symbolGridAriaLabel={t("usul.symbolGrid")}
          playButtonAriaLabel={isRhythmPlaying ? t("common.stop") : t("usul.playRhythm")}
          usulItems={usulItems}
          selectedUsul={selectedUsulObj?.id}
          onUsulChange={(key) => {
            stopRhythm();
            setSelectedUsul(key);
          }}
          symbols={symbols}
          onPlay={isRhythmPlaying ? stopRhythm : () => void playSelectedUsul()}
          beats={selectedUsulObj?.beats}
          unit={selectedUsulObj?.unit}
          isPlaying={isRhythmPlaying}
          currentBeat={currentSymbolIndex}
          progressBeat={progressBeat}
          className="mb-6"
        />

        <PageSurface className="mb-6 grid gap-4 p-5 sm:grid-cols-[2fr_2fr_1fr] sm:items-end">
          <LabeledSelect
            label={t("makam.instrument")}
            ariaLabel={t("makam.selectInstrument")}
            items={percussionItems}
            value={selectedPercussionInstrument}
            onChange={(key) => setSelectedPercussionInstrument(key as InstrumentType)}
            placeholder={t("makam.instrumentPlaceholder")}
          />
          <LabeledSlider
            label={`BPM: ${bpm}`}
            ariaLabel={t("usul.bpm")}
            value={bpm}
            onChange={(v) => {
              stopRhythm();
              setBpm(Number(v));
            }}
            minValue={40}
            maxValue={200}
            step={10}
            size="sm"
          />
          <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              aria-label="Döngü"
              checked={isLoopEnabled}
              onChange={(event) => {
                isLoopRef.current = event.target.checked;
                setIsLoopEnabled(event.target.checked);
              }}
              className="h-4 w-4 accent-[var(--color-primary-600)]"
            />
            Döngü
          </label>
        </PageSurface>

        {selectedUsulObj && (
          <PageSurface className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">{t("usul.beats")}</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {selectedUsulObj.beats}/{selectedUsulObj.unit}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Aktif darp</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {activeSymbol
                  ? `${SYMBOL_LABELS[activeSymbol.symbol] ?? activeSymbol.symbol} (${activeSymbol.beat}. vuruş)`
                  : "Hazır"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Tur</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isRhythmPlaying ? cycleCount : "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Döngü</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isRhythmPlaying ? (isLoopEnabled ? "Sürekli çalıyor" : "Tek tur") : "Durdu"}
              </p>
            </div>
          </PageSurface>
        )}
      </PageShell>
    </UnifiedLayout>
  );
}
