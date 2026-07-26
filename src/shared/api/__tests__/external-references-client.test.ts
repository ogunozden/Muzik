import {describe, it, expect, vi, afterEach} from "vitest";
import {
  fetchExternalReferenceState,
  runExternalReferenceAction,
  EXTERNAL_REFERENCE_OPS_TOKEN_HEADER,
} from "../external-references-client";
import {ApiError} from "../fetch-json";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: unknown, ok = true, status = 200) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => ({ok, status, json: async () => response}) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchExternalReferenceState", () => {
  it("query + ops-token header ile no-store GET yapar", async () => {
    const fetchMock = stubFetch({backlog: []});
    const params = new URLSearchParams({makam: "rast"});
    await fetchExternalReferenceState(params, "secret-token");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/external-references?makam=rast");
    expect((init as RequestInit).cache).toBe("no-store");
    expect((init as {headers: Record<string, string>}).headers[EXTERNAL_REFERENCE_OPS_TOKEN_HEADER]).toBe("secret-token");
  });

  it("query boşsa ve token yoksa sade endpoint + header'sız çağırır", async () => {
    const fetchMock = stubFetch({backlog: []});
    await fetchExternalReferenceState();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/external-references");
    expect((init as {headers: Record<string, string>}).headers[EXTERNAL_REFERENCE_OPS_TOKEN_HEADER]).toBeUndefined();
  });
});

describe("runExternalReferenceAction", () => {
  it("POST + {action, ...payload} gövdesi + Content-Type gönderir, {state,result} döner", async () => {
    const fetchMock = stubFetch({state: {x: 1}, result: {ok: true}});
    const res = await runExternalReferenceAction("stage", {url: "https://e.com"}, "tok");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({action: "stage", url: "https://e.com"});
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(res).toEqual({state: {x: 1}, result: {ok: true}});
  });

  it("hata durumunda fallbackErrorMessage'lı ApiError fırlatır", async () => {
    stubFetch({}, false, 500);
    await expect(runExternalReferenceAction("stage", {}, undefined, undefined, "Operasyon başarısız")).rejects.toThrow(ApiError);
    await expect(
      runExternalReferenceAction("stage", {}, undefined, undefined, "Operasyon başarısız"),
    ).rejects.toMatchObject({message: "Operasyon başarısız", status: 500});
  });
});
