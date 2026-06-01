# Threat Model: Archive Provider Profile

## Assets

- Central research source profile registry.
- 3000-eser external reference coverage summary.
- Candidate review queue artifacts.
- Auto-attached accepted reference manifest.
- Operator-facing `/references/curation` UI evidence.

## Trust Boundaries

- Provider profile configuration crosses into generated search URLs and review queue rows.
- Review-only archive search candidates must not be treated as accepted source evidence.
- Generated queue artifacts cross into API/UI pagination, filtering, and export.

## Security Invariants

- New provider profile URLs must be HTTPS and centrally validated.
- Archive candidates must stay review-only until imported as accepted source evidence.
- Auto-attached reference count must not grow from adding a search profile.
- Candidate review queue counts must match summary and per-profile validation.
- No secrets or local operation tokens may be committed.

## Reviewed Scope

- `src/data/references/research-source-profiles.json`
- `scripts/lib/source-curation-validation.mjs`
- `output/external-reference-coverage/summary.json`
- `output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json`
- `src/data/references/source-quality-stats.generated.json`
- Browser evidence for `/references/curation`
