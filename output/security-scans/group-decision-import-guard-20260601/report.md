# Security Review: Muzik group decision import guard

## Scope

- Scan mode: local patch diff against `HEAD` on branch `codex/batch-curation-pipeline`.
- In-scope code: `scripts/import-candidate-review-group-decisions.mjs` and `scripts/__tests__/import-candidate-review-group-decisions.test.mjs`.
- Supporting artifacts: `output/security-scans/group-decision-import-guard-20260601/artifacts/02_discovery/deep_review_input.csv`, `output/security-scans/group-decision-import-guard-20260601/artifacts/02_discovery/work_ledger.jsonl`, and `output/security-scans/group-decision-import-guard-20260601/artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test status: focused Vitest import tests passed, and external reference audit passed after the security fix.
- Explicit exclusions: unrelated untracked screenshots, `.agents/`, `symb/`, and broader product surfaces not changed by this diff.
- Threat model source: generated during this scan from repository evidence and copied into the per-scan context artifact.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no finding for reviewed diff rows |
| Coverage | 2 of 2 `deep_review_input.csv` rows closed in `work_ledger.jsonl` |
| Validation mode | Source review plus focused regression tests and external reference audit |

## Threat Model

# Muzik Repository Threat Model

## Assets

- Real Turkish music catalog data, curated reference manifests, candidate review queues, and source/provider policy files.
- Local admin and operator workflows that can import or write curation decisions.
- User-facing study surfaces that render SymbTr metadata, notation/PDF candidates, external links, and media embeds.
- Build, validation, and generated audit artifacts used as release evidence.

## Trust Boundaries

- Local/imported JSON manifests cross into trusted repository data only through validation scripts.
- External provider URLs and search candidates are untrusted until accepted by policy and validation.
- Browser-visible media and external links must remain sandboxed, HTTPS-only where required, and clearly separated between candidate and verified data.
- Generated output under `output/` is reproducible audit evidence, not a source of truth unless a script explicitly consumes a validated artifact.

## Attacker-Controlled Inputs

- Candidate review decision import files passed to local scripts.
- External source URLs, provider metadata, and curation manifests.
- Catalog text fields that later appear in generated search URLs, UI tables, and reports.

## Security Invariants

- Only accepted and validated sources may be auto-attached as curated references.
- `needs-review`, `rejected`, `deferred`, and `conflict` candidates must not become trusted user-facing sources.
- Import scripts must reject out-of-project file paths and stale, forged, or mismatched decision records.
- Batch tooling must fail closed when generated artifacts are missing, malformed, or drift from validation contracts.
- Real catalog data must not be overwritten by test/demo/mock data.

## Findings

| Severity | Confidence | Finding |
| --- | --- | --- |
| none | high | No reportable findings |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable findings survived discovery. A plausible integrity issue was identified during the scan before finalization: checking `groupId` and `catalogId` independently could allow a stale or forged decision to mix a valid group id with a different valid catalog id. The patch now validates the exact generated `(groupId, catalogId)` pair before any merge or write, and the regression test rejects mismatched pairs.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/import-candidate-review-group-decisions.mjs` | Local import trust boundary, path safety, manifest write integrity | No issue found | `--input` is constrained to the project root, incoming decisions must match generated review group pairs, preview validation runs before `--write`, and output path is fixed. |
| `scripts/__tests__/import-candidate-review-group-decisions.test.mjs` | Regression coverage for fail-closed import behavior | No issue found | Covers valid write, unknown generated group rejection, and mismatched `groupId`/`catalogId` rejection. |