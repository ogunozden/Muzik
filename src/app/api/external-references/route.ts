import {execFile} from "node:child_process";
import {unlink} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
import {
  applyCandidateReviewGroupQuery,
  applyCandidateReviewQuery,
  type CandidateReviewGroup,
  type CandidateReviewRow,
} from "./curation-query";

import {getCandidateReviewGroupFingerprint} from "@/data/references/candidate-review-group-fingerprint.mjs";
import {getLocalOperationAccessError} from "@/shared/security";
import {
  PROJECT_ROOT,
  BULK_CANDIDATES_FILE,
  CANDIDATE_REVIEW_GROUP_DECISIONS_FILE,
  CANDIDATE_REVIEW_QUEUE_FILE,
  CANDIDATE_REVIEW_GROUPS_FILE,
  CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE,
  JSON_MAX_BUFFER_BYTES,
  MAX_BULK_TEXT_CHARS,
  MAX_SOURCE_FIELD_CHARS,
  MAX_CANDIDATE_REVIEW_EXPORT_ROWS,
  MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS,
  MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS,
  CANDIDATE_REVIEW_GROUP_DECISION_STATUSES,
  OPS_TOKEN_HEADER,
  UNSAFE_LOCAL_FLAG,
} from "./route-config";
import {
  writeBulkTextInput,
  writeCandidateManifestInput,
  writeCandidateReviewGroupDecisionInput,
  writeJsonPayloadInput,
} from "./route-io";
import {
  getExternalReferenceState,
  readCandidateReviewExportQuery,
  readCandidateReviewGroupDecisionTemplate,
  readCandidateReviewGroupExportQuery,
  readJsonOrNull,
  summarizeBulkCandidateManifest,
} from "./route-state";
import {isExternalReferenceAction, recordSourceTerminalFeedback} from "./route-feedback";



import type {
  BulkCandidateManifest,
  CandidateReviewGroupDecisionRecommendationManifest,
  OperationBody,
  StageSourceBody,
} from "./route-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let operationInFlight = false;


function getAccessError(request: Request): NextResponse | null {
  return getLocalOperationAccessError(request, {
    enabledEnv: "EXTERNAL_REFERENCE_OPERATIONS_ENABLED",
    tokenEnv: "EXTERNAL_REFERENCE_OPERATIONS_TOKEN",
    unsafeLocalEnv: UNSAFE_LOCAL_FLAG,
    tokenHeader: OPS_TOKEN_HEADER,
    disabledMessage: "Harici kaynak operasyonları production ortamında açık değil.",
    missingProductionTokenMessage: "Production ortamında harici kaynak operasyon token'ı zorunlu.",
    missingTokenMessage: `Harici kaynak operasyon token'ı gerekli. Local tokenless kullanım için ${UNSAFE_LOCAL_FLAG}=true gerekir.`,
    invalidTokenMessage: "Harici kaynak operasyon token'ı geçersiz veya eksik.",
  });
}

function toProjectRelativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
}

function validateSourceFieldLengths(source: StageSourceBody): NextResponse | null {
  for (const [field, value] of Object.entries(source)) {
    if (typeof value === "string" && value.length > MAX_SOURCE_FIELD_CHARS) {
      return NextResponse.json(
        {error: `${field} alanı ${MAX_SOURCE_FIELD_CHARS} karakterden uzun olamaz.`},
        {status: 413},
      );
    }
  }

  return null;
}

function pushArg(args: string[], key: string, value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) return;
  args.push(key, value.trim());
}

function parseScriptJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

async function runNodeScript(args: string[]): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: PROJECT_ROOT,
        maxBuffer: JSON_MAX_BUFFER_BYTES,
        timeout: 120_000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr.trim() || stdout.trim() || error.message;
          reject(new Error(message));
          return;
        }

        try {
          resolve(parseScriptJson(stdout));
        } catch {
          reject(new Error(stdout.trim() || "Operation did not return JSON."));
        }
      },
    );
  });
}

