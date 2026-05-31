# Security Review: Muzik candidate manifest import/export diff

## Scope

- Scan mode: Codex Security diff scan, scoped to the candidate manifest import/export wave.
- In-scope code: `src/app/api/external-references/route.ts`, `src/features/references/ReferencesCurationDashboard.tsx`, `scripts/import-external-reference-candidates.mjs`, `scripts/lib/external-reference-audit.mjs`, and related tests.
- Runtime evidence: `npm run audit:security` returned 0 vulnerabilities; `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run curation:validate`, `npm run audit:external-references`, `git diff --check`, route layout validation, API smoke, and Browser QA passed.
- Explicit exclusions: broader dirty worktree changes outside this wave were not security-reviewed here; GitNexus still reports repository-wide CRITICAL scope because the working tree contains many other pending files.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for reviewed candidate manifest diff |
| Coverage | API import/export action, CLI import validation, audit status validation, dashboard controls, tests, docs evidence |
| Validation mode | Source review, targeted tests, full test suite, runtime API smoke, Browser QA, npm audit |

## Threat Model

The reviewed subsystem is a local/admin candidate manifest workflow for external reference curation. Assets include the 3000-entry SymbTr catalog, `external-reference-bulk-candidates.json`, accepted source manifests, generated audit artifacts, and the operations token that gates admin actions. Trust boundaries are the browser-to-Next API boundary, operator-supplied JSON manifest text, fixed script execution from the API, temporary project files under `output/external-reference-coverage/ui-input`, and generated manifest JSON returned to the dashboard. Security invariants: production API access requires `EXTERNAL_REFERENCE_OPERATIONS_TOKEN`, import input cannot choose arbitrary script names or output paths, temp files stay under the project and are cleaned up, malformed or oversized JSON is rejected before script execution, only `accepted` candidates can affect curated/auto-attached source coverage, and `needs-review`/`rejected`/`conflict` remain review data.

## Findings

### No findings

The diff did not introduce a plausible security vulnerability. New API actions are added to the existing token-gated `/api/external-references` route, and `getAccessError` still runs before state reads or operations. `candidate-export` reads the fixed `src/data/references/external-reference-bulk-candidates.json` path and returns manifest data plus counts; the path is not request-derived and the manifest contains source metadata, not credentials. `candidate-import` accepts JSON text or a structured manifest object, bounds text length to 8 MB, parses JSON before writing, writes only to a random temp file below the existing project-local `ui-input` directory, invokes only `scripts/import-external-reference-candidates.mjs` with fixed arguments, passes `--dry-run` as a boolean flag, and deletes the temp file in `finally`. The import CLI validates catalog ids, status, dates, stable source ids, accepted-source HTTPS policy, YouTube oEmbed policy, and accepted URL identity dedupe. The added `conflict` status is explicitly not counted as accepted coverage by the audit and auto-attach paths.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source and runtime evidence supports the conclusion with no unresolved reachability blocker. |
| medium | Source evidence supports a plausible issue, but runtime or deployment proof is incomplete. |
| low | Weak or incomplete evidence. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Authorization, script injection, temp file abuse, denial of service | No issue found | Operations token gate remains first; action names are enum-checked; import uses fixed script args, 8 MB cap, JSON parse, temp cleanup. |
| `scripts/import-external-reference-candidates.mjs` | Data integrity, path traversal, unsafe merge | No issue found | Input is constrained to project path; catalog ids and accepted source policy are validated; accepted URL identity dedupe is deterministic. |
| `scripts/lib/external-reference-audit.mjs` | Auto-attach/coverage safety | No issue found | `conflict` is accepted as manifest status but only `accepted` candidates count as curated. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Accidental mutation, sensitive display | No issue found | Export fills a local textarea; import remains an explicit token-authenticated action with dry-run toggle. Browser QA did not run a real import. |

## Open Questions And Follow Up

- Before push, run a broader Codex Security scan over the full pending working tree or split the work into commits so each scan target is reviewable.
- Resolve the GitNexus CRITICAL dirty-worktree scope before a final publish step; the current phase was reviewed, but the repository still has many unrelated pending changes.
