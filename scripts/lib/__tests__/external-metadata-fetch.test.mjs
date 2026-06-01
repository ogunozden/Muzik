import {describe, expect, it} from "vitest";
import {extractHtmlMetadata} from "../external-metadata-fetch.mjs";

describe("external metadata fetch", () => {
  it("extracts title, description, author and signal provenance from HTML", () => {
    const metadata = extractHtmlMetadata(`
      <html>
        <head>
          <title>Fallback Title</title>
          <meta property="og:title" content="Uşşak İlahi Allah Emrin Tutalım">
          <meta name="description" content="Zekai Dede notası">
          <meta name="author" content="Zekai Dede">
        </head>
      </html>
    `);

    expect(metadata).toEqual({
      title: "Uşşak İlahi Allah Emrin Tutalım",
      description: "Zekai Dede notası",
      author: "Zekai Dede",
      metadataSignals: ["html:og-title", "html:description", "html:author"],
    });
  });
});
