/**
 * PDF metin katmanindan NOTA BASI anchor'lari (W4.1 P1 — nota-anchor
 * cikarici). LLM yok; kanit = PDF metin matrisi + staff satir geometrisi +
 * SymbTr event sirasi.
 *
 * Neden metin katmani? Korpus PDF'leri notayi metin glifleriyle cizer
 * (orn. TT7/F3 muzik fontlari: `(x)Tj`, `(*)Tj`, `(**)Tj`) — sap/olcu
 * cizgileri vektor olsa da nota baslari metin konumlarindadir ve farkli
 * PDF ailelerinde tutarli sekilde okunur (2026-08-08 olcumu).
 *
 * Yontem:
 *   1. BT/ET icinde metin matrisi takibi (Tf, Tm, Td, TD, T-star, Tc, Tw,
 *      Tz, Tj, TJ operatorleri) + font genislik tablosuyla GLIF BAZINDA
 *      x konumu (Tc/Tw/Tz ve kerning dogru ilerleme verir).
 *   2. Staff satir bandina dusen glifler -> anchor adaylari (satir basi
 *      imza kumesi sol girinti + 15pt ile elenir).
 *   3. Ayni x'teki glifler kume (akor/duz-isareti) -> tek anchor.
 *   4. Yazili (tekrarsiz) event'lerle KURESEL sirali eslesme; satir ici
 *      dogrusal uyumdan 12pt uzeri aykirilar (imza/ornament) deterministik
 *      elenir.
 *   5. Olcu sinirlari beat -> x enterpolasyonu (satir ici lineer).
 */

/** Kanonik kurallarla SymbTr event'lerini sayar (kod 51/52 haric; Pay>0). */
export function countSymbTrEvents(rawText) {
  const events = [];
  let position = 0;
  for (const line of rawText.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    if (columns.length < 13) continue;
    const code = Number(columns[1]);
    const numerator = Number(columns[6]);
    const denominator = Number(columns[7]);
    if (!(numerator > 0 && denominator > 0)) continue;
    if (code === 51 || code === 52) continue;
    events.push({index: events.length + 1, beat: position});
    position += (numerator / denominator) * 4;
  }
  return {events, totalBeats: position};
}

/**
 * MusicXML'den YAZILI (tekrar acilmamis) event yapisini cikarir.
 * TXT tekrarlari actigi icin PDF ile karsilastirma YAZILI sayiyla yapilmalidir;
 * aksi halde tekrarli eserlerde anchor/event orani sistematik olarak ~1/tekrar
 * katsayisi duser (2026-08-08 olcumu: seyir/aranagme 1.0-1.2, sarki/turku
 * 0.34-0.64).
 * Donus: {writtenEvents: [{measure, beat, durationBeats}], measureStarts:
 * [{measure, beat, durationBeats}], writtenMeasureCount, totalBeats}
 */
export function countWrittenEventsFromMusicXml(xmlText) {
  const parts = [...xmlText.matchAll(/<part[^>]*id="([^"]*)"[\s\S]*?<\/part>/g)];
  const partBody = parts[0]?.[0] ?? xmlText;
  const measureBlocks = [...partBody.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)];
  if (measureBlocks.length === 0) return {writtenEvents: [], writtenMeasureCount: 0, totalBeats: 0};

  const writtenEvents = [];
  const measureStarts = [];
  let divisions = 1;
  let currentMeter = {numerator: 4, denominator: 4};
  let currentPosition = 0;
  let totalBeats = 0;
  let hasVoiceMarkers = false;
  const voiceNumbers = new Set();
  for (const block of measureBlocks) {
    const voices = [...block[1].matchAll(/<voice>(\d+)<\/voice>/g)].map((match) => Number(match[1]));
    if (voices.length > 0) {
      hasVoiceMarkers = true;
      for (const voice of voices) voiceNumbers.add(voice);
    }
  }
  const allowedVoices = hasVoiceMarkers ? new Set([Math.min(...voiceNumbers)]) : null;

  for (const block of measureBlocks) {
    const measureBody = block[1];
    const measureNumber = Number(block[0].match(/number="(\d+)"/)?.[1] ?? 1);
    const divisionsMatch = measureBody.match(/<divisions>(\d+)<\/divisions>/);
    if (divisionsMatch) divisions = Number(divisionsMatch[1]);
    const timeMatch = measureBody.match(/<time[^>]*>\s*<beats>(\d+)<\/beats>\s*<beat-type>(\d+)<\/beat-type>/);
    if (timeMatch) currentMeter = {numerator: Number(timeMatch[1]), denominator: Number(timeMatch[2])};
    const beatDuration = (currentMeter.denominator / 4) * divisions; // 1 beat = den/4 * divisions
    measureStarts.push({
      measure: measureNumber,
      beat: currentPosition / beatDuration,
      durationBeats: currentMeter.numerator,
    });

    const noteBlocks = [...measureBody.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/g)];
    for (const noteBlock of noteBlocks) {
      const noteBody = noteBlock[1];
      const isGrace = /<grace\b/.test(noteBody);
      const hasPitch = /<pitch>/.test(noteBody);
      const isRest = /<rest\b/.test(noteBody);
      if (!hasPitch && !isRest) continue;
      if (isGrace) continue;
      const voiceMatch = noteBody.match(/<voice>(\d+)<\/voice>/);
      // Yalnizca ACIKCA farkli voice etiketli notalar elenir; voice etiketi
      // olmayan notalar ana satira aittir (bazi olculerde voice etiketi yoktur).
      if (allowedVoices && voiceMatch && !allowedVoices.has(Number(voiceMatch[1]))) continue;
      const durationMatch = noteBody.match(/<duration>(\d+)<\/duration>/);
      const duration = durationMatch ? Number(durationMatch[1]) : 0;
      writtenEvents.push({
        measure: measureNumber,
        beat: currentPosition / beatDuration,
        durationBeats: duration / beatDuration,
      });
      currentPosition += duration;
    }
    const backupMatches = [...measureBody.matchAll(/<backup>\s*<duration>(\d+)<\/duration>\s*<\/backup>/g)];
    for (const backup of backupMatches) currentPosition -= Number(backup[1]);
    const forwardMatches = [...measureBody.matchAll(/<forward>\s*<duration>(\d+)<\/duration>\s*<\/forward>/g)];
    for (const forward of forwardMatches) currentPosition += Number(forward[1]);
    totalBeats += currentMeter.numerator;
    currentPosition += beatDuration * currentMeter.numerator;
  }

  return {
    writtenEvents,
    measureStarts,
    writtenMeasureCount: measureBlocks.length,
    totalBeats,
  };
}

