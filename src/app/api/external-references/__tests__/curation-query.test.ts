import {describe, expect, it} from "vitest";
import {
  applyBacklogQuery,
  applyCandidateReviewGroupQuery,
  applyCandidateReviewQuery,
  buildBacklogFacets,
  buildCandidateReviewFacets,
  buildCandidateReviewGroupFacets,
  clampBacklogOffset,
  isMissingBacklogRow,
  type BacklogQuery,
  type CandidateReviewGroupQuery,
  type CandidateReviewQuery,
} from "../curation-query";

const baseBacklogQuery: BacklogQuery = {
  limit: 100,
  offset: 0,
  scope: "missing",
  query: "",
  makam: "",
  form: "",
  usul: "",
  composer: "",
  priorityGroup: "",
};

const baseCandidateQuery: CandidateReviewQuery = {
  limit: 100,
  offset: 0,
  query: "",
  status: "",
  profileId: "",
  provider: "",
  composer: "",
};

const baseGroupQuery: CandidateReviewGroupQuery = {
  limit: 80,
  offset: 0,
  query: "",
  status: "",
  composer: "",
  priorityGroup: "",
};

describe("external reference curation query helpers", () => {
  it("keeps backlog scope, metadata filters and missing-source policy centralized", () => {
    const rows = [
      {
        catalogId: "one",
        makam: "Ussak",
        form: "İlahi",
        usul: "Düyek",
        composer: "Zekai Dede",
        missingCuratedReference: true,
        priorityGroup: "pdf-and-musicxml",
      },
      {
        catalogId: "two",
        makam: "Rast",
        composer: "İkinci Besteci",
        missingCuratedReference: true,
        deferredFromNextBatch: true,
        priorityGroup: "pdf-and-musicxml",
      },
      {
        catalogId: "three",
        makam: "Ussak",
        composer: "Zekai Dede",
        hasCuratedReference: true,
        missingCuratedReference: false,
      },
    ];

    expect(isMissingBacklogRow(rows[0])).toBe(true);
    expect(isMissingBacklogRow(rows[2])).toBe(false);
    expect(applyBacklogQuery(rows, {...baseBacklogQuery, scope: "active"}).map((row) => row.catalogId)).toEqual(["one"]);
    expect(applyBacklogQuery(rows, {...baseBacklogQuery, makam: "Ussak"}).map((row) => row.catalogId)).toEqual(["one"]);
    expect(applyBacklogQuery(rows, {...baseBacklogQuery, query: "ikinci"}).map((row) => row.catalogId)).toEqual(["two"]);
    expect(buildBacklogFacets(rows).makams).toEqual(expect.arrayContaining([
      {value: "Ussak", count: 2},
      {value: "Rast", count: 1},
    ]));
  });

  it("filters candidate review rows by provider profile, status, composer and text", () => {
    const rows = [
      {
        candidateId: "one:youtube:search",
        status: "needs-review",
        profileId: "youtube",
        provider: "youtube",
        composer: "Zekai Dede",
        reviewConfidenceLevel: "medium",
        searchQuery: "Ussak ilahi Zekai",
      },
      {
        candidateId: "two:archive:search",
        status: "conflict",
        profileId: "internet-archive",
        provider: "archive",
        composer: "İkinci Besteci",
        reviewConfidenceLevel: "needs-context",
        searchQuery: "Rast şarkı",
      },
    ];

    expect(applyCandidateReviewQuery(rows, {...baseCandidateQuery, profileId: "youtube"}).map((row) => row.candidateId)).toEqual(["one:youtube:search"]);
    expect(applyCandidateReviewQuery(rows, {...baseCandidateQuery, status: "conflict"}).map((row) => row.candidateId)).toEqual(["two:archive:search"]);
    expect(applyCandidateReviewQuery(rows, {...baseCandidateQuery, query: "ikinci"}).map((row) => row.candidateId)).toEqual(["two:archive:search"]);
    expect(buildCandidateReviewFacets(rows).profileIds).toEqual(expect.arrayContaining([
      {value: "youtube", count: 1},
      {value: "internet-archive", count: 1},
    ]));
  });

  it("filters review groups and clamps paginated offsets deterministically", () => {
    const groups = [
      {
        groupId: "one:review-group",
        status: "needs-review",
        composer: "Zekai Dede",
        priorityGroup: "pdf-and-musicxml",
        profiles: ["youtube", "ogm-materyal"],
        confidenceLevels: ["medium"],
      },
      {
        groupId: "two:review-group",
        status: "conflict",
        composer: "İkinci Besteci",
        priorityGroup: "pdf-and-musicxml",
        providers: ["archive"],
        confidenceLevels: ["needs-context"],
      },
    ];

    expect(applyCandidateReviewGroupQuery(groups, {...baseGroupQuery, status: "conflict"}).map((group) => group.groupId)).toEqual(["two:review-group"]);
    expect(applyCandidateReviewGroupQuery(groups, {...baseGroupQuery, query: "ogm"}).map((group) => group.groupId)).toEqual(["one:review-group"]);
    expect(buildCandidateReviewGroupFacets(groups).statuses).toEqual(expect.arrayContaining([
      {value: "needs-review", count: 1},
      {value: "conflict", count: 1},
    ]));
    expect(clampBacklogOffset(999, 125, 50)).toBe(100);
    expect(clampBacklogOffset(20, 0, 50)).toBe(0);
  });
});
