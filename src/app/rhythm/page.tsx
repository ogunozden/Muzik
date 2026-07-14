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
 * - Dongu: startRhythmLoop tum vuruslari WebAudio saatinde ileriye-bakisli
 *   planlar (tur basi setTimeout dikisi yok).
 * - Imlec requestAnimationFrame ile ekran tazelemesine hizali; her karede
 *   "DUYULAN" saati (getOutputTimestamp) okur -> ses-gorsel senkron (imlec
 *   artik outputLatency kadar onde gitmiyor; bkz. heardContextTime).
 */

"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {LabeledSelect, LabeledSlider, PageHeader, PageShell, PageSurface, UsulPanel} from "@/shared/ui";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {USUL_DATA} from "@/engines/usul/data";
import type {InstrumentType} from "@/engines/ses/engine";
import {startRhythmLoop, stopAll, type RhythmLoopController} from "@/engines/ses/engine";
import {useEditorStore} from "@/store/editorStore";
import {ENSTRUMAN_LIST, PERCUSSION_INSTRUMENTS} from "@/lib/app-constants";

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
  const [isVelveleEnabled, setIsVelveleEnabled] = useState(false);
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(-1);
  const [progressBeat, setProgressBeat] = useState(-1);
  const [cycleCount, setCycleCount] = useState(0);
  const isPlayingRef = useRef(false);
  const isLoopRef = useRef(true);
  const cursorRafRef = useRef<number | null>(null);
  const loopControllerRef = useRef<RhythmLoopController | null>(null);

  const usulItems = USUL_DATA.map((usul) => ({
    key: usul.id,
    label: usul.name,
  }));

  // Velvele modu: kitaptaki susleme dizilisi varsa ve secildiyse onu cal/goster.
  const hasVelvele = Boolean(selectedUsulObj?.velvele?.length);
  const symbols =
    isVelveleEnabled && selectedUsulObj?.velvele?.length ? selectedUsulObj.velvele : selectedUsulObj?.symbols;
  const activeSymbol = currentSymbolIndex >= 0 ? symbols?.[currentSymbolIndex] : null;
  const percussionItems = ENSTRUMAN_LIST.filter((instrument) =>
    (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id as string)
  ).map((instrument) => ({
    key: instrument.id as string,
    label: i18n.language === "tr" ? instrument.nameTr : instrument.nameEn,
  }));

  const stopRhythm = useCallback(() => {
    isPlayingRef.current = false;
    if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    cursorRafRef.current = null;
    loopControllerRef.current?.stop();
    loopControllerRef.current = null;
    stopAll();
    setIsRhythmPlaying(false);
    setCurrentSymbolIndex(-1);
    setProgressBeat(-1);
    setCycleCount(0);
  }, []);

  const playSelectedUsul = useCallback(async () => {
    const usul = selectedUsulObj;
    if (!usul || isPlayingRef.current) return;
    const pattern = isVelveleEnabled && usul.velvele?.length ? usul.velvele : usul.symbols;

    // Dikissiz dongu: tum vuruslar WebAudio saatinde ileriye-bakisli
    // planlanir; gorsel imlec de ayni saatten okunur (drift/dikis yok).
    const controller = await startRhythmLoop(
      usul.beats,
      pattern,
      bpm,
      selectedPercussionInstrument,
      usul.unit,
      isLoopRef.current,
    );
    if (!controller || isPlayingRef.current) {
      controller?.stop();
      return;
    }

    loopControllerRef.current = controller;
    isPlayingRef.current = true;
    setIsRhythmPlaying(true);
    setProgressBeat(0);
    setCurrentSymbolIndex(0);
    setCycleCount(1);

    // Imlec requestAnimationFrame ile ekran tazelemesine hizali (akici) ve her
    // karede "duyulan" saati (getPositionBeats -> getOutputTimestamp) taze okur;
    // sekme gizlenip donerse otomatik yeniden senkron olur (drift birikmez).
    const tick = () => {
      if (!isPlayingRef.current) return;
      const positionBeats = controller.getPositionBeats();
      if (!isLoopRef.current && positionBeats >= usul.beats) {
        stopRhythm();
        return;
      }
      const beatInCycle = positionBeats % usul.beats;
      setProgressBeat(beatInCycle);
      setCycleCount(controller.getCycleCount());
      // Aktif darp = pozisyonu gecilmis SON sembol (beat kolonuna gore).
      let active = 0;
      for (let index = 0; index < pattern.length; index += 1) {
        if (pattern[index].beat <= beatInCycle + 1 + 1e-6) active = index;
      }
      setCurrentSymbolIndex(active);
      cursorRafRef.current = requestAnimationFrame(tick);
    };
    cursorRafRef.current = requestAnimationFrame(tick);
  }, [bpm, isVelveleEnabled, selectedPercussionInstrument, selectedUsulObj, stopRhythm]);

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
          <div className="flex flex-col gap-2 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
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
            {hasVelvele && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <input
                  type="checkbox"
                  aria-label="Velvele"
                  checked={isVelveleEnabled}
                  onChange={(event) => {
                    stopRhythm();
                    setIsVelveleEnabled(event.target.checked);
                  }}
                  className="h-4 w-4 accent-[var(--color-primary-600)]"
                />
                Velvele
              </label>
            )}
          </div>
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
                  ? `${activeSymbol.syllable ?? SYMBOL_LABELS[activeSymbol.symbol] ?? activeSymbol.symbol} (${activeSymbol.beat}. vuruş)`
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
