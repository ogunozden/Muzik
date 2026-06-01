export interface CurationBacklogRow {
  catalogId?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  availableFormats?: string;
  hasPdf?: boolean;
  hasMusicXml?: boolean;
  hasTxt?: boolean;
  hasCuratedReference?: boolean;
  missingCuratedReference?: boolean;
  curationDecisionStatus?: string;
  curationDecisionReason?: string;
  curationDecisionReviewedAt?: string;
  deferredFromNextBatch?: boolean;
  priorityGroup?: string;
  curationPriorityScore?: number;
  scoreSearchQuery?: string;
  scoreSearchUrl?: string;
  scoreSourceHintQueries?: string;
  scoreSourceHintUrls?: string;
  recordingSearchQuery?: string;
  recordingSearchUrl?: string;
}

export interface BacklogQuery {
  limit: number;
  offset: number;
  scope: "missing" | "active" | "all";
  query: string;
  makam: string;
  form: string;
  usul: string;
  composer: string;
  priorityGroup: string;
}

interface BacklogFacet {
  value: string;
  count: number;
}

export interface CandidateReviewQuery {
  limit: number;
  offset: number;
  query: string;
  status: string;
  profileId: string;
  provider: string;
  composer: string;
}

export interface CandidateReviewGroupQuery {
  limit: number;
  offset: number;
  query: string;
  status: string;
  composer: string;
  priorityGroup: string;
}

export interface CandidateReviewRow {
  candidateId?: string;
  catalogId?: string;
  status?: string;
  statusReason?: string;
  profileId?: string;
  profileLabel?: string;
  provider?: string;
  trustWeight?: number;
  reviewConfidenceScore?: number;
  reviewConfidenceLevel?: string;
  searchQuery?: string;
  searchUrl?: string;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  priorityGroup?: string;
  deferredFromNextBatch?: boolean;
  curationDecisionStatus?: string;
}

export interface CandidateReviewGroup {
  groupId?: string;
  catalogId?: string;
  status?: string;
  reviewAction?: string;
  candidateCount?: number;
  profileCount?: number;
  profiles?: string[];
  providers?: string[];
  confidenceLevels?: string[];
  highestReviewConfidenceScore?: number;
  deferredFromNextBatch?: boolean;
  makam?: string;
  form?: string;
  usul?: string;
  title?: string;
  composer?: string;
  priorityGroup?: string;
  decisionReason?: string;
  decisionReviewedAt?: string;
  decisionReviewedBy?: string;
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("tr-TR");
}

