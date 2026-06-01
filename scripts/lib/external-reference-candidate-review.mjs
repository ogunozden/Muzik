import {getCandidateReviewGroupFingerprint} from "../../src/data/references/candidate-review-group-fingerprint.mjs";

export const CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATION_VERSION = "candidate-review-group-decision-recommendations-v1";
export const CANDIDATE_REVIEW_BATCH_PLAN_VERSION = "candidate-review-batch-plan-v1";
export const DEFAULT_CANDIDATE_REVIEW_PACKET_SIZE = 25;

function buildProfileSearchQuery(row, profile) {
  const suffix = profile.provider === "youtube" ? "icra kayıt" : "nota";
  return [row.makam, row.form, row.usul, row.title, row.composer, suffix].filter((part) => part && part !== "-").join(" ");
}

function buildProfileSearchUrl(profile, query) {
  return String(profile.searchUrlTemplate).replace("{query}", encodeURIComponent(query));
}

function getCandidateReviewStatus(row) {
  if (row.curationDecisionStatus === "source-mismatch") return "conflict";
  return "needs-review";
}

function getCandidateReviewReason(row) {
  if (row.curationDecisionStatus) {
    return row.curationDecisionReason || row.curationDecisionStatus;
  }

  return "provider-profile-search-candidate";
}

