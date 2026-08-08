#!/usr/bin/env node
/**
 * PDF olcu adaylarinin SymbTr zaman eksenine DETERMINISTIK otomatik hizalamasi
 * (W4.1 otomasyonu). LLM yok; kanit = SymbTr olcu sinirlari + PDF staff satir
 * geometrisi + aday x-konumlari.
 *
 * Yontem:
 *   1. TXT'ten olcu sinirlari (beats) — kanonik yurume kurallari (G2-G4/G9 ile
 *      ayni: Pay>0 && Payda>0 && kod!==51 zaman ilerletir; kod 52 tempo).
 *   2. Staff satirlari okuma sirasinda (rowIndex) siralanir; satir kapasitesi
 *      esit-bolusum: beatsPerRow = totalBeats / rowCount.
 *   3. Her olcu, satirda `projectBeatToVisualXPercent` ile beklenen x-araligina
 *      izdusurulur (0.14 icerik girinti orani — `visual-map.ts` ile ayni).
 *   4. Aday merkezi beklenen araliga dusen olcuya atanir; satir ici siralama
 *      korunur; her olcu icin en yakin aday secilir.
 *   5. Giris bazinda guven: kapsamli atama orani + medyan geometrik sapma.
 *      Mevcut `layout-verification.generated.json` kutulariyla karsilastirma
 *      yapilir (bayat/yanlis hizalamanin olcumu).
 *
 * Cikti: `output/symbtr-layout-review/auto-alignment-report.json` — YAZMAZ,
 * salt-okunur analiz. Import oncesi insan onay yuzeyini daraltmak icindir.
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {getSymbTrLayoutCandidateFingerprint} from "./lib/symbtr-layout-fingerprint.mjs";
import {buildWrittenMeasureRanges} from "./lib/symbtr-pdf-note-anchor.mjs";

const ROOT = process.cwd();
const LAYOUT_PATH = path.join(ROOT, "src", "data", "symbtr", "layout.generated.json");
const VERIFICATION_PATH = path.join(ROOT, "src", "data", "symbtr", "layout-verification.generated.json");
const DEFAULT_NOTE_ANCHORS_PATH = path.join(ROOT, "output", "symbtr-layout-review", "note-anchors.generated.json");
const TXT_ROOT = path.join(ROOT, "symb", "SymbTr-3.0", "txt");
const REPORT_PATH = path.join(ROOT, "output", "symbtr-layout-review", "auto-alignment-report.json");
const REPAIR_PROPOSAL_PATH = path.join(ROOT, "output", "symbtr-layout-review", "repair-proposals.json");
const NOTE_AREA_INSET = 0.14;

function parseCliOptions(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    const nextValue = inlineValue ?? (argv[index + 1]?.startsWith("--") ? "true" : argv[index + 1]);
    if (inlineValue === undefined && nextValue !== "true") index += 1;
    options.set(key, nextValue ?? "true");
  }
  return options;
}

function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

/**
 * Iki hizalama sonucundan olculebilir olarak daha iyisini secer: anchor
 * kalibrasyonu yalnizca medyan deltayi DUSURUYOR ve coverage'i ~%5'ten fazla
 * kaybetmiyorsa kullanilir. Regresyonu garantisiz birakmaz.
 */