function rowMatchesQuery(row: CurationBacklogRow, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);

  return [
    row.catalogId,
    row.makam,
    row.form,
    row.usul,
    row.title,
    row.composer,
    row.priorityGroup,
    row.curationDecisionStatus,
  ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

export function isMissingBacklogRow(row: CurationBacklogRow): boolean {
  return row.missingCuratedReference !== false && row.hasCuratedReference !== true;
}

export function applyBacklogQuery(rows: CurationBacklogRow[], query: BacklogQuery): CurationBacklogRow[] {
  const scopedRows = rows.filter((row) => {
    if (query.scope === "all") return true;
    if (!isMissingBacklogRow(row)) return false;
    return query.scope === "active" ? row.deferredFromNextBatch !== true : true;
  });

  return scopedRows.filter((row) => {
    if (query.makam && row.makam !== query.makam) return false;
    if (query.form && row.form !== query.form) return false;
    if (query.usul && row.usul !== query.usul) return false;
    if (query.composer && row.composer !== query.composer) return false;
    if (query.priorityGroup && row.priorityGroup !== query.priorityGroup) return false;
    return rowMatchesQuery(row, query.query);
  });
}

export function clampBacklogOffset(offset: number, total: number, limit: number): number {
  if (total === 0) return 0;
  return Math.min(offset, Math.floor((total - 1) / limit) * limit);
}

function summarizeBacklogFacet(rows: CurationBacklogRow[], field: keyof CurationBacklogRow): BacklogFacet[] {
  const counts = rows.reduce((accumulator, row) => {
    const value = String(row[field] ?? "").trim();
    if (!value) return accumulator;
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr-TR"));
}

export function buildBacklogFacets(rows: CurationBacklogRow[]) {
  return {
    makams: summarizeBacklogFacet(rows, "makam"),
    forms: summarizeBacklogFacet(rows, "form"),
    usuls: summarizeBacklogFacet(rows, "usul"),
    composers: summarizeBacklogFacet(rows, "composer"),
    priorityGroups: summarizeBacklogFacet(rows, "priorityGroup"),
    decisionStatuses: summarizeBacklogFacet(rows, "curationDecisionStatus"),
  };
}

function candidateReviewMatchesQuery(row: CandidateReviewRow, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);

  return [
    row.candidateId,
    row.catalogId,
    row.status,
    row.profileId,
    row.provider,
    row.searchQuery,
    row.makam,
    row.form,
    row.usul,
    row.title,
    row.composer,
    row.priorityGroup,
    row.curationDecisionStatus,
  ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

export function applyCandidateReviewQuery(rows: CandidateReviewRow[], query: CandidateReviewQuery): CandidateReviewRow[] {
  return rows.filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (query.profileId && row.profileId !== query.profileId) return false;
    if (query.provider && row.provider !== query.provider) return false;
    if (query.composer && row.composer !== query.composer) return false;
    return candidateReviewMatchesQuery(row, query.query);
  });
}

function candidateReviewGroupMatchesQuery(row: CandidateReviewGroup, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSearchText(query);

  return [
    row.groupId,
    row.catalogId,
    row.status,
    row.reviewAction,
    row.makam,
    row.form,
    row.usul,
    row.title,
    row.composer,
    row.priorityGroup,
    row.profiles?.join(" "),
    row.providers?.join(" "),
    row.confidenceLevels?.join(" "),
  ].some((value) => normalizeSearchText(value).includes(normalizedQuery));
}

export function applyCandidateReviewGroupQuery(rows: CandidateReviewGroup[], query: CandidateReviewGroupQuery): CandidateReviewGroup[] {
  return rows.filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (query.composer && row.composer !== query.composer) return false;
    if (query.priorityGroup && row.priorityGroup !== query.priorityGroup) return false;
    return candidateReviewGroupMatchesQuery(row, query.query);
  });
}

function summarizeCandidateReviewFacet(rows: CandidateReviewRow[], field: keyof CandidateReviewRow): BacklogFacet[] {
  const counts = rows.reduce((accumulator, row) => {
    const value = String(row[field] ?? "").trim();
    if (!value) return accumulator;
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr-TR"));
}

function summarizeCandidateReviewGroupFacet(rows: CandidateReviewGroup[], field: keyof CandidateReviewGroup): BacklogFacet[] {
  const counts = rows.reduce((accumulator, row) => {
    const value = String(row[field] ?? "").trim();
    if (!value) return accumulator;
    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return Array.from(counts, ([value, count]) => ({value, count}))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value, "tr-TR"));
}

export function buildCandidateReviewFacets(rows: CandidateReviewRow[]) {
  return {
    statuses: summarizeCandidateReviewFacet(rows, "status"),
    profileIds: summarizeCandidateReviewFacet(rows, "profileId"),
    providers: summarizeCandidateReviewFacet(rows, "provider"),
    confidenceLevels: summarizeCandidateReviewFacet(rows, "reviewConfidenceLevel"),
    composers: summarizeCandidateReviewFacet(rows, "composer"),
  };
}

export function buildCandidateReviewGroupFacets(rows: CandidateReviewGroup[]) {
  return {
    statuses: summarizeCandidateReviewGroupFacet(rows, "status"),
    composers: summarizeCandidateReviewGroupFacet(rows, "composer"),
    priorityGroups: summarizeCandidateReviewGroupFacet(rows, "priorityGroup"),
  };
}
