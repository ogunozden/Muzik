import {spawnSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_BASE_URL = "http://localhost:4015";
const DEFAULT_SUMMARY_OUTPUT = "output/external-reference-coverage/prod-cycle-summary.json";
const REQUIRED_FLOW = [
  "ingest",
  "normalize",
  "dedupe",
  "provider-profile-classify",
  "candidate-generate",
  "confidence-score",
  "status-assign",
  "safe-auto-attach-accepted-only",
  "validate",
  "coverage-report",
];

const npmExecutable = "npm";

function parseArgs(argv) {
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

function relativePath(filePath) {
  return path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, filePath)).replace(/\\/g, "/");
}

function readJson(filePath, label, errors) {
  const absolutePath = path.resolve(PROJECT_ROOT, filePath);
  if (!existsSync(absolutePath)) {
    errors.push(`${label} missing: ${relativePath(filePath)}`);
    return null;
  }

  try {
    return JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    errors.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function runCommand({id, command, args, timeoutMs = 180_000}) {
  const startedAt = Date.now();
  const actualCommand = process.platform === "win32" && command === "npm" ? "cmd.exe" : command;
  const actualArgs = process.platform === "win32" && command === "npm"
    ? ["/d", "/s", "/c", ["npm", ...args].join(" ")]
    : args;
  const result = spawnSync(actualCommand, actualArgs, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    shell: false,
    timeout: timeoutMs,
    windowsHide: true,
  });
  const durationMs = Date.now() - startedAt;
  const stdout = (result.stdout ?? "").trim();
  const stderr = [result.stderr, result.error?.message].filter(Boolean).join("\n").trim();
  const timedOut = result.error?.code === "ETIMEDOUT";
  const exitCode = typeof result.status === "number" ? result.status : (timedOut ? 124 : 1);

  return {
    id,
    command: [command, ...args].join(" "),
    ok: exitCode === 0 && !timedOut,
    exitCode,
    durationMs,
    timedOut,
    stdoutTail: stdout.split(/\r?\n/).slice(-12),
    stderrTail: stderr.split(/\r?\n/).filter(Boolean).slice(-12),
  };
}

function countByValue(rows = []) {
  const counts = {};
  for (const row of rows) {
    if (!row || typeof row.value !== "string") continue;
    counts[row.value] = row.count ?? 0;
  }
  return counts;
}

function setEquals(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function hasAcceptedOnlyPolicy(text) {
  return typeof text === "string" && /only accepted/i.test(text);
}

function collectErrors({
  commandResults,
  coverageSummary,
  sourceIntakeDryRun,
  pdfSummary,
  studioFollowAudit,
  referencesRuntimeAudit,
  securityAudit,
}) {
  const errors = [];

  for (const result of commandResults) {
    if (!result.ok) {
      errors.push(`${result.id} failed with exit code ${result.exitCode}`);
    }
  }

  if (!coverageSummary) {
    errors.push("external reference coverage summary could not be read");
  } else {
    const batchReport = coverageSummary.batchReport ?? {};
    if (coverageSummary.totalCatalogEntries !== 3000) {
      errors.push(`expected 3000 catalog entries, got ${coverageSummary.totalCatalogEntries}`);
    }
    if (batchReport.processedCatalogEntries !== 3000) {
      errors.push(`expected batchReport.processedCatalogEntries 3000, got ${batchReport.processedCatalogEntries}`);
    }
    if (!Array.isArray(batchReport.flow) || !setEquals(batchReport.flow, REQUIRED_FLOW)) {
      errors.push("batchReport.flow must contain the full batch-first pipeline contract");
    }
    if ((coverageSummary.duplicateRowsAfterDedupe ?? -1) !== 0) {
      errors.push(`duplicateRowsAfterDedupe must be 0, got ${coverageSummary.duplicateRowsAfterDedupe}`);
    }
    if ((batchReport.duplicateRowsAfterDedupe ?? -1) !== 0) {
      errors.push(`batchReport.duplicateRowsAfterDedupe must be 0, got ${batchReport.duplicateRowsAfterDedupe}`);
    }
    if (!hasAcceptedOnlyPolicy(batchReport.autoAttachPolicy)) {
      errors.push("batchReport.autoAttachPolicy must be accepted-only");
    }

    const reviewStatusCounts = countByValue(coverageSummary.candidateReviewQueueByStatus);
    if ((reviewStatusCounts.accepted ?? 0) !== 0) {
      errors.push("candidate review queue must not contain accepted rows");
    }
    if ((coverageSummary.candidateReviewQueueEntries ?? 0) !== (coverageSummary.candidateReviewGroupEntries ?? 0) * 5) {
      errors.push("candidate review queue must stay provider-profile grouped at five candidates per missing catalog entry");
    }
    if ((coverageSummary.sourceIntakeTemplateRowEntries ?? 0) > (coverageSummary.candidateReviewGroupEntries ?? 0)) {
      errors.push("source intake template rows cannot exceed review group entries");
    }
  }

  if (!sourceIntakeDryRun) {
    errors.push("source intake dry-run summary could not be read");
  } else {
    const summary = sourceIntakeDryRun.summary ?? {};
    const requiredGates = new Set(sourceIntakeDryRun.validationGates ?? []);
    for (const gate of [
      "accepted-candidates-present",
      "accepted-evidence-complete",
      "https-url-policy",
      "research-profile-match",
      "accepted-identity-dedupe",
      "dry-run-import-no-write",
    ]) {
      if (!requiredGates.has(gate)) errors.push(`source intake dry-run missing gate ${gate}`);
    }
    if (sourceIntakeDryRun.dryRun !== true) {
      errors.push("source intake verification must be dry-run only");
    }
    if (sourceIntakeDryRun.errors?.length) {
      errors.push(`source intake dry-run has ${sourceIntakeDryRun.errors.length} errors`);
    }
    if (summary.acceptedCandidateCount !== summary.httpsAcceptedCount) {
      errors.push("all accepted source intake candidates must have HTTPS URLs");
    }
    if (summary.acceptedCandidateCount !== summary.evidenceCompleteCount) {
      errors.push("all accepted source intake candidates must have complete evidence");
    }
  }

  if (!pdfSummary) {
    errors.push("PDF layout verification summary could not be read");
  } else {
    if (pdfSummary.errors?.length) {
      errors.push(`PDF layout verification has ${pdfSummary.errors.length} errors`);
    }
    if ((pdfSummary.verifiedMeasureBoxes ?? 0) !== 0) {
      errors.push("PDF verified measure boxes must stay 0 until explicit human/visual approval");
    }
    const emptyImport = pdfSummary.emptyImportDryRun ?? {};
    if (emptyImport.verificationManifestUnchanged !== true) {
      errors.push("PDF empty-import dry-run must prove verification manifest unchanged");
    }
    if (
      typeof emptyImport.verificationManifestBeforeSha256 !== "string" ||
      emptyImport.verificationManifestBeforeSha256 !== emptyImport.verificationManifestAfterSha256
    ) {
      errors.push("PDF empty-import SHA256 before/after values must match");
    }
  }

  if (!studioFollowAudit) {
    errors.push("studio follow browser audit summary could not be read");
  } else {
    if (studioFollowAudit.ok !== true) errors.push("studio follow browser audit must be ok");
    if ((studioFollowAudit.browserWarningOrErrorCount ?? 0) !== 0) {
      errors.push("studio follow browser console warning/error count must be 0");
    }
  }

  if (!referencesRuntimeAudit) {
    errors.push("references curation runtime audit summary could not be read");
  } else {
    if (referencesRuntimeAudit.ok !== true) errors.push("references curation runtime audit must be ok");
    if (referencesRuntimeAudit.metrics?.hasRawPacketArrays === true) {
      errors.push("/references/curation must not hydrate raw packet arrays");
    }
    if (referencesRuntimeAudit.metrics?.hasSourceIntakeRowFields === true) {
      errors.push("/references/curation must not hydrate source intake row fields");
    }
  }

  if (securityAudit) {
    const auditResult = commandResults.find((result) => result.id === "security-audit");
    const joined = [...(auditResult?.stdoutTail ?? []), ...(auditResult?.stderrTail ?? [])].join("\n");
    if (!/found 0 vulnerabilities/i.test(joined)) {
      errors.push("security audit must report 0 vulnerabilities");
    }
  }

  return errors;
}

function buildQueueClosure({coverageSummary, sourceIntakeDryRun}) {
  const batchReport = coverageSummary?.batchReport ?? {};
  const candidateReviewStatusCounts = coverageSummary?.candidateReviewQueueByStatus ?? [];
  const candidateReviewGroupStatusCounts = coverageSummary?.candidateReviewGroupsByStatus ?? [];
  const confidenceLevelCounts = batchReport.candidateReviewConfidenceLevelCounts ?? [];
  const reviewStatusCounts = countByValue(candidateReviewStatusCounts);
  const groupStatusCounts = countByValue(candidateReviewGroupStatusCounts);

  return {
    candidateReviewQueueEntries: coverageSummary?.candidateReviewQueueEntries ?? 0,
    candidateReviewGroupEntries: coverageSummary?.candidateReviewGroupEntries ?? 0,
    sourceIntakeTemplateRows: coverageSummary?.sourceIntakeTemplateRowEntries ?? 0,
    sourceIntakeTemplatePackets: coverageSummary?.sourceIntakeTemplatePacketEntries ?? 0,
    byProviderProfile: coverageSummary?.candidateReviewQueueByProfile ?? [],
    byCandidateStatus: candidateReviewStatusCounts,
    byGroupStatus: candidateReviewGroupStatusCounts,
    byConfidenceLevel: confidenceLevelCounts,
    acceptedPromotionEligibleFromReviewQueue: 0,
    acceptedBulkCandidateCount: sourceIntakeDryRun?.summary?.acceptedCandidateCount ?? 0,
    reviewOnlyCandidateCount: (reviewStatusCounts["needs-review"] ?? 0) + (reviewStatusCounts.conflict ?? 0),
    safeBacklogGroupCount: (groupStatusCounts["needs-review"] ?? 0) + (groupStatusCounts.deferred ?? 0) + (groupStatusCounts.conflict ?? 0),
    evidenceMissingReasonCounts: [
      {
        reason: "review-only-search-candidate-not-source-evidence",
        count: coverageSummary?.candidateReviewQueueEntries ?? 0,
      },
      {
        reason: "needs-validated-https-source-url-before-accepted",
        count: coverageSummary?.sourceIntakeTemplateRowEntries ?? 0,
      },
      {
        reason: "deferred-or-conflict-group-decision",
        count: coverageSummary?.deferredMissingEntries ?? 0,
      },
    ],
    policy: "Review queue candidates are searchable leads only. They remain needs-review/conflict/deferred until batch import supplies HTTPS URL, provider profile match, catalog id match, duplicate-safe identity, checkedAt and conflict-free evidence.",
  };
}

function buildSummary({
  baseUrl,
  commandResults,
  coverageSummary,
  sourceIntakeDryRun,
  pdfSummary,
  studioFollowAudit,
  referencesRuntimeAudit,
  securityAudit,
}) {
  const errors = collectErrors({
    commandResults,
    coverageSummary,
    sourceIntakeDryRun,
    pdfSummary,
    studioFollowAudit,
    referencesRuntimeAudit,
    securityAudit,
  });

  return {
    version: 1,
    type: "batch-first-prod-cycle-audit",
    generatedAt: new Date().toISOString(),
    baseUrl,
    ok: errors.length === 0,
    errors,
    warnings: [],
    commandResults,
    pipeline: {
      requiredFlow: REQUIRED_FLOW,
      actualFlow: coverageSummary?.batchReport?.flow ?? [],
      processedCatalogEntries: coverageSummary?.batchReport?.processedCatalogEntries ?? 0,
      totalCatalogEntries: coverageSummary?.totalCatalogEntries ?? 0,
      curatedReferenceEntries: coverageSummary?.curatedReferenceEntries ?? 0,
      missingCuratedEntries: coverageSummary?.missingCuratedEntries ?? 0,
      duplicateRowsAfterDedupe: coverageSummary?.duplicateRowsAfterDedupe ?? null,
      autoAttachPolicy: coverageSummary?.batchReport?.autoAttachPolicy ?? null,
      autoAttachAcceptedOnly: hasAcceptedOnlyPolicy(coverageSummary?.batchReport?.autoAttachPolicy),
      reviewQueueHasAccepted: (countByValue(coverageSummary?.candidateReviewQueueByStatus).accepted ?? 0) > 0,
    },
    queueClosure: buildQueueClosure({coverageSummary, sourceIntakeDryRun}),
    sourceIntakeVerification: {
      dryRun: sourceIntakeDryRun?.dryRun === true,
      acceptedCandidateCount: sourceIntakeDryRun?.summary?.acceptedCandidateCount ?? 0,
      httpsAcceptedCount: sourceIntakeDryRun?.summary?.httpsAcceptedCount ?? 0,
      evidenceCompleteCount: sourceIntakeDryRun?.summary?.evidenceCompleteCount ?? 0,
      dryRunSkippedDuplicateCount: sourceIntakeDryRun?.summary?.dryRunSkippedDuplicateCount ?? 0,
      validationGates: sourceIntakeDryRun?.validationGates ?? [],
    },
    pdfVerification: {
      candidateEntries: pdfSummary?.candidateEntries ?? 0,
      verificationEntries: pdfSummary?.verificationEntries ?? 0,
      verifiedEntries: pdfSummary?.verifiedEntries ?? 0,
      verifiedMeasureBoxes: pdfSummary?.verifiedMeasureBoxes ?? 0,
      candidateStatus: pdfSummary?.candidateStatus ?? null,
      promotionPolicy: pdfSummary?.promotionPolicy ?? null,
      emptyImportDryRun: pdfSummary?.emptyImportDryRun ?? null,
    },
    runtime: {
      studioFollow: {
        ok: studioFollowAudit?.ok === true,
        browserWarningOrErrorCount: studioFollowAudit?.browserWarningOrErrorCount ?? null,
        screenshot: studioFollowAudit?.screenshot ?? null,
      },
      referencesCuration: {
        ok: referencesRuntimeAudit?.ok === true,
        targetUrl: referencesRuntimeAudit?.targetUrl ?? null,
        htmlBytes: referencesRuntimeAudit?.metrics?.htmlBytes ?? null,
        hydratedCandidateIds: referencesRuntimeAudit?.metrics?.hydratedCandidateIds ?? null,
        hydratedCatalogIds: referencesRuntimeAudit?.metrics?.hydratedCatalogIds ?? null,
        hasRawPacketArrays: referencesRuntimeAudit?.metrics?.hasRawPacketArrays ?? null,
        hasSourceIntakeRowFields: referencesRuntimeAudit?.metrics?.hasSourceIntakeRowFields ?? null,
        screenshot: "output/playwright/references-curation-runtime-audit-20260601.png",
      },
    },
    security: {
      npmAuditModerateOrHigher: securityAudit?.ok === true ? "0 vulnerabilities" : "failed",
    },
    openWork: [
      {
        id: "external-reference-coverage",
        status: "batch-queue",
        count: coverageSummary?.missingCuratedEntries ?? 0,
        reason: "Missing works require validated real external sources; search candidates are not evidence and are not auto-attached.",
      },
      {
        id: "pdf-measure-verification",
        status: "candidate-only",
        count: pdfSummary?.unresolvedCandidateEntries ?? 0,
        reason: "PDF measure boxes remain candidate data until human or visual-regression verification promotes them.",
      },
    ],
    artifacts: {
      coverageSummary: "output/external-reference-coverage/summary.json",
      sourceIntakeDryRun: "output/external-reference-coverage/source-intake-accepted-import-dry-run.json",
      pdfLayoutVerificationSummary: "output/symbtr-layout-review/layout-verification-summary.json",
      referencesRuntimeAudit: "output/playwright/references-curation-batch-runtime-audit-20260601.json",
      studioFollowAudit: "output/playwright/studio-follow-browser-audit-20260601.json",
    },
  };
}

function writeJson(filePath, data) {
  const absolutePath = path.resolve(PROJECT_ROOT, filePath);
  mkdirSync(path.dirname(absolutePath), {recursive: true});
  writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function buildProdCycleSummary(inputs) {
  return buildSummary(inputs);
}

export async function runProdCycleAudit({
  baseUrl = DEFAULT_BASE_URL,
  summaryOutput = DEFAULT_SUMMARY_OUTPUT,
} = {}) {
  const commands = [
    {id: "external-reference-audit", command: npmExecutable, args: ["run", "audit:external-references"]},
    {id: "source-intake-dry-run", command: npmExecutable, args: ["run", "verify:external-source-intake"]},
    {id: "pdf-empty-import-dry-run", command: npmExecutable, args: ["run", "verify:symbtr-layout-review-import"]},
    {id: "pdf-layout-verification", command: npmExecutable, args: ["run", "verify:symbtr-measures"]},
    {id: "curation-validation", command: npmExecutable, args: ["run", "curation:validate"]},
    {id: "samples-instruments-audit", command: npmExecutable, args: ["run", "audit:samples"], timeoutMs: 240_000},
    {id: "studio-follow-browser-audit", command: npmExecutable, args: ["run", "audit:studio-follow"], timeoutMs: 240_000},
    {id: "references-curation-runtime-audit", command: npmExecutable, args: ["run", "audit:references-curation-runtime"], timeoutMs: 120_000},
    {
      id: "layout-guard",
      command: npmExecutable,
      args: [
        "run",
        "guardrails:layout",
        "--",
        "--base-url",
        baseUrl,
        "--routes",
        "/references/curation,/studio/follow",
      ],
      timeoutMs: 300_000,
    },
    {id: "security-audit", command: npmExecutable, args: ["run", "audit:security"], timeoutMs: 120_000},
  ];

  const commandResults = commands.map((command) => runCommand(command));
  const readErrors = [];
  const coverageSummary = readJson("output/external-reference-coverage/summary.json", "coverage summary", readErrors);
  const sourceIntakeDryRun = readJson(
    "output/external-reference-coverage/source-intake-accepted-import-dry-run.json",
    "source intake dry-run",
    readErrors,
  );
  const pdfSummary = readJson(
    "output/symbtr-layout-review/layout-verification-summary.json",
    "PDF layout verification summary",
    readErrors,
  );
  const studioFollowAudit = readJson(
    "output/playwright/studio-follow-browser-audit-20260601.json",
    "studio follow browser audit",
    readErrors,
  );
  const referencesRuntimeAudit = readJson(
    "output/playwright/references-curation-batch-runtime-audit-20260601.json",
    "references curation runtime audit",
    readErrors,
  );
  const securityAudit = commandResults.find((result) => result.id === "security-audit");
  const summary = buildSummary({
    baseUrl,
    commandResults,
    coverageSummary,
    sourceIntakeDryRun,
    pdfSummary,
    studioFollowAudit,
    referencesRuntimeAudit,
    securityAudit,
  });
  summary.errors = [...readErrors, ...summary.errors];
  summary.ok = summary.errors.length === 0;

  writeJson(summaryOutput, summary);
  return summary;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  const options = parseArgs(process.argv.slice(2));
  const summary = await runProdCycleAudit({
    baseUrl: options.get("base-url") ?? DEFAULT_BASE_URL,
    summaryOutput: options.get("summary-output") ?? DEFAULT_SUMMARY_OUTPUT,
  });

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}