export function pickBetterAlignment(projected, anchored) {
  if (!anchored) return projected;
  // Farkli olcu tabanlari (walk vs written-expanded): coverage paydalari
  // farkli oldugundan karsilastirilamaz. written-expanded tekrarli eser icin
  // DOGRU modeldir; yalnizca medyan deltasi cok kotuyse reddedilir.
  if (projected.measureIndexBasis !== anchored.measureIndexBasis) {
    return anchored.medianDeltaPercent !== null &&
      (projected.medianDeltaPercent === null || anchored.medianDeltaPercent <= projected.medianDeltaPercent + 4)
      ? anchored
      : projected;
  }
  const anchorMedian = anchored.medianDeltaPercent;
  const projectMedian = projected.medianDeltaPercent;
  const anchorBetter =
    anchorMedian !== null &&
    (projectMedian === null || anchorMedian < projectMedian) &&
    anchored.coverage >= projected.coverage - 0.05;
  return anchorBetter ? anchored : projected;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** `visual-map.ts` ile ayni izdusum: beat -> satir ici x yuzdesi. */
function projectBeatToVisualXPercent(band, currentBeat) {
  const beatSpan = Math.max(band.endBeat - band.startBeat, 1);
  const progressRatio = Math.min(1, Math.max(0, (currentBeat - band.startBeat) / beatSpan));
  const noteAreaProgress = NOTE_AREA_INSET + progressRatio * (1 - NOTE_AREA_INSET);
  return clampPercent(band.leftPercent + band.widthPercent * noteAreaProgress);
}

/**
 * Kanonik olcu sinirlari (beats) — `walkMeasureIndexes` ile ayni kurallar,
 * beat biriminde. Donus: {measures: [{index, startBeat, endBeat}], totalBeats}
 */
export function buildMeasureRanges(rawText, writtenMeter) {
  const measureBeats = (writtenMeter.numerator / writtenMeter.denominator) * 4;
  if (!(measureBeats > 0) || !Number.isFinite(measureBeats)) return {measures: [], totalBeats: 0};

  let position = 0;
  let measureBase = 1;
  let segmentStart = 0;
  let segmentBeats = measureBeats;
  const ranges = new Map();

  for (const line of rawText.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    if (columns.length < 13) continue;

    const code = Number(columns[1]);
    const numerator = Number(columns[6]);
    const denominator = Number(columns[7]);

    if (code === 51) {
      if (!(numerator > 0 && denominator > 0)) continue;
      const nextBeats = (numerator / denominator) * 4;
      if (nextBeats === segmentBeats) continue;
      const span = position - segmentStart;
      measureBase += Math.floor(span / segmentBeats) + (span % segmentBeats === 0 ? 0 : 1);
      segmentStart = position;
      segmentBeats = nextBeats;
      continue;
    }

    if (!(numerator > 0 && denominator > 0)) continue;
    if (code === 52) continue; // tempo isareti zamani ilerletmez

    const beatSpan = (numerator / denominator) * 4;
    const measureIndex = measureBase + Math.floor((position - segmentStart) / segmentBeats);
    const existing = ranges.get(measureIndex);
    if (!existing) {
      ranges.set(measureIndex, {index: measureIndex, startBeat: position, endBeat: position + beatSpan});
    } else {
      existing.endBeat = Math.max(existing.endBeat, position + beatSpan);
    }
    position += beatSpan;
  }

  const measures = Array.from(ranges.values()).sort((left, right) => left.index - right.index);
  return {measures, totalBeats: measures.reduce((max, m) => Math.max(max, m.endBeat), 0)};
}

/** mu2 yazili mertebe: ilk veri satirinin Pay/Payda'si (kod-51/52 degilse). */
function readWrittenMeter(mu2Raw) {
  for (const line of mu2Raw.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    if (columns.length < 3) continue;
    const code = Number(columns[1]);
    const numerator = Number(columns[2]);
    const denominator = Number(columns[3]);
    if (code === 51 && numerator > 0 && denominator > 0) return {numerator, denominator};
    if (numerator > 0 && denominator > 0) return {numerator, denominator};
  }
  return null;
}

function alignEntry({
  catalogId,
  layoutEntry,
  rawText,
  mu2Raw,
  verificationEntry,
  anchorCalibration = null,
  writtenMeasures = null,
  writtenMapping = null,
}) {
  const writtenMeterRaw = readWrittenMeter(mu2Raw ?? "");
  const writtenMeter = writtenMeterRaw ?? null;
  const measureIndexBasis = writtenMeter ? "meter-walk-v2" : "offset-ceil-v1";
  const {measures, totalBeats} = buildMeasureRanges(rawText, writtenMeter ?? {numerator: 4, denominator: 4});
  if (measures.length === 0 || totalBeats <= 0) {
    return {catalogId, skipped: "no-measures", measures: 0, boxes: [], confidence: "low"};
  }

  const rows = (Array.isArray(layoutEntry.staffRows) ? layoutEntry.staffRows : [])
    .map((row, index) => ({
      rowIndex: index,
      leftPercent: Number(row.leftPercent ?? 0),
      widthPercent: Number(row.widthPercent ?? 100),
    }))
    .sort((left, right) => left.rowIndex - right.rowIndex);
  if (rows.length === 0) return {catalogId, skipped: "no-rows", measures: measures.length, boxes: [], confidence: "low"};

  const beatsPerRow = totalBeats / rows.length;
  const bands = rows.map((row, index) => ({
    ...row,
    startBeat: index * beatsPerRow,
    endBeat: (index + 1) * beatsPerRow,
  }));

  // Her olcunun beklenen x-araligi (satir bazinda). `createVisualMeasureSegments`
  // ile ayni kural: olcu ile satir bantlari OGRTUSMUYORSA beklenen aralik yoktur
  // (dejenere aralik uretmemek icin — yanlis satir atamasini onler).
  // Anchor kalibrasyonu (W4.1c): yazili olcu sayisi TXT yuruyusuyle tutarliysa
  // (tekrarsiz eser) beklenen araliklar GERCEK nota konumlarindan enterpole
  // edilir. Tekrarli eserlerde (walk != written) yalnizca expanded sirasi walk
  // ile BIREBIR eslesiyorsa written-expanded analiz yolu kullanilir; kutular
  // ilk-genislemis olcu indeksini tasir (runtime measureIndex expanded
  // uzayinda esler — follow UI).
  const walkWrittenRatio =
    anchorCalibration?.writtenMeasureCount > 0
      ? Math.abs(measures.length - anchorCalibration.writtenMeasureCount) / anchorCalibration.writtenMeasureCount
      : Infinity;
  const expandedMatchesWalk =
    writtenMapping !== null &&
    writtenMapping.expanded?.length === measures.length &&
    measures.length > 0;
  const useWrittenExpanded = expandedMatchesWalk && walkWrittenRatio > 0.05;
  const anchorUsable =
    anchorCalibration !== null &&
    anchorCalibration.ranges.length > 0 &&
    anchorCalibration.writtenMeasureCount > 0 &&
    (walkWrittenRatio <= 0.05 || expandedMatchesWalk);
  const activeMeasures = useWrittenExpanded && writtenMeasures?.length ? writtenMeasures : measures;
  const expectedRanges = anchorUsable
    ? anchorCalibration.ranges
    : activeMeasures.flatMap((measure) =>
        bands
          .filter((band) => measure.endBeat > band.startBeat && measure.startBeat < band.endBeat)
          .map((band) => ({
            measureIndex: measure.index,
            rowIndex: band.rowIndex,
            leftPercent: projectBeatToVisualXPercent(band, measure.startBeat),
            rightPercent: projectBeatToVisualXPercent(band, measure.endBeat),
            centerPercent: projectBeatToVisualXPercent(band, (measure.startBeat + measure.endBeat) / 2),
          })),
      );

  const candidates = (Array.isArray(layoutEntry.measureCandidates) ? layoutEntry.measureCandidates : [])
    .map((candidate, index) => ({
      index,
      rowIndex: Number(candidate.rowIndex ?? 0),
      leftPercent: Number(candidate.leftPercent ?? 0),
      widthPercent: Number(candidate.widthPercent ?? 0),
      centerPercent: Number(candidate.leftPercent ?? 0) + Number(candidate.widthPercent ?? 0) / 2,
    }))
    .sort((left, right) => left.rowIndex - right.rowIndex || left.leftPercent - right.leftPercent);

  const assigned = []; // {candidateIndex, rowIndex, measureIndex, deltaPercent}
  for (const candidate of candidates) {
    const rowRanges = expectedRanges.filter((range) => range.rowIndex === candidate.rowIndex);
    if (rowRanges.length === 0) continue;
    const containing = rowRanges.filter(
      (range) => candidate.centerPercent >= range.leftPercent && candidate.centerPercent <= range.rightPercent,
    );
    const best =
      containing.length > 0
        ? containing.reduce((bestRange, range) =>
            Math.abs(range.centerPercent - candidate.centerPercent) <
            Math.abs(bestRange.centerPercent - candidate.centerPercent)
              ? range
              : bestRange,
          )
        : rowRanges.reduce((bestRange, range) =>
            Math.abs(range.centerPercent - candidate.centerPercent) <
            Math.abs(bestRange.centerPercent - candidate.centerPercent)
              ? range
              : bestRange,
          );
    assigned.push({
      candidateIndex: candidate.index,
      rowIndex: candidate.rowIndex,
      leftPercent: candidate.leftPercent,
      measureIndex: best.measureIndex,
      deltaPercent: Math.abs(best.centerPercent - candidate.centerPercent),
      contained: containing.length > 0,
    });
  }

  // Satir ici siralama: measureIndex monoton (azalmayan) olmali.
  const sortedAssigned = [...assigned].sort((left, right) => left.rowIndex - right.rowIndex || left.leftPercent - right.leftPercent);
  const ordered = [];
  let lastMeasure = 0;
  let lastRow = 0;
  for (const item of sortedAssigned) {
    if (item.rowIndex !== lastRow) {
      lastMeasure = 0;
      lastRow = item.rowIndex;
    }
    const measureIndex = Math.max(item.measureIndex, lastMeasure);
    ordered.push({...item, measureIndex});
    lastMeasure = measureIndex;
  }

  // Her olcu icin en iyi kutu (en kucuk delta) secilir.
  const byMeasure = new Map();
  for (const item of ordered) {
    const existing = byMeasure.get(item.measureIndex);
    if (!existing || item.deltaPercent < existing.deltaPercent) byMeasure.set(item.measureIndex, item);
  }

  const coveredMeasures = byMeasure.size;
  const coverage = activeMeasures.length > 0 ? coveredMeasures / activeMeasures.length : 0;
  const deltas = Array.from(byMeasure.values()).map((item) => item.deltaPercent);
  const medianDelta = deltas.length > 0 ? [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length / 2)] : null;
  const confidence = coverage >= 0.9 && (medianDelta === null || medianDelta <= 4) ? "high" : coverage >= 0.75 ? "medium" : "low";

  const boxes = Array.from(byMeasure.values())
    .map((item) => ({
      measureIndex: useWrittenExpanded
        ? (writtenMapping.firstExpandedIndexByWritten[item.measureIndex] ?? item.measureIndex)
        : item.measureIndex,
      sourceCandidateRowIndex: item.rowIndex,
      sourceCandidateIndexInRow: candidates[item.candidateIndex]
        ? Number(layoutEntry.measureCandidates[item.candidateIndex]?.candidateIndexInRow ?? item.candidateIndex)
        : item.candidateIndex,
      leftPercent: candidates[item.candidateIndex]?.leftPercent ?? null,
      deltaPercent: item.deltaPercent,
      contained: item.contained,
    }))
    .sort((left, right) => left.measureIndex - right.measureIndex);

  // Mevcut verified manifest ile karsilastirma: ayni olcu icin depolanan kutu
  // farkli adaya isaret ediyorsa (veya farkli x'teyse) "mismatch".
  const storedByMeasure = buildStoredBoxLookup(verificationEntry);
  let storedMismatches = 0;
  for (const box of boxes) {
    const stored = storedByMeasure.get(box.measureIndex);
    if (!stored) continue;
    if (
      stored.rowIndex !== box.sourceCandidateRowIndex ||
      Math.abs(stored.leftPercent - (box.leftPercent ?? -1)) > 2
    ) {
      storedMismatches += 1;
    }
  }
  const repair = classifyRepairActions({boxes, storedByMeasure});

  return {
    catalogId,
    measures: activeMeasures.length,
    walkMeasures: measures.length,
    rows: rows.length,
    totalBeats,
    measureIndexBasis: useWrittenExpanded ? "written-expanded-v1" : measureIndexBasis,
    anchorSource: anchorUsable ? "note-anchors" : null,
    importable: !useWrittenExpanded || (confidence === "high" && medianDelta !== null && medianDelta <= 4),
    candidates: candidates.length,
    coverage,
    medianDeltaPercent: medianDelta,
    confidence,
    boxes,
    storedBoxes: verificationEntry?.measureBoxes?.length ?? 0,
    storedMismatches,
    repairCounts: repair.counts,
  };
}