/**
 * MusicXML yazili olcu yapisini PERFORMANS (acilmis) sirasina genisletir.
 * Iki mekanizma desteklenir:
 *   1. `<repeat direction="forward/backward" times="N">` + `<ending number>`.
 *   2. `<segno/>` + `<sound dalsegno="segno"/>` (D.S.) — segno'dan sona tekrar.
 * Deterministik; volta gecisleri pass sayisina gore karar verir.
 * Donus: {expanded: [writtenMeasureNumber...], firstExpandedIndexByWritten:
 * {writtenMeasure: index}, writtenMeasureCount, navigation: "repeat"|"ds"|"both"|"none"}
 *
 * `targetLength` verilirse (TXT walk olcu sayisi) acilim WALK-REHBERLI
 * dogrulanir: D.S. bolumunun bitisi, hedef uzunlugu karsilayacak sekilde
 * deterministik cozulur (`dsEndGuided` ile isaretlenir). Kok neden:
 * SymbTr TXT'lerinde D.S. bolumunun bitisi cogu zaman `<fine>` ile
 * isaretlenmemistir; segno'dan baslayip eserin sonuna kadar calan varsayim
 * fazla uzatir (2026-08-08 olcumu: 1.215 over-expansion vakasi).
 */
function parseMusicXmlMeasures(xmlText) {
  const parts = [...xmlText.matchAll(/<part[^>]*id="([^"]*)"[\s\S]*?<\/part>/g)];
  const partBody = parts[0]?.[0] ?? xmlText;
  const measureBlocks = [...partBody.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)];
  return measureBlocks.map((block, index) => {
    const body = block[1];
    const number = Number(block[0].match(/number="(\d+)"/)?.[1] ?? index + 1);
    const fwdMatch = body.match(/<repeat direction="forward"[^>]*>/);
    const fwdLocation = body.match(/<barline location="(left|right)"[\s\S]*?<repeat direction="forward"/)?.[1] ?? null;
    const bwdMatch = body.match(/<repeat direction="backward"(\s+times="(\d+)")?[^>]*>/);
    const endingMatch = body.match(/<ending\s+number="(\d+)"/);
    const segno = /<segno\b|\bsound\s+segno=/.test(body);
    const dalsegno = /\bsound\s+dalsegno=/.test(body);
    return {
      number,
      fwd: Boolean(fwdMatch),
      fwdAtCurrent: fwdLocation === "left",
      bwdTimes: bwdMatch ? Number(bwdMatch[2] ?? 2) : null,
      ending: endingMatch ? Number(endingMatch[1]) : null,
      segno,
      dalsegno,
    };
  });
}

function expandRepeatsRange(measures, {withRepeats = true} = {}) {
  if (!withRepeats) return measures.map((measure) => measure.number);
  const sequence = [];
  const stack = [];
  const maxEnding = measures.reduce((max, measure) => Math.max(max, measure.ending ?? 0), 0);
  let index = 0;
  let iterations = 0;
  while (index < measures.length && iterations < 100000) {
    iterations += 1;
    const measure = measures[index];
    const pass = stack.length > 0 ? stack[stack.length - 1].pass : 1;
    // Genellestirilmis volta kurali: ending N yalniz N. geciste calinir;
    // diger gecislerde atlanir. 1/2 sonlu eserlerde eski davranisla aynidir;
    // 3+ sonlu (uc sonlu) eserler de boylece acilir.
    if (measure.ending !== null && measure.ending !== pass && measure.ending <= maxEnding) {
      index += 1;
      continue;
    }
    sequence.push(measure.number);
    if (measure.fwd) {
      // Bolge zaten aciksa (geri donus bu olcuye geldiyse) fwd tekrar
      // push edilmez; aksi halde sonsuz dongu olusur (location="left"
      // fwd olcusune geri donuste).
      const openTop = stack[stack.length - 1];
      const alreadyOpen = openTop && openTop.startIndex === index;
      if (!alreadyOpen) {
        stack.push({startIndex: index + (measure.fwdAtCurrent ? 0 : 1), pass: 1, times: 2});
      }
    }
    if (measure.bwdTimes !== null) {
      const top = stack.pop() ?? {startIndex: 0, pass: 1, times: measure.bwdTimes};
      const times = measure.bwdTimes ?? top.times;
      if (top.pass < times) {
        stack.push({...top, pass: top.pass + 1});
        index = top.startIndex;
        continue;
      }
    }
    index += 1;
  }
  return sequence;
}

