# Repository Threat Model: Muzik

## Product Surfaces

Muzik is a Turkish music study and production platform with browser-rendered Next.js pages, local/admin curation surfaces, generated SymbTr catalog artifacts, audio/rhythm engines, PDF/notation review artifacts, and batch scripts that read and write local JSON/CSV manifests.

## Assets

- Real catalog and curation data for roughly 3000 SymbTr entries.
- Accepted external references and source quality policy used by user-facing views.
- Operator-only curation decisions, feedback, manual corrections and import/export manifests.
- Local operation token guarding state-changing reference operations.
- Generated coverage, dedupe, review queue, PDF layout and browser evidence artifacts.

## Trust Boundaries

- Public/tokenless browser pages versus token-protected local/admin operations.
- User/operator supplied JSON, CSV, Markdown and text imports crossing into local manifests.
- Generated review/search candidates versus validated accepted source data.
- External URLs and provider metadata crossing into UI rendering and embed/preview decisions.
- Local filesystem writes by scripts and API helpers, which must remain under fixed project paths.

## Security Invariants

- Accepted sources are the only inputs eligible for auto-attach; review/conflict/deferred candidates must never become accepted implicitly.
- Tokenless snapshots may expose safe aggregate state but must not leak operator-only raw source URLs or secrets.
- Batch decision artifacts may reject, defer or mark conflict, but must not carry accepted source IDs or source URLs.
- Import paths must validate catalog IDs, statuses, HTTPS URL policy, duplicate accepted identities and stale fingerprints before mutating manifests.
- UI rendering must use React escaping and avoid raw HTML sinks for artifact data.
- Script output paths must be fixed or proven inside the project root.
