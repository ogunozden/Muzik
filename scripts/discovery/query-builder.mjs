import {normalizeText} from "../lib/external-source-intake.mjs";

export function humanizeCatalogSegment(value) {
  return String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("tr-TR"));
}

export function buildCatalogSearchQuery(entry) {
  return [
    humanizeCatalogSegment(entry.makam),
    humanizeCatalogSegment(entry.form),
    humanizeCatalogSegment(entry.usul),
    humanizeCatalogSegment(entry.title),
    humanizeCatalogSegment(entry.composer),
  ].filter((part) => part && part !== "-").join(" ");
}

export function buildProviderSearchUrl(profile, query) {
  const template = String(profile.searchUrlTemplate ?? "");
  if (template.includes("{query}")) {
    return template.replace("{query}", encodeURIComponent(query));
  }

  const url = new URL(String(profile.baseUrl ?? "https://example.com"));
  url.searchParams.set("q", query);
  return url.toString();
}

export function buildDiscoveryIdentity(catalogId, providerId, query) {
  return `${catalogId}:${providerId}:${normalizeText(query).replace(/\s+/g, "-")}`;
}