function buildMapping(baseSequence, writtenMeasureCount) {
  const firstExpandedIndexByWritten = {};
  baseSequence.forEach((writtenMeasure, index) => {
    if (!(writtenMeasure in firstExpandedIndexByWritten)) {
      // Motorun measureIndex uzayi 1-bazlidir (walk olculeri 1..N).
      firstExpandedIndexByWritten[writtenMeasure] = index + 1;
    }
  });
  return {firstExpandedIndexByWritten, writtenMeasureCount};
}

export function expandWrittenMeasures(xmlText, {targetLength = null} = {}) {
  const measures = parseMusicXmlMeasures(xmlText);
  if (measures.length === 0) return {expanded: [], firstExpandedIndexByWritten: {}, writtenMeasureCount: 0, navigation: "none"};

  const segnoIndex = measures.findIndex((measure) => measure.segno);
  const dalsegnoIndex = measures.findIndex((measure) => measure.dalsegno);
  const hasDs = segnoIndex >= 0 && dalsegnoIndex > segnoIndex;
  let baseSequence;
  let dsEndGuided = false;
  if (!hasDs) {
    baseSequence = expandRepeatsRange(measures);
  } else {
    const before = expandRepeatsRange(measures.slice(0, dalsegnoIndex + 1));
    const after = expandRepeatsRange(measures.slice(segnoIndex));
    baseSequence = [...before, ...after];
    if (
      targetLength !== null &&
      Number.isInteger(targetLength) &&
      targetLength > 0 &&
      baseSequence.length !== targetLength
    ) {
      // D.S. bolumunun bitisini walk'a gore coz: son = segno + (hedef - onceki)
      const sectionLength = targetLength - before.length;
      const guidedEndIndex = sectionLength > 0 ? segnoIndex + sectionLength - 1 : -1;
      if (guidedEndIndex >= segnoIndex && guidedEndIndex < measures.length && sectionLength > 0) {
        const guidedAfter = expandRepeatsRange(measures.slice(segnoIndex, guidedEndIndex + 1));
        if (before.length + guidedAfter.length === targetLength) {
          baseSequence = [...before, ...guidedAfter];
          dsEndGuided = true;
        }
      }
    }
  }
  const navigation = hasDs
    ? (measures.some((measure) => measure.bwdTimes !== null || measure.fwd) ? "both" : "ds")
    : (measures.some((measure) => measure.bwdTimes !== null || measure.fwd) ? "repeat" : "none");

  return {
    expanded: baseSequence,
    ...buildMapping(baseSequence, measures.length),
    navigation,
    dsEndGuided,
    dalsegnoMeasure: hasDs ? measures[dalsegnoIndex].number : null,
    segnoMeasure: hasDs ? measures[segnoIndex].number : null,
  };
}

/**
 * WALK-REHBERLI acilim (kalan %40,5 uyumsuzluk icin): yapisal yorumlari
 * aday olarak uretir ve TXT walk uzunluguna BIREBIR esleseni secer.
 * Adaylar: her segno konumu x {once, sonra} segmenti {tekrarlı, ham} +
 * DS-sonu walk'a gore cozumlu varyantlar. Hicbiri eslesmezse plain sonuc
 * doner (uyumsuzluk korunur, uydurma yok).
 */
