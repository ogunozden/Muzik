import type {BacklogFacet} from "@/features/references/curation-dashboard-types";

export const ALL_FILTER_VALUE = "all";

export function normalizeFilterText(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : "";
}

export function matchesQuery(values: unknown[], normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return values.some((value) => normalizeFilterText(value).includes(normalizedQuery));
}

export function getUniqueOptions(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((first, second) => first.localeCompare(second, "tr-TR"));
}

export function getFacetValues(facets: BacklogFacet[] | undefined): string[] {
  return (facets ?? []).map((facet) => facet.value).filter(Boolean);
}
