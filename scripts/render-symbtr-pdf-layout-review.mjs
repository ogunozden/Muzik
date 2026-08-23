import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  SYMBTR_LAYOUT_CANDIDATE_FINGERPRINT_ALGORITHM,
  getSymbTrLayoutCandidateFingerprint,
} from "./lib/symbtr-layout-fingerprint.mjs";
import {getSymbTrMeasureIndexSummary} from "./lib/symbtr-score-measures.mjs";
import {readZipEntry} from "./lib/zip-entry-reader.mjs";

const root = process.cwd();
const DEFAULT_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";
const DEFAULT_OUT_DIR = "output/symbtr-layout-review";
const DEFAULT_GENERATED_AT = "2026-06-01";
const DEFAULT_REVIEWER = "local-reviewer";
const DEFAULT_REVIEW_PACKET_SIZE = 1;
const verificationTemplatePolicy = "This file is a batch review template only. suggestedMeasureIndex values are ADVISORY pre-fills from the auto-alignment report (high/medium confidence) and do NOT constitute verification; do not copy rows into layout-verification.generated.json until every selected candidate is human-reviewed or visual-regression-approved and converted into measureBoxes with confidence verified.";
const verificationBatchPlanPolicy = "This file groups PDF measure candidates for batch visual review only. It must not promote candidates or carry verified measureBoxes; suggestedMeasureIndex values are advisory pre-fills; promotion must go through layout-verification.generated.json and npm run verify:symbtr-measures.";
const layoutPath = path.join(root, "src", "data", "symbtr", "layout.generated.json");
const pdfZipPath = path.join(root, "symb", "pdf_v3.zip");
const DEFAULT_ALIGNMENT_REPORT_PATH = path.join(root, "output", "symbtr-layout-review", "auto-alignment-report.json");

