import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ReferencesOperationsDashboard} from "@/features/references/ReferencesOperationsDashboard";

vi.mock("@/components/layout/UnifiedLayout", () => ({
  UnifiedLayout: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

const stateFixture = {
  inbox: {
    sourceCount: 1,
    sources: [
      {
        id: "divanmakam-example",
        provider: "score",
        url: "https://divanmakam.com/forum/example.1/",
        title: "Example Source",
        sourceProvider: "DîvânMakam",
        checkedAt: "2026-05-10",
        observed: {
          makam: "Uşşak",
          form: "İlahi",
          usul: "Düyek",
        },
      },
    ],
  },
  mapping: {
    generatedAt: "2026-05-10T12:00:00.000Z",
    summary: {
      sourceCount: 1,
      acceptedCount: 1,
      needsReviewCount: 0,
      rejectedCount: 0,
      skippedDuplicateCount: 0,
    },
    mappings: [
      {
        inboxId: "divanmakam-example",
        catalogId: "ussak--ilahi--duyek--example--zekai_dede",
        status: "accepted" as const,
        confidenceScore: 180,
        confidenceGap: 40,
        reason: "High-confidence automatic catalog match.",
        evidence: {
          makam: "Uşşak",
          form: "İlahi",
          usul: "Düyek",
          composer: "Zekai Dede",
          sourceProvider: "DîvânMakam",
        },
        candidate: {
          source: {
            title: "Example Source",
            url: "https://divanmakam.com/forum/example.1/",
            provider: "score",
          },
        },
      },
    ],
  },
  coverage: {
    totalCatalogEntries: 3000,
    curatedReferenceEntries: 22,
    missingCuratedEntries: 2978,
    acceptedBulkCandidateEntries: 7,
  },
};

function mockFetch() {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Response(
        JSON.stringify({
          action: "stage",
          result: {addedCount: 1, skippedDuplicateCount: 0},
          state: stateFixture,
        }),
        {status: 200, headers: {"Content-Type": "application/json"}},
      );
    }

    return new Response(JSON.stringify(stateFixture), {
      status: 200,
      headers: {"Content-Type": "application/json"},
    });
  });
}

describe("ReferencesPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows external source operations state in the frontend", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferencesOperationsDashboard />);

    await screen.findByRole("heading", {name: "Harici kaynak yönetimi"});
    fireEvent.change(screen.getByLabelText("Ops token"), {
      target: {value: "secret-token"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Yenile"}));

    await screen.findByRole("link", {name: "Example Source"});
    expect(screen.getAllByText("Inbox").length).toBeGreaterThan(0);
    expect(screen.getByText("Accepted")).toBeDefined();
    expect(screen.getByText("ussak--ilahi--duyek--example--zekai_dede")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/external-references",
      expect.objectContaining({
        headers: {"x-external-reference-ops-token": "secret-token"},
      }),
    );
  });

  it("submits a source staging operation from the page", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferencesOperationsDashboard />);

    await screen.findByRole("heading", {name: "Harici kaynak yönetimi"});
    fireEvent.change(screen.getByLabelText("Ops token"), {
      target: {value: "secret-token"},
    });
    fireEvent.change(screen.getByLabelText("URL"), {
      target: {value: "https://divanmakam.com/forum/new-source.1/"},
    });
    fireEvent.change(screen.getByLabelText("Makam"), {
      target: {value: "Hicaz"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Kaynağı ekle"}));

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
        action: "stage",
        source: expect.objectContaining({
          url: "https://divanmakam.com/forum/new-source.1/",
          makam: "Hicaz",
        }),
      }),
    );
  });

  it("renders a read-only snapshot without fetching token-protected state on first paint", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReferencesOperationsDashboard
        initialState={{
          ...stateFixture,
          inbox: {
            ...stateFixture.inbox,
            sources: stateFixture.inbox.sources.map((source) => ({
              id: source.id,
              provider: source.provider,
              title: source.title,
              sourceProvider: source.sourceProvider,
              checkedAt: source.checkedAt,
              observed: source.observed,
            })),
          },
          mapping: {
            ...stateFixture.mapping,
            mappings: stateFixture.mapping.mappings.map((mapping) => ({
              ...mapping,
              candidate: {
                source: {
                  title: mapping.candidate.source.title,
                  provider: mapping.candidate.source.provider,
                },
              },
            })),
          },
        }}
        initialMessage="Salt-okunur kaynak operasyon snapshot yüklendi."
      />,
    );

    await screen.findByText("Salt-okunur kaynak operasyon snapshot yüklendi.");
    expect(screen.getByText("22 / 3.000")).toBeDefined();
    expect(screen.getByText("2.978")).toBeDefined();
    expect(screen.getByText("Example Source")).toBeDefined();
    expect(screen.queryByRole("link", {name: "Example Source"})).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
