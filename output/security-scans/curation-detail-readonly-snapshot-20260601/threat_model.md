# Threat Model: Curation Detail Read-Only Snapshot

## Product Surfaces
- `/references/curation/[catalogId]` accepted-source detail page.
- `/api/external-references` protected curation operations.
- Local batch curation artifacts that feed the read-only UI.

## Assets
- Accepted source URLs and metadata, catalog metadata, operator feedback events, manual corrections, embed-state diagnostics, and operations token.

## Trust Boundaries
- Catalog id is user-controlled route input but must not influence filesystem paths.
- Tokenless users may see accepted source views only.
- Full state and mutations require the ops token.

## Security Invariants
- Read-only detail snapshots may expose accepted source links but not operator feedback logs, manual correction notes, or embed failure diagnostics.
- The detail page must read only fixed artifact paths.
- Mutation actions remain token-protected.
