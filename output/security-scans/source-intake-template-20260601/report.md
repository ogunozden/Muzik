# Security Review: Muzik source intake template local patch

## Scope

- Scan mode: local patch diff scan for the source intake template phase.
- In-scope code and artifacts: `scripts/lib/external-reference-candidate-review.mjs`, `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, `scripts/validate-source-curation.mjs`, `/api/external-references`, `/references/curation`, affected tests, `output/external-reference-coverage/summary.json`, and `output/external-reference-coverage/symbtr-curated-reference-source-intake-template.json`.
- Runtime evidence: `npm run curation:validate`, targeted tests, full test suite, lint, typecheck, build, npm audit, layout guard, and browser QA on `http://localhost:4015/references/curation`.
- Exclusions: unrelated untracked `.agents/`, `symb/`, and older Playwright screenshots were not reviewed or staged.
- Context: threat model generated for this scan and saved at `artifacts/01_context/threat_model.md`.

### Scan Summary

| Field | Value |
|---|---|
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for diff-scoped source intake changes |
| Coverage | 13 deep-review rows completed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Source review plus deterministic tests, curation validation, build, browser QA |

## Threat Model

### Assets

- SymbTr catalog metadata, curated external reference manifests, auto-attached references, source feedback, manual corrections, generated coverage reports, and local curation operation endpoints.
- Browser-rendered local admin surfaces under `/references/curation` and `/api/external-references`.

### Trust Boundaries

- Local operator input enters through import textareas and local-only API operations.
- Generated review/search artifacts are not trusted source evidence until validated by import scripts.
- External URLs are untrusted until HTTPS, research-profile match, duplicate identity, verification, and checked-at rules pass.

### Attacker Model

- A malicious or mistaken operator could paste malformed manifests, stale fingerprints, duplicate URLs, or source URLs into a review artifact.
- A remote site referenced by search candidates is not trusted and must not become auto-attached without validation.

### Security Invariants

- Review queues and source intake templates must not carry accepted source IDs or source URLs.
- Accepted attachment must remain limited to validated bulk candidate manifests.
- Generated artifacts must be deterministic and covered by validation gates so stale or tampered packets fail before attach.

## Findings

| ID | Title | Severity | Confidence | Status |
|---|---|---|---|---|
| - | No reportable findings | - | high | Closed |

### Confidence Scale

| Label | Meaning |
|---|---|
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when follow-up candidates are intentionally retained. |

### No Findings

No reportable security issue survived discovery. The patch adds a generated, blank source intake worklist and read-only UI/API metadata around it. The security-relevant controls were reviewed against the threat model: generated template rows are `needs-source-url`, source URL/source ID placeholders are blank, `sourceGroupFingerprint` is preserved for stale-data detection, validation rejects source URL/source ID leakage, and accepted references still require the existing validated bulk candidate import path.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
|---|---|---|---|
| `scripts/lib/external-reference-candidate-review.mjs` | Generated artifact could smuggle accepted source data | No issue found | `buildCandidateReviewSourceIntakeTemplate` emits `needs-source-url` rows with blank source fields and candidate provenance only. |
| `scripts/lib/external-reference-audit.mjs` | Audit could write trusted accepted data | No issue found | Audit writes a separate intake artifact and summary counts; it does not modify accepted manifests. |
| `scripts/lib/source-curation-validation.mjs` | Validator bypass or stale artifact drift | No issue found | Validator checks packet rows, active groups, fingerprints, blank source fields, no URL/source id, and summary drift. |
| `src/app/api/external-references/route.ts` | Local API exposure | No issue found | API exposes source intake manifest metadata only; no new POST action or accepted-source write path was added. |
| `src/app/references/curation/page.tsx` | Server-rendered data exposure | No issue found | Read-only initial state surfaces metadata and import contract only. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Client-side unsafe import affordance | No issue found | UI displays artifact path/count/import command; accepted import remains the existing validated manifest workflow. |
| `output/external-reference-coverage/symbtr-curated-reference-source-intake-template.json` | Generated data safety | No issue found | Artifact has 119 packets and 2973 blank source rows; browser QA confirmed visibility and no horizontal overflow. |

## Open Questions And Follow Up

- When real source URLs are added to an accepted bulk candidate manifest, run a follow-up diff scan focused on `src/data/references/external-reference-bulk-candidates.json` plus `scripts/import-external-reference-candidates.mjs` to confirm the new evidence still passes HTTPS/profile/dedupe validation.
- Run a separate scan for the future PDF verified-manifest import path once it changes from candidate-only data to accepted verified layout data.
