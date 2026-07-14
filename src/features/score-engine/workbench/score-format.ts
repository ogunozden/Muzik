import type {CanonicalScoreDocument} from "@/data/score-engine/canonical-score";
import {computePolicyDerivedNaturals, computeSourceProvenTies} from "@/data/score-engine/notation";
import type {CanonicalScoreQualityReport} from "@/data/score-engine/quality";
import type {InstrumentType} from "@/engines/ses/engine";
import {ENSTRUMAN_LIST} from "@/lib/app-constants";
import {buildScoreRenderSystems, type ScoreRenderSystem} from "../score-layout";

/**
 * ScoreEngine workbench icin saf yardimcilar, sabitler ve tipler (M8.4 bolme).
 * JSX icermez; hem ana bilesen hem `ScoreSurface` bu modulu paylasir.
 */

export const SURFACE_WIDTH = 1180;
export const SCORE_PADDING_X = 38;
export const SURFACE_HEADER_HEIGHT = 116;
export const SYSTEM_HEIGHT = 210;
export const STAVE_TOP_IN_SYSTEM = 56;
export const STAVE_HEIGHT = 128;
export const STAVE_WIDTH_MIN = 820;
export const EVIDENCE_BOTTOM_GAP = 42;

export type VisibleScoreLayers = {
  accidentals: boolean;
  cursor: boolean;
  evidence: boolean;
  grid: boolean;
  measureLabels: boolean;
};

export type VisibleScoreLayer = keyof VisibleScoreLayers;

export const DEFAULT_VISIBLE_LAYERS: VisibleScoreLayers = {
  accidentals: true,
  cursor: true,
  evidence: true,
  grid: true,
  measureLabels: true,
};

export const SCORE_LAYER_CONTROLS: Array<{id: VisibleScoreLayer; label: string; value: string}> = [
  {id: "grid", label: "Grid", value: "surface"},
  {id: "measureLabels", label: "Ölçü", value: "barline"},
  {id: "accidentals", label: "Arıza", value: "♯/♭"},
  {id: "cursor", label: "Cursor", value: "noteId"},
  {id: "evidence", label: "Kanıt", value: "source"},
];

export interface ScoreRenderSystemLayout extends ScoreRenderSystem {
  width: number;
  x: number;
  y: number;
}

export interface NoteRenderPosition {
  id: string;
  labelY: number;
  measureId: string;
  systemId: string;
  x: number;
  y: number;
}

