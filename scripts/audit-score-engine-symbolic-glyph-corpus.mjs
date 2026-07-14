#!/usr/bin/env node
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
// v3 (Zenodo 15470412; npm run fetch:symbtr-v3) tied/slur/repeat/ending tasir;
// mevcutsa varsayilan odur, yoksa v2 fallback.
const SYMBTR_ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, "symb", "SymbTr-3.0"),
  path.join(PROJECT_ROOT, "symb", "SymbTr-2.0.0"),
];
const DEFAULT_SYMBTR_ROOT = SYMBTR_ROOT_CANDIDATES.find((root) => existsSync(root)) ?? SYMBTR_ROOT_CANDIDATES[1];
const DEFAULT_SUMMARY_OUTPUT = path.join(
  PROJECT_ROOT,
  "output",
  "score-engine",
  "symbolic-glyph-corpus-summary.json",
);

const HICAZKAR_BASENAMES = new Set([
  "hicazkar--pesrev--devrikebir----osman_bey",
  "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey",
]);
const MAX_EXAMPLES_PER_FEATURE = 8;

function parseCliOptions(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options.set(key, next);
      index += 1;
    } else {
      options.set(key, "true");
    }
  }
  return options;
}

function assertInsideProject(targetPath) {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(PROJECT_ROOT, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside project: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function listFiles(folder, extension) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, {withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
    .map((entry) => path.join(folder, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function relativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replaceAll("\\", "/");
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function pushExample(examples, featureId, example) {
  const bucket = examples.get(featureId) ?? [];
  if (bucket.length >= MAX_EXAMPLES_PER_FEATURE) return;
  bucket.push(example);
  examples.set(featureId, bucket);
}

function toSortedObject(map, numericKeys = false) {
  const entries = Array.from(map.entries()).sort(([left], [right]) => {
    if (numericKeys) return Number(left) - Number(right);
    return String(left).localeCompare(String(right));
  });
  return Object.fromEntries(entries);
}

function decodeText(bytes) {
  return bytes.toString("utf8");
}

function scanTxtFiles(files) {
  const codeCounts = new Map();
  const lnsCounts = new Map();
  const basCounts = new Map();
  const examples = new Map();
  const featureCounts = {
    noteRows: 0,
    metadataRows: 0,
    restRows: 0,
    dottedLikeRows: 0,
    sharpRows: 0,
    flatRows: 0,
    komaSharpRows: 0,
    komaFlatRows: 0,
    textOrLyricRows: 0,
    structuralLabelRows: 0,
    usulAlterationRows: 0,
    naturalPitchRows: 0,
  };
  const hicazkar = {
    exists: false,
    rows: 0,
    noteRows: 0,
    measureEndRows: 0,
    sectionLabels: [],
    codeCounts: new Map(),
  };

  for (const file of files) {
    const basename = path.basename(file, ".txt");
    const isHicazkar = HICAZKAR_BASENAMES.has(basename);
    if (isHicazkar) hicazkar.exists = true;
    const rows = decodeText(readFileSync(file)).split(/\r?\n/).slice(1);
    for (const [rowIndex, line] of rows.entries()) {
      if (!line.trim()) continue;
      const columns = line.split("\t");
      const [sira, code, nota53, notaAe, koma53, komaAe, pay, payda, , lns, bas, soz1, offset] = columns;
      const numericPay = Number(pay);
      const numericPayda = Number(payda);
      const rowNumber = rowIndex + 2;
      increment(codeCounts, code || "(empty)");
      increment(lnsCounts, lns || "(empty)");
      increment(basCounts, bas || "(empty)");

      if (code === "9") {
        featureCounts.noteRows += 1;
      } else {
        featureCounts.metadataRows += 1;
        pushExample(examples, `txt-code-${code || "empty"}`, {
          file: relativePath(file),
          row: rowNumber,
          line,
        });
      }

      const isRest = nota53 === "Es" || notaAe === "Sus" || koma53 === "-1" || komaAe === "-1" || (!nota53 && code === "9");
      if (isRest) {
        featureCounts.restRows += 1;
        pushExample(examples, "txt-rest", {file: relativePath(file), row: rowNumber, line});
      }
      if (Number.isFinite(numericPay) && Number.isFinite(numericPayda) && numericPay > 1 && numericPayda > 0) {
        featureCounts.dottedLikeRows += 1;
        pushExample(examples, "txt-dotted-like", {file: relativePath(file), row: rowNumber, line});
      }
      if (/#/.test(notaAe || nota53 || "")) {
        featureCounts.sharpRows += 1;
        if (/#\d/.test(notaAe || nota53 || "")) featureCounts.komaSharpRows += 1;
      }
      if (/b/.test(notaAe || nota53 || "")) {
        featureCounts.flatRows += 1;
        if (/b\d/.test(notaAe || nota53 || "")) featureCounts.komaFlatRows += 1;
      }
      const lyricOrLabel = (soz1 || "").trim();
      const isStructuralLabel = /\b(?:HANE|TESL[İI]M|KARAR|MEYAN|NAKARAT|ARANA[GĞ]ME|SERHANE|M[ÜU]L[ÂA]Z[İI]ME)\b/i.test(
        lyricOrLabel,
      );
      if (lyricOrLabel) {
        featureCounts.textOrLyricRows += 1;
        pushExample(examples, "txt-text-or-lyric", {file: relativePath(file), row: rowNumber, label: lyricOrLabel, offset});
      }
      if (isStructuralLabel) {
        featureCounts.structuralLabelRows += 1;
        pushExample(examples, "txt-structural-label", {
          file: relativePath(file),
          row: rowNumber,
          label: lyricOrLabel,
          offset,
        });
      }
      if (code === "51") {
        featureCounts.usulAlterationRows += 1;
        pushExample(examples, "txt-usul-alteration-code-51", {
          file: relativePath(file),
          row: rowNumber,
          pay,
          payda,
          label: (soz1 || "").trim(),
          offset,
        });
      }
      if (/\b(?:natural|bekar|nat)\b|♮/i.test(`${nota53}\t${notaAe}`)) {
        featureCounts.naturalPitchRows += 1;
        pushExample(examples, "txt-natural-pitch", {file: relativePath(file), row: rowNumber, line});
      }

      if (isHicazkar) {
        hicazkar.rows += 1;
        increment(hicazkar.codeCounts, code || "(empty)");
        if (code === "9") hicazkar.noteRows += 1;
        if (Number.isFinite(Number(offset)) && Math.abs(Number(offset) - Math.round(Number(offset))) < 0.000001) {
          hicazkar.measureEndRows += 1;
        }
        if ((soz1 || "").trim()) {
          hicazkar.sectionLabels.push({
            sira,
            label: soz1.trim(),
            offset,
          });
        }
      }
    }
  }

  return {
    fileCount: files.length,
    featureCounts,
    codeCounts: toSortedObject(codeCounts, true),
    lnsTop: Object.fromEntries(Array.from(lnsCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20)),
    basTop: Object.fromEntries(Array.from(basCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20)),
    examples: Object.fromEntries(examples.entries()),
    hicazkar: {
      ...hicazkar,
      codeCounts: toSortedObject(hicazkar.codeCounts, true),
    },
  };
}

function extractXmlMatches(text, pattern) {
  const matches = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[1] ?? match[0]);
  }
  return matches;
}

function scanXmlFiles(files) {
  const examples = new Map();
  const featureCounts = {
    measureTags: 0,
    emptyMeasureTags: 0,
    noteTags: 0,
    restTags: 0,
    dotTags: 0,
    keyAccidentalTags: 0,
    accidentalTags: 0,
    naturalAccidentalTags: 0,
    microtonalAccidentalTags: 0,
    repeatTags: 0,
    endingTags: 0,
    barlineTags: 0,
    tieTags: 0,
    slurTags: 0,
    tupletTags: 0,
    timeModificationTags: 0,
    graceTags: 0,
  };
  const accidentalCounts = new Map();
  const keyAccidentalCounts = new Map();
  const hicazkar = {
    exists: false,
    measureTags: 0,
    emptyMeasureTags: 0,
    keyAccidentals: [],
    accidentalCounts: new Map(),
    repeatTags: 0,
    endingTags: 0,
    slurTags: 0,
    tieTags: 0,
    tupletTags: 0,
  };

  for (const file of files) {
    const basename = path.basename(file, ".xml");
    const isHicazkar = HICAZKAR_BASENAMES.has(basename);
    if (isHicazkar) hicazkar.exists = true;
    const text = decodeText(readFileSync(file));
    const count = (pattern) => (text.match(pattern) ?? []).length;

    const measureTags = count(/<measure\b/g);
    const emptyMeasureTags = count(/<measure\b[^>]*\/>/g);
    const noteTags = count(/<note\b/g);
    const restTags = count(/<rest\b/g);
    const dotTags = count(/<dot\b/g);
    const repeatTags = count(/<repeat\b/g);
    const endingTags = count(/<ending\b/g);
    const barlineTags = count(/<barline\b/g);
    const tieTags = count(/<tie\b/g);
    const slurTags = count(/<slur\b/g);
    const tupletTags = count(/<tuplet\b/g);
    const timeModificationTags = count(/<time-modification\b/g);
    const graceTags = count(/<grace\b/g);
    const accidentals = extractXmlMatches(text, /<accidental>([^<]*)<\/accidental>/g);
    const keyAccidentals = extractXmlMatches(text, /<key-accidental>([^<]*)<\/key-accidental>/g);

    featureCounts.measureTags += measureTags;
    featureCounts.emptyMeasureTags += emptyMeasureTags;
    featureCounts.noteTags += noteTags;
    featureCounts.restTags += restTags;
    featureCounts.dotTags += dotTags;
    featureCounts.repeatTags += repeatTags;
    featureCounts.endingTags += endingTags;
    featureCounts.barlineTags += barlineTags;
    featureCounts.tieTags += tieTags;
    featureCounts.slurTags += slurTags;
    featureCounts.tupletTags += tupletTags;
    featureCounts.timeModificationTags += timeModificationTags;
    featureCounts.graceTags += graceTags;
    featureCounts.accidentalTags += accidentals.length;
    featureCounts.keyAccidentalTags += keyAccidentals.length;

    for (const value of accidentals) {
      const key = value || "(empty)";
      increment(accidentalCounts, key);
      if (value === "natural") featureCounts.naturalAccidentalTags += 1;
      if (/quarter|slash|three-quarters/i.test(value)) featureCounts.microtonalAccidentalTags += 1;
    }
    for (const value of keyAccidentals) increment(keyAccidentalCounts, value || "(empty)");

    const featureExamples = [
      ["xml-repeat", repeatTags],
      ["xml-ending", endingTags],
      ["xml-slur", slurTags],
      ["xml-tie", tieTags],
      ["xml-tuplet", tupletTags + timeModificationTags],
      ["xml-natural", accidentals.filter((value) => value === "natural").length],
      ["xml-key-accidental", keyAccidentals.length],
    ];
    for (const [featureId, value] of featureExamples) {
      if (value > 0) pushExample(examples, featureId, {file: relativePath(file), count: value});
    }

    if (isHicazkar) {
      hicazkar.measureTags = measureTags;
      hicazkar.emptyMeasureTags = emptyMeasureTags;
      hicazkar.keyAccidentals = keyAccidentals;
      hicazkar.repeatTags = repeatTags;
      hicazkar.endingTags = endingTags;
      hicazkar.slurTags = slurTags;
      hicazkar.tieTags = tieTags;
      hicazkar.tupletTags = tupletTags + timeModificationTags;
      for (const value of accidentals) increment(hicazkar.accidentalCounts, value || "(empty)");
    }
  }

  return {
    fileCount: files.length,
    featureCounts,
    accidentalCounts: toSortedObject(accidentalCounts),
    keyAccidentalCounts: toSortedObject(keyAccidentalCounts),
    examples: Object.fromEntries(examples.entries()),
    hicazkar: {
      ...hicazkar,
      accidentalCounts: toSortedObject(hicazkar.accidentalCounts),
    },
  };
}

function scanMu2Files(files) {
  const codeCounts = new Map();
  const examples = new Map();
  const featureCounts = {
    rows: 0,
    noteRows: 0,
    metadataRows: 0,
    headerKeyRows: 0,
    usulRows: 0,
    tempoRows: 0,
    formRows: 0,
    secondaryMarkerRows: 0,
    caretMarkerRows: 0,
  };
  const hicazkar = {
    exists: false,
    rows: 0,
    codeCounts: new Map(),
    secondaryMarkers: [],
  };

  for (const file of files) {
    const basename = path.basename(file, ".mu2");
    const isHicazkar = HICAZKAR_BASENAMES.has(basename);
    if (isHicazkar) hicazkar.exists = true;
    const rows = decodeText(readFileSync(file)).split(/\r?\n/).slice(1);
    for (const [rowIndex, line] of rows.entries()) {
      if (!line.trim()) continue;
      const columns = line.split("\t");
      const code = (columns[0] || "").trim();
      const secondaryMarker = columns[8]?.trim() ?? "";
      const rowNumber = rowIndex + 2;
      featureCounts.rows += 1;
      increment(codeCounts, code || "(empty)");
      if (code === "9") featureCounts.noteRows += 1;
      else featureCounts.metadataRows += 1;
      if (code === "50") featureCounts.headerKeyRows += 1;
      if (code === "51") featureCounts.usulRows += 1;
      if (code === "52") featureCounts.tempoRows += 1;
      if (code === "57") featureCounts.formRows += 1;
      if (secondaryMarker) {
        featureCounts.secondaryMarkerRows += 1;
        pushExample(examples, "mu2-secondary-marker", {
          file: relativePath(file),
          row: rowNumber,
          code,
          marker: secondaryMarker,
          line,
        });
      }
      if (secondaryMarker === "^") {
        featureCounts.caretMarkerRows += 1;
        pushExample(examples, "mu2-caret-marker", {
          file: relativePath(file),
          row: rowNumber,
          code,
          line,
        });
      }

      if (isHicazkar) {
        hicazkar.rows += 1;
        increment(hicazkar.codeCounts, code || "(empty)");
        if (secondaryMarker) {
          hicazkar.secondaryMarkers.push({row: rowNumber, code, marker: secondaryMarker});
        }
      }
    }
  }

  return {
    fileCount: files.length,
    featureCounts,
    codeCounts: toSortedObject(codeCounts, true),
    examples: Object.fromEntries(examples.entries()),
    hicazkar: {
      ...hicazkar,
      codeCounts: toSortedObject(hicazkar.codeCounts, true),
    },
  };
}

function buildFeaturePolicy(txt, xml, mu2) {
  const catalogTupletOrMarkerCount =
    xml.featureCounts.slurTags +
    xml.featureCounts.tieTags +
    xml.featureCounts.tupletTags +
    xml.featureCounts.timeModificationTags +
    mu2.featureCounts.caretMarkerRows;
  const focusedTupletOrMarkerCount =
    xml.hicazkar.slurTags +
    xml.hicazkar.tieTags +
    xml.hicazkar.tupletTags +
    xml.hicazkar.repeatTags +
    xml.hicazkar.endingTags;
  const focusedHasMu2Metadata = Object.keys(mu2.hicazkar.codeCounts).some((code) => code !== "9");

  return [
    {
      id: "clef-key-meter",
      currentStatus: "focused-piece-source-available",
      catalogStatus: "source-available",
      focusedPieceStatus: xml.hicazkar.keyAccidentals.length > 0 || mu2.hicazkar.secondaryMarkers.length > 0
        ? "source-available"
        : "source-missing",
      evidence: [
        `TXT note rows: ${txt.featureCounts.noteRows}`,
        `MusicXML key accidentals: ${xml.featureCounts.keyAccidentalTags}`,
        `mu2 key rows: ${mu2.featureCounts.headerKeyRows}`,
        `Hicazkar MusicXML key accidentals: ${xml.hicazkar.keyAccidentals.join("/") || "none"}`,
        `Hicazkar mu2 markers: ${mu2.hicazkar.secondaryMarkers.map((marker) => marker.marker).join("/") || "none"}`,
      ],
      requiredAction: "Canonical model must ingest key-signature/makam accidental policy from MusicXML or mu2 header, not redraw every source accidental as an inline label.",
    },
    {
      id: "repeat-volta-endings",
      currentStatus: xml.featureCounts.repeatTags + xml.featureCounts.endingTags > 0 ? "source-available" : "source-missing-in-local-symbolic-corpus",
      catalogStatus: xml.featureCounts.repeatTags + xml.featureCounts.endingTags > 0 ? "source-available" : "source-missing",
      focusedPieceStatus: xml.hicazkar.repeatTags + xml.hicazkar.endingTags > 0 ? "source-available" : "source-missing",
      evidence: [
        `MusicXML repeat tags: ${xml.featureCounts.repeatTags}`,
        `MusicXML ending tags: ${xml.featureCounts.endingTags}`,
        `Hicazkar repeat tags: ${xml.hicazkar.repeatTags}`,
        `Hicazkar ending tags: ${xml.hicazkar.endingTags}`,
      ],
      requiredAction:
        xml.featureCounts.repeatTags + xml.featureCounts.endingTags > 0
          ? "Add MusicXML repeat/ending importer fields before rendering these glyphs."
          : "Do not fake repeat/volta from the Hicazkar crop; require PDF/manual anchor or another symbolic source carrying repeat metadata.",
    },
    {
      id: "slur-tie-triplet",
      currentStatus: focusedTupletOrMarkerCount > 0
        ? "focused-piece-source-available"
        : catalogTupletOrMarkerCount > 0
          ? "catalog-source-available-focused-piece-missing"
          : "source-missing-in-local-symbolic-corpus",
      catalogStatus: catalogTupletOrMarkerCount > 0 ? "source-available" : "source-missing",
      focusedPieceStatus: focusedTupletOrMarkerCount > 0 ? "source-available" : "source-missing",
      evidence: [
        `MusicXML slur tags: ${xml.featureCounts.slurTags}`,
        `MusicXML tie tags: ${xml.featureCounts.tieTags}`,
        `MusicXML tuplet/time-modification tags: ${xml.featureCounts.tupletTags + xml.featureCounts.timeModificationTags}`,
        `mu2 caret secondary markers: ${mu2.featureCounts.caretMarkerRows}`,
        `Hicazkar slur/tie/tuplet tags: ${xml.hicazkar.slurTags + xml.hicazkar.tieTags + xml.hicazkar.tupletTags}`,
      ],
      requiredAction:
        "Treat slur/tie/triplet as source-feature fields. Import from MusicXML/mu2 only when the source explicitly carries them; otherwise keep them unresolved evidence, not rendered truth.",
    },
    {
      id: "natural-accidental",
      currentStatus: xml.featureCounts.naturalAccidentalTags > 0 ? "source-available" : "policy-required",
      catalogStatus: xml.featureCounts.naturalAccidentalTags > 0 ? "source-available" : "policy-required",
      focusedPieceStatus: "policy-required",
      evidence: [
        `MusicXML natural accidentals: ${xml.featureCounts.naturalAccidentalTags}`,
        `TXT natural pitch rows: ${txt.featureCounts.naturalPitchRows}`,
      ],
      requiredAction:
        "Define cancellation policy from key signature plus measure accidental state; render natural only when canonical source/policy proves cancellation.",
    },
    {
      id: "metadata-non-note-rows",
      currentStatus: focusedHasMu2Metadata ? "focused-piece-mu2-metadata-not-imported" : "renderer-risk",
      catalogStatus: "renderer-risk",
      focusedPieceStatus: focusedHasMu2Metadata ? "source-available" : "source-missing",
      evidence: [
        `TXT non-note rows ignored by current parser: ${txt.featureCounts.metadataRows}`,
        `TXT code 51 usul alterations: ${txt.featureCounts.usulAlterationRows}`,
        `mu2 metadata rows: ${mu2.featureCounts.metadataRows}`,
        `Hicazkar mu2 non-note codes: ${Object.keys(mu2.hicazkar.codeCounts).filter((code) => code !== "9").join(",") || "none"}`,
      ],
      requiredAction:
        "Promote non-note rows into canonical events/markers where relevant: usul changes, headers, sections, phrase/marker rows and source-only annotations.",
    },
  ];
}

function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const symbtrRoot = path.resolve(options.get("symbtr-root") || DEFAULT_SYMBTR_ROOT);
  const summaryOutput = assertInsideProject(options.get("summary-output") || DEFAULT_SUMMARY_OUTPUT);

  if (!existsSync(symbtrRoot)) {
    throw new Error(`SymbTr root not found: ${symbtrRoot}`);
  }

  const txtFiles = listFiles(path.join(symbtrRoot, "txt"), ".txt");
  const xmlFiles = listFiles(path.join(symbtrRoot, "MusicXML"), ".xml");
  const mu2Files = listFiles(path.join(symbtrRoot, "mu2"), ".mu2");
  const txt = scanTxtFiles(txtFiles);
  const xml = scanXmlFiles(xmlFiles);
  const mu2 = scanMu2Files(mu2Files);
  const featurePolicy = buildFeaturePolicy(txt, xml, mu2);
  const summary = {
    version: 1,
    type: "score-engine-symbolic-glyph-corpus",
    generatedAt: new Date().toISOString(),
    symbtrRoot: relativePath(symbtrRoot),
    ok: txt.fileCount > 0 && xml.fileCount > 0 && mu2.fileCount > 0,
    txt,
    musicXml: xml,
    mu2,
    featurePolicy,
    verdict: {
      problem:
        "The current ScoreEngine is not failing only at visual placement; it is underfed by a TXT-only canonical import that drops symbol/engraving context available in MusicXML/mu2 and sometimes absent from all symbolic sources.",
      target:
        "Move ScoreEngine QA from screenshot pass/fail to source-classified glyph coverage: import explicit MusicXML/mu2 glyph metadata when present, and keep PDF/image-only cues as evidence until a validator or user correction promotes them.",
    },
  };

  mkdirSync(path.dirname(summaryOutput), {recursive: true});
  writeFileSync(summaryOutput, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main();
