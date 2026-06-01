# Security Review: detail facets and delete workflow

## Scope

- Scan mode: Codex Security scoped local-patch diff scan for curation detail facet filters and delete lifecycle controls.
- In-scope files: `src/features/references/ReferencesCurationDetail.tsx`, `src/app/references/curation/[catalogId]/__tests__/page.test.tsx`, `PROJECT_PLAN.md`, and generated browser/security evidence.
- Runtime evidence: targeted detail page test, full `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run curation:validate`, `npm run audit:security`, route layout guard, and Playwright browser QA passed.
- Secret scan: added-line pattern hits were limited to token UI/test labels and local test header names; no real secret, API key, bearer token, or private key was introduced.
- Explicit exclusions and limitations: this scan covers the new detail filters and lifecycle UI. It does not claim full completion of source-type/site/score/manual-note facets, which remain tracked as open work in `PROJECT_PLAN.md`.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for scoped UI/API workflow delta |
| Coverage | 2 changed source-like rows plus browser/runtime validation |
| Validation mode | Source review, deterministic local-patch worklist, secret-pattern scan, tests, build, curation validation, npm audit, layout/browser QA |

## Threat Model

The scoped change affects the local/admin external-reference curation detail surface. Assets are accepted source attachments, source lifecycle status, feedback event history, operator tokens, and real catalog metadata. Trust boundaries are browser-entered filter values, operator-triggered feedback actions, `/api/external-references` request bodies, and generated JSON registries. Security invariants: filters must only narrow display state, destructive lifecycle transitions must remain token-protected feedback events, no unaccepted candidate may be auto-attached, and browser-visible fields must not expose secrets.

## Findings

### No findings

No reportable security issue was found. The new besteci, güfteci, status, and silme filters operate only over in-memory curation reference data already returned by the tokened detail refresh. They do not construct SQL, shell commands, filesystem paths, HTML, or network destinations.

The new delete lifecycle controls use fixed event types and the existing `curation-feedback` API route. That route remains behind the external reference operation token and the added regression test verifies the `delete-requested` action includes `x-external-reference-ops-token`.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/features/references/ReferencesCurationDetail.tsx` | Unsafe mutation / token bypass | No issue found | Lifecycle buttons call token-protected `curation-feedback` with fixed event types. |
| `src/features/references/ReferencesCurationDetail.tsx` | Filter injection / data leak | No issue found | Filters are local equality checks over curation metadata. |
| `src/app/references/curation/[catalogId]/__tests__/page.test.tsx` | Missing regression coverage | No issue found | Tests cover facet visibility and tokened `delete-requested` payload shape. |
| Browser detail route | Layout/console regression | No issue found | Playwright confirmed controls and 0 warning/error console messages after tokened refresh. |

## Open Questions And Follow Up

- Continue the same detail surface with source type, site, confidence score, and manual-note facets so the full `PROJECT_PLAN.md` parça merkezli UI item can be closed.
