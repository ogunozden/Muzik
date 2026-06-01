# Muzik Repository Threat Model

## Assets And Privileges
- Curated Turkish music catalog data, accepted external reference records, candidate review queues, review group decisions, SymbTr metadata, PDF layout verification manifests, and local operator tokens are integrity-sensitive.
- Browser-facing pages expose catalog, notation, sample, rhythm, and curation workflows. The local curation API can mutate repository data only when explicitly enabled and authenticated with the configured operation token.
- Audio/sample and score routes must not expose arbitrary files, secrets, or unsafe embeds.

## Trust Boundaries
- Public browser users cross into Next.js route handlers through HTTP requests, route parameters, query filters, form inputs, and JSON request bodies.
- Local operator workflows cross a stronger boundary through `EXTERNAL_REFERENCE_OPERATIONS_ENABLED` and `x-external-reference-ops-token`.
- External reference URLs, provider search links, YouTube/archive embeds, and PDF/SymbTr-derived metadata are untrusted until validated and classified by central policy.
- Repository-local scripts and generated artifacts are trusted only after deterministic validation gates pass.

## Attacker-Controlled Inputs
- Route params, search/filter fields, JSON operation bodies, manifest import text, feedback payloads, candidate source URLs, external provider metadata, and browser-visible embed/source URLs.
- Any source marked `needs-review`, `conflict`, `rejected`, or `deferred` must remain non-authoritative and must not be auto-attached as accepted evidence.

## Security Invariants
- Curation mutations require the operation feature flag and valid operation token.
- Auto-attach is accepted-only; generated review candidates and group decisions cannot create accepted sources without a validated source URL.
- Provider/source classification, status contracts, duplicate policy, URL policy, and PDF verification promotion must be centralized and validated.
- Generated manifests must not leak secrets or unnecessary source data, must be bounded in size, and must preserve real catalog data.
- Browser previews must use safe HTTPS/provider rules, sandboxing, lazy loading, and fallback links.

## Repository-Wide Failure Modes
- Unauthorized curation mutation or unsafe local operation exposure.
- Incorrect promotion of untrusted candidates to accepted references.
- Source URL injection, unsafe embed/link rendering, or provider misclassification.
- Data loss or corruption through batch import/export.
- Path traversal or arbitrary file access in score/sample/PDF handling.
- Validation bypass that lets stale or malformed generated artifacts become project truth.