export interface SectionMarkerPosition {
  id: string;
  label: string;
  systemId: string;
  x: number;
  y: number;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function formatFrequency(value: number | null): string {
  return value ? `${value.toFixed(2)} Hz` : "-";
}

export function formatWesternPitch(value: string | null): string {
  if (!value) return "-";
  return value.replaceAll("#", "♯").replaceAll("b", "♭");
}

export function formatNotationLabel(value: string | null): string {
  return value ? value.replaceAll("#", "♯").replaceAll("b", "♭") : "Es";
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatKomaAccidental(value: string | null): string | null {
  if (!value) return null;
  return value.replace("#", "♯").replace("b", "♭");
}

export function formatKeySignaturePolicy(document: CanonicalScoreDocument): string {
  const accidentals = document.notationPolicy.keySignature.accidentals;
  if (accidentals.length === 0) return "key policy: kaynak eksik";
  return accidentals.map((accidental) => `${accidental.step}${accidental.accidental}`).join(" / ");
}

export function parseMeter(value: string): {beatValue: number; numBeats: number} {
  const match = value.match(/^(\d+)\/(\d+)$/);
  if (!match) return {beatValue: 4, numBeats: 4};
  return {
    beatValue: Math.max(1, Number(match[2])),
    numBeats: Math.max(1, Number(match[1])),
  };
}

export function getSurfaceWidth(): number {
  return Math.max(SURFACE_WIDTH, SCORE_PADDING_X * 2 + STAVE_WIDTH_MIN);
}

export function getSurfaceHeight(systemCount: number): number {
  return SURFACE_HEADER_HEIGHT + Math.max(1, systemCount) * SYSTEM_HEIGHT + EVIDENCE_BOTTOM_GAP;
}

export function getSystemLayouts(document: CanonicalScoreDocument, surfaceWidth: number): ScoreRenderSystemLayout[] {
  const availableWidth = surfaceWidth - SCORE_PADDING_X * 2;

  return buildScoreRenderSystems(document).map((system, index) => ({
    ...system,
    width: Math.max(STAVE_WIDTH_MIN, availableWidth - 64),
    x: SCORE_PADDING_X,
    y: SURFACE_HEADER_HEIGHT + index * SYSTEM_HEIGHT,
  }));
}

export function getSystemLabel(system: ScoreRenderSystemLayout): string {
  if (system.segmentCount === 1) return `ölçü ${system.measureIndex}`;
  return `ölçü ${system.measureIndex} · ${system.segmentIndex + 1}/${system.segmentCount}`;
}

export type GlyphDispatchStatus =
  | "source-proven"
  | "policy-derived"
  | "visual-evidence-only"
  | "unsupported"
  | "missing";

export interface GlyphClassDispatch {
  id: string;
  status: GlyphDispatchStatus;
  rendered: boolean;
  evidence: string;
}

/**
 * Merkezi glyph dispatch tablosu (E3/F8.3; ENGRAVING_POLICY bolum 1).
 *
 * Render yuzeyindeki HER glyph sinifi bu tablodan gecer: durum kaynak/policy
 * gercekliginden turetilir ve `rendered` yalniz `source-proven` veya
 * `policy-derived` durumlarinda true olabilir — kaynaksiz sinif cizilemez.
 * Manifest (`score-glyph-class-map`) bu tabloyu `dispatch:` satirlariyla
 * raporlar; browser audit'leri boylece "cizilen her sey siniflandirildi"
 * iddiasini dogrulayabilir.
 */
export function dispatchGlyphClasses(document: CanonicalScoreDocument): GlyphClassDispatch[] {
  const keySource = document.notationPolicy.keySignature.source;
  const hasKeyAccidentals = document.notationPolicy.keySignature.accidentals.length > 0;
  const tupletFeatures = document.sourceFeatures.filter(
    (feature) => feature.kind === "unsupported-symbol" && feature.label.startsWith("tuplet"),
  );
  const policyNaturalCount = computePolicyDerivedNaturals(document.events).size;
  const sourceTies = computeSourceProvenTies(document);
  const hasSourceNatural = document.events.some(
    (event) => event.pitch.source.includes("n") || event.pitch.source.includes("♮"),
  );

  return [
    {
      id: "staff-clef-meter",
      status: "source-proven",
      rendered: true,
      evidence: `meter ${document.meter} from SymbTr header`,
    },
    {
      id: "note-heads-durations",
      status: "source-proven",
      rendered: true,
      evidence: `${document.events.length} canonical events`,
    },
    {
      id: "inline-koma-accidentals",
      status: "source-proven",
      rendered: true,
      evidence: document.notationPolicy.inlineAccidentals.action,
    },
    {
      id: "key-signature",
      status: hasKeyAccidentals ? "source-proven" : "missing",
      rendered: hasKeyAccidentals,
      evidence: `keySignature.source=${keySource}`,
    },
    {
      id: "section-usul-labels",
      status: document.sections.length > 0 ? "source-proven" : "missing",
      rendered: document.sections.length > 0,
      evidence: `${document.sections.length} section, usul=${document.usul}`,
    },
    {
      id: "natural-accidental",
      status: hasSourceNatural ? "source-proven" : policyNaturalCount > 0 ? "policy-derived" : "missing",
      rendered: hasSourceNatural || policyNaturalCount > 0,
      evidence: `policy naturals=${policyNaturalCount}`,
    },
    {
      id: "tuplet-time-modification",
      status: tupletFeatures.length > 0 ? "unsupported" : "missing",
      rendered: false,
      evidence:
        tupletFeatures.length > 0
          ? tupletFeatures.map((feature) => feature.label).join(", ")
          : "no tuplet source feature",
    },
    {
      id: "repeat-volta-endings",
      status: "visual-evidence-only",
      rendered: false,
      evidence:
        "SymbTr v3 symbolic sources carry zero repeat/ending/segno for this piece; printed segno remains visual-evidence-only",
    },
    {
      id: "slur-tie",
      status: sourceTies.length > 0 ? "source-proven" : "visual-evidence-only",
      rendered: sourceTies.length > 0,
      evidence:
        sourceTies.length > 0
          ? `${sourceTies.length} source-proven tie (SymbTr v3 MusicXML <tied> + mu2 caret): ${sourceTies
              .map((tie) => `${tie.fromEventId}->${tie.toEventId}`)
              .join(", ")}`
          : "no validated tie source feature",
    },
  ];
}

export function buildGlyphClassMapText(document: CanonicalScoreDocument): string {
  const glyphTokens = [
    `usul-label:${document.usul}`,
    `meter-label:${document.meter}`,
    `key-signature-source:${document.notationPolicy.keySignature.source}`,
    `source-alignment:${document.notationPolicy.sourceAlignment.status}`,
    ...document.notationPolicy.keySignature.accidentals.map(
      (accidental) => `key-accidental:${accidental.step}:${accidental.accidental}`,
    ),
    ...document.sections.map((section) => `section-label:${section.label}`),
  ];

  if (document.events.some((event) => event.tie)) glyphTokens.push("tie-token");
  if (document.events.some((event) => event.slur)) glyphTokens.push("slur-token");
  // Kaynak-kanitli tie'lar (F8.7; SymbTr v3 <tied> kanali): dogrulanmis her
  // cift manifestte ayri token'la raporlanir; strict audit bu token'i sayar.
  for (const tie of computeSourceProvenTies(document)) {
    glyphTokens.push(`tie-token:source-proven:${tie.fromEventId}->${tie.toEventId}`);
  }
  if (document.events.some((event) => event.pitch.source.includes("n") || event.pitch.source.includes("♮"))) {
    glyphTokens.push("natural-accidental-token");
  }
  // Policy-derived cancellation naturals (ENGRAVING_POLICY bolum 3) manifestte
  // ayri token'la raporlanir; kaynak-natural ile karistirilmaz.
  if (computePolicyDerivedNaturals(document.events).size > 0) {
    glyphTokens.push("natural-accidental-token:policy-derived");
  }

  // Merkezi dispatch tablosu (E3): her sinif durum+rendered ile raporlanir.
  for (const entry of dispatchGlyphClasses(document)) {
    glyphTokens.push(`dispatch:${entry.id}:${entry.status}:${entry.rendered ? "rendered" : "not-rendered"}`);
  }

  return glyphTokens.join("\n");
}

export function getInstrumentLabel(instrumentId: InstrumentType): string {
  return ENSTRUMAN_LIST.find((instrument) => instrument.id === instrumentId)?.nameTr ?? instrumentId;
}

export function getValidationTone(document: CanonicalScoreDocument): "success" | "warning" | "neutral" {
  if (document.validationIssues.some((issue) => issue.severity === "error")) return "warning";
  if (document.validationIssues.some((issue) => issue.severity === "warning")) return "neutral";
  return "success";
}

export function getQualityTone(report: CanonicalScoreQualityReport): "success" | "warning" | "neutral" {
  if (report.status === "ready") return "success";
  if (report.status === "blocked") return "warning";
  return "neutral";
}
