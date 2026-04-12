/**
 * Usul Page - Usul Selection and Practice
 */

"use client";

import {useTranslation} from "react-i18next";
import {UsulPanel} from "@/components/organisms/UsulPanel";
import {LabeledSelect} from "@/components/molecules/LabeledSelect";
import {LabeledSlider} from "@/components/molecules/LabeledSlider";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {USUL_DATA} from "@/engines/usul/data";
import type {InstrumentType} from "@/engines/ses/engine";
import {useOrchestrator} from "@/hooks/useOrchestrator";
import {ENSTRUMAN_LIST, PERCUSSION_INSTRUMENTS} from "@/lib/centralized";

export default function UsulPage() {
  const {t, i18n} = useTranslation();
  const {
    selectedUsul,
    selectedPercussionInstrument,
    isPlaying,
    bpm,
    selectUsul,
    playUsulRhythm,
    setBpm,
    setPercussionInstrument,
  } = useOrchestrator();

  const usulItems = USUL_DATA.map((usul) => ({
    key: usul.id,
    label: usul.name,
  }));

  const symbols = selectedUsul?.symbols;
  const percussionItems = ENSTRUMAN_LIST.filter((instrument) =>
    (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id as string)
  ).map((instrument) => ({
    key: instrument.id as string,
    label: i18n.language === "tr" ? instrument.nameTr : instrument.nameEn,
  }));

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
          playButtonAriaLabel={isPlaying ? t("common.loading") : t("usul.playRhythm")}
          usulItems={usulItems}
          selectedUsul={selectedUsul?.id}
          onUsulChange={selectUsul}
          symbols={symbols}
          onPlay={playUsulRhythm}
          beats={selectedUsul?.beats}
          unit={selectedUsul?.unit}
          isPlaying={isPlaying}
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
              onChange={(key) => setPercussionInstrument(key as InstrumentType)}
              placeholder={t("makam.instrumentPlaceholder")}
            />
          </div>
          <LabeledSlider
            label={`BPM: ${bpm}`}
            ariaLabel={t("usul.bpm")}
            value={bpm}
            onChange={(v) => setBpm(Number(v))}
            minValue={40}
            maxValue={200}
            step={10}
            size="sm"
          />
        </div>

        {/* Usul Bilgileri */}
        {selectedUsul && (
          <div style={styles.infoGrid}>
            <div>
              <p style={styles.infoLabel}>{t("usul.beats")}</p>
              <p style={styles.infoValue}>{selectedUsul.beats}</p>
            </div>
            <div>
              <p style={styles.infoLabel}>{t("usul.unit")}</p>
              <p style={styles.infoValue}>{selectedUsul.unit}</p>
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
    gridTemplateColumns: "repeat(2, 1fr)",
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
