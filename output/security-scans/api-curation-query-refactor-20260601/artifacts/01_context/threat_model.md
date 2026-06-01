# Muzik Repository Threat Model

## Assets
- Real Turkish music catalog metadata, curated source manifests, feedback/manual correction/event logs, candidate review manifests, and generated batch coverage artifacts.
- Local operator curation routes guarded by local operation access checks and ops tokens.
- User-facing score/source rendering surfaces, including external links and safe inline media previews.
- Local filesystem data under `src/data/references` and generated `output/external-reference-coverage` artifacts.

## Trust Boundaries
- Browser/API boundary for `/api/external-references` GET and POST requests.
- Local operator boundary enforced by `getLocalOperationAccessError`, environment flags, and ops token headers.
- External source/provider data boundary: URLs, metadata, oEmbed, source titles, generated search candidates, and review groups are untrusted until validated.
- Filesystem boundary between temporary UI input files, generated exports, and persistent curated manifests.

## Attacker-Controlled Inputs
- API query parameters used for filtering, pagination, candidate review queue exports, group exports, recommendation exports, and decision-template exports.
- POST bodies for staging sources, importing manifests, and recording curation feedback/manual corrections/embed state.
- External source metadata and provider URLs staged into the batch pipeline.

## Security Invariants
- Production and non-local write operations require configured access gates and token checks.
- Query/filter helpers must not create accepted source evidence, mutate manifests, or bypass accepted-only auto-attach policy.
- Review-only candidates and review group decisions may classify backlog state but must not auto-attach sources without validated accepted source URLs.
- Generated candidate/search data must not be treated as trusted source truth or directly embedded without provider policy validation.
- Filesystem writes must stay within known temp or manifest paths and must not use user-selected arbitrary paths.
- UI/API responses must not expose secrets or bypass the local/admin nature of curation surfaces.
