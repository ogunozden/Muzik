import {mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE_URL = "http://localhost:4015";
const DEFAULT_ROUTE = "/references/curation";
const DEFAULT_SUMMARY_OUTPUT = "output/playwright/references-curation-batch-runtime-audit-20260601.json";
const MAX_HTML_BYTES = 750_000;
const MAX_HYDRATED_CANDIDATE_IDS = 120;
const MAX_HYDRATED_CATALOG_IDS = 320;

function parseArgs(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[index + 1]?.startsWith("--") ? "true" : (argv[index + 1] ?? "true");
    options.set(key, value);
    if (value !== "true") index += 1;
  }
  return options;
}

function countOccurrences(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function requireContains(text, value, label, errors) {
  if (!text.includes(value)) {
    errors.push(`missing ${label}: ${value}`);
  }
}

async function writeSummary(outputPath, summary) {
  const absoluteOutput = path.resolve(outputPath);
  await mkdir(path.dirname(absoluteOutput), {recursive: true});
  await writeFile(absoluteOutput, `${JSON.stringify(summary, null, 2)}\n`);
}

export async function auditReferencesCurationRuntime({
  baseUrl = DEFAULT_BASE_URL,
  route = DEFAULT_ROUTE,
  summaryOutput = DEFAULT_SUMMARY_OUTPUT,
} = {}) {
  const targetUrl = new URL(route, baseUrl).toString();
  const startedAt = Date.now();
  const response = await fetch(targetUrl, {headers: {"Cache-Control": "no-store"}});
  const html = await response.text();
  const htmlBytes = Buffer.byteLength(html, "utf8");
  const durationMs = Date.now() - startedAt;
  const hydratedCandidateIds = countOccurrences(html, /candidateId/g);
  const hydratedCatalogIds = countOccurrences(html, /catalogId/g);
  const errors = [];

  if (response.status !== 200) {
    errors.push(`expected HTTP 200, got ${response.status}`);
  }
  if (htmlBytes > MAX_HTML_BYTES) {
    errors.push(`HTML payload ${htmlBytes} bytes exceeds ${MAX_HTML_BYTES}`);
  }
  if (hydratedCandidateIds > MAX_HYDRATED_CANDIDATE_IDS) {
    errors.push(`hydrated candidate ids ${hydratedCandidateIds} exceeds ${MAX_HYDRATED_CANDIDATE_IDS}`);
  }
  if (hydratedCatalogIds > MAX_HYDRATED_CATALOG_IDS) {
    errors.push(`hydrated catalog ids ${hydratedCatalogIds} exceeds ${MAX_HYDRATED_CATALOG_IDS}`);
  }
  if (html.includes('"packets"')) {
    errors.push("read-only page must not hydrate raw packet arrays");
  }
  if (html.includes('"sourceFields"')) {
    errors.push("read-only page must not hydrate source intake row fields");
  }

  requireContains(html, "sourceIntakeTemplateJson", "source intake artifact path", errors);
  requireContains(html, "symbtr-curated-reference-source-intake-template.json", "source intake artifact file", errors);
  requireContains(html, "missingCuratedEntries", "missing backlog metric key", errors);
  requireContains(html, "candidateReviewQueueEntries", "candidate review queue metric key", errors);
  requireContains(html, "Read-only batch snapshot", "read-only snapshot message", errors);

  const summary = {
    version: 1,
    type: "references-curation-batch-runtime-audit",
    generatedAt: new Date().toISOString(),
    targetUrl,
    route,
    status: response.status,
    durationMs,
    thresholds: {
      maxHtmlBytes: MAX_HTML_BYTES,
      maxHydratedCandidateIds: MAX_HYDRATED_CANDIDATE_IDS,
      maxHydratedCatalogIds: MAX_HYDRATED_CATALOG_IDS,
    },
    metrics: {
      htmlBytes,
      hydratedCandidateIds,
      hydratedCatalogIds,
      hasRawPacketArrays: html.includes('"packets"'),
      hasSourceIntakeRowFields: html.includes('"sourceFields"'),
    },
    evidence: {
      hasSourceIntakeArtifactPath: html.includes("sourceIntakeTemplateJson"),
      hasSourceIntakeArtifactFile: html.includes("symbtr-curated-reference-source-intake-template.json"),
      hasBacklogMetric: html.includes("missingCuratedEntries"),
      hasCandidateQueueMetric: html.includes("candidateReviewQueueEntries"),
      hasReadOnlySnapshotMessage: html.includes("Read-only batch snapshot"),
    },
    ok: errors.length === 0,
    errors,
  };

  await writeSummary(summaryOutput, summary);
  return summary;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const options = parseArgs(process.argv.slice(2));
  const summary = await auditReferencesCurationRuntime({
    baseUrl: options.get("base-url") ?? DEFAULT_BASE_URL,
    route: options.get("route") ?? DEFAULT_ROUTE,
    summaryOutput: options.get("summary-output") ?? DEFAULT_SUMMARY_OUTPUT,
  });

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}
