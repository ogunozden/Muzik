# Threat Model

Repository: Muzik
Scan: references-curation-runtime-audit-20260601

## Assets

- Read-only `/references/curation` snapshot rendered from batch artifacts.
- 3000-piece SymbTr catalog metadata, 2978 missing-source backlog and 14890 generated review candidates.
- Operator-only mutation flows guarded by `/api/external-references` token policy.
- Generated artifact paths and runtime evidence written under `output/playwright`.

## Trust Boundaries

- Browser HTML is user-visible and must not hydrate full raw review packets, source intake row fields or operator-only source evidence.
- Runtime audit fetches a local fixed route and writes a local JSON report only.
- External source metadata and review candidates remain untrusted until accepted import validation passes.

## Security Invariants

- The audit must be read-only: no POST, no token, no mutation, no import, no deletion.
- The route under test must stay fixed to `/references/curation` on localhost unless explicitly overridden by CLI.
- Generated evidence must contain metrics only, not secrets, raw packets, sourceFields, accepted credentials or private operator notes.
- A failing threshold must exit non-zero and block the phase.

