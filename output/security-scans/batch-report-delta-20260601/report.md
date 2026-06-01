# Security Review: Muzik batch report delta

## Scope

- Scan mode: Codex Security scoped diff scan for the batch coverage/delta report change.
- In-scope files: `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, their tests, `src/features/references/ReferencesCurationDashboard.tsx`, `output/external-reference-coverage/summary.json`, and `PROJECT_PLAN.md`.
- Runtime evidence: targeted tests passed, `npm run audit:external-references` regenerated the 3000-entry report, `npm run curation:validate` returned `ok: true`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run audit:security`, route layout validation, Browser QA, and `git diff --check` passed for this phase.
- GitNexus evidence: `runExternalReferenceCoverageAudit`, `validateSourceCurationRegistries`, and `ReferencesCurationDashboard` pre-edit impacts were LOW individually; post-change `detect_changes(scope=unstaged)` reports CRITICAL because the validator participates in shared curation flows.
- Explicit exclusions: this scan does not claim new external sources are verified; it covers the reporting and validation mechanics for the current batch pipeline.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for scoped batch report delta |
| Coverage | Audit batch report generation, validation drift gate, generated summary artifact, dashboard aggregate display |
| Validation mode | Source review, GitNexus impact, targeted tests, full build/lint/typecheck, curation validation, Browser QA, npm audit |

## Threat Model

The scoped change adds machine-readable batch coverage reporting for the local/admin external-reference curation pipeline. Assets are the 3000-entry SymbTr catalog, accepted bulk candidate metadata, generated review queue counts, validation gate names, and the browser-visible curation dashboard. Trust boundaries are local generated JSON under `output/external-reference-coverage`, operator-authenticated `/api/external-references` state reads, and dashboard rendering of aggregate counts. Security invariants are: generated reports must not add caller-controlled filesystem paths, executable script names, credentials, raw media, or accepted source URLs from review-only rows; `needs-review` and `conflict` candidates remain review-only; summary counts must match generated queue rows and enabled profiles; and UI display must stay read-only aggregate metadata.

## Findings

### No findings

No reportable security issue was found in this scoped change. The audit script only adds `batchReport` to the existing fixed `summary.json` output; it does not introduce new request input, shell execution, network fetches, filesystem path selection, or media download. The report records aggregate batch counts, status/profile summaries, validation gate names, and accepted catalog ids that were already counted from the accepted bulk candidate manifest. Review-only candidates remain summarized as `needs-review` or `conflict` and are still not converted into accepted sources.

The validator now makes the new artifact stricter rather than weaker. It rejects non-integer batch fields, mismatch between `batchReport` and top-level coverage counts, mismatch between generated review candidates and actual queue rows, mismatch between review candidates and missing entries times enabled profile count, candidate review status summaries outside review-only statuses, and empty validation gate lists. The dashboard renders only aggregate counts and the gate count, so no operation token or raw source manifest is exposed.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-audit.mjs` | Data exposure, unsafe promotion, count drift | No issue found | `batchReport` contains aggregate counts, status/profile summaries, catalog ids already present in accepted manifest summary, and policy text; it does not write new caller-selected paths or promote review rows. |
| `scripts/lib/source-curation-validation.mjs` | Validation bypass, stale summary acceptance | No issue found | New validator checks batch report counts against coverage summary, candidate review row count, missing x enabled profile count, review-only statuses, and non-empty validation gates. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Secret exposure, unsafe operator action | No issue found | UI renders aggregate batch counts and validation gate count only; no token, raw manifest body, or accepted source mutation is introduced. |
| `output/external-reference-coverage/summary.json` | Generated artifact integrity | No issue found | Refreshed via `npm run audit:external-references`; `npm run curation:validate` returned `ok: true` for 3000 catalog entries and 11912 review rows. |

## Open Questions And Follow Up

- Push still requires explicit current-turn confirmation after reviewing this commit and the broader staged baseline.
