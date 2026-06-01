import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {getSymbTrMeasureIndexSummary} from "./lib/symbtr-score-measures.mjs";
import {readZipEntry} from "./lib/zip-entry-reader.mjs";

const root = process.cwd();
const DEFAULT_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";
const DEFAULT_OUT_DIR = "output/symbtr-layout-review";
const DEFAULT_GENERATED_AT = "2026-06-01";
const DEFAULT_REVIEWER = "local-reviewer";
const verificationTemplatePolicy = "This file is a batch review template only. Do not copy rows into layout-verification.generated.json until every selected candidate is human-reviewed or visual-regression-approved and converted into measureBoxes with confidence verified.";
const layoutPath = path.join(root, "src", "data", "symbtr", "layout.generated.json");
const pdfZipPath = path.join(root, "symb", "pdf_v3.zip");

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

function buildCandidateReviewRows(entry) {
  return entry.measureCandidates.map((candidate) => ({
    sourceCandidateRowIndex: candidate.rowIndex,
    sourceCandidateIndexInRow: candidate.candidateIndexInRow,
    candidateLabel: `row-${candidate.rowIndex + 1}-candidate-${candidate.candidateIndexInRow + 1}`,
    suggestedMeasureIndex: null,
    leftPercent: candidate.leftPercent,
    topPercent: candidate.topPercent,
    widthPercent: candidate.widthPercent,
    heightPercent: candidate.heightPercent,
    confidence: candidate.confidence,
  }));
}

function buildVerificationTemplateEntry({entry, layoutData, reviewer, scoreMeasureSummary}) {
  return {
    catalogId: entry.catalogId,
    sourceLayoutGeneratedAt: layoutData.generatedAt,
    sourceArchiveMemberPath: entry.source.archiveMemberPath,
    sourceMeasureCandidateCount: entry.measureCandidates.length,
    reviewer,
    method: "human-reviewed",
    scoreMeasureSummary: {
      sourceArchiveMemberPath: scoreMeasureSummary.sourceArchiveMemberPath,
      noteEventCount: scoreMeasureSummary.noteEventCount,
      measureCount: scoreMeasureSummary.measureCount,
      maxMeasureIndex: scoreMeasureSummary.maxMeasureIndex,
      measureIndexes: scoreMeasureSummary.measureIndexes,
      missingMeasureIndexes: scoreMeasureSummary.missingMeasureIndexes,
    },
    candidateReviewRows: buildCandidateReviewRows(entry),
    measureBoxes: [],
  };
}

function buildVerificationReviewTemplate({layoutData, artifacts, generatedAt, reviewer}) {
  return {
    schemaVersion: 1,
    type: "symbtr-pdf-layout-verification-review-template",
    generatedAt,
    policy: verificationTemplatePolicy,
    reviewer,
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
      scoreMeasureCount: artifact.verificationTemplateEntry.scoreMeasureSummary.measureCount,
    })),
  };
}

function renderReviewArtifact(catalogId, outDir, layoutData, reviewer) {
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
    }),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const options = parseCliOptions(process.argv.slice(2));
  const layoutData = JSON.parse(readFileSync(layoutPath, "utf8"));
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
  const artifacts = catalogIds.map((catalogId) => renderReviewArtifact(catalogId, outDir, layoutData, reviewer));
  const template = buildVerificationReviewTemplate({layoutData, artifacts, generatedAt, reviewer});
  const safeOutDir = assertInsideProject(path.resolve(root, outDir));
  const templateFileName = options.get("template-file") ?? "layout-verification-review-template.json";
  const templatePath = path.join(safeOutDir, templateFileName);

  writeFileSync(templatePath, `${JSON.stringify(template, null, 2)}\n`);

  console.log(JSON.stringify({
    generatedAt,
    outDir: toProjectPath(path.relative(root, safeOutDir)),
    entryCount: artifacts.length,
    reviewTemplate: toProjectPath(path.relative(root, templatePath)),
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
  buildVerificationReviewTemplate,
  renderReviewArtifact,
};