/**
 * Stored verified kutulari olcu indeksine gore indeksler.
 * Donus: Map<measureIndex, {measureIndex, rowIndex, indexInRow, leftPercent}>
 */
export function buildStoredBoxLookup(verificationEntry) {
  const lookup = new Map();
  for (const box of verificationEntry?.measureBoxes ?? []) {
    const measureIndex = Number(box.measureIndex);
    if (!Number.isFinite(measureIndex)) continue;
    lookup.set(measureIndex, {
      measureIndex,
      rowIndex: Number(box.sourceCandidateRowIndex),
      indexInRow: Number(box.sourceCandidateIndexInRow),
      leftPercent: Number(box.leftPercent),
    });
  }
  return lookup;
}

/**
 * Kutu-bazli onarim siniflandirmasi (W4.1b). LLM yok; kural deterministiktir:
 * - keep:    stored kutu ile yeni hizalama AYNI olcuye AYNI adayi atiyor.
 * - replace: stored kutu ile yeni hizalama ayni olcu icin FARKLI aday oneriyor
 *            -> yeni aday, geometrik kanitli onarim onerisidir.
 * - review:  stored kutu, yeni hizalamanin kapsamadigi bir olcuye ait
 *            -> kanit yok; dokunulmaz, insan/gorsel onaya kalir.
 * - add:     yeni hizalama, stored manifestte hic olmayan bir olcuyu kapsiyor.
 */
