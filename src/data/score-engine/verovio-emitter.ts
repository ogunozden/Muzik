/**
 * Verovio MEI emitter — canonical document -> MEI full gravure.
 *
 * Koma 53-EDO -> MEI accid.ges mapping is the musical core: each koma is
 * ~22.64 cents (1200/53). Standard VexFlow path draws koma via glyph text;
 * Verovio path carries the same microtone via MEI @accid.ges so the WASM
 * toolkit can render it with proper SMuFL. Full engraving includes beam
 * grouping, tuplet brackets (3:2 for SymbTr 1/12,1/24,1/48) and tie-split
 * rendering for durations that cannot be written as a single standard value
 * (e.g. 5/8 -> h+8 with tie). Duration/ pitch helpers are thin wrappers
 * around notation.ts ladder so Vex and Verovio stay in sync.
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
 * s/f plus cent adjustments; we keep the raw koma plus cents so SMuFL accid
 * can be swapped without changing call sites).
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
 * Koma accidental -> MEI @accid symbolic value.
 *
 * For 53-EDO koma accidents we still provide a symbolic accid so the MEI
 * stays valid even without ges. Quarter-tone-ish komas (1,2,3) map to the
 * MEI quarter-tone symbols su/fu/sd/fd; the precise cents remain in accid.ges.
 * Larger komas map to s/f (bakiye/kucuk mucenneb etc. stay on the standard
 * sharp/flat family with ges refinement).
 */
