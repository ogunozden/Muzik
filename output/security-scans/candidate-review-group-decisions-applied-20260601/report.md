# Security Review: Muzik Candidate Review Group Decisions

## Scope

- Scan mode: Codex Security diff scan for the local working-tree candidate review group decision application and idempotency changes.
- In-scope code and artifacts: `scripts/lib/external-reference-candidate-review.mjs`, `scripts/import-candidate-review-group-decisions.mjs`, related tests, `src/data/references/candidate-review-group-decisions.json`, refreshed external-reference coverage artifacts, `PROJECT_PLAN.md`, and browser evidence JSON.
- Runtime evidence considered: `npm run import:candidate-review-decisions -- --dry-run`, `npm run audit:external-references`, `npm run curation:validate`, targeted Vitest coverage, full lint/typecheck/test/build gates, `npm run audit:security`, layout guard, and browser QA on fixed port `4015`.
- Explicit exclusions: old unrelated untracked screenshots, `.agents/`, and `symb/` were not part of this diff scan.
- Threat model source: generated during Phase 1 for this repository and copied unchanged into `artifacts/01_context/threat_model.md`.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | no findings |
| Coverage | 11 diff-scoped rows completed in `artifacts/02_discovery/work_ledger.jsonl` |
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

No reportable findings were identified. The changed code and data apply five safe review-group decisions without introducing accepted references, source IDs, source URLs, or automatic attachment. The recommendation generator now skips already-decided groups, and empty recommendation manifests import as no-op, preventing repeated stale-fingerprint update loops.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-candidate-review.mjs` | Repeated recommendations and unsafe candidate promotion | No issue found | Decided groups are skipped by recommendation generation; accepted sources still require bulk candidate import. |
| `scripts/import-candidate-review-group-decisions.mjs` | Batch decision import trust boundary | No issue found | Project-contained input, group membership, fingerprint matching, and source identity rejection remain; empty manifests no-op. |
| `src/data/references/candidate-review-group-decisions.json` | Persistent operator decisions | No issue found | Stores only conflict/deferred decisions with source group fingerprints and no URLs/source IDs. |
| External reference coverage artifacts | Generated data integrity | No issue found | Audit reports 5 applied decisions, 0 remaining recommendations, 0 duplicate rows, and accepted-only auto attach. |
| `/references/curation` browser evidence | Operator UI display | No issue found | Browser QA confirms 5 decisions, 0 recommendations, no console warnings/errors, and no horizontal overflow. |

## Open Questions And Follow Up

None for this precise diff scan. The broader product goal still has non-security backlog around curated external source coverage (`22/3000`) and PDF verified manifest coverage (`0`), both intentionally left candidate/review-gated in this phase.
