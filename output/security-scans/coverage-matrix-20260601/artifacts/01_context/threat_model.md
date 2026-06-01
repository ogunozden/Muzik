# Repository Threat Model

Assets: SymbTr catalog metadata, curated external-reference manifests, batch coverage outputs, local operator tokens, generated screenshots/reports, and user-facing curation pages.

Trust boundaries: local operator browser/API boundary, filesystem-backed JSON registries, generated output artifacts, external source URLs/search queries, and Next.js rendered UI. Operations that mutate curation data are guarded by loopback and ops-token checks.

Relevant attacker capabilities: malformed local registry data, unsafe source URLs, stale/generated artifacts drifting from summary counts, accidental accepted-source promotion, UI-triggered import/export misuse, and dependency or build-time regressions.

Primary controls: accepted-only auto-attach policy, HTTPS/source profile validation, review-only candidate queue, candidate group decision validation, coverage summary drift checks, layout/browser verification, npm audit, and token-gated local operations.
