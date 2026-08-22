/**
 * Verovio MEI emitter — canonical document -> MEI stub.
 *
 * Koma 53-EDO -> MEI accid.ges mapping is the musical core: each koma is
 * ~22.64 cents (1200/53). Standard VexFlow path draws koma via glyph text;
 * Verovio path carries the same microtone via MEI @accid.ges so the WASM
 * toolkit can render it with proper SMuFL. Full engraving (beam, tuplet,
 * tie splitting) is TODO behind this stub — the MEI is intentionally simple
 * but valid and passes build/typecheck.
 */

import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";
import {parsePitch} from "@/core/domain/note-naming";
import {getTupletContext, mapEventDurationToVex} from "@/data/score-engine/notation";

const MEI_VERSION = "5.0";

/** One koma in cents (1200 / 53). */
const CENTS_PER_KOMA = 1200 / 53;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Koma accidental string (e.g. "#4", "b5", "#1") -> MEI @accid.ges cent hint.
 * Returns a symbolic ges value suitable for `accid.ges` (Verovio understands
 * s/f plus cent adjustments; we keep the raw koma plus cents so TODO can
 * swap in proper SMuFL `accid` later without changing call sites).
 */
export function komaAccidentalToGes(komaAccidental: string | null): string | null {
  if (!komaAccidental) return null;
  if (komaAccidental === "#") return "s";
  if (komaAccidental === "b") return "f";
  const match = komaAccidental.match(/^([#b])(\d+)$/);
  if (!match) return komaAccidental;
  const [, sign, komaText] = match;
  const koma = Number(komaText);
  if (!Number.isFinite(koma)) return komaAccidental;
  const cents = (koma * CENTS_PER_KOMA).toFixed(1);
  const base = sign === "#" ? "s" : "f";
  return `${base}${koma}c:${cents}c`;
}

/**
 * Canonical pitch -> MEI pitch attributes.
 *
 * - pname: a-g (lowercase)
 * - oct: octave number
 * - accid / accid.ges: standard sharp/flat or koma 53-EDO microtone
 */
export function pitchToMeiAttrs(event: CanonicalScoreEvent): {
  pname: string;
  oct: string;
  accid: string | null;
  accidGes: string | null;
} {
  const parsed = parsePitch(event.pitch.source);
  if (!parsed) {
    const fallback = event.pitch.playback ? parsePitch(event.pitch.playback) : null;
    if (fallback) {
      const accid = fallback.accidental.startsWith("#") ? "s" : fallback.accidental.startsWith("b") ? "f" : null;
      return {pname: fallback.step.toLowerCase(), oct: String(fallback.octave), accid, accidGes: accid};
    }
    return {pname: "c", oct: "4", accid: null, accidGes: null};
  }
  const pname = parsed.step.toLowerCase();
  const oct = String(parsed.octave);
  if (parsed.symbtrAccidental) {
    const ges = komaAccidentalToGes(parsed.accidental);
    return {pname, oct, accid: null, accidGes: ges};
  }
  const accid = parsed.accidental.startsWith("#") ? "s" : parsed.accidental.startsWith("b") ? "f" : null;
  return {pname, oct, accid, accidGes: accid};
}

function vexDurationToMeiDur(vexDuration: string): {dur: string; dots: number} {
  const base = vexDuration.replace("r", "");
  const map: Record<string, string> = {
    w: "1",
    h: "2",
    q: "4",
    "8": "8",
    "16": "16",
    "32": "32",
    "64": "64",
  };
  return {dur: map[base] ?? "4", dots: 0};
}

/**
 * Canonical duration (beats, with tuplet & tie split already resolved in
 * notation.ts) -> MEI @dur + @dots + tuplet hint.
 * Stub: returns first tied part; full beam/tie spanning is TODO.
 */
export function durationToMeiAttrs(event: CanonicalScoreEvent): {
  dur: string;
  dots: number;
  tuplet: ReturnType<typeof getTupletContext>;
  tiedParts: number;
} {
  const mapped = mapEventDurationToVex(event);
  const base = vexDurationToMeiDur(mapped.duration);
  return {
    dur: base.dur,
    dots: mapped.dotted ? 1 : 0,
    tuplet: mapped.tuplet ?? null,
    tiedParts: mapped.tiedParts?.length ?? 1,
  };
}

function emitNoteXml(event: CanonicalScoreEvent, indexInMeasure: number): string {
  if (event.isRest) {
    const dur = durationToMeiAttrs(event);
    const dots = dur.dots ? ` dots="${dur.dots}"` : "";
    return `              <rest xml:id="${escapeXml(event.id)}" dur="${dur.dur}"${dots} />`;
  }
  const pitch = pitchToMeiAttrs(event);
  const dur = durationToMeiAttrs(event);
  const dots = dur.dots ? ` dots="${dur.dots}"` : "";
  const accidAttr = pitch.accid ? ` accid="${pitch.accid}"` : "";
  const accidGesAttr = pitch.accidGes ? ` accid.ges="${escapeXml(pitch.accidGes)}"` : "";
  const tieAttr = event.tie ? ` tie="${event.tie === "start" || event.tie === "continue" ? "i" : event.tie === "stop" ? "t" : "m"}"` : "";
  const komaComment = event.pitch.koma53 !== null ? ` <!-- koma53=${event.pitch.koma53} ${escapeXml(event.pitch.source)} -->` : "";
  const tupletComment =
    dur.tuplet !== null
      ? ` <!-- tuplet ${dur.tuplet.numNotes}:${dur.tuplet.notesOccupied} sourceDenom=${dur.tuplet.sourceDenominator} -->`
      : "";
  const tieSplitComment = dur.tiedParts > 1 ? ` <!-- tiedParts=${dur.tiedParts} TODO: emit split ties -->` : "";
  return `              <note xml:id="${escapeXml(event.id)}" pname="${pitch.pname}" oct="${pitch.oct}" dur="${dur.dur}"${dots}${accidAttr}${accidGesAttr}${tieAttr} label="${escapeXml(
    event.pitch.solfege ?? "",
  )}" n="${indexInMeasure + 1}" />${komaComment}${tupletComment}${tieSplitComment}`;
}

/**
 * Canonical document -> MEI XML string (stub, valid but minimal engraving).
 */
export function canonicalToMei(document: CanonicalScoreDocument): string {
  const eventsById = new Map(document.events.map((event) => [event.id, event]));
  const meterParts = document.meter.split("/").map((part) => Number.parseInt(part, 10));
  const meterCount = Number.isFinite(meterParts[0]) ? meterParts[0] : 4;
  const meterUnit = Number.isFinite(meterParts[1]) ? meterParts[1] : 4;

  const keyAccidentals = document.notationPolicy.keySignature.accidentals;
  const keySigXml =
    keyAccidentals.length > 0
      ? `        <keySig sig="${escapeXml(
          keyAccidentals.map((acc) => `${acc.step}${acc.accidental}`).join(" "),
        )}" />\n`
      : "";

  const measuresXml = document.measures
    .map((measure) => {
      const measureEvents = measure.eventIds.map((id) => eventsById.get(id)).filter((event): event is CanonicalScoreEvent => Boolean(event));
      const notesXml = measureEvents.map((event, index) => emitNoteXml(event, index)).join("\n");
      return `        <measure xml:id="${escapeXml(measure.id)}" n="${measure.index}">
          <staff n="1">
            <layer n="1">
${notesXml}
            </layer>
          </staff>
        </measure>`;
    })
    .join("\n");

  const scoreDefMeter = ` meter.count="${meterCount}" meter.unit="${meterUnit}"`;
  const bpm = Number.isFinite(document.bpm) ? document.bpm : 72;

  return `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="${MEI_VERSION}" xml:id="${escapeXml(document.id)}">
  <meiHead>
    <fileDesc>
      <titleStmt>
        <title>${escapeXml(document.title)}</title>
        <composer>${escapeXml(document.composer)}</composer>
      </titleStmt>
      <pubStmt><unpub /></pubStmt>
    </fileDesc>
    <workList>
      <work>
        <title>${escapeXml(document.title)}</title>
        <composer>${escapeXml(document.composer)}</composer>
        <identifier type="makam">${escapeXml(document.makam)}</identifier>
        <identifier type="usul">${escapeXml(document.usul)}</identifier>
        <identifier type="catalog">${escapeXml(document.catalogId ?? "")}</identifier>
      </work>
    </workList>
    <extMeta>
      <verovioEmitter version="stub-53edo-ges" komaSource="symbtr-53edo" events="${document.events.length}" measures="${document.measures.length}" />
    </extMeta>
  </meiHead>
  <music>
    <body>
      <mdiv>
        <score>
          <scoreDef${scoreDefMeter} midi.bpm="${bpm}">
${keySigXml}          </scoreDef>
          <section>
${measuresXml}
          </section>
        </score>
      </mdiv>
    </body>
  </music>
</mei>`;
}

export function emitVerovioMei(document: CanonicalScoreDocument): {mei: string; measureCount: number; eventCount: number} {
  return {
    mei: canonicalToMei(document),
    measureCount: document.measures.length,
    eventCount: document.events.length,
  };
}
