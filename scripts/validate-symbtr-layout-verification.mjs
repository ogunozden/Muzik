import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getSymbTrMeasureIndexSummary } from "./lib/symbtr-score-measures.mjs";

const PROJECT_ROOT = process.cwd();
const LAYOUT_PATH = path.join(
  PROJECT_ROOT,
  "src",
  "data",
  "symbtr",
  "layout.generated.json",
);
const VERIFICATION_PATH = path.join(
  PROJECT_ROOT,
  "src",
  "data",
  "symbtr",
  "layout-verification.generated.json",
);
const TXT_ZIP_PATH = path.join(PROJECT_ROOT, "symb", "txt_v3.zip");
const REVIEW_TEMPLATE_PATH = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-review-template.json",
);

const ALLOWED_METHODS = new Set(["human-reviewed", "visual-regression"]);
const PERCENT_EPSILON = 0.01;

function parseCliOptions(argv) {
  const options = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const nextValue = inlineValue ?? (argv[index + 1]?.startsWith("--") ? "true" : argv[index + 1]);
    if (inlineValue === undefined && nextValue !== "true") index += 1;
    options.set(rawKey, nextValue ?? "true");
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function assertInsideProject(targetPath, root = PROJECT_ROOT) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to write outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function isPercent(value) {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function getEntries(data, label, errors) {
  if (!isPlainObject(data.entries)) {
    errors.push(`${label}.entries must be an object`);
    return {};
  }

  return data.entries;
}

function getMeasureCandidates(layoutEntry) {
  return Array.isArray(layoutEntry.measureCandidates)
    ? layoutEntry.measureCandidates
    : [];
}

function getCandidateKeys(layoutEntry) {
  const keys = new Set();

  for (const candidate of getMeasureCandidates(layoutEntry)) {
    if (
      Number.isInteger(candidate?.rowIndex) &&
      Number.isInteger(candidate?.candidateIndexInRow)
    ) {
      keys.add(`${candidate.rowIndex}:${candidate.candidateIndexInRow}`);
    }
  }

  return keys;
}

function validateTopLevel(layoutData, verificationData, errors) {
  if (layoutData.schemaVersion !== 1) {
    errors.push("layout.generated.json schemaVersion must be 1");
  }

  if (verificationData.schemaVersion !== 1) {
    errors.push("layout-verification.generated.json schemaVersion must be 1");
  }

  if (!isNonEmptyString(layoutData.generatedAt)) {
    errors.push("layout.generated.json generatedAt must be a non-empty string");
  }

  if (!isNonEmptyString(verificationData.generatedAt)) {
    errors.push(
      "layout-verification.generated.json generatedAt must be a non-empty string",
    );
  }
}

function validateVerificationEntry({
  catalogId,
  layoutData,
  layoutEntry,
  scoreMeasureSummary,
  verificationEntry,
  errors,
}) {
  const prefix = `entries.${catalogId}`;
  const measureCandidates = getMeasureCandidates(layoutEntry);
  const candidateKeys = getCandidateKeys(layoutEntry);

  if (verificationEntry.catalogId !== catalogId) {
    errors.push(`${prefix}.catalogId must match the entry key`);
  }

  if (verificationEntry.sourceLayoutGeneratedAt !== layoutData.generatedAt) {
    errors.push(
      `${prefix}.sourceLayoutGeneratedAt must equal layout.generatedAt (${layoutData.generatedAt})`,
    );
  }

  if (
    verificationEntry.sourceArchiveMemberPath !==
    layoutEntry.source?.archiveMemberPath
  ) {
    errors.push(
      `${prefix}.sourceArchiveMemberPath must equal the source PDF archive member`,
    );
  }

  if (
    verificationEntry.sourceMeasureCandidateCount !== measureCandidates.length
  ) {
    errors.push(
      `${prefix}.sourceMeasureCandidateCount must equal ${measureCandidates.length}`,
    );
  }

  if (!isNonEmptyString(verificationEntry.verifiedAt)) {
    errors.push(`${prefix}.verifiedAt must be a non-empty string`);
  }

  if (!isNonEmptyString(verificationEntry.reviewer)) {
    errors.push(`${prefix}.reviewer must be a non-empty string`);
  }

  if (!ALLOWED_METHODS.has(verificationEntry.method)) {
    errors.push(
      `${prefix}.method must be one of ${Array.from(ALLOWED_METHODS).join(", ")}`,
    );
  }

  if (!Array.isArray(verificationEntry.measureBoxes)) {
    errors.push(`${prefix}.measureBoxes must be an array`);
    return 0;
  }

  if (verificationEntry.measureBoxes.length === 0) {
    errors.push(`${prefix}.measureBoxes must include at least one verified box`);
  }

  const seenCandidateRefs = new Set();
  const seenMeasureIndexes = new Set();

  for (const [index, box] of verificationEntry.measureBoxes.entries()) {
    const boxPrefix = `${prefix}.measureBoxes[${index}]`;

    if (!isPlainObject(box)) {
      errors.push(`${boxPrefix} must be an object`);
      continue;
    }

    if (box.confidence !== "verified") {
      errors.push(`${boxPrefix}.confidence must be "verified"`);
    }

    if (!Number.isInteger(box.measureIndex) || box.measureIndex < 1) {
      errors.push(`${boxPrefix}.measureIndex must be a positive integer`);
    } else if (
      scoreMeasureSummary &&
      !scoreMeasureSummary.measureIndexes.includes(box.measureIndex)
    ) {
      errors.push(
        `${boxPrefix}.measureIndex ${box.measureIndex} is not present in SymbTr TXT offsets for ${catalogId}`,
      );
    } else if (seenMeasureIndexes.has(box.measureIndex)) {
      errors.push(`${boxPrefix} duplicates measureIndex ${box.measureIndex}`);
    } else {
      seenMeasureIndexes.add(box.measureIndex);
    }

    if (
      !Number.isInteger(box.sourceCandidateRowIndex) ||
      !Number.isInteger(box.sourceCandidateIndexInRow)
    ) {
      errors.push(
        `${boxPrefix} must include integer sourceCandidateRowIndex and sourceCandidateIndexInRow`,
      );
    } else {
      const candidateKey = `${box.sourceCandidateRowIndex}:${box.sourceCandidateIndexInRow}`;

      if (!candidateKeys.has(candidateKey)) {
        errors.push(`${boxPrefix} references missing candidate ${candidateKey}`);
      }

      if (seenCandidateRefs.has(candidateKey)) {
        errors.push(`${boxPrefix} duplicates candidate ${candidateKey}`);
      }

      seenCandidateRefs.add(candidateKey);
    }

    for (const fieldName of [
      "leftPercent",
      "topPercent",
      "widthPercent",
      "heightPercent",
    ]) {
      if (!isPercent(box[fieldName])) {
        errors.push(`${boxPrefix}.${fieldName} must be a finite 0-100 number`);
      }
    }

    if (isFiniteNumber(box.widthPercent) && box.widthPercent <= 0) {
      errors.push(`${boxPrefix}.widthPercent must be greater than 0`);
    }

    if (isFiniteNumber(box.heightPercent) && box.heightPercent <= 0) {
      errors.push(`${boxPrefix}.heightPercent must be greater than 0`);
    }

    if (
      isFiniteNumber(box.leftPercent) &&
      isFiniteNumber(box.widthPercent) &&
      box.leftPercent + box.widthPercent > 100 + PERCENT_EPSILON
    ) {
      errors.push(`${boxPrefix} extends beyond the right page edge`);
    }

    if (
      isFiniteNumber(box.topPercent) &&
      isFiniteNumber(box.heightPercent) &&
      box.topPercent + box.heightPercent > 100 + PERCENT_EPSILON
    ) {
      errors.push(`${boxPrefix} extends beyond the bottom page edge`);
    }
  }

  return verificationEntry.measureBoxes.length;
}

function validateScoreMeasureSummary({
  catalogId,
  prefix,
  scoreMeasureSummary,
  expectedScoreMeasureSummary,
  errors,
}) {
  if (!isPlainObject(scoreMeasureSummary)) {
    errors.push(`${prefix}.scoreMeasureSummary must be an object`);
    return;
  }

  for (const fieldName of [
    "sourceArchiveMemberPath",
    "noteEventCount",
    "measureCount",
    "maxMeasureIndex",
  ]) {
    if (scoreMeasureSummary[fieldName] !== expectedScoreMeasureSummary?.[fieldName]) {
      errors.push(`${prefix}.scoreMeasureSummary.${fieldName} must match SymbTr TXT summary for ${catalogId}`);
    }
  }

  for (const fieldName of ["measureIndexes", "missingMeasureIndexes"]) {
    const actual = JSON.stringify(scoreMeasureSummary[fieldName]);
    const expected = JSON.stringify(expectedScoreMeasureSummary?.[fieldName] ?? []);

    if (actual !== expected) {
      errors.push(`${prefix}.scoreMeasureSummary.${fieldName} must match SymbTr TXT summary for ${catalogId}`);
    }
  }
}

function validateReviewTemplateEntry({
  catalogId,
  layoutData,
  layoutEntry,
  reviewEntry,
  scoreMeasureSummary,
  errors,
}) {
  const prefix = `reviewTemplate.entries.${catalogId}`;
  const measureCandidates = getMeasureCandidates(layoutEntry);

  if (!isPlainObject(reviewEntry)) {
    errors.push(`${prefix} must be an object`);
    return 0;
  }

  if (reviewEntry.catalogId !== catalogId) {
    errors.push(`${prefix}.catalogId must match the entry key`);
  }

  if (reviewEntry.sourceLayoutGeneratedAt !== layoutData.generatedAt) {
    errors.push(`${prefix}.sourceLayoutGeneratedAt must equal layout.generatedAt (${layoutData.generatedAt})`);
  }

  if (reviewEntry.sourceArchiveMemberPath !== layoutEntry.source?.archiveMemberPath) {
    errors.push(`${prefix}.sourceArchiveMemberPath must equal the source PDF archive member`);
  }

  if (reviewEntry.sourceMeasureCandidateCount !== measureCandidates.length) {
    errors.push(`${prefix}.sourceMeasureCandidateCount must equal ${measureCandidates.length}`);
  }

  if (!isNonEmptyString(reviewEntry.reviewer)) {
    errors.push(`${prefix}.reviewer must be a non-empty string`);
  }

  if (!ALLOWED_METHODS.has(reviewEntry.method)) {
    errors.push(`${prefix}.method must be one of ${Array.from(ALLOWED_METHODS).join(", ")}`);
  }

  validateScoreMeasureSummary({
    catalogId,
    prefix,
    scoreMeasureSummary: reviewEntry.scoreMeasureSummary,
    expectedScoreMeasureSummary: scoreMeasureSummary,
    errors,
  });

  if (!Array.isArray(reviewEntry.measureBoxes)) {
    errors.push(`${prefix}.measureBoxes must be an array`);
  } else if (reviewEntry.measureBoxes.length !== 0) {
    errors.push(`${prefix}.measureBoxes must stay empty until promotion into layout-verification.generated.json`);
  }

  if (!Array.isArray(reviewEntry.candidateReviewRows)) {
    errors.push(`${prefix}.candidateReviewRows must be an array`);
    return 0;
  }

  if (reviewEntry.candidateReviewRows.length !== measureCandidates.length) {
    errors.push(`${prefix}.candidateReviewRows must include ${measureCandidates.length} source candidates`);
  }

  for (const [index, candidate] of measureCandidates.entries()) {
    const row = reviewEntry.candidateReviewRows[index];
    const rowPrefix = `${prefix}.candidateReviewRows[${index}]`;

    if (!isPlainObject(row)) {
      errors.push(`${rowPrefix} must be an object`);
      continue;
    }

    if (
      row.sourceCandidateRowIndex !== candidate.rowIndex ||
      row.sourceCandidateIndexInRow !== candidate.candidateIndexInRow
    ) {
      errors.push(`${rowPrefix} must preserve source candidate row/index order`);
    }

    if (row.suggestedMeasureIndex !== null) {
      errors.push(`${rowPrefix}.suggestedMeasureIndex must stay null in the non-promoting review template`);
    }

    if (row.confidence !== candidate.confidence) {
      errors.push(`${rowPrefix}.confidence must match the source candidate confidence`);
    }

    for (const fieldName of [
      "leftPercent",
      "topPercent",
      "widthPercent",
      "heightPercent",
    ]) {
      if (row[fieldName] !== candidate[fieldName]) {
        errors.push(`${rowPrefix}.${fieldName} must match source candidate geometry`);
      }
    }
  }

  return reviewEntry.candidateReviewRows.length;
}

function validateReviewTemplate({
  layoutData,
  layoutEntries,
  candidateEntryIds,
  reviewTemplateData,
  getScoreMeasureSummary,
  errors,
}) {
  if (reviewTemplateData.schemaVersion !== 1) {
    errors.push("layout-verification-review-template.json schemaVersion must be 1");
  }

  if (reviewTemplateData.type !== "symbtr-pdf-layout-verification-review-template") {
    errors.push("layout-verification-review-template.json type must be symbtr-pdf-layout-verification-review-template");
  }

  if (!isNonEmptyString(reviewTemplateData.generatedAt)) {
    errors.push("layout-verification-review-template.json generatedAt must be a non-empty string");
  }

  if (!isNonEmptyString(reviewTemplateData.policy)) {
    errors.push("layout-verification-review-template.json policy must be a non-empty string");
  }

  if (!isNonEmptyString(reviewTemplateData.reviewer)) {
    errors.push("layout-verification-review-template.json reviewer must be a non-empty string");
  }

  const reviewEntries = getEntries(
    reviewTemplateData,
    "layout-verification-review-template",
    errors,
  );
  const reviewEntryIds = Object.keys(reviewEntries);
  const candidateEntryIdSet = new Set(candidateEntryIds);
  const reviewEntryIdSet = new Set(reviewEntryIds);

  if (reviewTemplateData.entryCount !== reviewEntryIds.length) {
    errors.push("layout-verification-review-template.json entryCount must match entries");
  }

  for (const catalogId of candidateEntryIds) {
    if (!reviewEntryIdSet.has(catalogId)) {
      errors.push(`layout-verification-review-template.json must include candidate entry ${catalogId}`);
    }
  }

  for (const catalogId of reviewEntryIds) {
    if (!candidateEntryIdSet.has(catalogId)) {
      errors.push(`layout-verification-review-template.json includes non-candidate entry ${catalogId}`);
    }
  }

  if (!Array.isArray(reviewTemplateData.artifactIndex)) {
    errors.push("layout-verification-review-template.json artifactIndex must be an array");
  } else if (reviewTemplateData.artifactIndex.length !== reviewEntryIds.length) {
    errors.push("layout-verification-review-template.json artifactIndex length must match entries");
  }

  let reviewCandidateRows = 0;

  for (const [catalogId, reviewEntry] of Object.entries(reviewEntries)) {
    const layoutEntry = layoutEntries[catalogId];

    if (!isPlainObject(layoutEntry)) {
      errors.push(`reviewTemplate.entries.${catalogId} does not exist in src/data/symbtr/layout.generated.json`);
      continue;
    }

    reviewCandidateRows += validateReviewTemplateEntry({
      catalogId,
      layoutData,
      layoutEntry,
      reviewEntry,
      scoreMeasureSummary: getScoreMeasureSummary(catalogId),
      errors,
    });
  }

  return {
    path: path.relative(PROJECT_ROOT, REVIEW_TEMPLATE_PATH).replace(/\\/g, "/"),
    entryCount: reviewEntryIds.length,
    candidateReviewRows: reviewCandidateRows,
  };
}

const errors = [];
const options = parseCliOptions(process.argv.slice(2));
const verificationPath = options.has("verification-path")
  ? assertInsideProject(options.get("verification-path"))
  : VERIFICATION_PATH;
const layoutData = readJson(LAYOUT_PATH);
const verificationData = readJson(verificationPath);
const reviewTemplateData = readJson(REVIEW_TEMPLATE_PATH);

validateTopLevel(layoutData, verificationData, errors);

const layoutEntries = getEntries(layoutData, "layout", errors);
const verificationEntries = getEntries(
  verificationData,
  "layout-verification",
  errors,
);
const scoreMeasureSummaryCache = new Map();

function getScoreMeasureSummary(catalogId) {
  if (scoreMeasureSummaryCache.has(catalogId)) {
    return scoreMeasureSummaryCache.get(catalogId);
  }

  try {
    const summary = getSymbTrMeasureIndexSummary({
      catalogId,
      txtZipPath: TXT_ZIP_PATH,
    });

    scoreMeasureSummaryCache.set(catalogId, summary);
    return summary;
  } catch (error) {
    errors.push(`entries.${catalogId} SymbTr TXT measure summary unavailable: ${error.message}`);
    scoreMeasureSummaryCache.set(catalogId, null);
    return null;
  }
}

let verifiedEntries = 0;
let verifiedMeasureBoxes = 0;

for (const [catalogId, verificationEntry] of Object.entries(
  verificationEntries,
)) {
  if (!isPlainObject(verificationEntry)) {
    errors.push(`entries.${catalogId} must be an object`);
    continue;
  }

  const layoutEntry = layoutEntries[catalogId];

  if (!isPlainObject(layoutEntry)) {
    errors.push(
      `entries.${catalogId} does not exist in src/data/symbtr/layout.generated.json`,
    );
    continue;
  }

  verifiedEntries += 1;
  verifiedMeasureBoxes += validateVerificationEntry({
    catalogId,
    layoutData,
    layoutEntry,
    scoreMeasureSummary: getScoreMeasureSummary(catalogId),
    verificationEntry,
    errors,
  });
}

const candidateEntryIds = Object.entries(layoutEntries)
  .filter(([, entry]) => getMeasureCandidates(entry).length > 0)
  .map(([catalogId]) => catalogId);
const reviewTemplateSummary = validateReviewTemplate({
  layoutData,
  layoutEntries,
  candidateEntryIds,
  reviewTemplateData,
  getScoreMeasureSummary,
  errors,
});

const summary = {
  candidateEntries: candidateEntryIds.length,
  verificationEntries: Object.keys(verificationEntries).length,
  verifiedEntries,
  verifiedMeasureBoxes,
  promotionPolicy: "Only human-reviewed or visual-regression-approved PDF measure boxes may be promoted from pdf-vector-candidate to verified.",
  candidateStatus: verifiedMeasureBoxes > 0 ? "verified-measure-boxes-present" : "unreviewed-candidates-only",
  reviewTemplate: reviewTemplateSummary,
  unresolvedCandidateEntries: candidateEntryIds.filter(
    (catalogId) => !verificationEntries[catalogId],
  ).length,
  scoreMeasureSummaries: candidateEntryIds.map((catalogId) => {
    const scoreSummary = getScoreMeasureSummary(catalogId);
    const layoutEntry = layoutEntries[catalogId];

    return {
      catalogId,
      pdfMeasureCandidateCount: getMeasureCandidates(layoutEntry).length,
      symbtrMeasureCount: scoreSummary?.measureCount ?? 0,
      symbtrMaxMeasureIndex: scoreSummary?.maxMeasureIndex ?? 0,
      missingSymbtrMeasureIndexes: scoreSummary?.missingMeasureIndexes ?? [],
    };
  }),
  errors,
};

const summaryOutput = options.get("summary-output");
if (summaryOutput) {
  const outputPath = assertInsideProject(summaryOutput);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
}

if (errors.length > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
