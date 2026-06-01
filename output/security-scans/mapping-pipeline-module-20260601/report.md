# Security Review: mapping pipeline module extraction

## Scope

- Scan mode: Codex Security scoped local-patch diff scan for external source mapping pipeline modularization.
- In-scope files: `scripts/map-external-source-inbox.mjs`, `scripts/lib/external-source-mapping-pipeline.mjs`, `scripts/lib/__tests__/external-source-mapping-pipeline.test.mjs`, `PROJECT_PLAN.md`, generated mapping artifact, browser screenshot evidence, and this scan bundle.
- Runtime evidence: focused Vitest, full `npm run test:run`, `npm run guardrails:architecture`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run audit:security`, `npm run map:external-references`, `npm run audit:external-references`, `npm run curation:validate`, `npm run verify:symbtr-measures`, `git diff --check`, route layout guard, and Playwright browser QA passed.
- Secret scan: added-line secret-pattern scan returned no matches.
- Explicit exclusions and limitations: this scan covers the mapping pipeline extraction and accepted-only merge hardening. It does not claim completion of event-log/stat module extraction, PDF verified measure promotion, or final 3000-catalog source coverage closure.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for scoped refactor delta |
| Coverage | 5 changed/evidence rows in `deep_review_input.csv` with work ledger receipts |
| Validation mode | Source review, deterministic local-patch worklist, secret-pattern scan, tests, build, npm audit, curation validation, layout/browser QA |

## Threat Model

The scoped change affects source mapping orchestration, metadata enrichment, candidate merging, generated report writes, and accepted-only manifest writes. Assets are real curation manifests, accepted/review/conflict status integrity, source profile policy, generated mapping artifacts, and operator-facing curation UI. Trust boundaries are local CLI arguments into project file paths, external metadata/oEmbed responses into mapping artifacts, and generated JSON into API/UI. Security invariants are project-contained writes, HTTPS/private-host metadata fetch protection, data-only metadata handling, duplicate accepted identity protection, and no automatic attach for non-accepted rows.

## Findings

### No Findings

No reportable security issue was found in the scoped patch.

The CLI file is now a thin wrapper around `runExternalSourceMappingPipeline`, reducing the amount of privileged file I/O and merge logic in the entrypoint. The extracted module preserves project-contained path checks, existing metadata fetch controls, deterministic report writes, and accepted-only bulk manifest behavior.

The merge layer was also hardened: `mergeAcceptedCandidates` skips any incoming candidate whose status is not `accepted`, so a future caller mistake cannot place `needs-review`, `rejected`, or `conflict` data into the accepted manifest through this path. Tests cover this fail-closed behavior and duplicate accepted URL identity handling.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when explicitly requested for follow-up candidates. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/map-external-source-inbox.mjs` | CLI boundary / path handling | No issue found | Wrapper delegates to module defaults and keeps no privileged logic. |
| `scripts/lib/external-source-mapping-pipeline.mjs` | Unsafe writes / status promotion | No issue found | Project-contained writes and accepted-only merge are preserved and hardened. |
| `scripts/lib/__tests__/external-source-mapping-pipeline.test.mjs` | Regression coverage | No issue found | Tests exercise metadata enrichment, duplicate identity skip, non-accepted skip, and accepted writes. |
| Generated mapping artifact | Data integrity | No issue found | Mapping output still reports 7 accepted, 1 needs-review, 0 rejected; no manifest write during map run. |
| Browser curation surface | Operator visibility | No issue found | UI shows 3,000 processed entries, 2,978 backlog, 11,912 queue, 7 accepted, no console warnings/errors. |

## Open Questions And Follow Up

- Continue the broader `goal.md` backlog: event-log/stat module extraction, PDF verified measure promotion, and real curated coverage expansion remain open.
