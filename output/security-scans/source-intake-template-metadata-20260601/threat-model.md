# Threat Model

Repository: Muzik
Scan: source-intake-template-metadata-20260601

## Assets

- SymbTr catalog identity and canonical makam/usul/form/composer metadata.
- Curated external source manifests and auto-attached references.
- Operator review queues, source intake templates, feedback events and import artifacts.
- Local operator token used by `/api/external-references` for mutating curation actions.
- Browser-rendered reference and studio views.

## Trust Boundaries

- External source URLs, page metadata, oEmbed fields and schema.org JSON-LD are untrusted input.
- Generated review queues and source intake templates are worklists, not accepted data.
- Accepted source manifests cross the boundary into user-visible references only after validation.
- Local API operations are token-gated and must not accept arbitrary commands.
- Inline media must remain HTTPS, provider-policy constrained, sandboxed and CSP allowlisted.

## Security Invariants

- Only `accepted` sources may be auto-attached.
- `needs-review`, `rejected`, `conflict` and deferred rows must never become accepted references through generated artifacts alone.
- Generated source intake templates must not contain source URLs, source ids, provider decisions or prefilled evidence.
- Metadata from HTML, oEmbed and schema.org can influence confidence only through normalized, explainable scoring and validation gates.
- Duplicate accepted URL identities must be rejected before merge.
- Operator-supplied filled templates must pass HTTPS, catalog id, provider profile, checked date, metadata normalization and dedupe gates before affecting real data.

## Primary Failure Modes Considered

- Metadata prefill in a generated template causing unreviewed external data to be treated as trusted evidence.
- Missing import gates letting a filled worklist bypass normalization or dedupe.
- Source URL/provider fields leaking into generated review-only artifacts and enabling unsafe auto-attach.
- XSS or unsafe embed through untrusted metadata displayed in curation UI.
- Regression in token-gated API behavior through test fixture drift.

