import {describe, expect, it} from "vitest";
import {scoreDiscoveryCandidate} from "../discovery/discovery-scorer.mjs";

describe("discovery scorer", () => {
  it("uses a parenthesized nullish fallback for trust scoring", () => {
    const result = scoreDiscoveryCandidate({
      provider: {trustWeight: 0},
      group: {status: "needs-review", priorityGroup: "pdf-and-musicxml"},
      policy: {
        scoringParams: {
          defaultTrustWeight: 0.5,
          baseWeightMultiplier: 60,
          bonusPdfAndMusicxml: 10,
          maxDiscoveryScore: 89,
          bucketLow: 60,
          bucketMedium: 80,
        },
      },
    });

    expect(result.score).toBe(40);
    expect(result.bucket).toBe("needs-context");
  });
});