function getCandidateReviewScoreDetails(row, profile) {
  const trustWeight = Number(profile.trustWeight ?? 0.5);
  let score = Math.round(trustWeight * 70);
  const reasons = [`profile-trust:${trustWeight.toFixed(2)}`];
  if (profile.metadataStrategy && profile.metadataStrategy !== "none") {
    score += profile.metadataStrategy === "oembed" ? 6 : 4;
    reasons.push(`metadata-strategy:${profile.metadataStrategy}`);
  }
  if (row.hasPdf) {
    score += 8;
    reasons.push("catalog-format:pdf");
  }
  if (row.hasMusicXml) {
    score += 6;
    reasons.push("catalog-format:musicxml");
  }
  if (row.hasTxt) {
    score += 4;
    reasons.push("catalog-format:txt");
  }
  if (row.title && row.title !== "-") {
    score += 6;
    reasons.push("catalog-field:title");
  }
  if (row.composer && row.composer !== "-") {
    score += 6;
    reasons.push("catalog-field:composer");
  }
  if (row.usul && row.usul !== "-") {
    reasons.push("catalog-field:usul");
  }
  if (row.deferredFromNextBatch) {
    score -= 20;
    reasons.push("decision:deferred-penalty");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

function getCandidateReviewLevel(score) {
  if (score >= 80) return "medium";
  if (score >= 55) return "low";
  return "needs-context";
}

export function buildCandidateReviewRows(backlogRows, researchProfiles) {
  const missingRows = backlogRows.filter((row) => row.missingCuratedReference);
  const rows = [];

  for (const row of missingRows) {
    for (const profile of researchProfiles) {
      const searchQuery = buildProfileSearchQuery(row, profile);
      const scoreDetails = getCandidateReviewScoreDetails(row, profile);
      const queryFields = ["makam", "form", "usul", "title", "composer"].filter((field) => row[field] && row[field] !== "-");

      rows.push({
        candidateId: `${row.catalogId}:${profile.id}:search`,
        catalogId: row.catalogId,
        status: getCandidateReviewStatus(row),
        statusReason: getCandidateReviewReason(row),
        profileId: profile.id,
        profileLabel: profile.label,
        provider: profile.provider ?? "score",
        trustWeight: profile.trustWeight ?? 0,
        metadataStrategy: profile.metadataStrategy ?? "none",
        reviewConfidenceScore: scoreDetails.score,
        reviewConfidenceLevel: getCandidateReviewLevel(scoreDetails.score),
        scoreReasons: scoreDetails.reasons,
        queryFields,
        searchQuery,
        searchUrl: buildProfileSearchUrl(profile, searchQuery),
        makam: row.makam,
        form: row.form,
        usul: row.usul,
        title: row.title,
        composer: row.composer,
        priorityGroup: row.priorityGroup,
        deferredFromNextBatch: row.deferredFromNextBatch,
        curationDecisionStatus: row.curationDecisionStatus,
      });
    }
  }

  return rows.sort((left, right) => (
    left.status.localeCompare(right.status, "en") ||
    right.reviewConfidenceScore - left.reviewConfidenceScore ||
    left.profileId.localeCompare(right.profileId, "en") ||
    left.catalogId.localeCompare(right.catalogId, "en")
  ));
}

function applyCandidateReviewGroupDecisionStatus(group, decision) {
  if (!decision) return group;

  return {
    ...group,
    status: decision.status,
    reviewAction: `batch-decision-${decision.status}`,
    decisionReason: decision.reason,
    decisionReviewedAt: decision.reviewedAt,
    decisionReviewedBy: decision.reviewedBy,
  };
}

function getCandidateReviewGroupDecisionRecommendation(group) {
  if (group.decisionReviewedAt || String(group.reviewAction ?? "").startsWith("batch-decision-")) {
    return null;
  }

  if (group.status === "conflict") {
    return {
      status: "conflict",
      reason: "batch-recommend-source-mismatch-conflict",
      recommendationRule: "generated-conflict-review-group",
    };
  }

  if (group.deferredFromNextBatch) {
    return {
      status: "deferred",
      reason: "batch-recommend-existing-curation-deferred",
      recommendationRule: "existing-curation-decision-deferred-from-next-batch",
    };
  }

  return null;
}

export function buildCandidateReviewGroupDecisionRecommendations(candidateReviewGroups, reviewedAt) {
  const decisions = [];

  for (const group of candidateReviewGroups) {
    const recommendation = getCandidateReviewGroupDecisionRecommendation(group);
    if (!recommendation) continue;

    decisions.push({
      groupId: group.groupId,
      catalogId: group.catalogId,
      sourceGroupFingerprint: getCandidateReviewGroupFingerprint(group),
      status: recommendation.status,
      reason: recommendation.reason,
      reviewedAt,
      reviewedBy: "batch-policy",
      recommendationRule: recommendation.recommendationRule,
      sourceGroupStatus: group.status,
      highestReviewConfidenceScore: group.highestReviewConfidenceScore,
      candidateCount: group.candidateCount,
      profileCount: group.profileCount,
      makam: group.makam,
      form: group.form,
      usul: group.usul,
      title: group.title,
      composer: group.composer,
      priorityGroup: group.priorityGroup,
    });
  }

  return decisions.sort((left, right) => (
    left.status.localeCompare(right.status, "en") ||
    left.catalogId.localeCompare(right.catalogId, "en")
  ));
}

export function buildCandidateReviewGroups(candidateReviewRows, groupDecisionsByCatalogId = new Map()) {
  const grouped = candidateReviewRows.reduce((groups, row) => {
    const catalogId = row.catalogId ?? "";
    if (!groups.has(catalogId)) {
      groups.set(catalogId, []);
    }
    groups.get(catalogId).push(row);
    return groups;
  }, new Map());

  return Array.from(grouped, ([catalogId, rows]) => {
    const firstRow = rows[0] ?? {};
    const profiles = Array.from(new Set(rows.map((row) => row.profileId).filter(Boolean))).sort((left, right) => left.localeCompare(right, "en"));
    const providers = Array.from(new Set(rows.map((row) => row.provider).filter(Boolean))).sort((left, right) => left.localeCompare(right, "en"));
    const confidenceLevels = Array.from(new Set(rows.map((row) => row.reviewConfidenceLevel).filter(Boolean))).sort((left, right) => left.localeCompare(right, "en"));
    const status = rows.some((row) => row.status === "conflict") ? "conflict" : "needs-review";
    const highestReviewConfidenceScore = Math.max(...rows.map((row) => Number(row.reviewConfidenceScore ?? 0)));

    const group = {
      groupId: `${catalogId}:review-group`,
      catalogId,
      status,
      reviewAction: status === "conflict" ? "resolve-conflict-before-import" : "review-provider-candidates",
      candidateCount: rows.length,
      profileCount: profiles.length,
      profiles,
      providers,
      confidenceLevels,
      highestReviewConfidenceScore,
      deferredFromNextBatch: rows.some((row) => row.deferredFromNextBatch === true),
      makam: firstRow.makam,
      form: firstRow.form,
      usul: firstRow.usul,
      title: firstRow.title,
      composer: firstRow.composer,
      priorityGroup: firstRow.priorityGroup,
    };

    return applyCandidateReviewGroupDecisionStatus(group, groupDecisionsByCatalogId.get(catalogId));
  }).sort((left, right) => (
    left.status.localeCompare(right.status, "en") ||
    right.highestReviewConfidenceScore - left.highestReviewConfidenceScore ||
    left.catalogId.localeCompare(right.catalogId, "en")
  ));
}

function summarizeByValue(rows, field) {
  const counts = rows.reduce((summary, row) => {
    const value = String(row[field] ?? "unknown");
    summary.set(value, (summary.get(value) ?? 0) + 1);
    return summary;
  }, new Map());

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "en"));
}

