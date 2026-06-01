# Security Review: Muzik batch-lifecycle-validation-20260601

## Scope

- Scan mode: scoped working-tree security review for the batch lifecycle validation gate.
- In-scope code and artifacts: `scripts/lib/source-curation-validation.mjs`, `scripts/lib/__tests__/source-curation-validation.test.mjs`, `PROJECT_PLAN.md`, and `output/playwright/references-curation-batch-lifecycle-validation-20260601.png`.
- Runtime and validation status: focused validator tests, full tests, lint, typecheck, build, curation validation, external-reference audit, security audit, SymbTr measure verification, layout guard, and browser evidence were run for this phase.
- Context: the threat model was generated during Phase 1 for this scoped change and saved at `artifacts/01_context/threat_model.md`.
- Explicit exclusions: unrelated old untracked screenshots, `.agents/`, and `symb/` were not part of this scoped phase.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 4/4 scoped rows closed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Source review, test review, automated validation, browser evidence, and secret-pattern scan |

## Threat Model

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

## Findings

| Severity | Confidence | Title |
| --- | --- | --- |
| none | high | No reportable findings |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable findings survived discovery. The change hardens validation by making the batch lifecycle, accepted-only auto-attach policy, duplicate accepted URL identity policy, and core validation gates mandatory in the generated coverage summary. The real curation validation still passes for 3000 catalog entries, 7 auto-attached accepted references, and 11,912 review queue rows.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/source-curation-validation.mjs` | Batch report integrity, accepted-only policy, duplicate URL identity policy | No issue found | Validation now fails if required lifecycle steps or policy strings are omitted or altered. |
| `scripts/lib/__tests__/source-curation-validation.test.mjs` | Regression coverage | No issue found | Tests reject incomplete lifecycle reports and missing policy/gate declarations. |
| `PROJECT_PLAN.md` | Governance documentation | No issue found | Open TODO records the new validation gate and remaining PDF verification work. |
| Browser evidence | Operator UI evidence | No issue found | `/references/curation` renders batch report and queue with no console errors or warnings. |
