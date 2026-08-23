import "server-only";

import path from "node:path";
import {readFile} from "node:fs/promises";
import {getCatalogMetadata} from "../curation-state";
import type {
  BacklogQuery,
  CandidateReviewGroupQuery,
  CandidateReviewQuery,
  CurationBacklogRow,
} from "../curation-query";
import * as CFG from "../route-config";
import type {
  BulkCandidateManifest,
  OperationBody,
  SourceTerminalDecisionManifest,
} from "../route-types";

function toProjectRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

export async function readJsonOrNull<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function getCountByStatus(mappings: Array<{status?: string}> | undefined, status: string): number {
  return mappings?.filter((mapping) => mapping.status === status).length ?? 0;
}

export function enrichBacklogRow(row: CurationBacklogRow): CurationBacklogRow {
  const catalog = getCatalogMetadata(row.catalogId);
  if (!catalog) return row;

  return {
    catalogId: row.catalogId ?? catalog.id,
    makam: row.makam ?? catalog.makam,
    form: row.form ?? catalog.form,
    usul: row.usul ?? catalog.usul,
    title: row.title ?? catalog.title,
    composer: row.composer ?? catalog.composer,
    availableFormats: row.availableFormats ?? catalog.formats.join("|"),
    ...row,
  };
}

function parseBoundedInteger(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseNonNegativeInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeFilterValue(value: string | null): string {
  if (!value || value === "all") return "";
  return value.trim();
}

function normalizeBodyFilterValue(value: unknown): string {
  return typeof value === "string" ? normalizeFilterValue(value) : "";
}

export function readBacklogQuery(request: Request): BacklogQuery {
  const params = new URL(request.url).searchParams;
  const scope = params.get("backlogScope");

  return {
    limit: parseBoundedInteger(params.get("backlogLimit"), CFG.DEFAULT_BACKLOG_LIMIT, CFG.MAX_BACKLOG_LIMIT),
    offset: parseNonNegativeInteger(params.get("backlogOffset"), 0),
    scope: scope === "active" || scope === "all" ? scope : "missing",
    query: normalizeFilterValue(params.get("q")),
    makam: normalizeFilterValue(params.get("makam")),
    form: normalizeFilterValue(params.get("form")),
    usul: normalizeFilterValue(params.get("usul")),
    composer: normalizeFilterValue(params.get("composer")),
    priorityGroup: normalizeFilterValue(params.get("priorityGroup")),
  };
}

export function readCandidateReviewQuery(request: Request): CandidateReviewQuery {
  const params = new URL(request.url).searchParams;

  return {
    limit: parseBoundedInteger(params.get("candidateLimit"), CFG.DEFAULT_CANDIDATE_LIMIT, CFG.MAX_CANDIDATE_LIMIT),
    offset: parseNonNegativeInteger(params.get("candidateOffset"), 0),
    query: normalizeFilterValue(params.get("candidateQ") ?? params.get("q")),
    status: normalizeFilterValue(params.get("candidateStatus")),
    profileId: normalizeFilterValue(params.get("candidateProfile")),
    provider: normalizeFilterValue(params.get("candidateProvider")),
    composer: normalizeFilterValue(params.get("candidateComposer") ?? params.get("composer")),
  };
}

export function readCandidateReviewGroupQuery(request: Request): CandidateReviewGroupQuery {
  const params = new URL(request.url).searchParams;

  return {
    limit: parseBoundedInteger(params.get("groupLimit"), CFG.DEFAULT_CANDIDATE_GROUP_LIMIT, CFG.MAX_CANDIDATE_GROUP_LIMIT),
    offset: parseNonNegativeInteger(params.get("groupOffset"), 0),
    query: normalizeFilterValue(params.get("groupQ") ?? params.get("q")),
    status: normalizeFilterValue(params.get("groupStatus")),
    composer: normalizeFilterValue(params.get("groupComposer") ?? params.get("composer")),
    priorityGroup: normalizeFilterValue(params.get("groupPriorityGroup") ?? params.get("priorityGroup")),
  };
}

export function readCandidateReviewExportQuery(body: OperationBody): CandidateReviewQuery {
  const query = body.candidateReviewQuery ?? {};

  return {
    limit: CFG.MAX_CANDIDATE_REVIEW_EXPORT_ROWS,
    offset: 0,
    query: normalizeBodyFilterValue(query.query),
    status: normalizeBodyFilterValue(query.status),
    profileId: normalizeBodyFilterValue(query.profileId),
    provider: normalizeBodyFilterValue(query.provider),
    composer: normalizeBodyFilterValue(query.composer),
  };
}

export function readCandidateReviewGroupExportQuery(body: OperationBody): CandidateReviewGroupQuery {
  const query = body.candidateReviewGroupQuery ?? {};

  return {
    limit: CFG.MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS,
    offset: 0,
    query: normalizeBodyFilterValue(query.query),
    status: normalizeBodyFilterValue(query.status),
    composer: normalizeBodyFilterValue(query.composer),
    priorityGroup: normalizeBodyFilterValue(query.priorityGroup),
  };
}

function normalizeDecisionTemplateValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readCandidateReviewGroupDecisionTemplate(body: OperationBody): {
  status: string;
  reason: string;
  reviewedAt: string;
  reviewedBy: string;
} {
  const template = body.candidateReviewGroupDecisionTemplate ?? {};
  const status = normalizeDecisionTemplateValue(template.status);
  const reason = normalizeDecisionTemplateValue(template.reason);
  const reviewedAt = normalizeDecisionTemplateValue(template.reviewedAt);
  const reviewedBy = normalizeDecisionTemplateValue(template.reviewedBy) || "local-operator";

  return {status, reason, reviewedAt, reviewedBy};
}

export function summarizeBulkCandidateManifest(manifest: BulkCandidateManifest | null) {
  const candidates = Array.isArray(manifest?.candidates) ? manifest.candidates : [];
  const statusCounts = candidates.reduce<Record<string, number>>((accumulator, candidate) => {
    const status = String(candidate.status ?? "unknown");
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    artifactPath: toProjectRelativePath(CFG.BULK_CANDIDATES_FILE),
    candidateCount: candidates.length,
    acceptedCount: statusCounts.accepted ?? 0,
    needsReviewCount: statusCounts["needs-review"] ?? 0,
    rejectedCount: statusCounts.rejected ?? 0,
    conflictCount: statusCounts.conflict ?? 0,
    statusCounts,
  };
}

export function summarizeTerminalDecisionManifest(manifest: SourceTerminalDecisionManifest | null) {
  const entries = manifest?.entries ?? [];
  const statusCounts = manifest?.summary?.statusCounts ?? entries.reduce<Record<string, number>>((counts, entry) => {
    const status = String(entry.status ?? "unknown");
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

  return {
    artifactPath: toProjectRelativePath(CFG.SOURCE_TERMINAL_DECISIONS_FILE),
    generatedAt: manifest?.generatedAt ?? null,
    terminalDecisionGroupCount: manifest?.summary?.terminalDecisionGroupCount ?? entries.length,
    disputedCount: statusCounts.disputed ?? 0,
    verifiedUnavailableCount: statusCounts["verified-unavailable"] ?? 0,
    deferredCount: statusCounts.deferred ?? 0,
    directAutoAttachCount: manifest?.summary?.directAutoAttachCount ?? 0,
    mediaDownloadCount: manifest?.summary?.mediaDownloadCount ?? 0,
    statusCounts,
  };
}

// Keep internal helper exported for state.ts if needed; not part of public API but re-exported via barrel
export {getCountByStatus, toProjectRelativePath};
