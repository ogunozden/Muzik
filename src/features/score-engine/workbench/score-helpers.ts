import {STAVE_TOP_IN_SYSTEM, SURFACE_HEADER_HEIGHT, SYSTEM_HEIGHT} from "@/features/score-engine/workbench/score-format";
import type {NoteRenderPosition, ScoreRenderSystemLayout, SectionMarkerPosition} from "@/features/score-engine/workbench/score-format";
import type {CanonicalScoreDocument} from "@/data/score-engine/canonical-score";

/** Bir frame'de cizilecek sistem sayisi (D12). */
export const SYSTEMS_PER_FRAME = 8;

/**
 * Bu sayidan AZ sistemi olan belgeler tamamen cizilir — sanallastirma yok (K5).
 */
export const VIRTUALIZATION_MIN_SYSTEMS = 24;

/** Viewport disinda, ustte ve altta hazir tutulan sistem sayisi. */
export const RENDER_OVERSCAN_SYSTEMS = 6;

/**
 * Bir sonraki frame'i bekler. `requestAnimationFrame` yoksa (jsdom/SSR) hemen
 * cozulur — cizim yine tamamlanir, yalnizca bolunmez.
 */
export function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") return Promise.resolve();
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function computeRenderWindow(
  top: number,
  bottom: number,
  systemCount: number,
): {start: number; end: number} {
  const first = Math.floor((top - SURFACE_HEADER_HEIGHT) / SYSTEM_HEIGHT) - RENDER_OVERSCAN_SYSTEMS;
  const last = Math.ceil((bottom - SURFACE_HEADER_HEIGHT) / SYSTEM_HEIGHT) + RENDER_OVERSCAN_SYSTEMS;
  return {
    start: Math.max(0, first),
    end: Math.min(systemCount, Math.max(0, last)),
  };
}

export function getActiveCallout(
  activePosition: NoteRenderPosition | null,
  activeSystemLayout: ScoreRenderSystemLayout | null,
): {x: number; y: number} | null {
  if (!activePosition || !activeSystemLayout) return null;
  return {
    x: Math.min(
      Math.max(activePosition.x + 12, activeSystemLayout.x + 12),
      activeSystemLayout.x + activeSystemLayout.width - 128,
    ),
    y: activeSystemLayout.y + STAVE_TOP_IN_SYSTEM - 62,
  };
}

export function buildSectionMarkerPositions(
  document: CanonicalScoreDocument,
  notePositions: NoteRenderPosition[],
  systemLayouts: ScoreRenderSystemLayout[],
): SectionMarkerPosition[] {
  const eventById = new Map(document.events.map((event) => [event.id, event]));
  const firstEventIdBySection = new Map<string, string>();
  for (const section of document.sections) {
    const firstEventId = section.eventIds.find((eventId) => eventById.has(eventId));
    if (firstEventId) firstEventIdBySection.set(section.id, firstEventId);
  }

  return document.sections
    .map((section) => {
      const firstEventId = firstEventIdBySection.get(section.id);
      const position = firstEventId ? notePositions.find((candidate) => candidate.id === firstEventId) : null;
      const system = position ? systemLayouts.find((layout) => layout.id === position.systemId) : null;
      if (!position || !system) return null;
      return {
        id: section.id,
        label: section.label,
        systemId: position.systemId,
        x: Math.min(Math.max(position.x - 116, system.x + 112), system.x + system.width - 132),
        y: system.y + STAVE_TOP_IN_SYSTEM - 40,
      };
    })
    .filter((marker): marker is SectionMarkerPosition => Boolean(marker));
}