function chunkRows(rows, chunkSize) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  return chunks;
}

export function buildCandidateReviewBatchPlan(candidateReviewGroups, candidateReviewRows, {
  generatedAt,
  packetSize = DEFAULT_CANDIDATE_REVIEW_PACKET_SIZE,
  reviewedAt = "1970-01-01",
} = {}) {
  const rowsByCatalogId = candidateReviewRows.reduce((rowsById, row) => {
    const rows = rowsById.get(row.catalogId) ?? [];
    rows.push(row);
    rowsById.set(row.catalogId, rows);
    return rowsById;
  }, new Map());
  const activeGroups = candidateReviewGroups
    .filter((group) => group.status === "needs-review" && group.deferredFromNextBatch !== true)
    .sort((left, right) => (
      right.highestReviewConfidenceScore - left.highestReviewConfidenceScore ||
      left.priorityGroup.localeCompare(right.priorityGroup, "en") ||
      left.catalogId.localeCompare(right.catalogId, "en")
    ));
  const packets = chunkRows(activeGroups, packetSize).map((groups, index) => {
    const catalogIds = groups.map((group) => group.catalogId);
    const packetRows = groups.flatMap((group) => rowsByCatalogId.get(group.catalogId) ?? []);

    return {
      packetId: `candidate-review-packet-${String(index + 1).padStart(4, "0")}`,
      sequence: index + 1,
      status: "needs-review",
      reviewAction: "batch-review-provider-candidates",
      groupCount: groups.length,
      candidateCount: packetRows.length,
      profileCount: new Set(packetRows.map((row) => row.profileId)).size,
      highestReviewConfidenceScore: Math.max(...groups.map((group) => group.highestReviewConfidenceScore)),
      profiles: Array.from(new Set(packetRows.map((row) => row.profileId))).sort((left, right) => left.localeCompare(right, "en")),
      providers: Array.from(new Set(packetRows.map((row) => row.provider))).sort((left, right) => left.localeCompare(right, "en")),
      confidenceLevels: summarizeByValue(packetRows, "reviewConfidenceLevel"),
      priorityGroups: summarizeByValue(groups, "priorityGroup"),
      makamCounts: summarizeByValue(groups, "makam").slice(0, 10),
      formCounts: summarizeByValue(groups, "form").slice(0, 10),
      catalogIds,
      decisionTemplate: {
        version: 1,
        type: "candidate-review-group-decision-template",
        policy:
          "Packet decisions may reject, defer, or mark conflict review groups; accepted sources must be imported through validated bulk candidate manifests.",
        decisions: groups.map((group) => ({
          groupId: group.groupId,
          catalogId: group.catalogId,
          sourceGroupFingerprint: getCandidateReviewGroupFingerprint(group),
          status: "rejected",
          reason: "batch-reviewed-no-safe-source",
          reviewedAt,
          reviewedBy: "local-operator",
        })),
      },
    };
  });

  return {
    version: 1,
    type: "candidate-review-batch-plan",
    policyVersion: CANDIDATE_REVIEW_BATCH_PLAN_VERSION,
    generatedAt,
    summary: {
      totalGroups: candidateReviewGroups.length,
      candidateReviewQueueEntries: candidateReviewRows.length,
      activeGroupCount: activeGroups.length,
      conflictGroupCount: candidateReviewGroups.filter((group) => group.status === "conflict").length,
      deferredGroupCount: candidateReviewGroups.filter((group) => group.deferredFromNextBatch === true).length,
      rejectedGroupCount: candidateReviewGroups.filter((group) => group.status === "rejected").length,
      packetSize,
      packetCount: packets.length,
      plannedGroupCount: packets.reduce((total, packet) => total + packet.groupCount, 0),
      plannedCandidateCount: packets.reduce((total, packet) => total + packet.candidateCount, 0),
      safetyPolicy:
        "Review packets do not create accepted references and do not carry source URLs; they only group review candidates for operator batch decisions.",
    },
    packets,
  };
}
