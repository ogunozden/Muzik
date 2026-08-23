import "server-only";

import {NextResponse} from "next/server";

import {getCandidateReviewGroupFingerprint} from "@/data/references/candidate-review-group-fingerprint.mjs";
import type {CandidateReviewGroup, CandidateReviewRow} from "../curation-query";
import {applyCandidateReviewGroupQuery, applyCandidateReviewQuery} from "../curation-query";
import {
  BULK_CANDIDATES_FILE,
  CANDIDATE_REVIEW_GROUPS_FILE,
  CANDIDATE_REVIEW_GROUP_DECISIONS_FILE,
  CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE,
  CANDIDATE_REVIEW_GROUP_DECISION_STATUSES,
  CANDIDATE_REVIEW_QUEUE_FILE,
  MAX_CANDIDATE_REVIEW_EXPORT_ROWS,
  MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS,
  MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS,
} from "../route-config";
import {
  readCandidateReviewExportQuery,
  readCandidateReviewGroupDecisionTemplate,
  readCandidateReviewGroupExportQuery,
  readJsonOrNull,
  summarizeBulkCandidateManifest,
} from "../route-state";
import type {
  BulkCandidateManifest,
  CandidateReviewGroupDecisionRecommendationManifest,
  OperationBody,
} from "../route-types";
import {toProjectRelativePath} from "./paths";

export async function exportCandidateManifest(): Promise<unknown> {
  const manifest = (await readJsonOrNull<BulkCandidateManifest>(BULK_CANDIDATES_FILE)) ?? {
    version: 1,
    candidates: [],
  };

  return {
    summary: summarizeBulkCandidateManifest(manifest),
    manifest,
  };
}

export async function exportCandidateReviewQueue(body: OperationBody): Promise<unknown> {
  const rows = (await readJsonOrNull<CandidateReviewRow[]>(CANDIDATE_REVIEW_QUEUE_FILE)) ?? [];
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

export async function exportCandidateReviewGroups(body: OperationBody): Promise<unknown> {
  const rows = (await readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE)) ?? [];
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

export async function exportCandidateReviewGroupDecisionRecommendations(
  body: OperationBody,
): Promise<unknown> {
  const manifest = (await readJsonOrNull<CandidateReviewGroupDecisionRecommendationManifest>(
    CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE,
  )) ?? {version: 1, type: "candidate-review-group-decision-recommendations", decisions: []};
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

export async function exportCandidateReviewGroupDecisionTemplate(body: OperationBody): Promise<unknown> {
  const rows = (await readJsonOrNull<CandidateReviewGroup[]>(CANDIDATE_REVIEW_GROUPS_FILE)) ?? [];
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
