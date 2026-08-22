"use client";

import {useCallback, useMemo} from "react";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {tokens} from "@/shared/tokens";
import {Panel, Pill} from "./parts/FollowPrimitives";
import {FollowScorePanel} from "./parts/FollowScorePanel";
import {TempoControl} from "./parts/TempoControl";
import {FollowCuePanel} from "./parts/FollowCuePanel";
import {FollowLayersPanel} from "./parts/FollowLayersPanel";
import {PlaybackControlsPanel} from "./parts/PlaybackControlsPanel";
import {FollowPieceAddPanel} from "./parts/FollowPieceAddPanel";
import {StudioTabs} from "@/features/studio/StudioTabs";
import {formatTime} from "@/app/studio/follow/parts/follow-helpers";
import {useFollowPieces} from "@/app/studio/follow/hooks/useFollowPieces";
import {useFollowLayers} from "@/app/studio/follow/hooks/useFollowLayers";
import {useFollowPlayback} from "@/app/studio/follow/hooks/useFollowPlayback";

export default function EserTakipPage() {
  const pieces = useFollowPieces();
  const layers = useFollowLayers();
  const playback = useFollowPlayback({
    selectedPiece: pieces.selectedPiece,
    rawScore: pieces.rawScore,
    bpm: pieces.bpm,
    melodicLayers: layers.melodicLayers,
    percussionLayers: layers.percussionLayers,
    mutedLayerIds: layers.mutedLayerIds,
    soloLayerId: layers.soloLayerId,
  });

  const activeVerifiedPdfMeasureBox = useMemo(
    () =>
      pieces.selectedSymbTrVerifiedPdfMeasureBoxes.find((box) => box.measureIndex === playback.activeVisualMeasureSegment?.measureIndex) ?? null,
    [pieces.selectedSymbTrVerifiedPdfMeasureBoxes, playback.activeVisualMeasureSegment],
  );

  const handleSelectPiece = useCallback(
    (pieceId: string) => {
      const nextPiece = pieces.pieceLibrary.find((p) => p.id === pieceId);
      if (!nextPiece) return;
      playback.stopPlayback();
      pieces.selectPiece(pieceId);
      layers.syncLayersFromPiece(nextPiece);
      playback.resetLoopAndTranspose();
    },
    [layers, pieces, playback],
  );

  const handleAddCustomPiece = useCallback(() => {
    playback.stopPlayback();
    const created = pieces.addCustomPiece();
    if (created) layers.syncLayersFromPiece(created);
  }, [layers, pieces, playback]);

  const handleBpmChange = useCallback(
    (value: number) => {
      playback.stopPlayback();
      pieces.handleBpmChange(value);
    },
    [pieces, playback],
  );

  const handleAddMelodicLayer = useCallback(() => {
    playback.stopPlayback();
    layers.addMelodicLayer();
  }, [layers, playback]);

  const handleRemoveMelodicLayer = useCallback(
    (id: string) => {
      playback.stopPlayback();
      layers.removeMelodicLayer(id);
    },
    [layers, playback],
  );

  const handleAddPercussionLayer = useCallback(() => {
    playback.stopPlayback();
    layers.addPercussionLayer();
  }, [layers, playback]);

  const handleRemovePercussionLayer = useCallback(
    (id: string) => {
      playback.stopPlayback();
      layers.removePercussionLayer(id);
    },
    [layers, playback],
  );

  const handlePlayToggle = useCallback(() => {
    if (playback.isPlaying) playback.stopPlayback();
    else void playback.playPiece();
  }, [playback]);

  return (
    <UnifiedLayout>
      <StudioTabs />
      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 ${tokens.colors.background.base}`}>
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">{pieces.selectedPiece.displayTitle}</h1>
            <p className={`mt-2 text-sm ${tokens.colors.text.secondary}`}>
              {pieces.selectedPiece.composer} · {pieces.selectedPiece.makam} · {pieces.selectedPiece.form} · {pieces.selectedPiece.usul} {pieces.selectedPiece.meter}
              {pieces.selectedPiece.playbackAhenk ? ` · Ahenk: ${pieces.selectedPiece.playbackAhenk.label}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={playback.isPlaying ? "Durdur" : "Parçayı çal"}
              onClick={handlePlayToggle}
              disabled={!playback.isPlaying && (playback.events.length === 0 || layers.melodicLayers.length === 0)}
              className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[var(--color-primary-500)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {playback.isPlaying ? "Durdur" : "Parçayı Çal"}
            </button>
            {pieces.selectedPiece.playbackAhenk && <Pill tone="secondary">{pieces.selectedPiece.playbackAhenk.referencePitch}</Pill>}
            <Pill>{pieces.bpm} BPM</Pill>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <FollowScorePanel
            activeVerifiedPdfMeasureBox={activeVerifiedPdfMeasureBox}
            activeVisualBand={playback.activeVisualBand}
            activeVisualBandProgress={playback.activeVisualBandProgress}
            activeVisualBeatPosition={playback.activeVisualBeatPosition}
            activeVisualMeasureSegment={playback.activeVisualMeasureSegment}
            activeVisualNoteLabel={playback.activeVisualNoteLabel}
            activeVisualPageIndex={playback.activeVisualPageIndex}
            currentEvent={playback.currentEvent}
            referenceSources={pieces.referenceSources}
            selectedPiece={pieces.selectedPiece}
            selectedSymbTrPdfLayout={pieces.selectedSymbTrPdfLayout}
            selectedSymbTrPdfLayoutVerificationStatus={pieces.selectedSymbTrPdfLayoutVerificationStatus}
            selectedSymbTrSourceReferences={pieces.selectedSymbTrSourceReferences}
            selectedSymbTrVerifiedPdfMeasureBoxes={pieces.selectedSymbTrVerifiedPdfMeasureBoxes}
            visibleScoreEvents={playback.visibleScoreEvents}
            visualMeasureSegments={playback.visualMeasureSegments}
            visualTrackingIsExact={playback.visualTrackingIsExact}
          />

          <div className="flex flex-col gap-4">
            <FollowCuePanel
              currentSection={playback.currentSection}
              currentEvent={playback.currentEvent}
              playbackPosition={playback.playbackPosition}
              totalDuration={playback.totalDuration}
              activeVisualPageIndex={playback.activeVisualPageIndex}
              scorePageCount={pieces.selectedPiece.scorePageUrls.length}
              visualTrackingIsExact={playback.visualTrackingIsExact}
              activeVisualBandProgress={playback.activeVisualBandProgress}
              activeMeasureIndex={playback.activeVisualMeasureSegment?.measureIndex ?? null}
              usulName={playback.usul?.name ?? null}
              meter={pieces.selectedPiece.meter}
              activeUsulHit={playback.activeUsulHit}
              currentCycleBeat={playback.currentCycleBeat}
              currentPlaybackKoma53={playback.currentPlaybackKoma53}
              isPlaying={playback.isPlaying}
              progress={playback.progress}
              totalBeats={playback.totalBeats}
              currentBeat={playback.currentBeat}
            />

            <TempoControl bpm={pieces.bpm} onBpmChange={handleBpmChange} />

            <PlaybackControlsPanel
              volume={playback.volume}
              onVolumeChange={playback.setVolume}
              loopEnabled={playback.isLoopEnabled}
              onLoopEnabledChange={playback.setIsLoopEnabled}
              loopStartMeasure={playback.loopRegion?.startMeasure ?? 1}
              loopEndMeasure={playback.loopRegion?.endMeasure ?? playback.maxMeasureIndex}
              maxMeasure={playback.maxMeasureIndex}
              onLoopStartMeasureChange={playback.setLoopStartMeasure}
              onLoopEndMeasureChange={playback.setLoopEndMeasure}
              transposeKoma={playback.transposeKoma}
              onTransposeKomaChange={playback.setTransposeKoma}
            />

            <FollowPieceAddPanel
              pieceLibrary={pieces.pieceLibrary}
              selectedPieceId={pieces.selectedPiece.id}
              selectedPieceMakam={pieces.selectedPiece.makam}
              onSelectPiece={handleSelectPiece}
              symbtrCatalogCount={pieces.symbtrCatalogCount}
              customPieceDraft={pieces.customPieceDraft}
              catalogQuery={pieces.catalogQuery}
              onCatalogQueryChange={pieces.setCatalogQuery}
              catalogSearchIsLoading={pieces.catalogSearch.isLoading}
              catalogSearchError={pieces.catalogSearch.error}
              catalogResults={pieces.catalogResults}
              onApplyCatalogEntry={pieces.applyCatalogEntry}
              onUpdateDraftField={pieces.updateCustomPieceDraft}
              onScoreImagesSelected={pieces.handleCustomScoreImages}
              onRemoveScoreImage={pieces.removeCustomScoreImage}
              onAddPiece={handleAddCustomPiece}
              isAddingPiece={pieces.isAddingPiece}
              pieceMessage={pieces.pieceMessage}
            />

            <FollowLayersPanel
              layerInstrument={layers.layerInstrument}
              onLayerInstrumentChange={layers.setLayerInstrument}
              percussionInstrument={layers.percussionInstrument}
              onPercussionInstrumentChange={layers.setPercussionInstrument}
              melodicInstrumentItems={layers.melodicInstrumentItems}
              percussionInstrumentItems={layers.percussionInstrumentItems}
              onAddMelodicLayer={handleAddMelodicLayer}
              onChangePercussionLayer={handleAddPercussionLayer}
              onRemoveMelodicLayer={handleRemoveMelodicLayer}
              onRemovePercussionLayer={handleRemovePercussionLayer}
              mutedLayerIds={layers.mutedLayerIds}
              soloLayerId={layers.soloLayerId}
              onToggleMuteLayer={layers.toggleMuteLayer}
              onToggleSoloLayer={layers.toggleSoloLayer}
              melodicLayers={layers.melodicLayers}
              percussionLayers={layers.percussionLayers}
              layerMessage={layers.layerMessage}
              layerSampleMessages={playback.layerSampleMessages}
              hasSampleSlots={Boolean(playback.sampleSlots)}
              errorMessage={playback.sampleError ?? pieces.scoreError ?? null}
            />

            {playback.sectionMarkers.length > 0 && (
              <Panel>
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Bölümler</p>
                <div className="mt-3 space-y-2">
                  {playback.sectionMarkers.map((event) => (
                    <div key={event.index} className="flex items-center justify-between text-sm">
                      <span className={tokens.colors.text.primary}>{event.section}</span>
                      <span className={tokens.colors.text.secondary}>{formatTime(event.startTime)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
