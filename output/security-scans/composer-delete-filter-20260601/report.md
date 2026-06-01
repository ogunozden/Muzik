# Security Review: composer and deletion filter delta

## Scope

- Scan mode: Codex Security scoped diff scan for `/api/external-references` composer facets and `/references/curation` Besteci/Silme filters.
- In-scope files: `src/app/api/external-references/route.ts`, `src/features/references/ReferencesCurationDashboard.tsx`, related route/page tests, `PROJECT_PLAN.md`, and browser evidence screenshot.
- Runtime evidence: targeted route/page tests, full `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run curation:validate`, `npm run audit:security`, route layout guard, Playwright browser QA, and `git diff --check` passed.
- GitNexus evidence: CLI impact for `ReferencesCurationDashboard` was LOW; CLI impact for external references `GET` was LOW. Pre-commit `detect-changes --scope staged` reported HIGH because API query/export and dashboard load-state flows are intentionally affected.
- Explicit exclusions: this scan does not cover actual deletion execution because this phase only adds filters for `delete-requested` and `deleted` states.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for scoped filter delta |
| Coverage | API query filters/facets, dashboard filters, tests, browser QA |
| Validation mode | Source review, GitNexus CLI impact, tests, build, layout/browser QA, npm audit |

## Threat Model

The scoped change adds exact metadata filters over generated curation data. Assets are catalog/review queue metadata, auto-attached source statuses, and the local operator token. Trust boundaries are URL query parameters, local generated artifacts, the operator dashboard, and test/browser execution. The controls must only narrow data visibility; they must not mutate source status, promote review rows, or expose the ops token.

## Findings

### No findings

No reportable security issue was found. The API normalizes composer query values as strings and compares them directly to generated row metadata. It does not build shell commands, filesystem paths, SQL, or network requests from the filter. The candidate export payload now includes the selected composer as a structured filter only.

The dashboard Besteci and Silme controls only filter visible state. Silme maps to `delete-requested` and `deleted` status display paths and does not add delete, restore, or destructive actions. Existing curation mutation paths remain behind the operations token and fixed action names.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Query handling | No issue found | Composer values are exact filters over generated metadata. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Unsafe mutation | No issue found | Besteci/Silme controls only filter visible rows. |
| `src/app/api/external-references/__tests__/route.test.ts` | Missing server coverage | No issue found | Composer facet and query behavior are tested. |
| `src/app/references/curation/__tests__/page.test.tsx` | Missing UI coverage | No issue found | Filter rendering and export payload are tested. |

## Open Questions And Follow Up

- Push still requires explicit current-turn confirmation because it changes remote repository state.
