export function getEnabledDiscoveryProviders(policy, selectedProviderIds = []) {
  const selected = new Set(selectedProviderIds.filter(Boolean));
  const providers = Array.isArray(policy?.providers) ? policy.providers : [];

  return providers.filter((provider) => {
    if (provider.enabled === false) return false;
    if (provider.mode === "verification-only" && provider.discoverBySearch === false) return selected.has(provider.id);
    return selected.size === 0 || selected.has(provider.id);
  });
}

export function getResearchProfileById(researchProfiles) {
  return new Map((researchProfiles?.profiles ?? []).map((profile) => [profile.id, profile]));
}