export function expandWrittenMeasuresGuided(xmlText, {targetLength}) {
  const plain = expandWrittenMeasures(xmlText, {targetLength});
  if (!Number.isInteger(targetLength) || targetLength <= 0 || plain.expanded.length === targetLength) {
    return plain;
  }
  const measures = parseMusicXmlMeasures(xmlText);
  if (measures.length === 0) return plain;
  const dalsegnoIndex = measures.findIndex((measure) => measure.dalsegno);
  const hasDs = dalsegnoIndex > 0;
  const candidates = [];
  const modes = [
    {beforeRepeats: true, afterRepeats: true, label: "both-expanded"},
    {beforeRepeats: true, afterRepeats: false, label: "after-raw"},
    {beforeRepeats: false, afterRepeats: true, label: "before-raw"},
    {beforeRepeats: false, afterRepeats: false, label: "both-raw"},
  ];
  if (hasDs) {
    const segnoIndexes = measures
      .map((measure, index) => (measure.segno ? index : -1))
      .filter((index) => index >= 0 && index < dalsegnoIndex);
    for (const segnoIndex of segnoIndexes.length ? segnoIndexes : [0]) {
      for (const mode of modes) {
        // dalsegno olcusu atlamadan ONCE calinir (inclusive) veya sadece
        // atlamadan SONRA segno bolumunde gorunur (exclusive) — iki yorum da
        // korpusta olculur; walk ile birebir eslesen secilir.
        for (const beforeEnd of [dalsegnoIndex + 1, dalsegnoIndex]) {
          if (beforeEnd <= segnoIndex) continue;
          const before = expandRepeatsRange(measures.slice(0, beforeEnd), {withRepeats: mode.beforeRepeats});
          const after = expandRepeatsRange(measures.slice(segnoIndex), {withRepeats: mode.afterRepeats});
          const label = beforeEnd === dalsegnoIndex + 1 ? "inclusive" : "exclusive";
          candidates.push({sequence: [...before, ...after], mode: `${mode.label}:${label}:segno-${segnoIndex + 1}`});
          // DS-sonu walk'a gore cozumlu
          const sectionLength = targetLength - before.length;
          const guidedEndIndex = sectionLength > 0 ? segnoIndex + sectionLength - 1 : -1;
          if (guidedEndIndex >= segnoIndex && guidedEndIndex < measures.length && sectionLength > 0) {
            const guidedAfter = expandRepeatsRange(measures.slice(segnoIndex, guidedEndIndex + 1), {
              withRepeats: mode.afterRepeats,
            });
            candidates.push({
              sequence: [...before, ...guidedAfter],
              mode: `${mode.label}:${label}:ds-guided:segno-${segnoIndex + 1}`,
            });
          }
        }
      }
    }
  } else {
    candidates.push({sequence: expandRepeatsRange(measures), mode: "both-expanded"});
    candidates.push({sequence: expandRepeatsRange(measures, {withRepeats: false}), mode: "both-raw"});
  }
  const exact = candidates.find((candidate) => candidate.sequence.length === targetLength);
  if (!exact) return plain;
  return {
    expanded: exact.sequence,
    ...buildMapping(exact.sequence, measures.length),
    writtenMeasureCount: measures.length,
    navigation: plain.navigation,
    dsEndGuided: exact.mode.includes("ds-guided"),
    guidedMode: exact.mode,
    dalsegnoMeasure: plain.dalsegnoMeasure,
    segnoMeasure: plain.segnoMeasure,
  };
}

/**
 * Anchor'lari YAZILI event'lerle KURESEL sirali esler (tekrar acilmamis
 * MusicXML yapisi). Satir ici dogrusal uyumdan 12pt uzeri aykiri noktalar
 * (satir basi imza glifleri gibi) deterministik elenir.
 * Donus: null | {ratio, reason, pairs: [{beat, rowIndex, x, xPercent}], outlierCount}
 */
export function calibrateAnchorsToWrittenEvents({anchors, writtenEvents, staffRows}) {
  if (anchors.length === 0 || writtenEvents.length === 0) return null;
  const ratio = anchors.length / writtenEvents.length;
  if (ratio < 0.7 || ratio > 1.35) return {ratio, reason: "count-mismatch", pairs: null, outlierCount: 0};

  const orderedAnchors = [...anchors].sort((left, right) => left.rowIndex - right.rowIndex || left.x - right.x);
  const pairs = orderedAnchors
    .map((anchor, index) => ({
      beat: writtenEvents[index]?.beat ?? null,
      rowIndex: anchor.rowIndex,
      x: anchor.x,
      xPercent: anchor.xPercent,
    }))
    .filter((pair) => pair.beat !== null);

  const refined = [];
  for (const row of staffRows) {
    let working = pairs.filter((pair) => pair.rowIndex === row.rowIndex);
    if (working.length < 4) {
      refined.push(...working);
      continue;
    }
    // Yinelemeli aykiri eleme: en kotu artikli noktayi cikar, yeniden uydur.
    // Satir basi imza glifleri (beat-x dogrusal iliskisi disinda) boylece
    // deterministik elenir; tek gecisli fit aykirilarla carpilirdi.
    let iterations = 0;
    while (working.length >= 4 && iterations < 12) {
      const count = working.length;
      const meanBeat = working.reduce((sum, pair) => sum + pair.beat, 0) / count;
      const meanX = working.reduce((sum, pair) => sum + pair.x, 0) / count;
      let numerator = 0;
      let denominator = 0;
      for (const pair of working) {
        numerator += (pair.beat - meanBeat) * (pair.x - meanX);
        denominator += (pair.beat - meanBeat) ** 2;
      }
      const slope = denominator > 0 ? numerator / denominator : 0;
      const intercept = meanX - slope * meanBeat;
      let worst = null;
      let worstResidual = -1;
      for (const pair of working) {
        const residual = Math.abs(pair.x - (intercept + slope * pair.beat));
        if (residual > worstResidual) {
          worstResidual = residual;
          worst = pair;
        }
      }
      if (worstResidual <= 12) break;
      working = working.filter((pair) => pair !== worst);
      iterations += 1;
    }
    refined.push(...working);
  }
  refined.sort((left, right) => left.rowIndex - right.rowIndex || left.x - right.x);
  return {ratio, reason: "calibrated", pairs: refined, outlierCount: pairs.length - refined.length};
}