export function classifyRepairActions({boxes, storedByMeasure}) {
  const newByMeasure = new Map();
  for (const box of boxes) {
    newByMeasure.set(Number(box.measureIndex), box);
  }

  const actions = [];
  for (const [measureIndex, stored] of storedByMeasure) {
    const proposed = newByMeasure.get(measureIndex);
    if (!proposed) {
      actions.push({measureIndex, action: "review", reason: "no-new-box", stored});
      continue;
    }
    const sameCandidate =
      stored.rowIndex === proposed.sourceCandidateRowIndex &&
      stored.indexInRow === proposed.sourceCandidateIndexInRow &&
      Math.abs(stored.leftPercent - (proposed.leftPercent ?? -1)) <= 2;
    actions.push(
      sameCandidate
        ? {measureIndex, action: "keep", stored}
        : proposed.contained !== false
          ? {
            measureIndex,
            action: "replace",
            reason: "different-candidate",
            stored,
            proposed: {
              sourceCandidateRowIndex: proposed.sourceCandidateRowIndex,
              sourceCandidateIndexInRow: proposed.sourceCandidateIndexInRow,
              leftPercent: proposed.leftPercent,
              deltaPercent: proposed.deltaPercent,
            },
          }
          : {
            // Yeni atama beklenen x-araliginin DISINDA (en-yakin yedek kurali).
            // Kanit sinirli oldugu icin yazma onerilmez; insan/gorsel onaya
            // birakilir, yalnizca ipucu tasinir.
            measureIndex,
            action: "review",
            reason: "proposed-outside-range",
            stored,
            hint: {
              sourceCandidateRowIndex: proposed.sourceCandidateRowIndex,
              sourceCandidateIndexInRow: proposed.sourceCandidateIndexInRow,
              leftPercent: proposed.leftPercent,
              deltaPercent: proposed.deltaPercent,
            },
          },
    );
  }

  for (const box of boxes) {
    const measureIndex = Number(box.measureIndex);
    if (!storedByMeasure.has(measureIndex)) {
      actions.push({
        measureIndex,
        action: "add",
        reason: "measure-not-in-stored",
        proposed: {
          sourceCandidateRowIndex: box.sourceCandidateRowIndex,
          sourceCandidateIndexInRow: box.sourceCandidateIndexInRow,
          leftPercent: box.leftPercent,
          deltaPercent: box.deltaPercent,
        },
      });
    }
  }

  actions.sort((left, right) => left.measureIndex - right.measureIndex);
  const counts = {keep: 0, replace: 0, review: 0, add: 0};
  for (const action of actions) counts[action.action] += 1;
  return {actions, counts};
}

