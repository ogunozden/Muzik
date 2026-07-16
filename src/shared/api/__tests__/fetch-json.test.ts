import {describe, it, expect, vi, afterEach} from "vitest";
import {fetchJson, ApiError} from "../fetch-json";

function mockFetch(response: Partial<Response> & {json?: () => Promise<unknown>}) {
  return vi.fn().mockResolvedValue(response as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchJson", () => {
  it("başarılı yanıtta JSON'u parse edip döner", async () => {
    vi.stubGlobal("fetch", mockFetch({ok: true, status: 200, json: async () => ({id: "1", name: "Rast"})}));
    const data = await fetchJson<{id: string; name: string}>("/api/x");
    expect(data).toEqual({id: "1", name: "Rast"});
  });

  it("non-ok + JSON hata gövdesinde ApiError (mesaj + status) fırlatır", async () => {
    vi.stubGlobal("fetch", mockFetch({ok: false, status: 500, json: async () => ({error: "Sunucu patladı"})}));
    await expect(fetchJson("/api/x")).rejects.toThrow(ApiError);
    await expect(fetchJson("/api/x")).rejects.toMatchObject({message: "Sunucu patladı", status: 500});
  });

  it("non-ok + JSON olmayan gövdede varsayılan mesajlı ApiError fırlatır", async () => {
    vi.stubGlobal("fetch", mockFetch({
      ok: false,
      status: 404,
      json: async () => {
        throw new SyntaxError("not json");
      },
    }));
    const error = await fetchJson("/api/x").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toContain("404");
  });

  it("AbortError'ı sarmalamadan yayar", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));
    await expect(fetchJson("/api/x")).rejects.toBe(abortError);
  });
});