function medianResidual(pairs) {
  if (pairs.length < 3) return Infinity;
  const count = pairs.length;
  const meanBeat = pairs.reduce((sum, pair) => sum + pair.beat, 0) / count;
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / count;
  let numerator = 0;
  let denominator = 0;
  for (const pair of pairs) {
    numerator += (pair.beat - meanBeat) * (pair.x - meanX);
    denominator += (pair.beat - meanBeat) ** 2;
  }
  const slope = denominator > 0 ? numerator / denominator : 0;
  const intercept = meanX - slope * meanBeat;
  const residuals = pairs.map((pair) => Math.abs(pair.x - (intercept + slope * pair.beat))).sort((a, b) => a - b);
  return residuals[Math.floor(residuals.length / 2)];
}

/**
 * SATIR SIRALI kalibrasyon: her satir icin (a) satir basi imza kumesi
 * eleme sayisi k (0-6) ve (b) event dilimi, medyan artik en kucuk olacak
 * sekilde deterministik secilir. Boylece imza glifleri event eslesmesini
 * calmiyor ve satir sinirlari zip'i bozmuyor.
 * Donus: [{rowIndex, pairs, kept, dropped, medianResidual}]
 */
export function calibrateRowsSequential({anchors, writtenEvents, staffRows, maxSignatureDrop = 6}) {
  const byRow = new Map();
  for (const anchor of anchors) {
    if (!byRow.has(anchor.rowIndex)) byRow.set(anchor.rowIndex, []);
    byRow.get(anchor.rowIndex).push(anchor);
  }
  let eventCursor = 0;
  const results = [];
  for (const row of staffRows) {
    const rowAnchors = [...(byRow.get(row.rowIndex) ?? [])].sort((left, right) => left.x - right.x);
    if (rowAnchors.length === 0 || eventCursor >= writtenEvents.length) {
      results.push({rowIndex: row.rowIndex, pairs: [], kept: 0, dropped: 0, medianResidual: null, reason: "no-data"});
      continue;
    }
    let best = null;
    const maxDrop = Math.min(maxSignatureDrop, Math.max(0, rowAnchors.length - 3));
    for (let drop = 0; drop <= maxDrop; drop += 1) {
      const chunk = rowAnchors.slice(drop);
      const events = writtenEvents.slice(eventCursor, eventCursor + chunk.length);
      if (events.length < 3) continue;
      const pairs = chunk.slice(0, events.length).map((anchor, index) => ({
        beat: events[index].beat,
        rowIndex: row.rowIndex,
        x: anchor.x,
        xPercent: anchor.xPercent,
      }));
      const residual = medianResidual(pairs);
      if (!best || residual < best.medianResidual) best = {drop, pairs, medianResidual: residual};
    }
    if (!best) {
      results.push({rowIndex: row.rowIndex, pairs: [], kept: 0, dropped: 0, medianResidual: null, reason: "no-fit"});
      continue;
    }
    // en iyi k icin yinelemeli aykiri eleme (12pt)
    let working = best.pairs;
    let iterations = 0;
    while (working.length >= 4 && iterations < 12) {
      const count = working.length;
      const meanBeat = working.reduce((sum, pair) => sum + pair.beat, 0) / count;
      const meanX = working.reduce((sum, pair) => sum + pair.x, 0) / count;
      let numerator = 0;
      let denominator = 0;
      for (const pair of working) {
        numerator += (pair.beat - meanBeat) * (pair.x - meanX);
        denominator += (pair.beat - meanBeat) ** 2;
      }
      const slope = denominator > 0 ? numerator / denominator : 0;
      const intercept = meanX - slope * meanBeat;
      let worst = null;
      let worstResidual = -1;
      for (const pair of working) {
        const residual = Math.abs(pair.x - (intercept + slope * pair.beat));
        if (residual > worstResidual) {
          worstResidual = residual;
          worst = pair;
        }
      }
      if (worstResidual <= 12) break;
      working = working.filter((pair) => pair !== worst);
      iterations += 1;
    }
    eventCursor += best.pairs.length;
    results.push({
      rowIndex: row.rowIndex,
      pairs: working,
      kept: working.length,
      dropped: best.pairs.length - working.length,
      medianResidual: Number(medianResidual(working).toFixed(3)),
      reason: working.length >= 3 ? "calibrated" : "weak",
    });
  }
  return {results, consumedEvents: eventCursor, totalEvents: writtenEvents.length};
}

const CONTENT_TOKEN_PATTERN =
  /-?\d*\.\d+|-?\d+|\[|\]|\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>|\/[A-Za-z0-9._-]+|[A-Za-z*]+/g;

export function tokenizeContent(content) {
  return [...content.matchAll(CONTENT_TOKEN_PATTERN)].map((match) => match[0]);
}

/**
 * Metin akisini isler: her glif icin mutlak (x, y) uretir.
 * Donus: [{glyph, x, y, font, fontSize}]
 */
