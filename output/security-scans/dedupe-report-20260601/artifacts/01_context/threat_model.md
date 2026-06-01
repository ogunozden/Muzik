# Muzik Repository Threat Model

Assets: SymbTr catalog metadata, curated external-reference manifests, generated curation coverage artifacts, local operator tokens, source feedback/manual correction registries, screenshots/reports, and user-facing curation pages.

Trust boundaries: local operator browser/API boundary, filesystem-backed JSON registries, generated output artifacts, external source URLs/search queries, and Next.js rendered UI. Operations that mutate curation data are guarded by loopback and ops-token checks.

Attacker-controlled or risky inputs: staged external source URLs and metadata, bulk candidate manifests, generated review queues, candidate group decisions, source feedback/manual correction payloads, local operator form input, and stale or tampered output artifacts.

Primary invariants: auto-attach must remain accepted-only; review-only candidates must not carry source URLs as evidence; duplicate accepted identities must fail closed before attachment; generated artifact counts must drift-check against source registries; filesystem writes must stay under intended project output paths; operation tokens must not be exposed or weakened.

Security failure modes: unsafe source promotion, validation drift masking bad data, token-gated local operations becoming reachable without authorization, unsafe URL/embed handling, raw HTML/script injection in curation UI, path traversal in generated artifact writes, shell/script dispatch with user-controlled paths, and dependency or build-time regressions.
