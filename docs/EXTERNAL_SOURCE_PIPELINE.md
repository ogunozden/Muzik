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
6. Run `npm run audit:prod-cycle` before closing a production-near batch phase.
   It executes the source/profile audit, accepted-source dry-run, candidate
   decision validation, PDF layout verification, curation validation,
   sample/instrument audit, `/studio/follow` browser audit, `/references/curation`
   runtime payload audit, layout guard and security audit on the fixed local
   port `4015`, then writes
   `output/external-reference-coverage/prod-cycle-summary.json`.

Discovery dry-run flow is the batch-first producer for the 2978 missing-source
backlog. It does not attach sources directly and it does not treat search result
URLs as evidence:

```bash
npm run discover:external-sources
npm run verify:external-source-discovery
npm run verify:external-source-providers
npm run import:external-references -- --input output/external-source-discovery/accepted-import-ready.json --dry-run
npm run audit:prod-cycle
```

The discovery command writes `output/external-source-discovery/discovery-run.json`,
`discovery-candidates.json`, `accepted-import-ready.json`,
`needs-review-groups.json`, `conflicts.json`, `provider-coverage.json`,
`negative-cache.json` and `coverage-delta.json`. The first connector set is
Internet Archive structured search metadata, known-site metadata probes for
DîvânMakam/OGM Materyal/Salih Bora, and YouTube oEmbed verification for
operator-supplied YouTube URLs. YouTube Data API search remains optional because
it needs credentials and quota management.

Provider verification is the next evidence layer after search-lead discovery.
`npm run verify:external-source-providers` runs the configured provider set
(`internet-archive`, `divanmakam`, `ogm-materyal`, `salihbora`,
`youtube-oembed`) against a resumable backlog slice. It accepts `--offset`,
`--limit <n|all>`, `--provider <id|all>` and `--statuses <csv>`. The default
phase command processes 25 backlog groups and writes 125 provider packets while
accounting for all 2978 groups. Internet Archive uses its structured
advancedsearch metadata endpoint; DivanMakam, OGM Materyal, Salih Bora and
YouTube oEmbed stay `deferred` until a validated source URL exists, so search
URLs are never promoted as evidence. The command writes
`provider-verification-run.json`, `provider-verification-evidence.json`,
`provider-verification-cache.json`,
`provider-verification-accepted-import-ready.json` and
`provider-verification-plan.json`; it never downloads media, copies source
content or attaches directly.

Provider research references used for the current connector policy:

- Internet Archive item search API: https://doc-tools.readthedocs.io/en/ia-test-gsod/item-search-apis.html
- DivanMakam public site: https://divanmakam.com/
- OGM Materyal public portal: https://ogmmateryal.eba.gov.tr/etkilesimli-kitap/guzel-sanatlar-lisesi/muzik
- Salih Bora public archive site: https://www.salihbora.com/

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
catalog matcher. It also extracts schema.org JSON-LD music metadata when a page
publishes `MusicComposition`, `MusicRecording` or `CreativeWork` fields such as
name, composer, lyricist and lyrics. It still does not download score PDFs,
audio or media.

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
    "schemaName": "schema.org composition title",
    "schemaComposer": "schema.org composer",
    "schemaLyricist": "schema.org lyricist",
    "schemaLyrics": "schema.org lyric text",
    "schemaByArtist": "schema.org performer",
    "signals": ["html:og-title", "youtube:oembed-title", "schema:musiccomposition"]
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
  `schema_name`, `schema_composer`, `schema_lyricist`, `schema_lyrics`,
  `schema_by_artist`, `metadata_signals`, `oembed_verified`, `author`, and
  `thumbnail_url`.
- Markdown/TXT: every HTTPS URL in the document is extracted and staged.

## Source Intake Template

`npm run audit:external-references` writes
`output/external-reference-coverage/symbtr-curated-reference-source-intake-template.json`
as a blank operator worklist for the full candidate review queue. It is not an
accepted-source manifest and must not prefill source URLs, provider decisions or
metadata evidence. Each row carries empty source/evidence fields, including
HTML, oEmbed and schema.org metadata fields, so a filled worklist can later be
converted into a real bulk candidate import without losing provenance.

`npm run curation:validate` enforces the template contract:

- `importContract.acceptedOnlyAfterValidation` must be `true`.
- Required gates include `catalog-id`, `https-url-policy`,
  `research-profile-match`, `accepted-identity-dedupe`, `checked-at-date` and
  `metadata-evidence-normalization`.
- Every generated source, evidence and metadata field must remain blank in the
  template. Filled evidence belongs in a separate accepted bulk candidate input
  and must pass `npm run import:external-references -- --input <json>` before it
  can affect attached sources.

## Prod-Cycle Summary

`npm run audit:prod-cycle` is the single production-near closure gate for this
batch-first pipeline. It does not promote review candidates. It only reports
`ok: true` when the full 3000-entry catalog has been processed, duplicate rows
after dedupe are `0`, auto-attach remains accepted-only, review-only candidates
are not attached, accepted dry-run evidence is complete, PDF empty-import
verification keeps the verified manifest SHA256 unchanged, browser/runtime
payload gates pass and `npm audit --audit-level=moderate` reports `0`
vulnerabilities.

The generated `prod-cycle-summary.json` classifies the remaining queue by
provider profile, candidate/group status, confidence bucket and missing evidence
reason. The current expected low accepted coverage is therefore a truthful
backlog state, not a failure: entries stay in `needs-review`, `conflict`,
`rejected` or `deferred` until a validated HTTPS source with provider profile
match, catalog id match, duplicate-safe identity, `checkedAt` and conflict-free
metadata is imported through the accepted-source validation path.

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
