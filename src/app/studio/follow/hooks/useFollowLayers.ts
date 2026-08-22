"use client";

import {useCallback, useMemo, useState} from "react";
import type {PieceDefinition, PieceLayer, PiecePercussionLayer} from "@/data/pieces/hicazkarPesrev";
import type {InstrumentType} from "@/engines/ses/engine";
import {INSTRUMENTS, MELODIC_INSTRUMENTS, PERCUSSION_INSTRUMENTS} from "@/shared/config/instruments";
import {
  ADDED_MELODIC_LAYER_GAIN,
  DEFAULT_PIECE,
  getInstrumentLabel,
  hasMelodicSamples,
  hasPercussionSamples,
  makeLayerId,
  type SampleSlotStatus,
} from "@/app/studio/follow/parts/follow-helpers";

type UseFollowLayersOptions = {
  stopPlayback?: () => void;
  initialMelodicLayers?: readonly PieceLayer[];
  initialPercussionLayers?: readonly PiecePercussionLayer[];
};

export function useFollowLayers(options: UseFollowLayersOptions = {}) {
  const {stopPlayback, initialMelodicLayers, initialPercussionLayers} = options;
  const [layerInstrument, setLayerInstrument] = useState<InstrumentType>("ney");
  const [percussionInstrument, setPercussionInstrument] = useState<InstrumentType>("kudum");
  const [melodicLayers, setMelodicLayers] = useState<PieceLayer[]>(() =>
    initialMelodicLayers ? [...initialMelodicLayers] : [...DEFAULT_PIECE.melodicLayers],
  );
  const [percussionLayers, setPercussionLayers] = useState<PiecePercussionLayer[]>(() =>
    initialPercussionLayers ? [...initialPercussionLayers] : [...DEFAULT_PIECE.percussionLayers],
  );
  const [layerMessage, setLayerMessage] = useState<string | null>(null);
  const [mutedLayerIds, setMutedLayerIds] = useState<string[]>([]);
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);

  const melodicInstrumentItems = useMemo(
    () =>
      INSTRUMENTS.filter((instrument) => (MELODIC_INSTRUMENTS as readonly string[]).includes(instrument.id)).map(
        (instrument) => ({
          id: instrument.id as InstrumentType,
          label: instrument.nameTr,
        }),
      ),
    [],
  );

  const percussionInstrumentItems = useMemo(
    () =>
      INSTRUMENTS.filter((instrument) => (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id)).map(
        (instrument) => ({
          id: instrument.id as InstrumentType,
          label: instrument.nameTr,
        }),
      ),
    [],
  );

  const syncLayersFromPiece = useCallback((piece: PieceDefinition) => {
    setMelodicLayers([...piece.melodicLayers]);
    setPercussionLayers([...piece.percussionLayers]);
    setLayerMessage(null);
  }, []);

  const addMelodicLayer = useCallback(() => {
    stopPlayback?.();
    if (melodicLayers.some((layer) => layer.instrument === layerInstrument)) {
      setLayerMessage(`${getInstrumentLabel(layerInstrument)} zaten ezgi katmanlarında var.`);
      return;
    }
    setMelodicLayers((layers) => {
      const existingIds = new Set(layers.map((layer) => layer.id));
      return [
        ...layers,
        {
          id: makeLayerId(layerInstrument, existingIds),
          label: getInstrumentLabel(layerInstrument),
          instrument: layerInstrument,
          gain: ADDED_MELODIC_LAYER_GAIN,
          delay: layers.length * 0.012,
        },
      ];
    });
    setLayerMessage("Ezgi katmanları otomatik miks dengesiyle çalınır.");
  }, [layerInstrument, melodicLayers, stopPlayback]);

  const removeMelodicLayer = useCallback(
    (id: string) => {
      stopPlayback?.();
      setMelodicLayers((layers) => (layers.length <= 1 ? layers : layers.filter((layer) => layer.id !== id)));
    },
    [stopPlayback],
  );

  const addPercussionLayer = useCallback(() => {
    stopPlayback?.();
    if (percussionLayers.some((layer) => layer.instrument === percussionInstrument)) {
      setLayerMessage(`${getInstrumentLabel(percussionInstrument)} zaten vuruş katmanlarında var.`);
      return;
    }
    setPercussionLayers([
      {
        id: makeLayerId(percussionInstrument, new Set()),
        label: getInstrumentLabel(percussionInstrument),
        instrument: percussionInstrument,
      },
    ]);
    setLayerMessage("Vuruş enstrümanı değiştirildi; vurmalı katmanlar üst üste bindirilmez.");
  }, [percussionInstrument, percussionLayers, stopPlayback]);

  const removePercussionLayer = useCallback(
    (id: string) => {
      stopPlayback?.();
      setPercussionLayers((layers) => layers.filter((layer) => layer.id !== id));
    },
    [stopPlayback],
  );

  const toggleMuteLayer = useCallback((layerId: string) => {
    setMutedLayerIds((current) =>
      current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId],
    );
  }, []);

  const toggleSoloLayer = useCallback((layerId: string) => {
    setSoloLayerId((current) => (current === layerId ? null : layerId));
  }, []);

  const getLayerSampleMessages = useCallback(
    (sampleSlots: SampleSlotStatus[] | null, requiredPercussionSymbols: readonly import("@/engines/ses/engine").PercussionSymbol[]) => {
      if (!sampleSlots) return [] as string[];
      return [
        ...melodicLayers
          .filter((layer) => !hasMelodicSamples(sampleSlots, layer.instrument))
          .map((layer) => `${layer.label}: sample yok, sentez kullanılır`),
        ...percussionLayers
          .filter((layer) => !hasPercussionSamples(sampleSlots, layer.instrument, requiredPercussionSymbols))
          .map((layer) => `${layer.label}: bazı vuruş sample'ları yok, sentez tamamlar`),
      ];
    },
    [melodicLayers, percussionLayers],
  );

  return {
    layerInstrument,
    setLayerInstrument,
    percussionInstrument,
    setPercussionInstrument,
    melodicLayers,
    setMelodicLayers,
    percussionLayers,
    setPercussionLayers,
    layerMessage,
    setLayerMessage,
    mutedLayerIds,
    setMutedLayerIds,
    soloLayerId,
    setSoloLayerId,
    melodicInstrumentItems,
    percussionInstrumentItems,
    syncLayersFromPiece,
    addMelodicLayer,
    removeMelodicLayer,
    addPercussionLayer,
    removePercussionLayer,
    toggleMuteLayer,
    toggleSoloLayer,
    getLayerSampleMessages,
  };
}
