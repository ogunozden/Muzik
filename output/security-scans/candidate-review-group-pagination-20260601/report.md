# Security Review: Muzik candidate-review-group-pagination-20260601

## Scope

- Scan mode: scoped working-tree security review for candidate review group pagination, filtering, export, and rendered curation UI controls.
- In-scope code and artifacts: `src/app/api/external-references/route.ts`, `src/features/references/ReferencesCurationDashboard.tsx`, `src/app/api/external-references/__tests__/route.test.ts`, `src/app/references/curation/__tests__/page.test.tsx`, and Playwright screenshots for this phase.
- Runtime and validation status: focused tests, full tests, lint, typecheck, build, curation validation, architecture guard, security audit, layout guard, and browser evidence were run for this phase.
- Context: the threat model was generated during Phase 1 for this scoped change and saved at `artifacts/01_context/threat_model.md`.
- Explicit exclusions: unrelated old untracked screenshots, `.agents/`, and raw `symb/` archive files were not part of this scoped phase.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 7/7 scoped rows closed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Source review, automated tests, bounded-query review, browser evidence, and npm audit |

## Threat Model

## Assets

- Candidate review group artifact for 2,978 missing curated-reference catalog entries.
- Token-gated `/api/external-references` local curation API.
- Operator `/references/curation` UI and filtered export payloads.
- Accepted-only auto-attach manifest and bulk candidate import path.

## Trust Boundaries

- Local operator query parameters filter generated review-only group artifacts.
- Filtered export payloads cross from server-side artifact reads into browser-visible JSON text areas.
- Review-only group exports must remain separate from accepted candidate import and auto-attach flows.
- External-reference operations token controls access to curation state and exports.

## Security Invariants

- Group rows and group exports must not carry accepted source IDs or source URLs.
- Group pagination/filter/export must remain read-only and must not trigger auto-attach.
- Query parameters are bounded to prevent unbounded export or render pressure.
- Existing local-operation token guard must protect the new group export action.
- UI must label groups as review work, not verified source evidence.

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

No reportable findings survived discovery. The new group pagination and export path is token-gated, read-only, bounded, and stays separate from accepted candidate import and auto-attach flows. Browser evidence confirmed the operator can filter/export conflict groups and page group rows without console warnings, errors, or horizontal overflow.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Token-gated group export and bounded pagination | No issue found | New action is allowlisted, token protected, read-only, bounded, and does not shell out. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Operator UI action safety | No issue found | Group controls only filter, page, and export review group JSON. |
| API tests | Contract regression | No issue found | Group pagination/filter and export behavior are covered. |
| Dashboard tests | Rendered workflow regression | No issue found | Group filter, export, and next-page request are covered. |
| Browser evidence | Runtime and layout health | No issue found | Desktop/mobile runs had no console warning/error and no horizontal overflow. |

