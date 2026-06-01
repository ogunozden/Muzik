import {beforeEach, describe, expect, it, vi} from "vitest";
import type {NextRequest} from "next/server";
import {mkdir, stat, unlink, writeFile} from "node:fs/promises";
import {DELETE, GET, POST} from "../route";

vi.mock("node:fs/promises", () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };

  return {
    ...promises,
    default: promises,
  };
});

vi.mock("@/engines/ses/sample-library", () => {
  const sampleSlot = {
    key: "ney:C4",
    category: "melodic",
    instrumentId: "ney",
    instrumentName: "Ney",
    groupLabel: "Ney",
    label: "C4",
    fileName: "C4.wav",
    relativePath: "ney/C4.wav",
    url: "/samples/ney/C4.wav",
    midiNumber: 60,
    noteName: "C4",
  };

  return {
    SAMPLE_SLOTS: [sampleSlot],
    SAMPLE_SLOT_BY_KEY: new Map([[sampleSlot.key, sampleSlot]]),
  };
});

const SAMPLE_OPS_TOKEN_HEADER = "x-sample-operations-token";

function makeUploadRequest(fileName: string, type: string, slotKey = "ney:C4", token = "secret-token") {
  const file = new File(["audio"], fileName, {type});
  const formData = {
    get: vi.fn((key: string) => {
      if (key === "slotKey") return slotKey;
      if (key === "file") return file;
      return null;
    }),
  };

  return {
    url: "http://localhost/api/samples",
    headers: new Headers(token ? {[SAMPLE_OPS_TOKEN_HEADER]: token} : undefined),
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as NextRequest;
}

function makeDeleteRequest(slotKey = "ney:C4", token = "secret-token") {
  return new Request("http://localhost/api/samples", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? {[SAMPLE_OPS_TOKEN_HEADER]: token} : {}),
    },
    body: JSON.stringify({slotKey}),
  });
}

describe("/api/samples route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("SAMPLE_OPERATIONS_TOKEN", "secret-token");
    vi.mocked(stat).mockResolvedValue({
      isFile: () => true,
      size: 2048,
      mtime: new Date("2026-05-10T00:00:00.000Z"),
    } as never);
  });

  it("rejects sample mutations without the operation token", async () => {
    const response = await POST(makeUploadRequest("sample.wav", "audio/wav", "ney:C4", ""));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("token");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("returns sample slot status", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.installed).toBe(1);
    expect(body.slots[0]).toEqual(
      expect.objectContaining({
        key: "ney:C4",
        installed: true,
        size: 2048,
      }),
    );
  });

  it("rejects sample uploads that do not match the central upload policy", async () => {
    const request = makeUploadRequest("sample.m4a", "audio/mp4");

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain(".wav");
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("accepts allowed sample uploads and writes them to the slot path", async () => {
    const request = makeUploadRequest("sample.wav", "audio/wav");

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slot).toEqual(expect.objectContaining({key: "ney:C4", installed: true}));
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining("ney"), {recursive: true});
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("C4.wav"), expect.any(Buffer));
  });

  it("requires the operation token before deleting a sample", async () => {
    const response = await DELETE(makeDeleteRequest("ney:C4", ""));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain("token");
    expect(unlink).not.toHaveBeenCalled();
  });

  it("deletes an allowed sample slot with the operation token", async () => {
    const response = await DELETE(makeDeleteRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.slot).toEqual(expect.objectContaining({key: "ney:C4"}));
    expect(unlink).toHaveBeenCalledWith(expect.stringContaining("C4.wav"));
  });
});
