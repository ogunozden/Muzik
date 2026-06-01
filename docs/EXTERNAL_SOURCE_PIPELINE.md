# External Source Pipeline

This pipeline keeps score pages, recordings, archives and code/data links out of
one-off manual edits.

## Flow

Frontend operations live at `/references`:

1. Paste a single URL with metadata or a bulk URL list.
2. Run `Map`, `Sync` and `Audit` from the page toolbar.
3. Review accepted, needs-review and rejected mappings in the table.

The page calls only fixed local operations through `/api/external-references`.
It does not accept arbitrary shell commands.

Operational safety rules:

- Operations require `EXTERNAL_REFERENCE_OPERATIONS_TOKEN` by default. The page
  sends it through the `Ops token` field as `x-external-reference-ops-token`.
- Production usage is disabled unless `EXTERNAL_REFERENCE_OPERATIONS_ENABLED=true`
  and `EXTERNAL_REFERENCE_OPERATIONS_TOKEN` is set.
- Local tokenless use is an explicit unsafe escape hatch:
  `EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL=true`, and still only for
  loopback hosts (`localhost`, `127.0.0.1`, `[::1]`).
- Only one mutating operation can run at a time through the API.
- Bulk pasted input is capped and temporary input files are deleted after the
  stage command finishes.

CLI flow remains available for batch work:

1. Stage newly discovered URLs with `npm run stage:external-source -- --url <https-url>`
   or bulk stage a JSON/CSV/Markdown/TXT source file with
   `npm run stage:external-sources -- --input <path>`.
2. Run `npm run map:external-references`.
3. Review `output/external-reference-coverage/mapped-external-reference-candidates.json`
   or the CSV next to it.
4. Run `npm run sync:external-references` to write only accepted mappings into
   `src/data/references/external-reference-bulk-candidates.json`.
5. Run `npm run audit:external-references` to refresh coverage and backlog
   summaries.

Examples:

```bash
npm run stage:external-source -- --url https://divanmakam.com/forum/example.1/ --title "Visible title" --makam Uşşak --form İlahi --usul Düyek --composer "Zekai Dede"
npm run stage:external-source -- --url https://www.youtube.com/watch?v=example --oembed-verified --oembed-title "Visible recording title" --oembed-author "Performer" --metadata-signal youtube:oembed-title
npm run stage:external-sources -- --input docs/new-source-links.md
```

The stage command writes normalized sources into
`src/data/references/external-source-inbox.json`, infers the provider from the
URL, requires HTTPS, gives each item a stable id and skips duplicate URL
identities unless `--update-existing` is supplied.

For YouTube recording links, use:

```bash
npm run map:external-references -- --verify-youtube-oembed
```

That option asks YouTube oEmbed for title, author and thumbnail metadata before
classification. It is opt-in because it requires network access.

For plain score/archive URLs where the inbox entry has no title yet, use:

```bash
npm run map:external-references -- --fetch-page-metadata
```

That option reads HTML page metadata (`og:title` / `<title>`) and uses it in the
catalog matcher. It still does not download score PDFs, audio or media.

## Input Contract

The stage command can create this shape automatically. The normalized inbox
contract carries a URL, provider, visible title, checked date and observed
metadata:

```json
{
  "id": "divanmakam-example",
  "provider": "score",
  "url": "https://example.com/source",
  "title": "Visible source title",
  "sourceProvider": "Provider name",
  "checkedAt": "2026-05-10",
  "metadata": {
    "htmlTitle": "HTML or OpenGraph title",
    "htmlDescription": "HTML or OpenGraph description",
    "htmlAuthor": "HTML author",
    "oembedTitle": "oEmbed title",
    "oembedAuthor": "oEmbed author",
    "oembedProvider": "YouTube",
    "signals": ["html:og-title", "youtube:oembed-title"]
  },
  "observed": {
    "title": "Piece title",
    "makam": "Uşşak",
    "form": "İlahi",
    "usul": "Düyek",
    "composer": "Composer"
  }
}
```

`catalogId` is optional. When it is absent, the mapper scores all 3000 SymbTr
catalog entries by normalized title, makam, form, usul and composer metadata.
`title` and `observed` improve confidence, but URL-only sources can still be
preprocessed with `--fetch-page-metadata` and routed to `needs-review` if the
match is weak.

Bulk inputs are accepted as:

- JSON: an array, `{ "sources": [...] }`, or one source object.
- CSV: header columns such as `url,title,makam,form,usul,composer,checked_at`.
  Metadata columns are also preserved: `html_title`, `html_description`,
  `html_author`, `oembed_title`, `oembed_author`, `oembed_provider`,
  `metadata_signals`, `oembed_verified`, `author`, and `thumbnail_url`.
- Markdown/TXT: every HTTPS URL in the document is extracted and staged.

## Acceptance Rules

- `accepted`: high-confidence match with no blocking metadata mismatch.
- `needs-review`: plausible match, but metadata conflict or insufficient trust.
- `rejected`: no reliable SymbTr catalog match.

Only `accepted` mappings are eligible for bulk manifest write. Media is not
downloaded. Inline preview is allowed only for validated HTTPS sources that
match the central policy in `src/data/references/external-reference-policy.json`:
provider-specific verification, CSP `frame-src` allowlisting, iframe sandbox,
lazy loading and fallback links are required. YouTube entries must carry oEmbed
verification before they can be accepted.
