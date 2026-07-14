import {describe, expect, it} from "vitest";
import {planNextSourceBatch} from "../run-prod-closure-source-batches.mjs";

describe("prod closure source batch runner", () => {
  it("plans the next IA batch from closure offset and remaining count", () => {
    const plan = planNextSourceBatch({
      limit: 250,
      closure: {
        sourceClosure: {
          providerNetworkClassifiedGroupCount: 341,
          unresolvedGroupCount: 2637,
        },
      },
    });

    expect(plan).toEqual({
      offset: 341,
      remaining: 2637,
      limit: 250,
      complete: false,
    });
  });

  it("caps the batch limit to remaining work", () => {
    const plan = planNextSourceBatch({
      limit: 250,
      closure: {
        sourceClosure: {
          providerNetworkClassifiedGroupCount: 2950,
          unresolvedGroupCount: 28,
        },
      },
    });

    expect(plan.limit).toBe(28);
  });

  it("does not plan work when source closure is complete", () => {
    const plan = planNextSourceBatch({
      closure: {
        sourceClosure: {
          providerNetworkClassifiedGroupCount: 2978,
          unresolvedGroupCount: 0,
        },
      },
    });

    expect(plan.complete).toBe(true);
    expect(plan.limit).toBe(0);
  });
});
