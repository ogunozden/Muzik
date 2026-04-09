"use client";

import {useTranslation} from "react-i18next";
import {UsulPanel} from "@/components/organisms/UsulPanel";
import {LabeledSlider} from "@/components/molecules/LabeledSlider";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {USUL_DATA} from "@/engines/usul/data";
import {useOrchestrator} from "@/hooks/useOrchestrator";
import {tokens} from "@/lib/tokens";

export default function UsulPage() {
  const {t} = useTranslation();
  const {state, selectUsul, playUsulRhythm, setBpm} = useOrchestrator();

  const usulItems = USUL_DATA.map((usul) => ({
    key: usul.id,
    label: usul.name,
  }));

  const symbols = state.selectedUsul?.symbols.map((s) => ({
    symbol: s.symbol === "dum" ? "●" : s.symbol === "tek" ? "○" : s.symbol === "ke" ? "◐" : "",
    count: s.isAccent ? 2 : 1,
  }));

  return (
    <UnifiedLayout>
      <div className={`max-w-4xl mx-auto px-4 py-8 ${tokens.colors.background.base}`}>
        <h1 className={`text-3xl font-bold ${tokens.colors.text.primary} mb-6`}>
          {t("usul.title")}
        </h1>

        <UsulPanel
          usulSelectAriaLabel={t("usul.selectUsul")}
          symbolGridAriaLabel={t("usul.symbolGrid")}
          playButtonAriaLabel={state.isPlaying ? t("common.loading") : t("usul.playRhythm")}
          usulItems={usulItems}
          selectedUsul={state.selectedUsul?.id}
          onUsulChange={selectUsul}
          symbols={symbols}
          onPlay={playUsulRhythm}
          className="mb-6"
        />

        <div className={`p-4 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border mb-6`}>
          <LabeledSlider
            label={`BPM: ${state.bpm}`}
            ariaLabel={t("usul.bpm")}
            value={state.bpm}
            onChange={(v) => setBpm(Number(v))}
            minValue={40}
            maxValue={200}
            step={10}
            size="sm"
          />
        </div>

        {state.selectedUsul && (
          <div className={`grid grid-cols-2 gap-4 p-4 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border`}>
            <div>
              <p className={`text-xs ${tokens.colors.text.secondary}`}>{t("usul.beats")}</p>
              <p className={`font-semibold ${tokens.colors.text.primary}`}>{state.selectedUsul.beats}</p>
            </div>
            <div>
              <p className={`text-xs ${tokens.colors.text.secondary}`}>{t("usul.unit")}</p>
              <p className={`font-semibold ${tokens.colors.text.primary}`}>{state.selectedUsul.unit}</p>
            </div>
          </div>
        )}
      </div>
    </UnifiedLayout>
  );
}