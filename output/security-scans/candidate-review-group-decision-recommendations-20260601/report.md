# Security Review: Muzik candidate review group decision recommendations diff

## Scope

- Scan mode: local patch diff against `HEAD`.
- In-scope changed files: `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, `scripts/validate-source-curation.mjs`, `/api/external-references` route and tests, `/references/curation` UI and tests, generated `summary.json`, and generated recommendation artifact.
- Artifact inputs: `artifacts/02_discovery/rank_input.csv`, `artifacts/02_discovery/deep_review_input.csv`, `artifacts/01_context/threat_model.md`, and `artifacts/02_discovery/work_ledger.jsonl`.
- Runtime/test status: focused tests, curation validation, external-reference audit, layout guard, lint, typecheck, architecture guard, npm audit, full tests, production build, SymbTr measure validation, and browser dry-run import evidence all passed before report assembly.
- Explicit limitation: this is a diff-scoped security scan for the recommendation export phase, not a full repository security scan.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 11/11 diff rows completed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Discovery produced no candidate findings; validation and attack-path phases were not opened. |

## Threat Model

# Muzik Repository Threat Model

## Assets And Privileges
- Curated Turkish music catalog data, accepted external reference records, candidate review queues, review group decisions, recommendation manifests, SymbTr metadata, PDF layout verification manifests, and local operator tokens are integrity-sensitive.
- Browser-facing pages expose catalog, notation, sample, rhythm, and curation workflows. The local curation API can mutate repository data only when explicitly enabled and authenticated with the configured operation token.
- Audio/sample and score routes must not expose arbitrary files, secrets, or unsafe embeds.

## Trust Boundaries
- Public browser users cross into Next.js route handlers through HTTP requests, route parameters, query filters, form inputs, and JSON request bodies.
- Local operator workflows cross a stronger boundary through `EXTERNAL_REFERENCE_OPERATIONS_ENABLED` and `x-external-reference-ops-token`.
- External reference URLs, provider search links, YouTube/archive embeds, and PDF/SymbTr-derived metadata are untrusted until validated and classified by central policy.
- Repository-local scripts and generated artifacts are trusted only after deterministic validation gates pass.

## Attacker-Controlled Inputs
- Route params, search/filter fields, JSON operation bodies, manifest import text, feedback payloads, candidate source URLs, external provider metadata, and browser-visible embed/source URLs.
- Any source marked `needs-review`, `conflict`, `rejected`, or `deferred` must remain non-authoritative and must not be auto-attached as accepted evidence.

## Security Invariants
- Curation mutations require the operation feature flag and valid operation token.
- Auto-attach is accepted-only; generated review candidates, group decisions, and recommendation manifests cannot create accepted sources without a validated source URL.
- Provider/source classification, status contracts, duplicate policy, URL policy, recommendation policy, and PDF verification promotion must be centralized and validated.
- Generated manifests must not leak secrets or unnecessary source data, must be bounded in size, and must preserve real catalog data.
- Browser previews must use safe HTTPS/provider rules, sandboxing, lazy loading, and fallback links.

## Repository-Wide Failure Modes
- Unauthorized curation mutation or unsafe local operation exposure.
- Incorrect promotion of untrusted candidates or recommendations to accepted references.
- Source URL injection, unsafe embed/link rendering, or provider misclassification.
- Data loss or corruption through batch import/export.
- Path traversal or arbitrary file access in score/sample/PDF handling.
- Validation bypass that lets stale or malformed generated artifacts become project truth.

## Findings

| Finding | Severity | Confidence | Category |
| --- | --- | --- | --- |
| No findings | none | high | none |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable findings survived discovery. The recommendation pipeline emits only `conflict` and `deferred` review group decisions, never `accepted`; generated rows contain no source IDs or source URLs; validation now enforces that contract; and the API/UI path is read-only until the existing dry-run/write import operation is invoked under the established operations token boundary.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-audit.mjs` | Unsafe recommendation policy, accepted promotion, generated artifact corruption | No issue found | Generator emits only `conflict` or `deferred`, derives from review group state, and writes deterministic generated artifact data. |
| `scripts/lib/source-curation-validation.mjs` | Validation bypass, source-field leakage, summary drift | No issue found | Validator rejects accepted/source fields and enforces count/status/group drift checks. |
| `src/app/api/external-references/route.ts` | Unauthorized export, unsafe mutation, data leakage | No issue found | Action is token-gated, read-only, bounded, and reads only the generated recommendation artifact. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Unsafe bulk UI operation | No issue found | UI uses existing operation token flow and dry-run decision import path. |
| Generated recommendation artifact | Real-data safety | No issue found | Current artifact has 5 recommendations, no accepted/source URL/source ID fields. |
| Tests | Regression coverage | No issue found | Unit and page tests cover safe generation, API export, UI action, and unsafe accepted/source-field rejection. |

## Open Questions And Follow Up

- Continue the broader goal with the next batch-first curation phase: decide whether the 5 safe recommendations should be applied with `candidate-review-group-decision-import --write`, then regenerate audit and validate the shifted group counts.
