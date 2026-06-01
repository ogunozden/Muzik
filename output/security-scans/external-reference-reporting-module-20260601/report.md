# Security Review: Muzik external reference reporting module

## Scope

- Scan mode: local patch diff scan against `HEAD`.
- In-scope code: `scripts/lib/external-reference-reporting.mjs`, `scripts/lib/external-reference-audit.mjs`, and `scripts/lib/__tests__/external-reference-reporting.test.mjs`.
- Supporting artifacts reviewed: `artifacts/02_discovery/deep_review_input.csv`, `artifacts/02_discovery/work_ledger.jsonl`, and `artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test status: focused Vitest, full test suite, lint, typecheck, build, curation validation, external reference audit, SymbTr measure validation, npm audit, browser UI evidence, and diff whitespace checks were run for this phase.
- Explicit exclusions: unrelated untracked local files and prior screenshot artifacts were not reviewed for this diff scan.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | no findings |
| Coverage | 3 diff-scoped source/test files reviewed |
| Validation mode | Discovery found no technically plausible candidates; validation and attack-path analysis were closed as not applicable. |

## Threat Model

## Assets
- External reference coverage matrix, dedupe reports, batch summary counts, and generated curation artifacts.
- Accepted source identity policy that prevents duplicate accepted URLs and source ids from being auto-attached.
- Operator-facing `/references/curation` metrics used to decide batch work and safe source promotion.

## Trust Boundaries
- Catalog, provider profile, feedback, and bulk candidate manifests enter reporting scripts as local JSON data.
- Review-only candidate rows must remain separate from accepted source records when rendered into coverage and dedupe reports.
- Generated reports are consumed by validators, UI, and operator review workflows.

## Attacker Model
- A malicious or mistaken operator/contributor can introduce malformed batch manifests or duplicate accepted identities.
- A future code change can weaken dedupe counting or accidentally include accepted source fields in review-only coverage reports.

## Security Objectives
- Preserve accepted-only auto-attach and duplicate identity fail-closed behavior.
- Keep reporting deterministic and side-effect free aside from the audit layer writing generated artifacts.
- Avoid secret handling, process execution, external network access, and unencoded URL construction in reporting helpers.

## Findings

| Severity | Finding | Confidence |
| --- | --- | --- |
| none | No findings | high |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable security findings survived discovery. The changed reporting module performs deterministic in-memory aggregation for coverage and dedupe reports. It does not read secrets, execute commands, write files, call the network, alter API access control, or promote review candidates into accepted references. Accepted URL identity normalization remains in the audit layer and is injected into the reporting helper, preserving the existing duplicate identity policy without adding a circular dependency.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-reporting.mjs` | Coverage reporting, dedupe accounting, unsafe promotion | No issue found | Pure report builders keep review-only data separate and require injected accepted identity normalization. |
| `scripts/lib/external-reference-audit.mjs` | Refactor integration and policy preservation | No issue found | Existing export surface remains; dedupe report receives `getReferenceIdentity` from the audit module. |
| `scripts/lib/__tests__/external-reference-reporting.test.mjs` | Regression coverage | No issue found | Covers duplicate URL identity accounting and coverage matrix no-source-field invariant. |

## Open Questions And Follow Up

- Continue later full-goal security review for import/write actions in `/api/external-references` when those routes are changed; this diff did not modify those sinks.
