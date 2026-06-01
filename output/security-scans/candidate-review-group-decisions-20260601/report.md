# Security Review: Muzik candidate-review-group-decisions-20260601

## Scope

- Scan mode: Codex Security diff scan for the working-tree patch adding candidate review group decision import, manifest validation, audit reporting, and UI controls.
- In-scope code and artifacts: `scripts/import-candidate-review-group-decisions.mjs`, `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, `scripts/validate-source-curation.mjs`, `src/app/api/external-references/route.ts`, `src/features/references/ReferencesCurationDashboard.tsx`, related tests, and generated coverage summary/CSV artifacts.
- Coverage artifacts: `artifacts/rank_input.csv`, `artifacts/deep_review_input.csv`, `artifacts/01_context/threat_model.md`, and `artifacts/02_discovery/work_ledger.jsonl`.
- Explicit exclusions: unrelated pre-existing untracked screenshots, `.agents/`, and raw `symb/` archive files were not part of this scoped phase.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 10/10 diff-scoped rows closed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Source review, fixed-command review, path-boundary review, tests, curation validation, browser/layout evidence, and npm audit |

## Threat Model

The scan treats the local operator API and batch JSON import as the primary trust boundary. Candidate review group decisions are operator-supplied review metadata; they must never become accepted source evidence, must never carry source IDs or URLs, must be catalog/group validated before persistence, and must remain behind the existing external-reference operations token.

## Findings

| Severity | Confidence | Title |
| --- | --- | --- |
| none | high | No reportable findings |

### No Findings

No reportable findings survived discovery. The new import path writes only to a fixed project manifest through a fixed `execFile` script invocation, bounds input size, rejects malformed JSON before temp-file dispatch, validates project-relative input paths, validates known catalog/group IDs, rejects `accepted`/`needs-review` persisted decisions, rejects source IDs and URLs, and keeps dry-run non-mutating. The API action remains allowlisted and protected by the existing operations token guard. The UI defaults group-decision import to dry-run and the browser evidence confirms the dry-run path without console warnings/errors or horizontal overflow.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Token gate, temp-file import, command invocation | No issue found | Action is allowlisted, token protected, fixed-script only, size bounded, and temp files are cleaned. |
| `scripts/import-candidate-review-group-decisions.mjs` | File/path safety and persistence | No issue found | Input must resolve inside project; output path is fixed; dry-run is default; validation runs before write. |
| `scripts/lib/external-reference-audit.mjs` | Decision application and report semantics | No issue found | Decisions can only mark generated groups rejected/conflict/deferred and never create accepted sources. |
| `scripts/lib/source-curation-validation.mjs` | Fail-closed data contract | No issue found | Validator rejects accepted/source URL leakage and checks group/status/decision drift. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Operator UI safety | No issue found | Import is explicit, dry-run defaults on, and decision textarea is separated from accepted candidate import. |
| Tests and browser evidence | Regression coverage | No issue found | Focused tests, full tests, build, curation validation, layout guard, and Playwright dry-run flow passed. |
