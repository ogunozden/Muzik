# Threat Model: Curation Read-Only Snapshot

## Product Surfaces
- `/references/curation` server-rendered read-only batch dashboard.
- `/api/external-references` token-protected state and write/import/export operations.
- Local generated curation artifacts used by the batch-first 3000-eser pipeline.

## Assets
- SymbTr catalog metadata, candidate queues, auto-attached accepted reference registry, feedback/manual correction/embed state registries, source profile statistics, and operations token.

## Trust Boundaries
- Public/tokenless browser page load crosses from unauthenticated user to server-rendered read-only data.
- Token-protected API remains the boundary for full state and mutations.
- Local filesystem artifacts are trusted only through fixed repo-relative paths.

## Security Invariants
- Tokenless snapshot may show aggregate metrics and bounded batch queues, but not privileged source URLs, feedback logs, manual corrections, embed states, or token values.
- Write/import/export/refresh operations still require the operations token.
- Accepted-only auto-attach policy is unchanged.
