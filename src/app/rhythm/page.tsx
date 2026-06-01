/**
 * Usul Page - Usul Selection and Practice
 */

"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {LabeledSelect, LabeledSlider, PageHeader, PageShell, PageSurface, UsulPanel} from "@/shared/ui";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {USUL_DATA, getUsulBeatDuration} from "@/engines/usul/data";
import type {InstrumentType} from "@/engines/ses/engine";
import {initAudio, playRhythm, stopAll} from "@/engines/ses/engine";
import {useEditorStore} from "@/store/editorStore";
import {ENSTRUMAN_LIST, PERCUSSION_INSTRUMENTS} from "@/lib/centralized";

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
  const [currentBeatIndex, setCurrentBeatIndex] = useState(-1);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const usulItems = USUL_DATA.map((usul) => ({
    key: usul.id,
    label: usul.name,
  }));

  const symbols = selectedUsulObj?.symbols;
  const activeSymbol = currentBeatIndex >= 0 ? symbols?.[currentBeatIndex] : null;
  const percussionItems = ENSTRUMAN_LIST.filter((instrument) =>
    (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id as string)
  ).map((instrument) => ({
    key: instrument.id as string,
    label: i18n.language === "tr" ? instrument.nameTr : instrument.nameEn,
  }));

  const stopRhythm = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
    stopAll();
    setIsRhythmPlaying(false);
    setCurrentBeatIndex(-1);
  }, []);

  const playSelectedUsul = useCallback(async () => {
    if (!selectedUsulObj || isRhythmPlaying) return;

    stopRhythm();
    const beatDuration = getUsulBeatDuration(selectedUsulObj, bpm);
    const startedAt = performance.now();
    setIsRhythmPlaying(true);
    setCurrentBeatIndex(0);
    intervalRef.current = window.setInterval(() => {
      const elapsedBeats = Math.floor((performance.now() - startedAt) / (beatDuration * 1000));
      setCurrentBeatIndex(Math.min(selectedUsulObj.symbols.length - 1, elapsedBeats));
    }, 40);
    timeoutRef.current = window.setTimeout(stopRhythm, selectedUsulObj.beats * beatDuration * 1000 + 120);

    try {
      const audioReady = await initAudio();
      if (!audioReady) {
        stopRhythm();
        return;
      }

      await playRhythm(selectedUsulObj.beats, selectedUsulObj.symbols, bpm, selectedPercussionInstrument);
    } catch {
      stopRhythm();
    }
  }, [bpm, isRhythmPlaying, selectedPercussionInstrument, selectedUsulObj, stopRhythm]);

  useEffect(() => {
    if (!selectedUsulObj) setSelectedUsul("sofyan");
  }, [selectedUsulObj, setSelectedUsul]);

  useEffect(() => stopRhythm, [stopRhythm]);

  return (
    <UnifiedLayout>
      <PageShell className="max-w-5xl">
        <PageHeader
          meta="Ritim motoru"
          title={t("usul.title")}
          description={t("usul.subtitle")}
        />

        {/* Usul Seçimi ve Vuruş Gösterimi */}
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
          currentBeat={currentBeatIndex}
          className="mb-8"
        />

        {/* Kontroller */}
        <PageSurface className="mb-6 p-5">
          <div className="mb-4">
            <LabeledSelect
              label={t("makam.instrument")}
              ariaLabel={t("makam.selectInstrument")}
              items={percussionItems}
              value={selectedPercussionInstrument}
              onChange={(key) => setSelectedPercussionInstrument(key as InstrumentType)}
              placeholder={t("makam.instrumentPlaceholder")}
            />
          </div>
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
        </PageSurface>

        {/* Usul Bilgileri */}
        {selectedUsulObj && (
          <PageSurface className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">{t("usul.beats")}</p>
              <p className="font-semibold text-[var(--color-text-primary)]">{selectedUsulObj.beats}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">{t("usul.unit")}</p>
              <p className="font-semibold text-[var(--color-text-primary)]">{selectedUsulObj.unit}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Aktif darp</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {activeSymbol ? `${activeSymbol.beat}. ${activeSymbol.symbol.toUpperCase()}` : "Hazır"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Döngü</p>
              <p className="font-semibold text-[var(--color-text-primary)]">{isRhythmPlaying ? "Çalıyor" : "Durdu"}</p>
            </div>
          </PageSurface>
        )}
      </PageShell>
    </UnifiedLayout>
  );
}
