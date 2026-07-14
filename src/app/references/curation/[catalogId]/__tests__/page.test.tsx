import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ReferencesCurationDetail} from "@/features/references/ReferencesCurationDetail";
import ReferencesCurationDetailPage from "../page";

vi.mock("@/shared/ui/layout/UnifiedLayout", () => ({
  UnifiedLayout: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

const catalogId = "ussak--ilahi--duyek--example--zekai_dede";
const stateFixture = {
  curation: {
    autoAttachedReferences: [
      {
        catalogId,
        sourceId: "divanmakam-example",
        catalog: {
          makam: "Uşşak",
          form: "İlahi",
          usul: "Düyek",
          title: "Example",
          composer: "Zekai Dede",
        },
        status: "auto-attached",
        confidenceScore: 0.82,
        confidenceLevel: "high",
        matchReasons: ["title:token-match"],
        conflicts: [],
        source: {
          id: "divanmakam-example",
          provider: "score",
          url: "https://divanmakam.com/forum/example.1/",
          title: "Example Source",
          author: "Yunus Emre",
          access: "external-link",
          verification: "manual",
        },
        feedbackEvents: [],
        manualCorrection: null,
        embedState: null,
      },
    ],
    feedbackEvents: [],
    manualCorrections: [],
  },
};

const youtubeStateFixture = {
  curation: {
    autoAttachedReferences: [
      {
        catalogId,
        sourceId: "youtube-example",
        catalog: {
          makam: "Uşşak",
          form: "İlahi",
          usul: "Düyek",
          title: "Example",
          composer: "Zekai Dede",
        },
        status: "auto-attached",
        confidenceScore: 0.9,
        confidenceLevel: "high",
        matchReasons: ["oembed:title"],
        conflicts: [],
        source: {
          id: "youtube-example",
          provider: "youtube",
          url: "https://www.youtube.com/watch?v=NwbNZN75bR8",
          title: "Example Recording",
          access: "embed-allowed",
          verification: "oembed",
        },
        feedbackEvents: [],
        manualCorrection: null,
        embedState: {
          embedType: "youtube",
          canEmbed: true,
          fallbackUrl: "https://www.youtube.com/watch?v=NwbNZN75bR8",
        },
      },
    ],
    feedbackEvents: [],
    manualCorrections: [],
  },
};

function mockFetch(responseState: unknown = stateFixture) {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Response(
        JSON.stringify({
          action: "curation-manual-correction",
          result: {manualCorrections: 1},
          state: responseState,
        }),
        {status: 200, headers: {"Content-Type": "application/json"}},
      );
    }

    return new Response(JSON.stringify(responseState), {
      status: 200,
      headers: {"Content-Type": "application/json"},
    });
  });
}