function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const layoutData = readJson(LAYOUT_PATH);
  const verificationData = readJson(VERIFICATION_PATH, {entries: {}});
  const verificationEntries = verificationData.entries ?? {};
  if (!layoutData) throw new Error(`Missing ${LAYOUT_PATH}`);
  const writeImportReady = options.get("import-ready") === "true";
  const writeRepairProposal = options.get("repair-proposal") === "true";
  const minConfidence = options.get("min-confidence") ?? "high";
  const noteAnchorsPath = options.get("note-anchors")
    ?? (existsSync(DEFAULT_NOTE_ANCHORS_PATH) ? DEFAULT_NOTE_ANCHORS_PATH : null);
  const allowedConfidences = new Set(["high", "medium", "low"]);
  if (!allowedConfidences.has(minConfidence)) throw new Error(`--min-confidence must be high|medium|low`);
  const noteAnchorsData = noteAnchorsPath ? readJson(noteAnchorsPath) : null;
  const noteAnchorsByCatalog = new Map(
    (noteAnchorsData?.entries ?? []).map((entry) => [entry.catalogId, entry]),
  );

  const candidateIds = Object.keys(layoutData.entries ?? {});
  const requestedIds = options.has("catalog-id")
    ? [options.get("catalog-id")]
    : candidateIds;
  const limit = Number(options.get("limit") ?? requestedIds.length);
  const catalogIds = requestedIds.slice(0, Number.isInteger(limit) && limit > 0 ? limit : requestedIds.length);

  const entries = [];
  let txtMissing = 0;
  for (const catalogId of catalogIds) {
    const layoutEntry = layoutData.entries[catalogId];
    if (!layoutEntry) continue;
    const txtPath = path.join(TXT_ROOT, `${catalogId}.txt`);
    const mu2Path = path.join(TXT_ROOT.replace("txt", "mu2"), `${catalogId}.mu2`);
    if (!existsSync(txtPath)) {
      txtMissing += 1;
      continue;
    }
    const anchorEntry = noteAnchorsByCatalog.get(catalogId);
    let anchorCalibration = null;
    let writtenMeasures = null;
    let writtenMapping = null;
    if (anchorEntry?.status === "calibrated" && anchorEntry.measureStarts?.length && anchorEntry.calibrations?.length) {
      const pageSize = layoutEntry.pageSize ?? {width: 595.22, height: 842};
      const staffRowsForRanges = (layoutEntry.staffRows ?? []).map((row, rowIndex) => {
        const leftPercent = Number(row.leftPercent ?? 0);
        const widthPercent = Number(row.widthPercent ?? 100);
        return {
          rowIndex,
          left: (leftPercent / 100) * pageSize.width,
          right: ((leftPercent + widthPercent) / 100) * pageSize.width,
        };
      });
      const ranges = buildWrittenMeasureRanges({
        measureStarts: anchorEntry.measureStarts,
        calibrations: anchorEntry.calibrations,
        staffRows: staffRowsForRanges,
        pageSize,
      });
      if (ranges.length > 0) {
        anchorCalibration = {
          ranges,
          writtenMeasureCount: anchorEntry.writtenMeasureCount,
        };
        writtenMeasures = anchorEntry.measureStarts.map((measureStart) => ({
          index: measureStart.measure,
          startBeat: measureStart.beat,
          endBeat: measureStart.beat + (measureStart.durationBeats ?? 4),
        }));
        if (anchorEntry.writtenMeasureMapping) writtenMapping = anchorEntry.writtenMeasureMapping;
      }
    }
    const projected = alignEntry({
      catalogId,
      layoutEntry,
      rawText: readFileSync(txtPath, "utf8"),
      mu2Raw: existsSync(mu2Path) ? readFileSync(mu2Path, "latin1") : "",
      verificationEntry: verificationEntries[catalogId],
      anchorCalibration: null,
      writtenMeasures: null,
      writtenMapping: null,
    });
    const anchored = anchorCalibration
      ? alignEntry({
        catalogId,
        layoutEntry,
        rawText: readFileSync(txtPath, "utf8"),
        mu2Raw: existsSync(mu2Path) ? readFileSync(mu2Path, "latin1") : "",
        verificationEntry: verificationEntries[catalogId],
        anchorCalibration,
        writtenMeasures,
        writtenMapping,
      })
      : null;
    entries.push(pickBetterAlignment(projected, anchored));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scope: catalogIds.length,
    txtMissing,
    alignedEntries: entries.length,
    confidence: {
      high: entries.filter((entry) => entry.confidence === "high").length,
      medium: entries.filter((entry) => entry.confidence === "medium").length,
      low: entries.filter((entry) => entry.confidence === "low").length,
    },
    storedMismatchTotal: entries.reduce((sum, entry) => sum + (entry.storedMismatches ?? 0), 0),
    storedBoxesTotal: entries.reduce((sum, entry) => sum + (entry.storedBoxes ?? 0), 0),
    anchorSourceCount: entries.filter((entry) => entry.anchorSource === "note-anchors").length,
    writtenExpandedEntryCount: entries.filter((entry) => entry.measureIndexBasis === "written-expanded-v1").length,
    medianDeltaDistribution: {
      under2Percent: entries.filter((entry) => entry.medianDeltaPercent !== null && entry.medianDeltaPercent <= 2).length,
      under6Percent: entries.filter((entry) => entry.medianDeltaPercent !== null && entry.medianDeltaPercent <= 6).length,
      over6Percent: entries.filter((entry) => entry.medianDeltaPercent !== null && entry.medianDeltaPercent > 6).length,
    },
  };
  const report = {summary, entries};
  mkdirSync(path.dirname(REPORT_PATH), {recursive: true});
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (writeImportReady) {
    const importEntries = {};
    const confidenceRank = {high: 0, medium: 1, low: 2};
    for (const entry of entries) {
      if (
        entry.skipped ||
        !["meter-walk-v2", "written-expanded-v1"].includes(entry.measureIndexBasis) ||
        confidenceRank[entry.confidence] > confidenceRank[minConfidence]
      ) {
        continue;
      }
      const layoutEntry = layoutData.entries[entry.catalogId];
      if (!layoutEntry) continue;
      const measureBoxes = entry.boxes
        .filter((box) => box.leftPercent !== null)
        .map((box) => ({
          leftPercent: box.leftPercent,
          topPercent: layoutEntry.measureCandidates.find(
            (candidate) =>
              Number(candidate.rowIndex) === box.sourceCandidateRowIndex &&
              Number(candidate.candidateIndexInRow) === box.sourceCandidateIndexInRow,
          )?.topPercent ?? null,
          widthPercent: layoutEntry.measureCandidates.find(
            (candidate) =>
              Number(candidate.rowIndex) === box.sourceCandidateRowIndex &&
              Number(candidate.candidateIndexInRow) === box.sourceCandidateIndexInRow,
          )?.widthPercent ?? null,
          heightPercent: layoutEntry.measureCandidates.find(
            (candidate) =>
              Number(candidate.rowIndex) === box.sourceCandidateRowIndex &&
              Number(candidate.candidateIndexInRow) === box.sourceCandidateIndexInRow,
          )?.heightPercent ?? null,
          confidence: "verified",
          measureIndex: box.measureIndex,
          verifiedAt: new Date().toISOString(),
          reviewer: "symbtr-txt-aligner-v1",
          method: "symbtr-txt-aligned",
          sourceCandidateRowIndex: box.sourceCandidateRowIndex,
          sourceCandidateIndexInRow: box.sourceCandidateIndexInRow,
        }))
        .filter((box) => box.topPercent !== null && box.widthPercent !== null && box.heightPercent !== null);
      if (measureBoxes.length === 0) continue;
      const candidateFingerprint = getSymbTrLayoutCandidateFingerprint({
        catalogId: entry.catalogId,
        layoutData,
        layoutEntry,
      });
      importEntries[entry.catalogId] = {
        catalogId: entry.catalogId,
        sourceLayoutGeneratedAt: layoutData.generatedAt,
        sourceArchiveMemberPath: layoutEntry.source?.archiveMemberPath ?? "",
        sourceMeasureCandidateCount: layoutEntry.measureCandidates?.length ?? 0,
        candidateGeometryFingerprint: candidateFingerprint,
        measureIndexBasis: entry.measureIndexBasis,
        method: "symbtr-txt-aligned",
        reviewer: "symbtr-txt-aligner-v1",
        verifiedAt: new Date().toISOString(),
        alignmentEvidence: {
          reportPath: REPORT_PATH,
          generatedAt: report.generatedAt,
          medianDeltaPercent: entry.medianDeltaPercent,
          confidence: entry.confidence,
        },
        ...(entry.measureIndexBasis === "written-expanded-v1"
          ? {
              writtenMeasureMapping: noteAnchorsByCatalog.get(entry.catalogId)?.writtenMeasureMapping ?? null,
            }
          : {}),
        measureBoxes,
      };
      if (entry.measureIndexBasis === "written-expanded-v1" && !importEntries[entry.catalogId]?.writtenMeasureMapping) {
        delete importEntries[entry.catalogId];
      }
    }
    const importPath = path.join(
      ROOT,
      "output",
      "symbtr-layout-review",
      `auto-aligned-import-ready-${minConfidence}.json`,
    );
    writeFileSync(importPath, `${JSON.stringify({entries: importEntries}, null, 2)}\n`);
    console.log(`import-ready: ${Object.keys(importEntries).length} entries -> ${importPath}`);
  }

  if (writeRepairProposal) {
    const proposalEntries = {};
    const excluded = [];
    let fingerprintMismatchCount = 0;
    for (const entry of entries) {
      if (entry.skipped || entry.storedBoxes <= 0) continue;
      const layoutEntry = layoutData.entries[entry.catalogId];
      const fingerprint = getSymbTrLayoutCandidateFingerprint({
        catalogId: entry.catalogId,
        layoutData,
        layoutEntry,
      });
      const storedEntry = verificationEntries[entry.catalogId];
      const fingerprintMatch = storedEntry?.candidateGeometryFingerprint === fingerprint;
      if (!fingerprintMatch) {
        fingerprintMismatchCount += 1;
        excluded.push({catalogId: entry.catalogId, reason: "candidate-geometry-fingerprint-mismatch"});
        continue;
      }
      const storedByMeasure = buildStoredBoxLookup(storedEntry);
      const repair = classifyRepairActions({boxes: entry.boxes, storedByMeasure});
      proposalEntries[entry.catalogId] = {
        catalogId: entry.catalogId,
        measureIndexBasis: entry.measureIndexBasis,
        confidence: entry.confidence,
        coverage: entry.coverage,
        medianDeltaPercent: entry.medianDeltaPercent,
        storedBoxes: entry.storedBoxes,
        candidateGeometryFingerprintMatch: true,
        counts: repair.counts,
        actions: repair.actions,
      };
    }

    const actionTotals = {keep: 0, replace: 0, review: 0, add: 0};
    for (const proposal of Object.values(proposalEntries)) {
      for (const action of Object.keys(actionTotals)) actionTotals[action] += proposal.counts[action];
    }
    const proposalSummary = {
      version: 1,
      type: "symbtr-measure-box-repair-proposals",
      generatedAt: new Date().toISOString(),
      dryRun: true,
      basis: {
        alignmentReportPath: REPORT_PATH,
        alignmentReportGeneratedAt: report.generatedAt,
        verificationManifestPath: VERIFICATION_PATH,
      },
      summary: {
        verifiedEntriesWithProposals: Object.keys(proposalEntries).length,
        verifiedEntriesExcludedFingerprintMismatch: fingerprintMismatchCount,
        replaceBoxCount: actionTotals.replace,
        keepBoxCount: actionTotals.keep,
        reviewBoxCount: actionTotals.review,
        addBoxCount: actionTotals.add,
        writeReadyEntryCount: Object.values(proposalEntries).filter(
          (proposal) => proposal.measureIndexBasis === "meter-walk-v2" && proposal.confidence === "high",
        ).length,
      },
      excluded,
      entries: proposalEntries,
    };
    mkdirSync(path.dirname(REPAIR_PROPOSAL_PATH), {recursive: true});
    writeFileSync(REPAIR_PROPOSAL_PATH, `${JSON.stringify(proposalSummary, null, 2)}\n`);
    console.log(`repair-proposal: ${proposalSummary.summary.verifiedEntriesWithProposals} entries -> ${REPAIR_PROPOSAL_PATH}`);
    console.log(JSON.stringify(proposalSummary.summary, null, 2));
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

export {alignEntry, readWrittenMeter};
