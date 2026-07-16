import {describe, expect, it, vi} from "vitest";
import {extractHtmlMetadata, fetchExternalHtmlMetadata} from "../external-metadata-fetch.mjs";

function redirectResponse(location) {
  return {
    status: 302,
    ok: false,
    headers: {get: (key) => (key.toLowerCase() === "location" ? location : null)},
  };
}

describe("external metadata fetch", () => {
  it("extracts title, description, author and signal provenance from HTML", () => {
    const metadata = extractHtmlMetadata(`
      <html>
        <head>
          <title>Fallback Title</title>
          <meta property="og:title" content="Uşşak İlahi Allah Emrin Tutalım">
          <meta name="description" content="Zekai Dede notası">
          <meta name="author" content="Zekai Dede">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "MusicComposition",
              "name": "Allah Emrin Tutalım",
              "composer": {"@type": "Person", "name": "Zekai Dede"},
              "lyricist": {"@type": "Person", "name": "Yunus Emre"},
              "lyrics": {"@type": "CreativeWork", "text": "Allah emrin tutalım rahmetine batalım"}
            }
          </script>
        </head>
      </html>
    `);

    expect(metadata).toEqual(expect.objectContaining({
      title: "Uşşak İlahi Allah Emrin Tutalım",
      description: "Zekai Dede notası",
      author: "Zekai Dede",
      schemaName: "Allah Emrin Tutalım",
      schemaComposer: "Zekai Dede",
      schemaLyricist: "Yunus Emre",
      schemaLyrics: "Allah emrin tutalım rahmetine batalım",
      metadataSignals: expect.arrayContaining([
        "html:og-title",
        "html:description",
        "html:author",
        "schema:musiccomposition",
        "schema:name",
        "schema:composer",
        "schema:lyricist",
        "schema:lyrics",
      ]),
    }));
  });

  describe("SSRF redirect sertlestirmesi", () => {
    it("https loopback'e yonlendirmeyi engeller (Location re-validation)", async () => {
      const fetchImpl = vi.fn(async () => redirectResponse("https://127.0.0.1:11434/api"));
      const result = await fetchExternalHtmlMetadata({url: "https://example.com/eser", notes: ""}, {fetchImpl});
      expect(result.notes).toMatch(/redirect to loopback or private host/i);
      expect(fetchImpl).toHaveBeenCalledTimes(1); // yonlendirme takip EDILMEDI
    });

    it("http'ye (cross-protocol) yonlendirmeyi engeller", async () => {
      const fetchImpl = vi.fn(async () => redirectResponse("http://127.0.0.1:11434/api"));
      const result = await fetchExternalHtmlMetadata({url: "https://example.com/eser", notes: ""}, {fetchImpl});
      expect(result.notes).toMatch(/redirect to URL must use HTTPS/i);
    });

    it("IPv4-mapped IPv6 loopback'e (::ffff:127.0.0.1) yonlendirmeyi engeller", async () => {
      const fetchImpl = vi.fn(async () => redirectResponse("https://[::ffff:127.0.0.1]/api"));
      const result = await fetchExternalHtmlMetadata({url: "https://example.com/eser", notes: ""}, {fetchImpl});
      expect(result.notes).toMatch(/redirect to loopback or private host/i);
    });
  });
});
