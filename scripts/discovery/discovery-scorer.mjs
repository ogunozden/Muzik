export function scoreDiscoveryCandidate({provider, group, policy}) {
  const sp = policy?.scoringParams ?? {};
  const trustWeight = Number(provider.trustWeight ?? provider.policy?.trustWeight ?? sp.defaultTrustWeight ?? 0.5);
  const base = Math.round((trustWeight || sp.defaultTrustWeight ?? 0.5) * (sp.baseWeightMultiplier ?? 60));
  const formatBonus = group.priorityGroup === "pdf-and-musicxml" ? (sp.bonusPdfAndMusicxml ?? 10) : group.priorityGroup === "pdf-only" ? (sp.bonusPdfOnly ?? 6) : 0;
  const statusPenalty = group.status === "conflict" ? (sp.penaltyConflict ?? 30) : group.status === "deferred" ? (sp.penaltyDeferred ?? 20) : 0;
  const maxScore = sp.maxDiscoveryScore ?? 89;
  const score = Math.max(0, Math.min(maxScore, base + formatBonus - statusPenalty));
  const bucketMedium = sp.bucketMedium ?? 80;
  const bucketLow = sp.bucketLow ?? 60;

  return {
    score,
    bucket: score >= bucketMedium ? "medium" : score >= bucketLow ? "low" : "needs-context",
    reasons: [
      "provider-profile-search-lead",
      "no-validated-source-url-yet",
      "no-provider-metadata-evidence-yet",
      group.status === "conflict" ? "group-conflict-decision" : "",
      group.status === "deferred" ? "group-deferred-decision" : "",
    ].filter(Boolean),
  };
}

export function classifyDiscoveryCandidate({group, score, acceptedThreshold}) {
  if (group.status === "conflict") return "conflict";
  if (group.status === "deferred") return "deferred";
  return score >= acceptedThreshold ? "accepted-ready" : "needs-review";
}
