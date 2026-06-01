# Threat Model

## Assets
- Curated Turkish music catalog metadata, source profile policy, auto-attached reference manifests, candidate review queues, and operator decisions.
- Local admin/API operations under `/api/external-references`, including batch import/export, audit, auto-attach, stats, feedback, and decision import flows.
- Generated evidence artifacts under `output/external-reference-coverage` and `output/playwright`.

## Trust Boundaries
- Browser/operator input crosses into local Next.js API routes and script runners.
- External source URLs, provider profiles, and batch manifests cross from untrusted or semi-trusted research data into deterministic curation artifacts.
- Generated candidate rows are intentionally lower trust than accepted source records and must not be promoted without accepted status or explicit operator decision.

## Attacker Model
- A local or authenticated operator can submit malformed manifests, URLs, filters, or curation decisions.
- A malicious external page/provider can influence observed metadata or search-result candidates.
- A repository contributor can alter batch policy, scoring, and validation gates in ways that accidentally promote unsafe candidates.

## Security Objectives
- Keep needs-review/conflict candidates separated from accepted references and prevent automatic attachment of unaccepted data.
- Preserve token-gated local operations and avoid weakening API authorization or production safety checks.
- Keep generated URLs encoded and bounded; avoid command injection, path traversal, secret disclosure, and unsafe filesystem writes.
- Maintain auditable validation, coverage, and browser evidence for batch pipeline changes.
