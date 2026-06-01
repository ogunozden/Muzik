# Threat Model: Batch Lifecycle Validation Gate

## Assets

- `output/external-reference-coverage/summary.json` batch report and review queue counts.
- 3000-eser source curation validation command.
- Accepted-only auto-attach and duplicate accepted URL identity policies.
- Operator-facing `/references/curation` batch evidence.

## Trust Boundaries

- Generated audit artifacts cross from batch scripts into validation and UI reporting.
- A malformed or incomplete `batchReport` could claim production readiness without the full batch lifecycle.
- Accepted source candidates must not be mixed with review-only search candidates.

## Security Invariants

- The batch report must declare the required lifecycle: ingest, normalize, dedupe, provider-profile-classify, candidate-generate, confidence-score, status-assign, safe-auto-attach-accepted-only, validate, coverage-report.
- The report must carry accepted-only auto-attach and duplicate accepted URL identity policy text.
- Validation gates must include catalog id, accepted identity dedupe, status contract, review-only queue, profile-count drift, summary-count drift, and metadata strategy drift.
- The real 3000-eser validation command must pass after the gate is added.
- No secrets or local operation tokens may be added.

## Reviewed Scope

- `scripts/lib/source-curation-validation.mjs`
- `scripts/lib/__tests__/source-curation-validation.test.mjs`
- `PROJECT_PLAN.md`
- Browser evidence for `/references/curation`
