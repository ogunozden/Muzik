export function buildNegativeCacheEntry(candidate) {
  return {
    cacheKey: candidate.discoveryId,
    catalogId: candidate.catalogId,
    providerProfileId: candidate.providerProfileId,
    status: candidate.status,
    reason: "dry-run-search-lead-has-no-validated-source-evidence",
    nextAction: "supply validated HTTPS source URL or enable provider metadata connector with cache/rate-limit",
  };
}
