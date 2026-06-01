export function scoreDiscoveryCandidate({provider, group}) {
  const trustWeight = Number(provider.trustWeight ?? provider.policy?.trustWeight ?? 0);
  const base = Math.round((trustWeight || 0.5) * 60);
  const formatBonus = group.priorityGroup === "pdf-and-musicxml" ? 10 : group.priorityGroup === "pdf-only" ? 6 : 0;
  const statusPenalty = group.status === "conflict" ? 30 : group.status === "deferred" ? 20 : 0;
  const score = Math.max(0, Math.min(89, base + formatBonus - statusPenalty));

  return {
    score,
    bucket: score >= 80 ? "medium" : score >= 60 ? "low" : "needs-context",
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