export function extractTextRuns(content, {fontWidths = null} = {}) {
  const tokens = tokenizeContent(content);
  const runs = [];
  const stack = [];
  let font = null;
  let fontSize = 21; // Tf boyutu (metin uzayinda, em birimi)
  let characterSpacing = 0;
  let wordSpacing = 0;
  let horizontalScale = 100;
  let tm = [1, 0, 0, 1, 0, 0];
  let leading = 0;
  let inText = false;
  let index = 0;

  const widthOf = (glyphChar) => {
    const entry = fontWidths?.get(font);
    if (!entry) return 550; // bilinmeyen font: 0.55em varsayilan
    const code = glyphChar.codePointAt(0);
    const index = code - entry.firstChar;
    if (index < 0 || index >= entry.widths.length) return 550;
    return entry.widths[index] ?? 550;
  };
  const pushRun = (glyph, x, y) => {
    runs.push({glyph, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)), font, fontSize});
  };
  const advanceFor = (glyph) => {
    // PDF: ilerleme = (w0 - Tj/1000 + Tc + Tw) * Tfs * Th; user dx = tm[0] * ilerleme
    return tm[0] * fontSize * (widthOf(glyph) / 1000 + characterSpacing + wordSpacing) * (horizontalScale / 100);
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^-?\d/.test(token)) {
      stack.push(Number(token));
      index += 1;
      continue;
    }
    if (token.startsWith("/")) {
      stack.push(token);
      index += 1;
      continue;
    }
    if (token.startsWith("(") || token.startsWith("<")) {
      stack.push(token);
      index += 1;
      continue;
    }
    if (token === "BT") {
      inText = true;
      tm = [1, 0, 0, 1, 0, 0];
      index += 1;
      continue;
    }
    if (token === "ET") {
      inText = false;
      index += 1;
      continue;
    }
    if (token === "Tf") {
      fontSize = stack.pop() ?? fontSize;
      const fontToken = stack.pop();
      font = typeof fontToken === "string" ? fontToken.replace(/^\//, "") : font;
      index += 1;
      continue;
    }
    if (token === "Tm") {
      const f = stack.pop();
      const e = stack.pop();
      const d = stack.pop();
      const c = stack.pop();
      const b = stack.pop();
      const a = stack.pop();
      if ([a, b, c, d, e, f].every(Number.isFinite)) tm = [a, b, c, d, e, f];
      index += 1;
      continue;
    }
    if (token === "Td" || token === "TD") {
      const ty = stack.pop() ?? 0;
      const tx = stack.pop() ?? 0;
      tm[4] += tm[0] * tx + tm[2] * ty;
      tm[5] += tm[1] * tx + tm[3] * ty;
      leading = -ty;
      index += 1;
      continue;
    }
    if (token === "T*") {
      tm[4] = 0;
      tm[5] -= tm[3] * leading;
      index += 1;
      continue;
    }
    if (token === "TL") {
      leading = stack.pop() ?? leading;
      index += 1;
      continue;
    }
    if (token === "Tc" || token === "Tw" || token === "Tz" || token === "Tr" || token === "Ts") {
      const value = stack.pop() ?? 0;
      if (token === "Tc") characterSpacing = value;
      if (token === "Tw") wordSpacing = value;
      if (token === "Tz") horizontalScale = value || 100;
      index += 1;
      continue;
    }
    if (token === "Tj") {
      const glyph = stack.pop();
      if (typeof glyph === "string" && inText) {
        let x = tm[4];
        for (const glyphChar of glyph.slice(1, -1)) {
          pushRun(glyphChar, x, tm[5]);
          x += advanceFor(glyphChar);
        }
      }
      index += 1;
      continue;
    }
    if (token === "TJ") {
      const array = stack.pop();
      if (Array.isArray(array) && inText) {
        let x = tm[4];
        for (const item of array) {
          if (typeof item === "number") {
            x -= (item / 1000) * fontSize * tm[0] * (horizontalScale / 100);
            continue;
          }
          const glyphText = item.slice(1, -1);
          for (const glyphChar of glyphText) {
            pushRun(glyphChar, x, tm[5]);
            x += advanceFor(glyphChar);
          }
        }
      }
      index += 1;
      continue;
    }
    if (token === "[") {
      const array = [];
      index += 1;
      while (index < tokens.length && tokens[index] !== "]") {
        const item = tokens[index];
        array.push(/^-?\d/.test(item) ? Number(item) : item);
        index += 1;
      }
      index += 1;
      stack.push(array);
      continue;
    }
    if (token === "]") {
      index += 1;
      continue;
    }
    if (
      ["m", "l", "c", "v", "y", "re", "h", "S", "s", "f", "F", "f*", "B", "B*", "b", "b*", "n",
        "W", "w", "q", "Q", "d", "i", "J", "j", "M", "G", "g", "RG", "rg", "K", "k", "gs",
        "CS", "cs", "SC", "sc", "SCN", "scn", "sh", "Do", "BI", "ID", "EI"].includes(token)
    ) {
      stack.length = 0;
      index += 1;
      continue;
    }
    index += 1;
  }

  return runs;
}

const STAFF_BAND_TOLERANCE = 8;
const ANCHOR_CLUSTER_X_DISTANCE = 3;
const SIGNATURE_CLUSTER_X_OFFSET = 15;

