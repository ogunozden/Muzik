# Threat Model: candidate scoring evidence delta

## Scope

This scoped scan covers the batch curation scoring-evidence change in `scripts/lib/external-source-intake.mjs`, `scripts/lib/external-source-matcher.mjs`, `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, `src/features/references/ReferencesCurationDashboard.tsx`, the refreshed generated curation artifacts, and directly related tests.

## Assets

- 3000-entry SymbTr catalog metadata.
- Accepted external source candidate manifest.
- Review-only provider-profile candidate queue.
- Operator ops token used only for local curation API calls.
- Generated JSON/CSV reports under `output/external-reference-coverage`.

## Trust Boundaries

- Local generated artifacts are read by the admin/local `/api/external-references` route and rendered by `/references/curation`.
- Review queue rows remain search candidates, not accepted source evidence.
- CLI intake can accept pasted or CSV source metadata, but accepted auto-attach remains gated by validation and status policy.

## Security Invariants

- `needs-review` and `conflict` review rows must not carry accepted source ids or source URLs.
- Only `accepted` bulk candidates can be counted as curated or auto-attached.
- Query/scoring evidence must be declarative metadata, not executable input.
- Generated search URLs must remain HTTPS and profile-template controlled.
- Operator token values must not be written into generated artifacts or visible UI.
