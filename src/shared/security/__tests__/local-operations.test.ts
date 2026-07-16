import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {getLocalOperationAccessError} from "../local-operations";

const OPTS = {
  enabledEnv: "TEST_LOCAL_ENABLED",
  tokenEnv: "TEST_LOCAL_TOKEN",
  unsafeLocalEnv: "TEST_LOCAL_UNSAFE",
  tokenHeader: "x-test-token",
  disabledMessage: "disabled",
  missingProductionTokenMessage: "missing-prod-token",
  missingTokenMessage: "missing-token",
  invalidTokenMessage: "invalid-token",
};

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/test", {method: "POST", headers});
}

describe("getLocalOperationAccessError — CSRF guard (unsafe-local tokensiz yol)", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [OPTS.tokenEnv, OPTS.unsafeLocalEnv, OPTS.enabledEnv]) saved[key] = process.env[key];
    // Tokensiz unsafe-local yolunu etkinlestir (NODE_ENV vitest'te "test" = non-prod).
    delete process.env[OPTS.tokenEnv];
    process.env[OPTS.unsafeLocalEnv] = "true";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("same-origin tarayici istegine izin verir", () => {
    expect(getLocalOperationAccessError(makeRequest({"sec-fetch-site": "same-origin"}), OPTS)).toBeNull();
  });

  it("tarayici-disi istege (Sec-Fetch-Site yok) izin verir", () => {
    expect(getLocalOperationAccessError(makeRequest(), OPTS)).toBeNull();
  });

  it("cross-site tarayici istegini ENGELLER (CSRF)", () => {
    const error = getLocalOperationAccessError(makeRequest({"sec-fetch-site": "cross-site"}), OPTS);
    expect(error).not.toBeNull();
    expect(error?.status).toBe(403);
  });

  it("same-site tarayici istegini ENGELLER (baska origin)", () => {
    const error = getLocalOperationAccessError(makeRequest({"sec-fetch-site": "same-site"}), OPTS);
    expect(error).not.toBeNull();
    expect(error?.status).toBe(403);
  });
});