function komaAccidentalToAccid(komaAccidental: string | null): string | null {
  if (!komaAccidental) return null;
  if (komaAccidental === "#") return "s";
  if (komaAccidental === "b") return "f";
  const match = komaAccidental.match(/^([#b])(\d+)$/);
  if (!match) return null;
  const [, sign, komaText] = match;
  const koma = Number(komaText);
  if (!Number.isFinite(koma)) return sign === "#" ? "s" : "f";
  // 1-3 koma ~ 22-68c: ~quarter-tone region -> su/fu for verovio SMuFL
  if (koma >= 1 && koma <= 3) return sign === "#" ? "su" : "fu";
  // 4-5 koma ~90-113c: half-ish but still s/f with ges
  // 6-8 koma ~135-181c: 3/4 or whole minus comma -> sd/fd for 6-7
  if (koma >= 6 && koma <= 7) return sign === "#" ? "sd" : "fd";
  if (koma === 8) return sign === "#" ? "ss" : "ff";
  return sign === "#" ? "s" : "f";
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
    const accid = komaAccidentalToAccid(parsed.accidental);
    return {pname, oct, accid, accidGes: ges};
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
 * Returns first tied part for convenience; full split is emitted by
 * emitEventNotes().
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

function isMeiBeamable(event: CanonicalScoreEvent): boolean {
  if (event.isRest) return false;
  const mapped = mapEventDurationToVex(event);
  if (mapped.tiedParts) return false;
  const base = mapped.duration.replace("r", "");
  return base === "8" || base === "16" || base === "32" || base === "64";
}

function emitSingleNoteRest(event: CanonicalScoreEvent, indexInMeasure: number, suffixId: string | null, durValue: string, dots: number, tieValue: string | null): string {
  if (event.isRest) {
    const dotsAttr = dots ? ` dots="${dots}"` : "";
    const id = suffixId ? `${escapeXml(event.id)}-${suffixId}` : escapeXml(event.id);
    return `              <rest xml:id="${id}" dur="${durValue}"${dotsAttr} />`;
  }
  const pitch = pitchToMeiAttrs(event);
  const dotsAttr = dots ? ` dots="${dots}"` : "";
  const accidAttr = pitch.accid ? ` accid="${pitch.accid}"` : "";
  const accidGesAttr = pitch.accidGes ? ` accid.ges="${escapeXml(pitch.accidGes)}"` : "";
  const tieAttr = tieValue ? ` tie="${tieValue}"` : "";
  const id = suffixId ? `${escapeXml(event.id)}-${suffixId}` : escapeXml(event.id);
  const labelAttr = ` label="${escapeXml(event.pitch.solfege ?? "")}"`;
  const nAttr = ` n="${indexInMeasure + 1}"`;
  // For koma microtones we also emit a child <accid> element so the MEI contains
  // an explicit <accid> node (required by the engraving contract for 1/4,3/4 etc.).
  // The note stays self-closing when no accidental; otherwise we expand with child.
  const hasAccidChild = Boolean(pitch.accid && pitch.accidGes && pitch.accid !== pitch.accidGes);
  const simpleKomaChild = Boolean(event.pitch.komaAccidental);
  const needsExpandedAccid = Boolean(pitch.accid && (simpleKomaChild || hasAccidChild));
  if (needsExpandedAccid && pitch.accid) {
    const gesAttr = pitch.accidGes ? ` accid.ges="${escapeXml(pitch.accidGes)}"` : "";
    return `              <note xml:id="${id}" pname="${pitch.pname}" oct="${pitch.oct}" dur="${durValue}"${dotsAttr}${accidAttr}${accidGesAttr}${tieAttr}${labelAttr}${nAttr}>\n                <accid accid="${pitch.accid}"${gesAttr} />\n              </note>`;
  }
  return `              <note xml:id="${id}" pname="${pitch.pname}" oct="${pitch.oct}" dur="${durValue}"${dotsAttr}${accidAttr}${accidGesAttr}${tieAttr}${labelAttr}${nAttr} />`;
}

function emitEventNotes(event: CanonicalScoreEvent, indexInMeasure: number): string[] {
  const mapped = mapEventDurationToVex(event);
  if (mapped.tiedParts && mapped.tiedParts.length > 1) {
    return mapped.tiedParts.map((part, partIndex) => {
      const meiDur = vexDurationToMeiDur(part.duration);
      const dots = part.dotted ? 1 : 0;
      const tie = partIndex === 0 ? "i" : partIndex === mapped.tiedParts!.length - 1 ? "t" : "m";
      // For split ties we override event.tie with internal tie
      return emitSingleNoteRest(event, indexInMeasure, partIndex === 0 ? null : String(partIndex), meiDur.dur, dots, tie);
    });
  }
  const dur = durationToMeiAttrs(event);
  const tie = event.tie ? (event.tie === "start" || event.tie === "continue" ? "i" : event.tie === "stop" ? "t" : "m") : null;
  return [emitSingleNoteRest(event, indexInMeasure, null, dur.dur, dur.dots, tie)];
}

/**
 * Canonical document -> MEI XML string (full engraving).
 *
 * Emits for each measure/layer:
 * - <note>/<rest> with pname/oct/dur/dots/accid/accid.ges/tie
 * - <accid> child for koma 53-EDO microtones (1/4,3/4 etc. via accid.ges)
 * - <beam> groups for consecutive 8/16/32 notes
 * - <tuplet num="3" numbase="2"> for SymbTr 1/12,1/24,1/48 triolets
 * - tied split notes as multiple <note> with tie="i/m/t"
 * - <barLine> at end of each measure (form="end" on the final measure)
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
    .map((measure, measureIndex) => {
      const measureEvents = measure.eventIds.map((id) => eventsById.get(id)).filter((event): event is CanonicalScoreEvent => Boolean(event));
      // Build layer inner with beam/tuplet grouping
      const layerParts: string[] = [];
      let idx = 0;
      while (idx < measureEvents.length) {
        const event = measureEvents[idx];
        const tuplet = getTupletContext(event.durationFraction);
        if (tuplet) {
          const denom = tuplet.sourceDenominator;
          const run: CanonicalScoreEvent[] = [];
          while (idx < measureEvents.length && getTupletContext(measureEvents[idx].durationFraction)?.sourceDenominator === denom) {
            run.push(measureEvents[idx]);
            idx += 1;
          }
          const chunkSize = tuplet.numNotes;
          for (let chunkStart = 0; chunkStart < run.length; chunkStart += chunkSize) {
            const chunk = run.slice(chunkStart, chunkStart + chunkSize);
            const firstDur = durationToMeiAttrs(chunk[0]);
            const allBeamable = chunk.length > 1 && chunk.every(isMeiBeamable);
            const innerNotes: string[] = [];
            for (const chunkEvent of chunk) {
              const origIndex = measureEvents.indexOf(chunkEvent);
              innerNotes.push(...emitEventNotes(chunkEvent, origIndex));
            }
            if (allBeamable) {
              layerParts.push(
                `              <tuplet num="${tuplet.numNotes}" numbase="${tuplet.notesOccupied}" dur="${firstDur.dur}">\n              <beam>\n${innerNotes.join("\n")}\n              </beam>\n              </tuplet>`,
              );
            } else {
              layerParts.push(
                `              <tuplet num="${tuplet.numNotes}" numbase="${tuplet.notesOccupied}" dur="${firstDur.dur}">\n${innerNotes.join("\n")}\n              </tuplet>`,
              );
            }
          }
          continue;
        }
        if (isMeiBeamable(event)) {
          const beamRun: CanonicalScoreEvent[] = [];
          while (idx < measureEvents.length && isMeiBeamable(measureEvents[idx]) && !getTupletContext(measureEvents[idx].durationFraction)) {
            beamRun.push(measureEvents[idx]);
            idx += 1;
          }
          if (beamRun.length > 1) {
            const beamNotes: string[] = [];
            for (const beamEvent of beamRun) {
              const origIndex = measureEvents.indexOf(beamEvent);
              beamNotes.push(...emitEventNotes(beamEvent, origIndex));
            }
            layerParts.push(`              <beam>\n${beamNotes.join("\n")}\n              </beam>`);
          } else if (beamRun.length === 1) {
            const origIndex = measureEvents.indexOf(beamRun[0]);
            layerParts.push(...emitEventNotes(beamRun[0], origIndex));
          }
          continue;
        }
        const origIndex = measureEvents.indexOf(event);
        layerParts.push(...emitEventNotes(event, origIndex));
        idx += 1;
      }

      const notesXml = layerParts.join("\n");
      // Barline at end of every measure: "end" (light-heavy) for the final
      // measure, regular single bar for the rest. MEI places <barLine> as a
      // child of <measure>, after the staff elements.
      const isLastMeasure = measureIndex === document.measures.length - 1;
      const barLineForm = isLastMeasure ? "end" : "regular";
      const barLineId = `${escapeXml(measure.id)}-barline`;
      return `        <measure xml:id="${escapeXml(measure.id)}" n="${measure.index}">
          <staff n="1">
            <layer n="1">
${notesXml}
            </layer>
          </staff>
          <barLine xml:id="${barLineId}" form="${barLineForm}" />
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
      <verovioEmitter version="full-53edo-beam-tuplet" komaSource="symbtr-53edo" events="${document.events.length}" measures="${document.measures.length}" />
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
