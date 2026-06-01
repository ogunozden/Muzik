import {createHash} from "node:crypto";

export const SYMBTR_LAYOUT_CANDIDATE_FINGERPRINT_ALGORITHM = "sha256:symbtr-layout-candidate-geometry-v1";

function stableCandidate(candidate) {
  return {
    rowIndex: candidate?.rowIndex ?? null,
    candidateIndexInRow: candidate?.candidateIndexInRow ?? null,
    x: candidate?.x ?? null,
    y: candidate?.y ?? null,
    width: candidate?.width ?? null,
    height: candidate?.height ?? null,
    leftPercent: candidate?.leftPercent ?? null,
    topPercent: candidate?.topPercent ?? null,
    widthPercent: candidate?.widthPercent ?? null,
    heightPercent: candidate?.heightPercent ?? null,
    confidence: candidate?.confidence ?? null,
  };
}

export function getSymbTrLayoutCandidateFingerprint({catalogId, layoutData, layoutEntry}) {
  const payload = {
    algorithm: SYMBTR_LAYOUT_CANDIDATE_FINGERPRINT_ALGORITHM,
    catalogId,
    layoutSchemaVersion: layoutData?.schemaVersion ?? null,
    sourceLayoutGeneratedAt: layoutData?.generatedAt ?? null,
    sourceArchiveMemberPath: layoutEntry?.source?.archiveMemberPath ?? null,
    pageSize: {
      width: layoutEntry?.pageSize?.width ?? null,
      height: layoutEntry?.pageSize?.height ?? null,
    },
    candidates: (Array.isArray(layoutEntry?.measureCandidates) ? layoutEntry.measureCandidates : [])
      .map(stableCandidate),
  };

  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}
