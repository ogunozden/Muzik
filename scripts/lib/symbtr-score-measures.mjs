import path from "node:path";
import {readZipEntry} from "./zip-entry-reader.mjs";

/**
 * OLCU NUMARASI TABANI (PLAN.md §3/G5).
 *
 * Dogrulanmis PDF olcu kutulari, olcu numarasinin NASIL hesaplandigina
 * bagimlidir. Taban degisirse 18.334 kutunun bir kismi baska olcuye isaret
 * eder. Bu sabit, kutularin hangi tabana gore dogrulandigini KAYDEDER; taban
 * degistiginde `isVerificationCurrent` eski kayitlari bayatlamis sayar ve
 * kutular **gorunur sekilde** dusher. Sessiz kayma yerine gorunur kayip.
 *
 *   offset-ceil-v1 — `Math.ceil(Offset)`; SymbTr `Offset` sutunundan turetilir.
 *                    G4 olcumu: tempo isareti olmayan eserlerde %98,58 dogru,
 *                    olanlarda %83,56 (kod-52'nin hayalet suresi `Offset`
 *                    eksenini kaydiriyor).
 *   meter-walk-v2  — `MeterMap` KANONIK eksende yurunerek bulunur (G6 hedefi).
 *
 * `src/data/symbtr/layout.ts` ayni sabiti tanimlar; `layout.test.ts` ikisinin
 * esitligini test eder — TS ile `.mjs` arasinda kayma olamaz.
 */
export const MEASURE_INDEX_BASES = ["offset-ceil-v1", "meter-walk-v2"];
export const CURRENT_MEASURE_INDEX_BASIS = "meter-walk-v2";

/**
 * Alani OLMAYAN kayitlarin varsayilani. `src/data/symbtr/layout.ts` ile ayni
 * olmali: alan eklenmeden once yazilan her kayit `offset-ceil-v1` tabanindaydi.
 * Burada `CURRENT`e dusmek, alani unutulmus YENI bir kaydin dogrulayicidan
 * gecip calisma zamaninda bayat sayilmasina — yani sessiz bir ayrilmaya —
 * yol acardi.
 */
export const LEGACY_MEASURE_INDEX_BASIS = "offset-ceil-v1";

/**
 * `src/core/time/ticks.ts` ile AYNI cozunurluk. Korpustaki tum paydalarin
 * EKOK'u: 2^7 · 3^2 · 5 · 7 · 13. `symbtr-score-measures.test.mjs` TS
 * sabitiyle esitligini test eder.
 */
export const TICKS_PER_WHOLE = 524160;

export function getSymbTrTxtArchiveMemberPath(catalogId) {
  return `txt_v3/${catalogId}.txt`;
}

export function getSymbTrMu2ArchiveMemberPath(catalogId) {
  return `mu2_v3/${catalogId}.mu2`;
}

/** `mu2` satir-1'den yazili mertebe. `src/data/symbtr/meter-map.ts` ile ayni. */
export function readMu2WrittenMeter(mu2Raw) {
  const firstLine = mu2Raw.split(/\r?\n/).find((line) => line.trim() !== "");
  if (!firstLine) return null;

  const columns = firstLine.split("\t");
  const numerator = Number(columns[0]?.trim());
  const denominator = Number(columns[1]?.trim());
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;
  if (numerator <= 0 || denominator <= 0) return null;
  if (TICKS_PER_WHOLE % denominator !== 0) return null;

  return {numerator, denominator};
}

/**
 * Olcu numarasini YAZILI MERTEBEDEN yurur (`meter-walk-v2`).
 *
 * `src/data/symbtr/meter-map.ts` + `parser.ts` ile ayni algoritma. Projede TS
 * runner olmadigi icin bu kopya zorunlu; `symbtr-score-measures.test.mjs` iki
 * uygulamanin AYNI sonucu verdigini fixture'lar uzerinde test eder.
 *
 * Kurallar (PLAN §3/G2-G4 olcumleri):
 *   · satir zamani ilerletir  <=>  Pay>0 && Payda>0 && kod!==51
 *   · kod 52 TEMPO isaretidir, kanonik zamani ILERLETMEZ
 *   · kod 51 mertebe degistirir (Pay/Payda = yeni mertebe)
 */
