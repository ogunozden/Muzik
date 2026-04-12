"use client";

import {useTranslation} from "react-i18next";
import {MakamPanel} from "@/components/organisms/MakamPanel";
import {LabeledSlider} from "@/components/molecules/LabeledSlider";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {MAKAM_DATA} from "@/engines/makam/data";
import {ENSTRUMAN_LIST} from "@/lib/centralized";
import {useOrchestrator} from "@/hooks/useOrchestrator";
import {tokens} from "@/lib/tokens";
import {InstrumentType} from "@/engines/ses/engine";

export default function MakamPage() {
  const {t, i18n} = useTranslation();
  const {
    selectedMakam,
    selectedInstrument,
    currentScale,
    isPlaying,
    bpm,
    selectMakam,
    playMakamScale,
    setBpm,
    setInstrument,
  } = useOrchestrator();

  const makamItems = MAKAM_DATA.map((makam) => ({
    key: makam.id,
    label: makam.name,
  }));

  const instrumentItems = ENSTRUMAN_LIST.filter((inst) => 
    ["ney", "ud", "kemençe", "tanpura"].includes(inst.id as string)
  ).map((inst) => ({
    key: inst.id as string,
    label: i18n.language === "tr" ? inst.nameTr : inst.nameEn,
  }));

  const scaleDisplay = selectedMakam
    ? {
        name: selectedMakam.name,
        notes: currentScale,
      }
    : undefined;

  return (
    <UnifiedLayout>
      <div className={`max-w-4xl mx-auto px-6 py-12 ${tokens.colors.background.base}`}>
        {/* Başlık */}
        <div className="mb-10">
          <h1 className={`text-3xl font-bold ${tokens.colors.text.primary} mb-2`}>
            {t("makam.title")}
          </h1>
          <p className={`text-sm ${tokens.colors.text.secondary}`}>
            {t("makam.subtitle")}
          </p>
        </div>

        {/* Makam Seçimi ve Kontroller */}
        <MakamPanel
          makamSelectAriaLabel={t("makam.selectMakam")}
          instrumentSelectAriaLabel={t("makam.selectInstrument")}
          scaleDisplayAriaLabel={t("makam.scaleDisplay")}
          playButtonAriaLabel={isPlaying ? t("common.loading") : t("makam.playScale")}
          makamItems={makamItems}
          instrumentItems={instrumentItems}
          selectedMakam={selectedMakam?.id}
          selectedInstrument={selectedInstrument}
          onMakamChange={selectMakam}
          onInstrumentChange={(key) => setInstrument(key as InstrumentType)}
          scaleDisplay={scaleDisplay}
          onPlay={playMakamScale}
          className="mb-8"
        />

        {/* BPM Kontrolü */}
        <div className={`p-5 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border mb-8`}>
          <LabeledSlider
            label={`BPM: ${bpm}`}
            ariaLabel={t("makam.bpm")}
            value={bpm}
            onChange={(v) => setBpm(Number(v))}
            minValue={60}
            maxValue={200}
            step={10}
            size="sm"
          />
        </div>

        {/* Açıklama */}
        {selectedMakam && (
          <div className={`p-5 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border`}>
            <p className={`text-sm ${tokens.colors.text.secondary} leading-relaxed`}>
              {selectedMakam.description}
            </p>
          </div>
        )}
      </div>
    </UnifiedLayout>
  );
}