describe("ReferencesCurationDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a catalog detail view and submits manual corrections", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    const page = await ReferencesCurationDetailPage({
      params: Promise.resolve({catalogId}),
    });

    render(page);

    await screen.findByRole("heading", {name: catalogId});
    fireEvent.change(screen.getByLabelText("Ops token"), {
      target: {value: "secret-token"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Yenile"}));

    await screen.findByRole("heading", {name: "Example Source"});
    expect(screen.getAllByRole("link", {name: "https://divanmakam.com/forum/example.1/"}).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Besteci")).toBeDefined();
    expect(screen.getByLabelText("Güfteci")).toBeDefined();
    expect(screen.getByLabelText("Kaynak tipi")).toBeDefined();
    expect(screen.getByLabelText("Site")).toBeDefined();
    expect(screen.getByLabelText("Güven")).toBeDefined();
    expect(screen.getByLabelText("Manuel not")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Besteci"), {
      target: {value: "Zekai Dede"},
    });
    fireEvent.change(screen.getByLabelText("Güfteci"), {
      target: {value: "Yunus Emre"},
    });
    fireEvent.change(screen.getByLabelText("Kaynak tipi"), {
      target: {value: "score"},
    });
    fireEvent.change(screen.getByLabelText("Site"), {
      target: {value: "divanmakam.com"},
    });
    fireEvent.change(screen.getByLabelText("Güven"), {
      target: {value: "high"},
    });
    expect(screen.getByText(/1 \/ 1 kaynak görünür .* manuel notlu 0/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", {name: "Manuel Düzeltme"}));
    fireEvent.change(screen.getByLabelText("Doğru başlık"), {
      target: {value: "Corrected title"},
    });
    fireEvent.change(screen.getByLabelText("Makam"), {
      target: {value: "Uşşak"},
    });
    fireEvent.change(screen.getByLabelText("Alternatif URL"), {
      target: {value: "https://example.com/corrected"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Kaydet"}));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/external-references",
      expect.objectContaining({method: "POST"}),
    ));

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(postCall?.[1]?.headers).toEqual(expect.objectContaining({
      "x-external-reference-ops-token": "secret-token",
    }));
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "curation-manual-correction",
        manualCorrection: expect.objectContaining({
          catalogId,
          sourceId: "divanmakam-example",
          correctTitle: "Corrected title",
          correctMakam: "Uşşak",
          alternativeUrl: "https://example.com/corrected",
        }),
      }),
    );
  });

  it("records delete lifecycle feedback through the token-protected operation API", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    const page = await ReferencesCurationDetailPage({
      params: Promise.resolve({catalogId}),
    });

    render(page);

    fireEvent.change(screen.getByLabelText("Ops token"), {
      target: {value: "secret-token"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Yenile"}));
    await screen.findByRole("heading", {name: "Example Source"});

    fireEvent.click(screen.getByRole("button", {name: "Silme İste"}));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/external-references",
      expect.objectContaining({method: "POST"}),
    ));

    const deleteCall = fetchMock.mock.calls.find(([, init]) => (
      init?.method === "POST" &&
      String(init.body).includes("delete-requested")
    ));
    expect(deleteCall?.[1]?.headers).toEqual(expect.objectContaining({
      "x-external-reference-ops-token": "secret-token",
    }));
    expect(JSON.parse(String(deleteCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        action: "curation-feedback",
        feedback: expect.objectContaining({
          catalogId,
          sourceId: "divanmakam-example",
          eventType: "delete-requested",
          reason: "curation-detail-delete-requested",
        }),
      }),
    );
  });

  it("renders verified YouTube sources as lazy sandboxed inline previews", async () => {
    const fetchMock = mockFetch(youtubeStateFixture);
    vi.stubGlobal("fetch", fetchMock);
    const page = await ReferencesCurationDetailPage({
      params: Promise.resolve({catalogId}),
    });

    render(page);

    fireEvent.change(screen.getByLabelText("Ops token"), {
      target: {value: "secret-token"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Yenile"}));

    const preview = await screen.findByTitle("Example Recording önizleme");

    expect(preview.getAttribute("src")).toBe("https://www.youtube.com/embed/NwbNZN75bR8");
    expect(preview.getAttribute("loading")).toBe("lazy");
    expect(preview.getAttribute("sandbox")).toContain("allow-presentation");

    fireEvent.click(screen.getByRole("button", {name: "Gizle"}));
    expect(screen.getByText("Önizleme gizli.")).toBeDefined();
  });

  it("renders a read-only accepted source snapshot before an ops token is entered", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReferencesCurationDetail
        catalogId={catalogId}
        initialState={stateFixture}
        initialMessage="Read-only kabul edilmiş kaynak snapshot yüklendi. Feedback ve manuel düzeltme operasyonları ops token ister."
      />,
    );

    await screen.findByRole("heading", {name: catalogId});
    expect(screen.getByText(/Read-only kabul edilmiş kaynak snapshot/)).toBeDefined();
    expect(screen.getByRole("heading", {name: "Example Source"})).toBeDefined();
    expect(screen.getAllByRole("link", {name: "https://divanmakam.com/forum/example.1/"}).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 \/ 1 kaynak görünür/)).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
