# Security Review: detail source facets

## Scope

- Scan mode: Codex Security scoped local-patch diff scan for curation detail source-type, site, confidence, and manual-note facets.
- In-scope files: `src/features/references/ReferencesCurationDetail.tsx`, `src/app/references/curation/[catalogId]/__tests__/page.test.tsx`, `PROJECT_PLAN.md`, and generated browser/security evidence.
- Runtime evidence: targeted detail page test, full `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run curation:validate`, `npm run audit:security`, route layout guard, and Playwright browser QA passed.
- Secret scan: added-line pattern hits were limited to token UI/test labels; no real secret, API key, bearer token, or private key was introduced.
- Explicit exclusions and limitations: this scan covers the source facet delta only. It does not claim final completion of the wider `goal.md` objective, including external coverage expansion and PDF verified-box promotion.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for scoped UI filtering delta |
| Coverage | 2 changed source-like rows plus browser/runtime validation |
| Validation mode | Source review, deterministic local-patch worklist, secret-pattern scan, tests, build, curation validation, npm audit, layout/browser QA |

## Threat Model

The scoped change affects local/admin curation detail filtering. Assets are accepted source attachments, source metadata, manual correction notes/tags, confidence scores, operator tokens, and real catalog metadata. Trust boundaries are browser-controlled filter selections, source URLs parsed for host display, and token-protected `/api/external-references` refresh/mutation calls. Security invariants: filters must only narrow already-authorized display state, URL parsing must not trigger network fetches or navigation, manual notes must remain operator-visible metadata only, and no token or secret value may be written into generated artifacts.

## Findings

### No findings

No reportable security issue was found. The added source-type, site, confidence, and manual-note facets perform local equality or scope checks against curation detail state already loaded through the existing operation-token protected API. Hostname extraction uses `new URL()` for parsing only and does not fetch, redirect, or inject HTML.

The browser UI displays facet values and counters without creating new mutation paths. Existing source lifecycle actions remain in the token-protected feedback workflow from the previous phase.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/features/references/ReferencesCurationDetail.tsx` | Unsafe URL/site handling | No issue found | Hostname parsing is display-only and invalid URLs are ignored. |
| `src/features/references/ReferencesCurationDetail.tsx` | Filter injection / data leak | No issue found | Facets are local predicates over authorized curation state. |
| `src/features/references/ReferencesCurationDetail.tsx` | Manual note exposure | No issue found | Manual-note facet exposes presence/count of existing operator correction metadata only. |
| `src/app/references/curation/[catalogId]/__tests__/page.test.tsx` | Missing regression coverage | No issue found | Test covers the new controls. |
| Browser detail route | Layout/console regression | No issue found | Playwright confirmed controls and 0 warning/error console messages after tokened refresh. |

## Open Questions And Follow Up

- Continue the broader `goal.md` backlog: external source coverage is still low and PDF verified measure boxes remain unpromoted.