/**
 * PDF nesne haritasindan font genislik tablolarini cikarir.
 * resourceDict: /Resources << /Font << /TT7 14 0 R ... >> >> blogu.
 * Donus: Map<fontName, {firstChar, widths[]}>
 */
export function parseFontWidths(objects, resourceDict) {
  const result = new Map();
  const fontDictMatch = String(resourceDict ?? "").match(/\/Font\s*<<([\s\S]*?)>>/);
  if (!fontDictMatch) return result;
  const refs = [...fontDictMatch[1].matchAll(/\/([A-Za-z0-9]+)\s+(\d+) 0 R/g)];
  for (const [, name, id] of refs) {
    const body = objects.get(Number(id)) ?? "";
    const firstChar = Number(body.match(/\/FirstChar\s+(\d+)/)?.[1] ?? -1);
    const widthsMatch = body.match(/\/Widths\s*\[([\s\d.]+)\]/);
    if (firstChar < 0 || !widthsMatch) continue;
    result.set(name, {firstChar, widths: widthsMatch[1].trim().split(/\s+/).map(Number)});
  }
  return result;
}

/**
 * Staff satirlarina gore nota basi anchor adaylarini cikarir.
 * Glif konumu; akorlar x kumesi olarak tek anchor.
 * Donus: [{rowIndex, x, xPercent, y, glyphs}] (x: PDF noktasi)
 */
export function extractNoteAnchors({content, staffRows, pageSize, fontWidths = null}) {
  const runs = extractTextRuns(content, {fontWidths});
  const anchors = [];

  for (const row of staffRows) {
    const rowRuns = runs.filter(
      (run) => run.y >= row.bottom - STAFF_BAND_TOLERANCE && run.y <= row.top + STAFF_BAND_TOLERANCE,
    );
    const sortedRuns = [...rowRuns].sort((left, right) => left.x - right.x);
    const clusters = [];
    for (const run of sortedRuns) {
      if (run.x < row.left + SIGNATURE_CLUSTER_X_OFFSET) continue;
      const last = clusters[clusters.length - 1];
      if (last && Math.abs(last.x - run.x) <= ANCHOR_CLUSTER_X_DISTANCE) {
        last.x = (last.x * last.glyphCount + run.x) / (last.glyphCount + 1);
        last.glyphCount += 1;
        last.glyphs.push(run.glyph);
      } else {
        clusters.push({x: run.x, glyphCount: 1, glyphs: [run.glyph]});
      }
    }
    for (const cluster of clusters) {
      anchors.push({
        rowIndex: row.rowIndex,
        x: Number(cluster.x.toFixed(3)),
        xPercent: Number(((cluster.x / (pageSize?.width ?? 595.22)) * 100).toFixed(3)),
        y: Number(row.top.toFixed(3)),
        glyphs: cluster.glyphs,
      });
    }
  }

  return anchors;
}

/**
 * Satir bazinda anchor<->event eslemesi (sirali eslesme). Oran 0.6-1.4
 * disinda ise kalibrasyon kurulmaz (cok sesli / susleme fazlaligi).
 * Donus: null | {ratio, pairs: [{beat, x}]}
 */
export function matchAnchorsToEvents({anchors, events, rowIndex, staffRows, totalBeats}) {
  const rowAnchorCount = anchors.filter((anchor) => anchor.rowIndex === rowIndex).length;
  const rowStartBeat = rowIndex * (totalBeats / staffRows.length);
  const rowEndBeat = (rowIndex + 1) * (totalBeats / staffRows.length);
  const rowEvents = events.filter((event) => event.beat >= rowStartBeat && event.beat < rowEndBeat);
  if (rowAnchorCount === 0 || rowEvents.length === 0) return null;

  const ratio = rowAnchorCount / rowEvents.length;
  if (ratio < 0.6 || ratio > 1.4) return {ratio, pairs: null, reason: "count-mismatch"};

  const rowAnchors = anchors
    .filter((anchor) => anchor.rowIndex === rowIndex)
    .sort((left, right) => left.x - right.x);
  const pairs = rowAnchors.map((anchor, index) => ({
    beat: rowEvents[index]?.beat ?? null,
    x: anchor.x,
    xPercent: anchor.xPercent,
  })).filter((pair) => pair.beat !== null);
  return {ratio, pairs, reason: "calibrated"};
}

/**
 * Beat -> x enterpolasyonu. Kalibrasyon noktalari disinda en yakin dogrunun
 * egimi uzatilir; [minX, maxX] araligina kirpilir.
 */
