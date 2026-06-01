# Security Review: Muzik curation state refactor local patch

## Scope
- Scan mode: local working-tree patch against `HEAD`.
- In-scope files: `PROJECT_PLAN.md`, `scripts/lib/source-curation-operations.mjs`, `scripts/lib/source-curation-state.mjs`, `scripts/lib/__tests__/source-curation-operations.test.mjs`.
- Runtime and validation evidence: architecture guardrails, external-reference audit, curation validation, lint, typecheck, Vitest, production build, npm audit, and diff whitespace check passed for this phase.
- Explicit exclusions: unrelated untracked `.agents/`, `symb/`, and pre-existing screenshots were not reviewed as part of this diff scan.
- Threat model was generated during Phase 1 for this repository-level scan context.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | no candidates emitted |
| Coverage | 4 diff-scoped source/doc/test files reviewed; every `deep_review_input.csv` row has a `work_ledger.jsonl` completion receipt |
| Validation mode | Discovery-only closure because no plausible candidates survived discovery |
| Primary artifacts | `output/security-scans/curation-state-refactor-20260601/artifacts` |

## Threat Model

## Product Surfaces
- Next.js App Router web UI for Turkish music study, eser following, rhythm, audio sample management, external reference management, and local/admin curation.
- Token-protected local operations APIs under `/api/external-references` and `/api/samples` that read/write generated manifests and source curation artifacts.
- Batch-first source curation scripts that read, validate, and write real catalog/reference manifests.

## Assets And Privileges
- Real 3000-entry SymbTr catalog metadata, curated external source manifests, source quality stats, review queues, and feedback/correction logs.
- Local operations tokens and environment configuration; token values must never be exposed in logs, reports, browser output, or committed files.
- User-facing trust signals: accepted vs needs-review/rejected/conflict, safe auto-attach policy, embed/source allowlists, and PDF verification status.

## Trust Boundaries
- Browser users can control UI filters, operation forms, imported candidate manifests, source URLs, and curation feedback requests.
- Operations APIs cross from browser input into local filesystem scripts and generated artifacts; token enforcement and loopback restrictions are critical.
- External URLs and provider metadata are untrusted until classified by central source profiles and validation gates.
- Script modules that mutate manifests must validate references against the catalog and auto-attached source registry before writing.

## Security Invariants
- Mutating operations require the configured operation token or explicitly safe loopback development mode.
- Accepted sources alone may be auto-attached; generated search candidates stay review-only until imported and validated.
- Feedback, manual correction, embed state, and source quality stats remain append/update operations tied to existing auto-attached references.
- Generated reports and logs must not contain secret token values.

## Relevant Failure Modes
- Token bypass or accidental token disclosure in UI, logs, reports, or tests.
- Orphan feedback/correction/embed rows corrupting curation state or misleading operators.
- Incorrect source status transitions causing needs-review/conflict sources to appear as accepted.
- Filesystem script misuse corrupting real curation data or generated manifests without validation gates.

## Findings

| Finding | Severity | Confidence | Category |
| --- | --- | --- | --- |
| No findings | none | high | none |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings
Discovery reviewed all diff-scoped rows and did not identify any technically plausible source-to-sink security issue. The new state module is read-only, uses fixed registry helpers, and does not change token handling, write paths, or validation gates.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Curation state module | Registry read boundaries | No issue found | Reads are constrained to existing `CURATION_PATHS` and `readJson`/`readCurationRegistries` helpers. |
| Curation operations module | Manifest mutation path | No issue found | Existing write functions and validation gates remain in `source-curation-events` / operations. |
| Test and plan updates | Runtime exposure | Not applicable | No production/runtime surface added. |

## Open Questions And Follow Up
None for this diff.