async function stageSources(body: OperationBody): Promise<unknown> {
  const args = ["scripts/stage-external-sources.mjs"];
  const source = body.source ?? {};
  const hasSourceUrl = typeof source.url === "string" && source.url.trim().length > 0;
  const hasBulkText = typeof body.bulkText === "string" && body.bulkText.trim().length > 0;
  let tempInputFilePath: string | null = null;

  if (!hasSourceUrl && !hasBulkText) {
    return NextResponse.json({error: "Kaynak URL veya toplu metin gerekli."}, {status: 400});
  }

  if (hasBulkText && (body.bulkText ?? "").length > MAX_BULK_TEXT_CHARS) {
    return NextResponse.json(
      {error: `Toplu kaynak metni ${MAX_BULK_TEXT_CHARS} karakterden uzun olamaz.`},
      {status: 413},
    );
  }

  const fieldLengthError = validateSourceFieldLengths(source);
  if (fieldLengthError) return fieldLengthError;

  if (hasBulkText) {
    const tempInput = await writeBulkTextInput(body.bulkText ?? "");
    tempInputFilePath = tempInput.filePath;
    args.push("--input", tempInput.relativePath);
  }

  if (hasSourceUrl) {
    pushArg(args, "--url", source.url);
    pushArg(args, "--title", source.title);
    pushArg(args, "--provider", source.provider === "auto" ? "" : source.provider);
    pushArg(args, "--source-provider", source.sourceProvider);
    pushArg(args, "--checked-at", source.checkedAt);
    pushArg(args, "--catalog-id", source.catalogId);
    pushArg(args, "--observed-title", source.observedTitle);
    pushArg(args, "--makam", source.makam);
    pushArg(args, "--form", source.form);
    pushArg(args, "--usul", source.usul);
    pushArg(args, "--composer", source.composer);
    pushArg(args, "--lyricist", source.lyricist);
    pushArg(args, "--lyrics", source.lyrics);
  }

  if (body.dryRun) args.push("--dry-run");

  try {
    return await runNodeScript(args);
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

async function exportCandidateManifest(): Promise<unknown> {
  const manifest = await readJsonOrNull<BulkCandidateManifest>(BULK_CANDIDATES_FILE) ?? {version: 1, candidates: []};

  return {
    summary: summarizeBulkCandidateManifest(manifest),
    manifest,
  };
}

async function exportCandidateReviewQueue(body: OperationBody): Promise<unknown> {
  const rows = await readJsonOrNull<CandidateReviewRow[]>(CANDIDATE_REVIEW_QUEUE_FILE) ?? [];
  const query = readCandidateReviewExportQuery(body);
  const filteredRows = applyCandidateReviewQuery(rows, query);

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_EXPORT_ROWS) {
    return NextResponse.json(
      {error: `Aday review export ${MAX_CANDIDATE_REVIEW_EXPORT_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_QUEUE_FILE),
      totalRows: rows.length,
      exportedCount: filteredRows.length,
      filters: {
        query: query.query,
        status: query.status,
        profileId: query.profileId,
        provider: query.provider,
      },
    },
    manifest: {
      version: 1,
      type: "candidate-review-queue-export",
      filters: {
        query: query.query,
        status: query.status,
        profileId: query.profileId,
        provider: query.provider,
      },
      candidates: filteredRows,
    },
  };
}

async function exportCandidateReviewGroups(body: OperationBody): Promise<unknown> {
  const rows = await readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE) ?? [];
  const query = readCandidateReviewGroupExportQuery(body);
  const filteredRows = applyCandidateReviewGroupQuery(rows, query);

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS) {
    return NextResponse.json(
      {error: `Aday group export ${MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUPS_FILE),
      totalRows: rows.length,
      exportedCount: filteredRows.length,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
    },
    manifest: {
      version: 1,
      type: "candidate-review-group-export",
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      groups: filteredRows,
    },
  };
}

async function exportCandidateReviewGroupDecisionRecommendations(body: OperationBody): Promise<unknown> {
  const manifest = await readJsonOrNull<CandidateReviewGroupDecisionRecommendationManifest>(
    CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE,
  ) ?? {version: 1, type: "candidate-review-group-decision-recommendations", decisions: []};
  const rows = manifest.decisions ?? [];
  const query = readCandidateReviewGroupExportQuery(body);
  const filteredRows = applyCandidateReviewGroupQuery(rows, query);

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS) {
    return NextResponse.json(
      {error: `Review grup karar önerisi ${MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE),
      targetArtifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
      totalRows: rows.length,
      exportedCount: filteredRows.length,
      policyVersion: manifest.policyVersion,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
    },
    manifest: {
      version: 1,
      type: "candidate-review-group-decision-recommendation-export",
      policyVersion: manifest.policyVersion,
      generatedAt: manifest.generatedAt,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      decisions: filteredRows,
    },
  };
}

async function exportCandidateReviewGroupDecisionTemplate(body: OperationBody): Promise<unknown> {
  const rows = await readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE) ?? [];
  const query = readCandidateReviewGroupExportQuery(body);
  const template = readCandidateReviewGroupDecisionTemplate(body);
  const filteredRows = applyCandidateReviewGroupQuery(rows, query);

  if (!CANDIDATE_REVIEW_GROUP_DECISION_STATUSES.has(template.status)) {
    return NextResponse.json(
      {error: "Review grup karar durumu rejected, conflict veya deferred olmalı."},
      {status: 400},
    );
  }

  if (!template.reason) {
    return NextResponse.json({error: "Review grup karar nedeni gerekli."}, {status: 400});
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(template.reviewedAt)) {
    return NextResponse.json({error: "Review grup karar tarihi YYYY-MM-DD olmalı."}, {status: 400});
  }

  if (filteredRows.length > MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS) {
    return NextResponse.json(
      {error: `Review grup karar şablonu ${MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS} satır ile sınırlıdır. Filtreleri daraltın.`},
      {status: 413},
    );
  }

  const decisions = filteredRows.map((group) => ({
    groupId: group.groupId,
    catalogId: group.catalogId,
    sourceGroupFingerprint: getCandidateReviewGroupFingerprint(group),
    status: template.status,
    reason: template.reason,
    reviewedAt: template.reviewedAt,
    reviewedBy: template.reviewedBy,
  }));

  return {
    summary: {
      artifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUP_DECISIONS_FILE),
      sourceArtifactPath: toProjectRelativePath(CANDIDATE_REVIEW_GROUPS_FILE),
      totalRows: rows.length,
      exportedCount: decisions.length,
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      decisionStatus: template.status,
    },
    manifest: {
      version: 1,
      type: "candidate-review-group-decision-template",
      filters: {
        query: query.query,
        status: query.status,
        composer: query.composer,
        priorityGroup: query.priorityGroup,
      },
      decisions,
    },
  };
}

async function importCandidateManifest(body: OperationBody): Promise<unknown> {
  const candidateManifestText = typeof body.candidateManifestText === "string"
    ? body.candidateManifestText
    : typeof body.candidateManifest === "object" && body.candidateManifest !== null
      ? JSON.stringify(body.candidateManifest)
      : "";
  let tempInputFilePath: string | null = null;

  try {
    const tempInput = await writeCandidateManifestInput(candidateManifestText);
    tempInputFilePath = tempInput.filePath;

    const args = ["scripts/import-external-reference-candidates.mjs", "--input", tempInput.relativePath];
    if (body.dryRun) args.push("--dry-run");

    return await runNodeScript(args);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json({error: error.message}, {status: Number(error.status)});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

async function importCandidateReviewGroupDecisionManifest(body: OperationBody): Promise<unknown> {
  const manifestText = typeof body.candidateReviewGroupDecisionManifestText === "string"
    ? body.candidateReviewGroupDecisionManifestText
    : typeof body.candidateReviewGroupDecisionManifest === "object" && body.candidateReviewGroupDecisionManifest !== null
      ? JSON.stringify(body.candidateReviewGroupDecisionManifest)
      : "";
  let tempInputFilePath: string | null = null;

  try {
    const tempInput = await writeCandidateReviewGroupDecisionInput(manifestText);
    tempInputFilePath = tempInput.filePath;

    const args = ["scripts/import-candidate-review-group-decisions.mjs", "--input", tempInput.relativePath];
    if (!body.dryRun) args.push("--write");

    return await runNodeScript(args);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json({error: error.message}, {status: Number(error.status)});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

async function runCurationPayloadAction(
  action: "feedback" | "feedback-batch" | "manual-correction" | "embed-state",
  payload: unknown,
): Promise<unknown> {
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({error: "Kürasyon operasyon girdisi gerekli."}, {status: 400});
  }

  let tempInputFilePath: string | null = null;
  try {
    const tempInput = await writeJsonPayloadInput(payload);
    tempInputFilePath = tempInput.filePath;
    return await runNodeScript(["scripts/manage-source-curation.mjs", action, "--input", tempInput.relativePath]);
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 413) {
      return NextResponse.json({error: error.message}, {status: 413});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

function requiredObjectPayload(value: unknown, label: string): unknown | NextResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({error: `${label} gerekli.`}, {status: 400});
  }

  return value;
}

function requiredArrayPayload(value: unknown, label: string): unknown[] | NextResponse {
  if (!Array.isArray(value) || value.length === 0) {
    return NextResponse.json({error: `${label} gerekli.`}, {status: 400});
  }

  return value;
}

async function runCurationOperation(body: OperationBody): Promise<unknown> {
  if (body.action === "curation-auto-attach") {
    const args = ["scripts/manage-source-curation.mjs", "auto-attach"];
    if (!body.dryRun) args.push("--write");
    return await runNodeScript(args);
  }

  if (body.action === "curation-stats") {
    const args = ["scripts/manage-source-curation.mjs", "stats"];
    if (!body.dryRun) args.push("--write");
    return await runNodeScript(args);
  }

  if (body.action === "curation-validate") {
    return await runNodeScript(["scripts/validate-source-curation.mjs"]);
  }

  if (body.action === "curation-feedback") {
    const feedback = requiredObjectPayload(body.feedback, "Feedback girdisi");
    if (feedback instanceof NextResponse) return feedback;
    return await runCurationPayloadAction("feedback", {feedback});
  }

  if (body.action === "curation-feedback-batch") {
    const feedbackEvents = requiredArrayPayload(body.feedbackEvents, "Toplu feedback girdisi");
    if (feedbackEvents instanceof NextResponse) return feedbackEvents;
    return await runCurationPayloadAction("feedback-batch", {feedbackEvents});
  }

  if (body.action === "source-terminal-feedback") {
    const sourceTerminalFeedback = requiredObjectPayload(body.sourceTerminalFeedback, "Terminal kaynak feedback girdisi");
    if (sourceTerminalFeedback instanceof NextResponse) return sourceTerminalFeedback;
    return await recordSourceTerminalFeedback(sourceTerminalFeedback);
  }

  if (body.action === "curation-manual-correction") {
    const manualCorrection = requiredObjectPayload(body.manualCorrection, "Manuel düzeltme girdisi");
    if (manualCorrection instanceof NextResponse) return manualCorrection;
    return await runCurationPayloadAction("manual-correction", {manualCorrection});
  }

  const embedState = requiredObjectPayload(body.embedState, "Embed state girdisi");
  if (embedState instanceof NextResponse) return embedState;
  return await runCurationPayloadAction("embed-state", {embedState});
}

async function readOperationBody(request: Request): Promise<OperationBody | NextResponse> {
  try {
    return (await request.json()) as OperationBody;
  } catch {
    return NextResponse.json({error: "Geçersiz JSON gövdesi."}, {status: 400});
  }
}

async function runExclusiveOperation(callback: () => Promise<NextResponse>): Promise<NextResponse> {
  if (operationInFlight) {
    return NextResponse.json(
      {error: "Başka bir harici kaynak operasyonu devam ediyor. Bitince tekrar dene."},
      {status: 409},
    );
  }

  operationInFlight = true;
  try {
    return await callback();
  } finally {
    operationInFlight = false;
  }
}

export async function GET(request: Request) {
  try {
    const accessError = getAccessError(request);
    if (accessError) return accessError;

    return NextResponse.json(await getExternalReferenceState(request));
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Harici kaynak durumu okunamadı."},
      {status: 500},
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessError = getAccessError(request);
    if (accessError) return accessError;

    const bodyResult = await readOperationBody(request);
    if (bodyResult instanceof NextResponse) return bodyResult;

    const body = bodyResult;
    if (!isExternalReferenceAction(body.action)) {
      return NextResponse.json({error: "Geçersiz operasyon."}, {status: 400});
    }

    return await runExclusiveOperation(async () => {
      let result: unknown;

      if (body.action === "stage") {
        result = await stageSources(body);
      } else if (body.action === "map") {
        result = await runNodeScript(["scripts/map-external-source-inbox.mjs"]);
      } else if (body.action === "sync") {
        result = await runNodeScript(["scripts/map-external-source-inbox.mjs", "--write"]);
      } else if (body.action === "audit") {
        result = await runNodeScript(["scripts/audit-external-reference-coverage.mjs"]);
      } else if (body.action === "candidate-export") {
        result = await exportCandidateManifest();
      } else if (body.action === "candidate-import") {
        result = await importCandidateManifest(body);
      } else if (body.action === "candidate-review-export") {
        result = await exportCandidateReviewQueue(body);
      } else if (body.action === "candidate-review-group-export") {
        result = await exportCandidateReviewGroups(body);
      } else if (body.action === "candidate-review-group-decision-recommendation-export") {
        result = await exportCandidateReviewGroupDecisionRecommendations(body);
      } else if (body.action === "candidate-review-group-decision-template-export") {
        result = await exportCandidateReviewGroupDecisionTemplate(body);
      } else if (body.action === "candidate-review-group-decision-import") {
        result = await importCandidateReviewGroupDecisionManifest(body);
      } else {
        result = await runCurationOperation(body);
      }

      if (result instanceof NextResponse) return result;

      return NextResponse.json({
        action: body.action,
        result,
        state: await getExternalReferenceState(request),
      });
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Harici kaynak operasyonu başarısız."},
      {status: 500},
    );
  }
}