function walkMeasureIndexes(rawText, writtenMeter) {
  let measureTicks = writtenMeter.numerator * (TICKS_PER_WHOLE / writtenMeter.denominator);
  let position = 0;
  let measureBase = 1;
  let segmentStart = 0;

  const measureIndexes = new Set();
  let noteEventCount = 0;

  for (const line of rawText.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;

    const columns = line.split("\t");
    if (columns.length < 13) continue;

    const code = Number(columns[1]);
    const numerator = Number(columns[6]);
    const denominator = Number(columns[7]);

    if (code === 51) {
      if (!(numerator > 0 && denominator > 0) || TICKS_PER_WHOLE % denominator !== 0) continue;
      const nextTicks = numerator * (TICKS_PER_WHOLE / denominator);
      if (nextTicks === measureTicks) continue;

      const span = position - segmentStart;
      measureBase += Math.floor(span / measureTicks) + (span % measureTicks === 0 ? 0 : 1);
      segmentStart = position;
      measureTicks = nextTicks;
      continue;
    }

    if (!(numerator > 0 && denominator > 0) || TICKS_PER_WHOLE % denominator !== 0) continue;

    // Kod-52 tempo isareti: kanonik zamani ilerletmez, olcuye de yazilmaz.
    if (code === 52) continue;

    // G9: TS tarafi artik zamani ilerleten HER satiri olay sayiyor
    // (yalniz kod-9 degil). Iki uygulama ayni kalmali — `symbtr-score-
    // measures.test.mjs` bunu fixture'larda dogruluyor.
    noteEventCount += 1;
    measureIndexes.add(measureBase + Math.floor((position - segmentStart) / measureTicks));

    position += numerator * (TICKS_PER_WHOLE / denominator);
  }

  return {measureIndexes, noteEventCount};
}

/**
 * `writtenMeter` verilirse olcu numarasi mertebeden YURUNUR (`meter-walk-v2`);
 * verilmezse `Math.ceil(Offset)` tabanina duser (`offset-ceil-v1`). Hangi
 * tabanin kullanildigi donen ozette `measureIndexBasis` ile bildirilir —
 * ortulu kalmaz.
 */
export function getSymbTrMeasureIndexSummaryFromRaw({
  catalogId,
  rawText,
  writtenMeter = null,
  sourceArchiveMemberPath = getSymbTrTxtArchiveMemberPath(catalogId),
}) {
  let measureIndexes;
  let noteEventCount;
  let measureIndexBasis;

  if (writtenMeter) {
    ({measureIndexes, noteEventCount} = walkMeasureIndexes(rawText, writtenMeter));
    measureIndexBasis = "meter-walk-v2";
  } else {
    measureIndexes = new Set();
    noteEventCount = 0;
    measureIndexBasis = "offset-ceil-v1";

    for (const line of rawText.split(/\r?\n/).slice(1)) {
      if (!line.trim()) continue;

      const columns = line.split("\t");
      if (columns.length < 13 || columns[1] !== "9") continue;

      const offsetUnits = Number(columns[12]);
      if (!Number.isFinite(offsetUnits) || offsetUnits <= 0) continue;

      noteEventCount += 1;
      measureIndexes.add(Math.max(1, Math.ceil(offsetUnits)));
    }
  }

  const sortedMeasureIndexes = Array.from(measureIndexes).sort((left, right) => left - right);
  const maxMeasureIndex = sortedMeasureIndexes.at(-1) ?? 0;
  const missingMeasureIndexes = Array.from({length: maxMeasureIndex}, (_, index) => index + 1).filter(
    (measureIndex) => !measureIndexes.has(measureIndex),
  );

  return {
    catalogId,
    sourceArchiveMemberPath,
    measureIndexBasis,
    noteEventCount,
    measureIndexes: sortedMeasureIndexes,
    measureCount: sortedMeasureIndexes.length,
    maxMeasureIndex,
    missingMeasureIndexes,
  };
}

/**
 * Yazili mertebeyi `mu2` arsivinden okur. Bulunamazsa `null` — cagiran taraf
 * `offset-ceil-v1` tabanina duser ve bu ozette bildirilir.
 */
function readWrittenMeterFromArchive(catalogId, mu2ZipPath) {
  try {
    const buffer = readZipEntry(mu2ZipPath, getSymbTrMu2ArchiveMemberPath(catalogId));
    return readMu2WrittenMeter(buffer.toString("latin1"));
  } catch {
    // Arsiv ya da uye yoksa mertebe bilinmiyor demektir; tahmin uretilmez.
    return null;
  }
}

export function getSymbTrMeasureIndexSummary({
  catalogId,
  txtZipPath = path.join(process.cwd(), "symb", "txt_v3.zip"),
  mu2ZipPath = path.join(process.cwd(), "symb", "mu2_v3.zip"),
}) {
  const sourceArchiveMemberPath = getSymbTrTxtArchiveMemberPath(catalogId);
  const rawBuffer = readZipEntry(txtZipPath, sourceArchiveMemberPath);

  // SymbTr v3 text files can be Windows/Turkish encoded. Offset columns are
  // ASCII, so latin1 decoding preserves tabs, line breaks and numeric fields.
  return getSymbTrMeasureIndexSummaryFromRaw({
    catalogId,
    rawText: rawBuffer.toString("latin1"),
    writtenMeter: readWrittenMeterFromArchive(catalogId, mu2ZipPath),
    sourceArchiveMemberPath,
  });
}
