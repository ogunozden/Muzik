# Security Review: Muzik PDF Review Batch Plan

## Scope

- Scan mode: Codex Security diff scan for the local working-tree PDF review batch-plan changes.
- In-scope artifacts: `scripts/render-symbtr-pdf-layout-review.mjs`, `scripts/validate-symbtr-layout-verification.mjs`, `scripts/__tests__/render-symbtr-pdf-layout-review.test.mjs`, `output/symbtr-layout-review/layout-verification-review-batch-plan.json`, and `output/symbtr-layout-review/layout-verification-summary.json`.
- Runtime evidence considered: `npm run verify:symbtr-measures`, targeted Vitest coverage, full test/build gates, and browser QA on fixed port `4015`.
- Explicit exclusions: old unrelated untracked screenshots, `.agents/`, and `symb/` were not part of this diff scan.
- Threat model source: generated during Phase 1 for this repository and copied unchanged into `artifacts/01_context/threat_model.md`.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | no findings |
| Coverage | 5 diff-scoped rows completed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Discovery produced no candidate findings; validation and attack-path analysis were not applicable. |

## Threat Model

# Repository Threat Model: Muzik

Product surfaces: Next.js pages and APIs, local/admin curation panels, generated SymbTr artifacts, audio/rhythm engines, PDF/notation review artifacts, and batch scripts that transform catalog or operator data.

Assets: the 3000 eser catalog, accepted external references, operator review decisions, local operation tokens, generated PDF/notation artifacts, and source-provider classification policy.

Trust boundaries: public/tokenless pages versus local/operator actions; operator JSON/CSV imports; generated candidates versus accepted/verified data; external URLs; archive contents; and local filesystem writes under project output paths.

Attacker-controlled or cross-boundary inputs: catalog/provider manifests, curation imports, source URLs, archive member metadata, route/query inputs, browser-rendered generated artifacts, and any manually reviewed batch packet that later feeds accepted data.

Required invariants: candidates must not become accepted or verified implicitly; tokenless snapshots must not leak privileged operator URLs, tokens, or raw secrets; batch decisions cannot carry accepted source IDs or URLs unless validated; imports must validate IDs, statuses, HTTPS policy, dedupe keys, and fingerprints; React rendering must escape user-controlled text; filesystem writes must remain project-contained; and source/provider policy must be centralized and auditable.

Repository-wide security failure modes: unsafe promotion of unreviewed candidate data into trusted manifests, filesystem writes outside the project root, XSS through rendered catalog/source text, SSRF or unsafe outbound reference handling, stale fingerprint acceptance, duplicate or conflicting source attachment, and accidental leakage of local-only operator state.

## Findings

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable findings were identified. The changed code adds a non-promoting PDF review batch plan and a validation gate that rejects accidental promotion into trusted measure-box data. The generated plan contains only `pdf-vector-candidate` rows with `reviewDecision: unreviewed`, `suggestedMeasureIndex: null`, and empty `promotionTemplate.measureBoxes`. The validator recursively fails if the batch plan carries `confidence: verified` or any non-empty `measureBoxes`.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/render-symbtr-pdf-layout-review.mjs` | Filesystem write and unreviewed candidate promotion | No issue found | Existing project-contained write guard remains in use; batch packets do not write verified data. |
| `scripts/validate-symbtr-layout-verification.mjs` | Trusted manifest validation and fail-closed promotion gate | No issue found | New validator requires exact review-template coverage and rejects `confidence: verified` or non-empty `measureBoxes` anywhere in the batch plan. |
| `scripts/__tests__/render-symbtr-pdf-layout-review.test.mjs` | Regression coverage | No issue found | Test asserts packet/candidate counts and no serialized verified confidence. |
| `output/symbtr-layout-review/layout-verification-review-batch-plan.json` | Generated candidate data | No issue found | Contains unreviewed candidate rows only, grouped into 10 staff-row packets. |
| `output/symbtr-layout-review/layout-verification-summary.json` | Generated validation summary | No issue found | Reports `verifiedMeasureBoxes=0`, `errors=[]`, and batch-plan coverage counts. |

## Open Questions And Follow Up

None for this precise diff scan. The broader product goal still has non-security backlog around curated external source coverage (`22/3000`) and PDF verified manifest coverage (`0`), both intentionally left candidate/review-gated in this phase.
