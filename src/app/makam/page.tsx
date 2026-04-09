"use client";

import {useTranslation} from "react-i18next";
import {MakamPanel} from "@/components/organisms/MakamPanel";
import {LabeledSlider} from "@/components/molecules/LabeledSlider";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {MAKAM_DATA} from "@/engines/makam/data";
import {useOrchestrator} from "@/hooks/useOrchestrator";
import {tokens} from "@/lib/tokens";
import {InstrumentType} from "@/engines/ses/engine";

const INSTRUMENTS: Array<{id: InstrumentType; name: string}> = [
  {id: "ney", name: "Ney"},
  {id: "ud", name: "Ud"},
  {id: "kemençe", name: "Kemençe"},
  {id: "tanpura", name: "Tanpura"},
];

export default function MakamPage() {
  const {t} = useTranslation();
  const {state, selectMakam, playMakamScale, setBpm, setInstrument} = useOrchestrator();

  const makamItems = MAKAM_DATA.map((makam) => ({
    key: makam.id,
    label: makam.name,
  }));

  const instrumentItems = INSTRUMENTS.map((inst) => ({
    key: inst.id,
    label: inst.name,
  }));

  const scaleDisplay = state.selectedMakam
    ? {
        name: state.selectedMakam.name,
        notes: state.currentScale,
      }
    : undefined;

  return (
    <UnifiedLayout>
      <div className={`max-w-4xl mx-auto px-4 py-8 ${tokens.colors.background.base}`}>
        <h1 className={`text-3xl font-bold ${tokens.colors.text.primary} mb-6`}>
          {t("makam.title")}
        </h1>

        <MakamPanel
          makamSelectAriaLabel={t("makam.selectMakam")}
          instrumentSelectAriaLabel={t("makam.selectInstrument")}
          scaleDisplayAriaLabel={t("makam.scaleDisplay")}
          playButtonAriaLabel={state.isPlaying ? t("common.loading") : t("makam.playScale")}
          makamItems={makamItems}
          instrumentItems={instrumentItems}
          selectedMakam={state.selectedMakam?.id}
          selectedInstrument={state.selectedInstrument}
          onMakamChange={selectMakam}
          onInstrumentChange={(key) => setInstrument(key as InstrumentType)}
          scaleDisplay={scaleDisplay}
          onPlay={playMakamScale}
          className="mb-6"
        />

        <div className={`p-4 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border mb-6`}>
          <LabeledSlider
            label={`BPM: ${state.bpm}`}
            ariaLabel={t("makam.bpm")}
            value={state.bpm}
            onChange={(v) => setBpm(Number(v))}
            minValue={60}
            maxValue={200}
            step={10}
            size="sm"
          />
        </div>

        {state.selectedMakam && (
          <div className={`p-4 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border`}>
            <p className={`text-sm ${tokens.colors.text.secondary}`}>
              {state.selectedMakam.description}
            </p>
          </div>
        )}
      </div>
    </UnifiedLayout>
  );
}