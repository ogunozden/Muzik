# Security Review: Muzik curation queue pagination diff

## Scope

- Scan mode: Codex Security diff scan, scoped to the curation queue pagination wave.
- In-scope code: `src/app/api/external-references/route.ts`, `src/features/references/ReferencesCurationDashboard.tsx`, `scripts/lib/external-reference-audit.mjs`, and the related route/dashboard/audit tests.
- Runtime evidence: `npm run audit:security` returned 0 vulnerabilities; `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run curation:validate`, and curation browser QA passed.
- Explicit exclusions: broader dirty worktree changes outside this wave were not security-reviewed here; GitNexus still reports repository-wide CRITICAL scope because the working tree contains many other pending files.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for reviewed curation queue diff |
| Coverage | 3 changed source surfaces plus related tests/docs evidence |
| Validation mode | Source review, route tests, runtime API smoke, browser QA, npm audit |

## Threat Model

The reviewed subsystem is a local/admin external-reference curation surface for a Turkish music catalog. Assets include the 3000-entry SymbTr catalog, accepted external reference manifests, source feedback events, local generated audit artifacts, and the operations token that gates curation actions. Trust boundaries are the browser-to-Next API boundary, local generated JSON/CSV artifacts read by the API, operator-supplied staging/feedback POST bodies, and external source URLs that remain metadata only until validation accepts them. Attacker-controlled input relevant to this diff is limited to GET query parameters for backlog pagination/filtering and previously existing POST bodies for staging or curation actions. Security invariants: production curation APIs require the operations token, GET pagination cannot choose arbitrary filesystem paths, user-supplied limits are bounded, POST script execution remains on fixed script names and fixed argument construction, and accepted sources are still governed by provider verification plus validation gates.

## Findings

### No findings

The diff did not introduce a plausible security vulnerability. The new GET parameters are parsed from `URLSearchParams`, normalized to string filters, and bounded with `MAX_BACKLOG_LIMIT = 500`; `backlogOffset` is clamped to the filtered queue range. The backlog file paths are constants under `output/external-reference-coverage`, not request-derived paths. The route still calls `getAccessError` before returning state or running operations, and production mode still requires `EXTERNAL_REFERENCE_OPERATIONS_TOKEN`. The audit writer still writes inside the project through `assertInsideProject`, and the new JSON artifact contains catalog queue metadata rather than secrets or downloaded media.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source and runtime evidence supports the conclusion with no unresolved reachability blocker. |
| medium | Source evidence supports a plausible issue, but runtime or deployment proof is incomplete. |
| low | Weak or incomplete evidence. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Authorization, path traversal, denial of service | No issue found | Operations token gate remains first; file paths are constants; `backlogLimit` is capped at 500 and offset is clamped. |
| `scripts/lib/external-reference-audit.mjs` | Filesystem writes, data safety | No issue found | New full backlog JSON is written next to existing CSV through the existing project containment helper. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Client-side data exposure/state change | No issue found | UI only sends token-authenticated GET parameters for filtering and existing POST action bodies; no secret value is rendered. |
| Generated backlog artifact | Sensitive data exposure | No issue found | Artifact contains catalog ids, metadata, status/facet fields, and safe search URLs; no media is downloaded and no credentials are stored. |

## Open Questions And Follow Up

- Before push, run a broader Codex Security scan over the full pending working tree or split the work into commits so each scan target is reviewable.
- Resolve the GitNexus CRITICAL dirty-worktree scope before a final publish step; the current phase was reviewed, but the repository still has many unrelated pending changes.
