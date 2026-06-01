import {createHash} from "node:crypto";

export const CANDIDATE_REVIEW_GROUP_FINGERPRINT_ALGORITHM = "sha256:external-reference-candidate-review-group-v1";

function stableGroup(group) {
  return {
    groupId: group?.groupId ?? null,
    catalogId: group?.catalogId ?? null,
    status: group?.status ?? null,
    reviewAction: group?.reviewAction ?? null,
    candidateCount: group?.candidateCount ?? null,
    profileCount: group?.profileCount ?? null,
    profiles: Array.isArray(group?.profiles) ? [...group.profiles].sort() : [],
    providers: Array.isArray(group?.providers) ? [...group.providers].sort() : [],
    confidenceLevels: Array.isArray(group?.confidenceLevels) ? [...group.confidenceLevels].sort() : [],
    highestReviewConfidenceScore: group?.highestReviewConfidenceScore ?? null,
    deferredFromNextBatch: group?.deferredFromNextBatch === true,
    makam: group?.makam ?? null,
    form: group?.form ?? null,
    usul: group?.usul ?? null,
    title: group?.title ?? null,
    composer: group?.composer ?? null,
    priorityGroup: group?.priorityGroup ?? null,
  };
}

export function getCandidateReviewGroupFingerprint(group) {
  return createHash("sha256")
    .update(JSON.stringify({
      algorithm: CANDIDATE_REVIEW_GROUP_FINGERPRINT_ALGORITHM,
      group: stableGroup(group),
    }))
    .digest("hex");
}
