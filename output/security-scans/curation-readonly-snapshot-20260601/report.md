# Security Review: Muzik curation read-only snapshot local patch

## Scope
- Scan mode: local working-tree patch against `HEAD`.
- In-scope files: `PROJECT_PLAN.md`, `src/app/references/curation/page.tsx`, `src/features/references/ReferencesCurationDashboard.tsx`, `src/app/references/curation/__tests__/page.test.tsx`.
- Runtime and validation evidence: targeted curation/API tests, lint, typecheck, full test/build/validation/layout/browser gates for this phase.
- Explicit exclusions: unrelated untracked `.agents/`, `symb/`, and pre-existing screenshots were not reviewed as part of this diff scan.

## Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | no reportable candidates |
| Coverage | 3 diff-scoped source/test rows reviewed from `deep_review_input.csv`; `PROJECT_PLAN.md` reviewed as documentation-only context |
| Validation mode | Discovery closure with one rejected candidate after code hardening |
| Primary artifacts | `output/security-scans/curation-readonly-snapshot-20260601/artifacts` |

## Threat Model

## Product Surfaces
- Next.js App Router web UI for external reference curation, batch queue review, source quality stats, and local/admin operations.
- Token-protected `/api/external-references` state and mutation endpoints.
- Generated real-data curation artifacts under `output/external-reference-coverage` and `src/data/references`.

## Assets And Privileges
- 3000-entry SymbTr catalog metadata, accepted auto-attached source registry, candidate review queue/group artifacts, source feedback, manual correction, and embed state registries.
- Local operations token and protected curation API state.
- User-facing trust boundary between public read-only batch metrics and token-protected detailed curation operations.

## Trust Boundaries
- Tokenless browser users may load `/references/curation`.
- Only token-bearing operators may fetch full curation API state or run write/import/export actions.
- Server-rendered snapshot reads fixed local artifact paths and must not expose privileged token-protected details.

## Findings

| Finding | Severity | Confidence | Category |
| --- | --- | --- | --- |
| No findings | none | high | none |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/references/curation/page.tsx` | Tokenless server-rendered data exposure | No issue after hardening | Snapshot now omits source URLs, feedback events, manual corrections, and embed states; it reads only fixed project artifact paths with no user-controlled path input. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Client initialization and operation gating | No issue found | Initial state only seeds read-only UI; refresh, import/export, feedback, and mutation actions still call token-protected API paths. |
| `src/app/references/curation/__tests__/page.test.tsx` | Regression coverage | No issue found | Added coverage proves tokenless snapshot renders without fetching API state; route tests continue to assert API token requirements. |

## Rejected Candidates

| Candidate | Reason Rejected | Evidence |
| --- | --- | --- |
| Tokenless `/references/curation` could expose protected curation state in HTML | Fixed before closure | Server snapshot sanitizes auto-attached source views to remove `source.url`, drops `feedbackEvents`, `manualCorrections`, and `embedStates`, and API tests still require the configured operations token for full state. |

## Open Questions And Follow Up
None for this diff.
