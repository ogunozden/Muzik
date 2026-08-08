import type {PieceLayer, PiecePercussionLayer} from "@/data/pieces/hicazkarPesrev";
import type {InstrumentType} from "@/engines/ses/engine";
import {tokens} from "@/shared/tokens";
import {Panel} from "./FollowPrimitives";
import {MELODIC_MIX_GAIN_CEILING} from "./follow-helpers";

/**
 * Calinan katmanlar paneli (M8.3 JSX bolme): melodik katman ekleme, tek
 * vurmali katman degistirme, katman listesi ve sample durum mesajlari.
 * Saf gosterim + callback'ler; tum durum ust bilesenden gelir.
 */
export interface FollowLayersPanelProps {
  layerInstrument: InstrumentType;
  onLayerInstrumentChange: (instrument: InstrumentType) => void;
  percussionInstrument: InstrumentType;
  onPercussionInstrumentChange: (instrument: InstrumentType) => void;
  melodicInstrumentItems: ReadonlyArray<{id: InstrumentType; label: string}>;
  percussionInstrumentItems: ReadonlyArray<{id: InstrumentType; label: string}>;
  onAddMelodicLayer: () => void;
  onChangePercussionLayer: () => void;
  onRemoveMelodicLayer: (id: string) => void;
  onRemovePercussionLayer: (id: string) => void;
  /** Sessize alinan katman id'leri (master volume'dan bagimsiz). */
  mutedLayerIds: readonly string[];
  /** Yalniz calan katman id'si; null = solo yok. */
  soloLayerId: string | null;
  onToggleMuteLayer: (id: string) => void;
  onToggleSoloLayer: (id: string) => void;
  melodicLayers: readonly PieceLayer[];
  percussionLayers: readonly PiecePercussionLayer[];
  layerMessage: string | null;
  layerSampleMessages: readonly string[];
  hasSampleSlots: boolean;
  errorMessage: string | null;
}

export function FollowLayersPanel({
  layerInstrument,
  onLayerInstrumentChange,
  percussionInstrument,
  onPercussionInstrumentChange,
  melodicInstrumentItems,
  percussionInstrumentItems,
  onAddMelodicLayer,
  onChangePercussionLayer,
  onRemoveMelodicLayer,
  onRemovePercussionLayer,
  mutedLayerIds,
  soloLayerId,
  onToggleMuteLayer,
  onToggleSoloLayer,
  melodicLayers,
  percussionLayers,
  layerMessage,
  layerSampleMessages,
  hasSampleSlots,
  errorMessage,
}: FollowLayersPanelProps) {
  return (
    <Panel>
      <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Çalınan katmanlar</p>
      <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
        Aynı enstrüman ikinci kez eklenmez; ezgi katmanları çalarken toplam gain {MELODIC_MIX_GAIN_CEILING.toFixed(2)} tavanına göre dengelenir. Vurmalı çalgı tek katman olarak değiştirilir.
      </p>
      <div className="mt-3 grid gap-3">
        <div className="flex gap-2">
          <select
            id="melodic-layer-instrument"
            name="melodic-layer-instrument"
            aria-label="Melodik enstrüman ekle"
            value={layerInstrument}
            onChange={(event) => onLayerInstrumentChange(event.target.value as InstrumentType)}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
          >
            {melodicInstrumentItems.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>{instrument.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddMelodicLayer}
            className="rounded-md bg-[var(--color-primary-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-600)]"
          >
            Ekle
          </button>
        </div>

        <div className="flex gap-2">
          <select
            id="percussion-layer-instrument"
            name="percussion-layer-instrument"
            aria-label="Vurmalı enstrüman ekle"
            value={percussionInstrument}
            onChange={(event) => onPercussionInstrumentChange(event.target.value as InstrumentType)}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
          >
            {percussionInstrumentItems.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>{instrument.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onChangePercussionLayer}
            className="rounded-md border border-[var(--color-border-default)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]"
          >
            Değiştir
          </button>
        </div>
      </div>

      {layerMessage && (
        <div className="mt-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
          {layerMessage}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {melodicLayers.map((layer) => (
          <div key={layer.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm">
            <span>{layer.label} · ezgi</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={soloLayerId === layer.id}
                onClick={() => onToggleSoloLayer(layer.id)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  soloLayerId === layer.id
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                    : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                }`}
              >
                Solo
              </button>
              <button
                type="button"
                aria-pressed={mutedLayerIds.includes(layer.id)}
                onClick={() => onToggleMuteLayer(layer.id)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  mutedLayerIds.includes(layer.id)
                    ? "border-[var(--color-error)] bg-[var(--color-error-light)] text-[var(--color-error-dark)]"
                    : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                }`}
              >
                Sessiz
              </button>
              <button
                type="button"
                onClick={() => onRemoveMelodicLayer(layer.id)}
                disabled={melodicLayers.length <= 1}
                className="text-[var(--color-error)] disabled:opacity-40"
              >
                Kaldır
              </button>
            </span>
          </div>
        ))}
        {percussionLayers.map((layer) => (
          <div key={layer.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm">
            <span>{layer.label} · vuruş</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={soloLayerId === layer.id}
                onClick={() => onToggleSoloLayer(layer.id)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  soloLayerId === layer.id
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                    : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                }`}
              >
                Solo
              </button>
              <button
                type="button"
                aria-pressed={mutedLayerIds.includes(layer.id)}
                onClick={() => onToggleMuteLayer(layer.id)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  mutedLayerIds.includes(layer.id)
                    ? "border-[var(--color-error)] bg-[var(--color-error-light)] text-[var(--color-error-dark)]"
                    : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                }`}
              >
                Sessiz
              </button>
              <button
                type="button"
                onClick={() => onRemovePercussionLayer(layer.id)}
                className="text-[var(--color-error)]"
              >
                Kaldır
              </button>
            </span>
          </div>
        ))}
      </div>

      {layerSampleMessages.length > 0 && (
        <div className="mt-4 space-y-1 text-sm text-[var(--color-text-secondary)]">
          {layerSampleMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {hasSampleSlots && layerSampleMessages.length === 0 && (
        <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
          Sample hazır; eksik olursa sentez kullanılır.
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 text-sm text-[var(--color-error)]">
          {errorMessage}
        </p>
      )}
    </Panel>
  );
}
