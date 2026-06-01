# Security Review: Muzik curation detail read-only snapshot local patch

## Scope
- Scan mode: local working-tree patch against `HEAD`.
- In-scope files: `PROJECT_PLAN.md`, `src/app/references/curation/[catalogId]/page.tsx`, `src/features/references/ReferencesCurationDetail.tsx`, `src/app/references/curation/[catalogId]/__tests__/page.test.tsx`.
- Runtime and validation evidence: targeted detail/API tests, lint, typecheck, full Vitest suite, production build, curation validation, external-reference audit, npm audit, SymbTr verification guard, architecture guard, layout guard, and browser QA on port `4015`.
- Explicit exclusions: unrelated untracked `.agents/`, `symb/`, and pre-existing screenshots were not reviewed as part of this diff scan.

## Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | no reportable candidates |
| Coverage | 3 diff-scoped source/test rows reviewed from `deep_review_input.csv`; `PROJECT_PLAN.md` reviewed as documentation-only context |
| Validation mode | Discovery closure with no candidates surviving review |
| Primary artifacts | `output/security-scans/curation-detail-readonly-snapshot-20260601/artifacts` |

## Threat Model

## Product Surfaces
- `/references/curation/[catalogId]` server-rendered read-only detail page for accepted external references.
- `/api/external-references` token-protected state and mutation endpoints for feedback/manual correction/delete lifecycle.
- Local generated curation artifacts under `output/external-reference-coverage` and `src/data/references`.

## Assets And Privileges
- Accepted external reference URLs and source metadata that may be shown to users.
- Feedback events, manual corrections, embed-state failure diagnostics, and operations token that must remain operator-only.
- Catalog id route parameter, which is user-controlled but must only filter fixed local artifacts.

## Trust Boundaries
- Tokenless browser users may load accepted-source detail pages.
- Only token-bearing operators may fetch full curation API state or mutate feedback/manual correction state.
- Server-rendered snapshot crosses from local artifact storage to public HTML, so it must sanitize operator-only fields before hydration.

## Findings

| Finding | Severity | Confidence | Category |
| --- | --- | --- | --- |
| No findings | none | high | none |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/references/curation/[catalogId]/page.tsx` | Tokenless HTML data exposure, path handling | No issue found | Route param is decoded and used only as an equality filter over fixed artifact paths. Snapshot drops feedback events, manual corrections, source notes, and embed failure reason fields. |
| `src/features/references/ReferencesCurationDetail.tsx` | Client hydration and mutation gating | No issue found | Initial state only seeds read-only accepted-source UI; refresh, feedback, delete lifecycle, and manual correction actions still call token-protected API paths. |
| `src/app/references/curation/[catalogId]/__tests__/page.test.tsx` | Regression coverage | No issue found | Added coverage proves tokenless read-only detail render without fetching API state; existing tests continue to assert token-bearing feedback/manual correction calls. |

## Candidate Review Notes
- Public accepted source URLs remain intentionally visible on the detail page because the product requirement is safe external source viewing. These URLs are sourced from accepted/validated curation artifacts and are not accepted automatically from the read-only route.
- Browser QA confirmed zero console issues, no horizontal overflow, no feedback/manual correction/embed failure payload in HTML, and an accepted OGM source rendered from the real catalog snapshot.

## Open Questions And Follow Up
None for this diff.
