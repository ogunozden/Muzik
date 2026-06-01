# Muzik Repository Threat Model

## Assets
- Real Turkish music catalog metadata, curated source manifests, feedback/manual correction/event logs, and generated batch review artifacts.
- Local operator curation routes guarded by local operation access checks and ops tokens.
- User-facing score/source rendering surfaces, including external links and safe inline media previews.
- Local filesystem data under `src/data/references` and generated `output/external-reference-coverage` artifacts.

## Trust Boundaries
- Browser/API boundary for `/api/external-references` GET and POST requests.
- Local operator boundary enforced by `getLocalOperationAccessError`, environment flags, and ops token headers.
- External source/provider data boundary: URLs, metadata, oEmbed, source titles, and generated candidates are untrusted until validated.
- Filesystem boundary between temporary UI input files and persistent curated manifests.

## Attacker-Controlled Inputs
- API query parameters used for filtering, pagination, and candidate review exports.
- POST bodies for staging sources, importing manifests, and recording curation feedback/manual corrections/embed state.
- External source metadata and provider URLs staged into the batch pipeline.

## Security Invariants
- Production and non-local write operations require the configured access gate and token checks.
- Only accepted curated sources may be auto-attached; needs-review, rejected, conflict, and generated search candidates are not evidence.
- Generated candidate/search data must not be treated as trusted source truth or directly embedded without provider policy validation.
- Filesystem writes must stay within known temp or manifest paths and must not use user-selected arbitrary paths.
- UI/API responses must not expose secrets or bypass the local/admin nature of curation surfaces.
