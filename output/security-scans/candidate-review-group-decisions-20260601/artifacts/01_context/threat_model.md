# Threat Model: Muzik

Assets: SymbTr 3000-entry catalog, accepted-only auto-attach registry, generated candidate review queue/group artifacts, local operator curation API, operator token, and browser-rendered curation UI.

Trust boundaries: local operator JSON input crosses into token-gated API, temporary project files, import scripts, generated coverage artifacts, and browser-visible state. Search candidates and group decisions are review metadata only; accepted sources require validated HTTPS source metadata through the existing candidate import path.

Security invariants: review groups and group decisions must not carry source URLs/source IDs, must not create accepted candidates, must not bypass ops token, must stay bounded/idempotent, must validate catalog/group IDs before writing, and must keep dry-run non-mutating.
