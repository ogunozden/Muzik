# Security Review: Muzik Candidate Review Packet Import

## Scope

- Scan mode: diff-scoped local patch review.
- In-scope files: `package.json`, `scripts/import-candidate-review-group-decisions.mjs`, `scripts/__tests__/import-candidate-review-group-decisions.test.mjs`, `PROJECT_PLAN.md`.
- Context: repository-scoped threat model copied to `artifacts/01_context/threat_model.md`.
- Runtime evidence: `npm run lint`, `npm run typecheck`, `npm run guardrails:architecture`, `npm run curation:validate`, `npm run test:run`, `npm run build`, `npm run audit:external-references`, `npm run audit:security`, and `/references/curation` browser/layout QA passed.
- Limitation: validation and attack-path phases were skipped because discovery produced no technically plausible candidates.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 4/4 deep-review rows completed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | no candidates after discovery |

## Threat Model

## Product Surfaces

Muzik is a Turkish music study and production platform with browser-rendered Next.js pages, local/admin curation surfaces, generated SymbTr catalog artifacts, audio/rhythm engines, PDF/notation review artifacts, and batch scripts that read and write local JSON/CSV manifests.

## Assets

- Real catalog and curation data for roughly 3000 SymbTr entries.
- Accepted external references and source quality policy used by user-facing views.
- Operator-only curation decisions, feedback, manual corrections and import/export manifests.
- Local operation token guarding state-changing reference operations.
- Generated coverage, dedupe, review queue, PDF layout and browser evidence artifacts.

## Trust Boundaries

- Public/tokenless browser pages versus token-protected local/admin operations.
- User/operator supplied JSON, CSV, Markdown and text imports crossing into local manifests.
- Generated review/search candidates versus validated accepted source data.
- External URLs and provider metadata crossing into UI rendering and embed/preview decisions.
- Local filesystem writes by scripts and API helpers, which must remain under fixed project paths.

## Security Invariants

- Accepted sources are the only inputs eligible for auto-attach; review/conflict/deferred candidates must never become accepted implicitly.
- Tokenless snapshots may expose safe aggregate state but must not leak operator-only raw source URLs or secrets.
- Batch decision artifacts may reject, defer or mark conflict, but must not carry accepted source IDs or source URLs.
- Import paths must validate catalog IDs, statuses, HTTPS URL policy, duplicate accepted identities and stale fingerprints before mutating manifests.
- UI rendering must use React escaping and avoid raw HTML sinks for artifact data.
- Script output paths must be fixed or proven inside the project root.

## Findings

| Title | Severity | Confidence | Category |
| --- | --- | --- | --- |
| No findings | none | high | none |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable findings were identified. The changed importer keeps the operator-supplied input path inside the project root, rejects packet imports carrying `sourceId`, `sourceUrl`, or `url`, validates catalog/group fingerprints before optional writes, and writes only to the fixed `candidate-review-group-decisions.json` manifest. The new npm alias does not introduce a new network, credential, or shell interpolation boundary.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `package.json` | Local operator command exposure | No issue found | Adds a deterministic npm alias to an existing local importer only. |
| `scripts/import-candidate-review-group-decisions.mjs` | Operator-supplied JSON import, local file write, source identity smuggling | No issue found | Project-root input constraint, fixed output path, recursive source identity rejection, group/fingerprint validation, and preview validation remain in place before writes. |
| `scripts/__tests__/import-candidate-review-group-decisions.test.mjs` | Regression proof for import safety | No issue found | Covers packet import, packet scoping, source identity rejection, invalid group, mismatched group, and stale fingerprint cases. |
| `PROJECT_PLAN.md` | Operator process guidance | No issue found | Documents accepted-only policy and source identity rejection without exposing secrets or unsafe manual operations. |

## Open Questions And Follow Up

- Continue a separate focused review when the next phase introduces actual accepted source import expansion or new provider metadata fetching. This scan only covers the packet decision import bridge and did not change accepted source attachment.
