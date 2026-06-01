# Security Review: Muzik candidate review module

## Scope

- Scan mode: local patch diff scan against `HEAD`.
- In-scope code: `scripts/lib/external-reference-candidate-review.mjs`, `scripts/lib/external-reference-audit.mjs`, and `scripts/lib/__tests__/external-reference-candidate-review.test.mjs`.
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
- Curated Turkish music catalog metadata, source profile policy, auto-attached reference manifests, candidate review queues, and operator decisions.
- Local admin/API operations under `/api/external-references`, including batch import/export, audit, auto-attach, stats, feedback, and decision import flows.
- Generated evidence artifacts under `output/external-reference-coverage` and `output/playwright`.

## Trust Boundaries
- Browser/operator input crosses into local Next.js API routes and script runners.
- External source URLs, provider profiles, and batch manifests cross from untrusted or semi-trusted research data into deterministic curation artifacts.
- Generated candidate rows are intentionally lower trust than accepted source records and must not be promoted without accepted status or explicit operator decision.

## Attacker Model
- A local or authenticated operator can submit malformed manifests, URLs, filters, or curation decisions.
- A malicious external page/provider can influence observed metadata or search-result candidates.
- A repository contributor can alter batch policy, scoring, and validation gates in ways that accidentally promote unsafe candidates.

## Security Objectives
- Keep needs-review/conflict candidates separated from accepted references and prevent automatic attachment of unaccepted data.
- Preserve token-gated local operations and avoid weakening API authorization or production safety checks.
- Keep generated URLs encoded and bounded; avoid command injection, path traversal, secret disclosure, and unsafe filesystem writes.
- Maintain auditable validation, coverage, and browser evidence for batch pipeline changes.

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

No reportable security findings survived discovery. The changed module only performs deterministic candidate-row, candidate-group, and group-decision recommendation construction. It does not read secrets, execute commands, write files, call the network, alter API access control, or promote candidates into accepted references. Candidate search URLs encode user/catalog-derived query text with `encodeURIComponent`, and regression coverage asserts review candidates do not carry `sourceId` or `sourceUrl` fields that could be mistaken for accepted attachments.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-candidate-review.mjs` | Candidate generation, URL encoding, unsafe promotion | No issue found | Review rows are derived from backlog/profile data, search queries are URL-encoded, and no accepted source fields are emitted. |
| `scripts/lib/external-reference-audit.mjs` | Refactor integration and export compatibility | No issue found | Existing audit flow delegates to the extracted module; write paths and validation behavior remain in the audit layer. |
| `scripts/lib/__tests__/external-reference-candidate-review.test.mjs` | Regression coverage for data safety | No issue found | Test covers conflict/needs-review grouping and asserts no `sourceId`/`sourceUrl` on generated candidates. |

## Open Questions And Follow Up

- Continue later full-goal security review for import/write actions in `/api/external-references` when those routes are changed; this diff did not modify those sinks.