export function interpolateBeatToX(pairs, beat, minX, maxX) {
  if (!pairs || pairs.length === 0) return null;
  if (pairs.length === 1) return Math.min(maxX, Math.max(minX, pairs[0].x));
  if (beat <= pairs[0].beat) {
    const slope = (pairs[1].x - pairs[0].x) / Math.max(pairs[1].beat - pairs[0].beat, 1);
    return Math.min(maxX, Math.max(minX, pairs[0].x - (pairs[0].beat - beat) * slope));
  }
  const last = pairs[pairs.length - 1];
  if (beat >= last.beat) {
    const prev = pairs[pairs.length - 2];
    const slope = (last.x - prev.x) / Math.max(last.beat - prev.beat, 1);
    return Math.min(maxX, Math.max(minX, last.x + (beat - last.beat) * slope));
  }
  for (let index = 0; index < pairs.length - 1; index += 1) {
    const left = pairs[index];
    const right = pairs[index + 1];
    if (beat >= left.beat && beat <= right.beat) {
      const progress = (beat - left.beat) / Math.max(right.beat - left.beat, 1);
      return left.x + (right.x - left.x) * progress;
    }
  }
  return null;
}

/** Beat'in hangi satira ait oldugunu kalibrasyon araliklarindan bulur. */
export function rowForBeat(calibrations, beat) {
  const rows = [...calibrations]
    .filter((calibration) => calibration.pairs?.length)
    .map((calibration) => ({
      rowIndex: calibration.rowIndex,
      minBeat: Math.min(...calibration.pairs.map((pair) => pair.beat)),
      maxBeat: Math.max(...calibration.pairs.map((pair) => pair.beat)),
    }))
    .sort((left, right) => left.minBeat - right.minBeat);
  const containing = rows.find((row) => beat >= row.minBeat - 0.5 && beat <= row.maxBeat + 0.5);
  if (containing) return containing.rowIndex;
  if (rows.length === 0) return null;
  if (beat < rows[0].minBeat) return rows[0].rowIndex;
  if (beat > rows[rows.length - 1].maxBeat) return rows[rows.length - 1].rowIndex;
  // Satirlar arasi bosluk: en yakin sinira sahip satir (ekstrapolasyon).
  let best = null;
  let bestDistance = Infinity;
  for (const row of rows) {
    const distance = beat < row.minBeat ? row.minBeat - beat : beat - row.maxBeat;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = row.rowIndex;
    }
  }
  return best;
}

/** Yazili olcu sinirlarini anchor kalibrasyonuyla beklenen x-araliklarina cevirir. */
export function buildWrittenMeasureRanges({measureStarts, calibrations, staffRows, pageSize}) {
  const pageWidth = pageSize?.width ?? 595.22;
  const ranges = [];
  const rowBounds = new Map(staffRows.map((row) => [row.rowIndex, row]));
  for (let index = 0; index < measureStarts.length; index += 1) {
    const startMeasure = measureStarts[index];
    const endMeasure = measureStarts[index + 1] ?? {
      measure: startMeasure.measure + 1,
      beat: startMeasure.beat + (startMeasure.durationBeats ?? 4),
    };
    const rowIndex = rowForBeat(calibrations, startMeasure.beat);
    const row = rowBounds.get(rowIndex);
    if (!row) continue;
    const calibration = calibrations.find((item) => item.rowIndex === rowIndex);
    if (!calibration?.pairs?.length) continue;
    const leftX = interpolateBeatToX(calibration.pairs, startMeasure.beat, row.left, row.right);
    const rightX = interpolateBeatToX(calibration.pairs, endMeasure.beat, row.left, row.right);
    if (leftX === null || rightX === null) continue;
    ranges.push({
      measureIndex: startMeasure.measure,
      rowIndex,
      leftPercent: Number(((leftX / pageWidth) * 100).toFixed(3)),
      rightPercent: Number(((rightX / pageWidth) * 100).toFixed(3)),
      centerPercent: Number((((leftX + rightX) / 2 / pageWidth) * 100).toFixed(3)),
    });
  }
  return ranges;
}

/**
 * Olcu sinirlarini anchor kalibrasyonuyla beklenen x-araliklarina cevirir.
 * Donus: [{measureIndex, rowIndex, leftPercent, rightPercent, centerPercent}]
 */
export function buildAnchorMeasureRanges({measures, calibrations, staffRows, pageSize}) {
  const pageWidth = pageSize?.width ?? 595.22;
  const ranges = [];
  for (const calibration of calibrations) {
    const row = staffRows[calibration.rowIndex];
    if (!row || !calibration.pairs) continue;
    for (const measure of measures) {
      const rowStartBeat = calibration.rowIndex * (calibration.totalBeats / staffRows.length);
      const rowEndBeat = (calibration.rowIndex + 1) * (calibration.totalBeats / staffRows.length);
      if (!(measure.endBeat > rowStartBeat && measure.startBeat < rowEndBeat)) continue;
      const leftX = interpolateBeatToX(calibration.pairs, measure.startBeat, row.left, row.right);
      const rightX = interpolateBeatToX(calibration.pairs, measure.endBeat, row.left, row.right);
      if (leftX === null || rightX === null) continue;
      const leftPercent = (leftX / pageWidth) * 100;
      const rightPercent = (rightX / pageWidth) * 100;
      ranges.push({
        measureIndex: measure.index,
        rowIndex: calibration.rowIndex,
        leftPercent: Number(leftPercent.toFixed(3)),
        rightPercent: Number(rightPercent.toFixed(3)),
        centerPercent: Number((((leftX + rightX) / 2 / pageWidth) * 100).toFixed(3)),
      });
    }
  }
  return ranges;
}