function parseCliOptions(args) {
  const options = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }

    const next = args[index + 1];
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
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to write outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function toProjectPath(targetPath) {
  return targetPath.split(path.sep).join("/");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pdfYToSvgY(pageHeight, pdfY) {
  return Number((pageHeight - pdfY).toFixed(3));
}

function formatNumber(value) {
  return Number(value.toFixed(3));
}

function getCandidateTop(pageHeight, candidate) {
  return pdfYToSvgY(pageHeight, candidate.y + candidate.height);
}

function renderSvg(entry) {
  const page = entry.pageSize;
  const staffLines = entry.staffRows
    .flatMap((row) =>
      row.staffLineY.map((lineY) => `
        <line x1="${row.left}" y1="${pdfYToSvgY(page.height, lineY)}" x2="${row.right}" y2="${pdfYToSvgY(page.height, lineY)}" class="staff-line" />`),
    )
    .join("");
  const staffBands = entry.staffRows
    .map((row) => `
      <rect x="${row.left}" y="${pdfYToSvgY(page.height, row.top)}" width="${formatNumber(row.right - row.left)}" height="${formatNumber(row.top - row.bottom)}" class="staff-band" />
      <text x="${row.left + 4}" y="${pdfYToSvgY(page.height, row.top) - 5}" class="row-label">row ${row.rowIndex + 1}</text>`)
    .join("");
  const measureBoxes = entry.measureCandidates
    .map((candidate) => {
      const labelX = candidate.x + Math.max(candidate.width / 2 - 3, 0);
      const labelY = getCandidateTop(page.height, candidate) + candidate.height / 2 + 3;

      return `
        <rect x="${candidate.x}" y="${getCandidateTop(page.height, candidate)}" width="${candidate.width}" height="${candidate.height}" class="measure-candidate" />
        <text x="${labelX}" y="${labelY}" class="candidate-label">${candidate.candidateIndexInRow + 1}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeHtml(entry.catalogId)} PDF vector measure candidates</title>
  <desc id="desc">${entry.summary.measureCandidateCount} measure candidates extracted from ${entry.summary.staffRowCount} staff rows. These are unverified candidates.</desc>
  <style>
    .page { fill: #fffdf8; stroke: #1f2937; stroke-width: 1.2; }
    .staff-band { fill: rgba(21, 94, 117, 0.06); stroke: rgba(21, 94, 117, 0.45); stroke-width: 0.8; }
    .staff-line { stroke: #334155; stroke-width: 0.55; }
    .measure-candidate { fill: rgba(217, 119, 6, 0.15); stroke: #b45309; stroke-width: 0.9; }
    .row-label { fill: #0f766e; font: 8px ui-monospace, SFMono-Regular, Consolas, monospace; }
    .candidate-label { fill: #92400e; font: 7px ui-monospace, SFMono-Regular, Consolas, monospace; text-anchor: middle; }
  </style>
  <rect x="0" y="0" width="${page.width}" height="${page.height}" class="page" />
${staffBands}
${staffLines}
${measureBoxes}
</svg>`;
}

function renderHtml(entry, svgFileName, pdfFileName) {
  const candidatesByRow = new Map();
  for (const candidate of entry.measureCandidates) {
    const existing = candidatesByRow.get(candidate.rowIndex) ?? 0;
    candidatesByRow.set(candidate.rowIndex, existing + 1);
  }
  const rows = entry.staffRows
    .map((row) => `
      <tr>
        <td>${row.rowIndex + 1}</td>
        <td>${candidatesByRow.get(row.rowIndex) ?? 0}</td>
        <td>${row.leftPercent.toFixed(2)}%</td>
        <td>${row.widthPercent.toFixed(2)}%</td>
        <td>${row.topPercent.toFixed(2)}%</td>
      </tr>`)
    .join("");

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23b45309'/%3E%3Cpath d='M5 11V4h6v2H7v1.5h3.5v2H7V11H5Z' fill='white'/%3E%3C/svg%3E" />
  <title>SymbTr PDF layout review - ${escapeHtml(entry.catalogId)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172033;
      --muted: #64748b;
      --line: #d9e2ec;
      --surface: #f8fafc;
      --accent: #b45309;
      --accent-soft: #fff7ed;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f7;
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    main {
      display: grid;
      gap: 18px;
      max-width: 1180px;
      margin: 0 auto;
      padding: 24px;
    }
    header {
      display: grid;
      gap: 8px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: clamp(20px, 3vw, 34px);
      letter-spacing: 0;
    }
    p { margin: 0; color: var(--muted); }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    .metric, .warning, .review-frame, .source-frame, .table-wrap {
      border: 1px solid var(--line);
      background: white;
      border-radius: 8px;
    }
    .metric { padding: 12px; }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }
    .metric strong {
      display: block;
      margin-top: 4px;
      font-size: 24px;
    }
    .warning {
      border-color: #fed7aa;
      background: var(--accent-soft);
      color: #7c2d12;
      padding: 12px;
    }
    .review-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 14px;
      align-items: start;
    }
    .review-frame, .source-frame {
      overflow: auto;
      padding: 16px;
    }
    .frame-title {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    object, iframe {
      display: block;
      width: 100%;
      min-height: 860px;
      border: 0;
      margin: 0 auto;
      background: white;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    caption {
      padding: 12px;
      text-align: left;
      font-weight: 700;
    }
    th, td {
      padding: 10px 12px;
      border-top: 1px solid var(--line);
      text-align: left;
    }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; }
    code {
      overflow-wrap: anywhere;
      border-radius: 4px;
      background: var(--surface);
      padding: 2px 4px;
    }
    @media (max-width: 760px) {
      main { padding: 16px; }
      .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .review-grid { grid-template-columns: 1fr; }
      object, iframe { min-height: 560px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>SymbTr PDF ölçü aday incelemesi</h1>
      <p><code>${escapeHtml(entry.catalogId)}</code></p>
      <p>Kaynak: <code>${escapeHtml(entry.source.archiveMemberPath)}</code></p>
    </header>
    <section class="summary" aria-label="Özet">
      <div class="metric"><span>Porte satırı</span><strong>${entry.summary.staffRowCount}</strong></div>
      <div class="metric"><span>Ölçü adayı</span><strong>${entry.summary.measureCandidateCount}</strong></div>
      <div class="metric"><span>PDF genişlik</span><strong>${entry.pageSize.width}</strong></div>
      <div class="metric"><span>PDF yükseklik</span><strong>${entry.pageSize.height}</strong></div>
    </section>
    <section class="warning">${escapeHtml(entry.summary.warning)}</section>
    <section class="review-grid" aria-label="Kaynak PDF ve aday overlay">
      <div class="source-frame">
        <p class="frame-title">Kaynak PDF</p>
        <iframe title="Kaynak PDF" src="${escapeHtml(pdfFileName)}"></iframe>
      </div>
      <div class="review-frame">
        <p class="frame-title">Vektör aday overlay</p>
        <object type="image/svg+xml" data="${escapeHtml(svgFileName)}"></object>
      </div>
    </section>
    <section class="table-wrap">
      <table>
        <caption>Porte satırı aday dağılımı</caption>
        <thead>
          <tr>
            <th>Satır</th>
            <th>Aday</th>
            <th>Sol</th>
            <th>Genişlik</th>
            <th>Üst</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

function buildCandidateReviewRows(entry, suggestions) {
  return entry.measureCandidates.map((candidate) => ({
    sourceCandidateRowIndex: candidate.rowIndex,
    sourceCandidateIndexInRow: candidate.candidateIndexInRow,
    candidateLabel: `row-${candidate.rowIndex + 1}-candidate-${candidate.candidateIndexInRow + 1}`,
    suggestedMeasureIndex:
      suggestions?.byCandidate.get(`${candidate.rowIndex}:${candidate.candidateIndexInRow}`) ?? null,
    suggestionConfidence: suggestions?.confidence ?? null,
    leftPercent: candidate.leftPercent,
    topPercent: candidate.topPercent,
    widthPercent: candidate.widthPercent,
    heightPercent: candidate.heightPercent,
    confidence: candidate.confidence,
  }));
}

function buildVerificationTemplateEntry({entry, layoutData, reviewer, scoreMeasureSummary, alignmentSuggestion}) {
  const candidateGeometryFingerprint = getSymbTrLayoutCandidateFingerprint({
    catalogId: entry.catalogId,
    layoutData,
    layoutEntry: entry,
  });

  return {
    catalogId: entry.catalogId,
    sourceLayoutGeneratedAt: layoutData.generatedAt,
    sourceArchiveMemberPath: entry.source.archiveMemberPath,
    sourceMeasureCandidateCount: entry.measureCandidates.length,
    candidateGeometryFingerprint,
    reviewer,
    method: "human-reviewed",
    ...(alignmentSuggestion
      ? {
          alignmentSuggestion: {
            confidence: alignmentSuggestion.confidence,
            medianDeltaPercent: alignmentSuggestion.medianDeltaPercent,
            coverage: alignmentSuggestion.coverage,
            measureIndexBasis: alignmentSuggestion.measureIndexBasis,
            source: "auto-alignment-report",
          },
        }
      : {}),
    scoreMeasureSummary: {
      sourceArchiveMemberPath: scoreMeasureSummary.sourceArchiveMemberPath,
      noteEventCount: scoreMeasureSummary.noteEventCount,
      measureCount: scoreMeasureSummary.measureCount,
      maxMeasureIndex: scoreMeasureSummary.maxMeasureIndex,
      measureIndexes: scoreMeasureSummary.measureIndexes,
      missingMeasureIndexes: scoreMeasureSummary.missingMeasureIndexes,
    },
    candidateReviewRows: buildCandidateReviewRows(entry, alignmentSuggestion),
    measureBoxes: [],
  };
}

/**
 * Otomatik hizalama raporundan on-doldurma haritasi uretir (W4.1 P2):
 * high/medium guvenli girilerin adaylari icin suggestedMeasureIndex.
 * DUSUK guvenli girilere on-doldurma YAPILMAZ — karar insanin.
 */
function loadAlignmentSuggestions(reportPath) {
  if (!reportPath || !existsSync(reportPath)) return new Map();
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const suggestionsByCatalog = new Map();
  for (const entry of report.entries ?? []) {
    if (!["high", "medium"].includes(entry.confidence)) continue;
    const byCandidate = new Map();
    for (const box of entry.boxes ?? []) {
      if (box.leftPercent === null) continue;
      byCandidate.set(`${box.sourceCandidateRowIndex}:${box.sourceCandidateIndexInRow}`, box.measureIndex);
    }
    suggestionsByCatalog.set(entry.catalogId, {
      confidence: entry.confidence,
      medianDeltaPercent: entry.medianDeltaPercent,
      coverage: entry.coverage,
      measureIndexBasis: entry.measureIndexBasis,
      byCandidate,
    });
  }
  return suggestionsByCatalog;
}

function buildVerificationReviewTemplate({layoutData, artifacts, generatedAt, reviewer}) {
  return {
    schemaVersion: 1,
    type: "symbtr-pdf-layout-verification-review-template",
    generatedAt,
    policy: verificationTemplatePolicy,
    reviewer,
    fingerprintAlgorithm: SYMBTR_LAYOUT_CANDIDATE_FINGERPRINT_ALGORITHM,
    entryCount: artifacts.length,
    entries: Object.fromEntries(
      artifacts.map((artifact) => [artifact.catalogId, artifact.verificationTemplateEntry]),
    ),
    artifactIndex: artifacts.map((artifact) => ({
      catalogId: artifact.catalogId,
      html: artifact.html,
      svg: artifact.svg,
      pdf: artifact.pdf,
      sourceLayoutGeneratedAt: layoutData.generatedAt,
      sourceMeasureCandidateCount: artifact.measureCandidateCount,
      candidateGeometryFingerprint: artifact.verificationTemplateEntry.candidateGeometryFingerprint,
      scoreMeasureCount: artifact.verificationTemplateEntry.scoreMeasureSummary.measureCount,
    })),
  };
}

function summarizeCandidateRowsByStaffRow(entry) {
  const rowsByStaffRow = new Map();
  for (const row of entry.candidateReviewRows) {
    const rows = rowsByStaffRow.get(row.sourceCandidateRowIndex) ?? [];
    rows.push(row);
    rowsByStaffRow.set(row.sourceCandidateRowIndex, rows);
  }

  return Array.from(rowsByStaffRow, ([staffRowIndex, rows]) => ({
    staffRowIndex,
    candidateCount: rows.length,
    candidates: rows,
  })).sort((left, right) => left.staffRowIndex - right.staffRowIndex);
}

function chunkRows(rows, chunkSize) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  return chunks;
}

function buildVerificationReviewBatchPlan({reviewTemplate, generatedAt, reviewer, packetSize = DEFAULT_REVIEW_PACKET_SIZE}) {
  const reviewEntries = Object.values(reviewTemplate.entries ?? {});
  const staffRowGroups = reviewEntries.flatMap((entry) =>
    summarizeCandidateRowsByStaffRow(entry).map((group) => ({
      ...group,
      catalogId: entry.catalogId,
      sourceLayoutGeneratedAt: entry.sourceLayoutGeneratedAt,
      sourceArchiveMemberPath: entry.sourceArchiveMemberPath,
      sourceMeasureCandidateCount: entry.sourceMeasureCandidateCount,
      candidateGeometryFingerprint: entry.candidateGeometryFingerprint,
      scoreMeasureCount: entry.scoreMeasureSummary.measureCount,
      scoreMeasureIndexes: entry.scoreMeasureSummary.measureIndexes,
    })),
  );
  const packets = chunkRows(staffRowGroups, packetSize).map((groups, index) => {
    const candidates = groups.flatMap((group) => group.candidates.map((candidate) => ({
      ...candidate,
      catalogId: group.catalogId,
    })));

    return {
      packetId: `symbtr-pdf-review-packet-${String(index + 1).padStart(4, "0")}`,
      sequence: index + 1,
      status: "needs-visual-review",
      reviewAction: "map-pdf-vector-candidates-to-symbtr-measures",
      catalogIds: Array.from(new Set(groups.map((group) => group.catalogId))).sort(),
      staffRows: groups.map((group) => ({
        catalogId: group.catalogId,
        staffRowIndex: group.staffRowIndex,
        candidateCount: group.candidateCount,
        candidateGeometryFingerprint: group.candidateGeometryFingerprint,
        sourceArchiveMemberPath: group.sourceArchiveMemberPath,
        sourceMeasureCandidateCount: group.sourceMeasureCandidateCount,
        scoreMeasureCount: group.scoreMeasureCount,
        scoreMeasureIndexes: group.scoreMeasureIndexes,
      })),
      candidateCount: candidates.length,
      candidateReviewRows: candidates.map((candidate) => ({
        catalogId: candidate.catalogId,
        sourceCandidateRowIndex: candidate.sourceCandidateRowIndex,
        sourceCandidateIndexInRow: candidate.sourceCandidateIndexInRow,
        candidateLabel: candidate.candidateLabel,
        suggestedMeasureIndex: null,
        reviewDecision: "unreviewed",
        leftPercent: candidate.leftPercent,
        topPercent: candidate.topPercent,
        widthPercent: candidate.widthPercent,
        heightPercent: candidate.heightPercent,
        confidence: candidate.confidence,
      })),
      promotionTemplate: {
        measureBoxes: [],
        policy: verificationBatchPlanPolicy,
      },
    };
  });

  return {
    schemaVersion: 1,
    type: "symbtr-pdf-layout-verification-review-batch-plan",
    generatedAt,
    reviewer,
    policy: verificationBatchPlanPolicy,
    packetSize,
    packetCount: packets.length,
    entryCount: reviewEntries.length,
    candidateReviewRows: packets.reduce((total, packet) => total + packet.candidateCount, 0),
    fingerprintAlgorithm: reviewTemplate.fingerprintAlgorithm,
    sourceReviewTemplate: {
      type: reviewTemplate.type,
      generatedAt: reviewTemplate.generatedAt,
      entryCount: reviewTemplate.entryCount,
    },
    packets,
  };
}

function renderReviewArtifact(catalogId, outDir, layoutData, reviewer, alignmentSuggestion) {
  const entry = layoutData.entries?.[catalogId];
  if (!entry) {
    throw new Error(`No PDF layout candidate entry found for catalog id: ${catalogId}`);
  }

  const safeOutDir = assertInsideProject(path.resolve(root, outDir));
  mkdirSync(safeOutDir, {recursive: true});

  const baseName = `${catalogId}-layout-review`;
  const svgFileName = `${baseName}.svg`;
  const htmlFileName = `${baseName}.html`;
  const pdfFileName = `${baseName}.pdf`;
  const svgPath = path.join(safeOutDir, svgFileName);
  const htmlPath = path.join(safeOutDir, htmlFileName);
  const pdfPath = path.join(safeOutDir, pdfFileName);
  const sourcePdf = readZipEntry(pdfZipPath, entry.source.archiveMemberPath);
  const scoreMeasureSummary = getSymbTrMeasureIndexSummary({catalogId});

  writeFileSync(pdfPath, sourcePdf);
  writeFileSync(svgPath, `${renderSvg(entry)}\n`);
  writeFileSync(htmlPath, `${renderHtml(entry, svgFileName, pdfFileName)}\n`);

  return {
    catalogId,
    html: toProjectPath(path.relative(root, htmlPath)),
    svg: toProjectPath(path.relative(root, svgPath)),
    pdf: toProjectPath(path.relative(root, pdfPath)),
    staffRowCount: entry.summary.staffRowCount,
    measureCandidateCount: entry.summary.measureCandidateCount,
    warning: entry.summary.warning,
    verificationTemplateEntry: buildVerificationTemplateEntry({
      entry,
      layoutData,
      reviewer,
      scoreMeasureSummary,
      alignmentSuggestion,
    }),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const options = parseCliOptions(process.argv.slice(2));
  const layoutData = JSON.parse(readFileSync(layoutPath, "utf8"));
  const alignmentReportPath = options.get("alignment-report")
    ?? (existsSync(DEFAULT_ALIGNMENT_REPORT_PATH) ? DEFAULT_ALIGNMENT_REPORT_PATH : null);
  const alignmentSuggestions = loadAlignmentSuggestions(alignmentReportPath);
  const outDir = options.get("out-dir") ?? DEFAULT_OUT_DIR;
  const reviewer = options.get("reviewer") ?? DEFAULT_REVIEWER;
  const generatedAt = options.get("generated-at") ?? DEFAULT_GENERATED_AT;
  const candidateEntries = Object.values(layoutData.entries ?? {})
    .filter((entry) => Array.isArray(entry.measureCandidates) && entry.measureCandidates.length > 0)
    .map((entry) => entry.catalogId)
    .sort();
  const requestedCatalogIds = options.has("catalog-id")
    ? [options.get("catalog-id") ?? DEFAULT_CATALOG_ID]
    : candidateEntries;
  const limit = Number(options.get("limit") ?? requestedCatalogIds.length);
  const catalogIds = requestedCatalogIds.slice(0, Number.isInteger(limit) && limit > 0 ? limit : requestedCatalogIds.length);
  const artifacts = catalogIds.map((catalogId) =>
    renderReviewArtifact(catalogId, outDir, layoutData, reviewer, alignmentSuggestions.get(catalogId)),
  );
  const template = buildVerificationReviewTemplate({layoutData, artifacts, generatedAt, reviewer});
  const batchPlan = buildVerificationReviewBatchPlan({reviewTemplate: template, generatedAt, reviewer});
  const safeOutDir = assertInsideProject(path.resolve(root, outDir));
  const templateFileName = options.get("template-file") ?? "layout-verification-review-template.json";
  const templatePath = path.join(safeOutDir, templateFileName);
  const batchPlanFileName = options.get("batch-plan-file") ?? "layout-verification-review-batch-plan.json";
  const batchPlanPath = path.join(safeOutDir, batchPlanFileName);

  writeFileSync(templatePath, `${JSON.stringify(template, null, 2)}\n`);
  writeFileSync(batchPlanPath, `${JSON.stringify(batchPlan, null, 2)}\n`);

  console.log(JSON.stringify({
    generatedAt,
    outDir: toProjectPath(path.relative(root, safeOutDir)),
    entryCount: artifacts.length,
    reviewTemplate: toProjectPath(path.relative(root, templatePath)),
    reviewBatchPlan: toProjectPath(path.relative(root, batchPlanPath)),
    reviewBatchPackets: batchPlan.packetCount,
    reviewBatchCandidateRows: batchPlan.candidateReviewRows,
    artifacts: artifacts.map((artifact) => ({
      catalogId: artifact.catalogId,
      html: artifact.html,
      svg: artifact.svg,
      pdf: artifact.pdf,
      staffRowCount: artifact.staffRowCount,
      measureCandidateCount: artifact.measureCandidateCount,
      warning: artifact.warning,
    })),
    promotionPolicy: verificationTemplatePolicy,
  }, null, 2));
}

export {
  buildVerificationReviewBatchPlan,
  buildVerificationReviewTemplate,
  renderReviewArtifact,
};
