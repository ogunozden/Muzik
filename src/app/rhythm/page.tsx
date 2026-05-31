/**
 * Usul Page - Usul Selection and Practice
 */

"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {LabeledSelect, LabeledSlider, UsulPanel} from "@/shared/ui";
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
      <div style={styles.container}>
        {/* Başlık */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            {t("usul.title")}
          </h1>
          <p style={styles.subtitle}>
            {t("usul.subtitle")}
          </p>
        </div>

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
        <div style={styles.controls}>
          <div style={styles.controlItem}>
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
        </div>

        {/* Usul Bilgileri */}
        {selectedUsulObj && (
          <div style={styles.infoGrid}>
            <div>
              <p style={styles.infoLabel}>{t("usul.beats")}</p>
              <p style={styles.infoValue}>{selectedUsulObj.beats}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>{t("usul.unit")}</p>
              <p style={styles.infoValue}>{selectedUsulObj.unit}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>Aktif darp</p>
              <p style={styles.infoValue}>
                {activeSymbol ? `${activeSymbol.beat}. ${activeSymbol.symbol.toUpperCase()}` : "Hazır"}
              </p>
            </div>
            <div>
              <p style={styles.infoLabel}>Döngü</p>
              <p style={styles.infoValue}>{isRhythmPlaying ? "Çalıyor" : "Durdu"}</p>
            </div>
          </div>
        )}
      </div>
    </UnifiedLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "56rem",
    marginLeft: "auto",
    marginRight: "auto",
    padding: "var(--space-12) var(--space-6)",
    backgroundColor: "var(--color-bg-base)",
  },
  header: {
    marginBottom: "var(--space-10)",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    marginBottom: "var(--space-2)",
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "var(--color-text-secondary)",
  },
  controls: {
    padding: "var(--space-5)",
    backgroundColor: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border-default)",
    marginBottom: "var(--space-8)",
  },
  controlItem: {
    marginBottom: "var(--space-4)",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))",
    gap: "var(--space-4)",
    padding: "var(--space-5)",
    backgroundColor: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border-default)",
  },
  infoLabel: {
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
    marginBottom: "var(--space-1)",
  },
  infoValue: {
    fontWeight: 600,
    color: "var(--color-text-primary)",
  },
};
