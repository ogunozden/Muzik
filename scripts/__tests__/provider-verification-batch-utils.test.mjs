import {describe, expect, it} from "vitest";
import {dedupeAcceptedCandidatesByIdentity} from "../verify-external-source-providers.mjs";
import {detectOfflineRun} from "../run-provider-verification-batches.mjs";

function acceptedCandidate(catalogId, url, score) {
  return {
    catalogId,
    status: "accepted",
    source: {provider: "archive", url},
    evidence: {score},
  };
}

describe("provider verification batch utilities", () => {
  it("dedupeAcceptedCandidatesByIdentity ayni URL icin en yuksek skorlu adayi tutar", () => {
    const candidates = [
      acceptedCandidate("a--eser--1", "https://archive.org/details/item1", 80),
      acceptedCandidate("b--eser--2", "https://archive.org/details/item1", 95),
      acceptedCandidate("c--eser--3", "https://archive.org/details/item2", 90),
    ];

    const deduped = dedupeAcceptedCandidatesByIdentity(candidates);

    expect(deduped).toHaveLength(2);
    expect(deduped.map((candidate) => candidate.catalogId)).toEqual(["b--eser--2", "c--eser--3"]);
  });

  it("dedupeAcceptedCandidatesByIdentity esit skorda catalogId karar verir", () => {
    const candidates = [
      acceptedCandidate("b--eser--2", "https://archive.org/details/item1", 90),
      acceptedCandidate("a--eser--1", "https://archive.org/details/item1", 90),
    ];

    const deduped = dedupeAcceptedCandidatesByIdentity(candidates);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].catalogId).toBe("a--eser--1");
  });

  it("detectOfflineRun: ilerleme varsa durma yok", () => {
    const run = {
      processedGroupCount: 25,
      byFailureKind: [{value: "network", count: 3}],
    };
    expect(detectOfflineRun(run, 10, 8)).toBe(false);
  });

  it("detectOfflineRun: ilerlemesiz ag hatasi network-outage", () => {
    const run = {
      processedGroupCount: 25,
      byFailureKind: [{value: "network", count: 25}],
    };
    expect(detectOfflineRun(run, 10, 10)).toBe("network-outage");
  });

  it("detectOfflineRun: ilerlemesiz connector hatasi deterministic-failures", () => {
    const run = {
      processedGroupCount: 25,
      byFailureKind: [{value: "connector", count: 25}],
    };
    expect(detectOfflineRun(run, 10, 10)).toBe("deterministic-failures");
  });

  it("detectOfflineRun: hatasiz ilerlemesiz partide durma yok (cache yeniden isleme)", () => {
    const run = {
      processedGroupCount: 25,
      byFailureKind: [],
    };
    expect(detectOfflineRun(run, 10, 10)).toBe(false);
  });
});
