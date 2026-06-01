# Security Review: Muzik candidate review group decision template diff

## Scope

- Scan mode: local patch diff against `HEAD`.
- In-scope changed files: `src/app/api/external-references/route.ts`, `src/features/references/ReferencesCurationDashboard.tsx`, `src/app/api/external-references/__tests__/route.test.ts`, and `src/app/references/curation/__tests__/page.test.tsx`.
- Artifact inputs: `artifacts/02_discovery/rank_input.csv`, `artifacts/02_discovery/deep_review_input.csv`, `artifacts/01_context/threat_model.md`, and `artifacts/02_discovery/work_ledger.jsonl`.
- Runtime/test status: focused tests, curation validation, external-reference audit, layout guard, lint, typecheck, architecture guard, npm audit, full tests, production build, and SymbTr measure validation all passed before report assembly.
- Explicit limitation: this is a diff-scoped security scan for the decision-template export phase, not a full repository security scan.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 4/4 diff rows completed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Discovery produced no candidate findings; validation and attack-path phases were not opened. |

## Threat Model

# Muzik Repository Threat Model

## Assets And Privileges
- Curated Turkish music catalog data, accepted external reference records, candidate review queues, review group decisions, SymbTr metadata, PDF layout verification manifests, and local operator tokens are integrity-sensitive.
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
- Auto-attach is accepted-only; generated review candidates and group decisions cannot create accepted sources without a validated source URL.
- Provider/source classification, status contracts, duplicate policy, URL policy, and PDF verification promotion must be centralized and validated.
- Generated manifests must not leak secrets or unnecessary source data, must be bounded in size, and must preserve real catalog data.
- Browser previews must use safe HTTPS/provider rules, sandboxing, lazy loading, and fallback links.

## Repository-Wide Failure Modes
- Unauthorized curation mutation or unsafe local operation exposure.
- Incorrect promotion of untrusted candidates to accepted references.
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

No reportable findings survived discovery. The new API action is still inside the existing operation feature flag and token boundary, writes no project data, bounds generated rows, rejects `accepted`, requires reason/date fields, and emits only review-group decision metadata without source URL or source ID fields. The UI uses the same authenticated `runOperation` path and adds no new external fetch, embed, shell, or filesystem sink.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Unauthorized curation mutation, unsafe accepted promotion, source data leakage, unbounded manifest generation | No issue found | Existing operation auth/feature flag remains in force; export is read-only, bounded, non-accepted-only, and strips source URL/source ID data. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Token handling, unsafe bulk UI operation, incorrect status assignment | No issue found | Uses existing operation token path; UI offers only `rejected`, `conflict`, and `deferred` status options for generated templates. |
| `src/app/api/external-references/__tests__/route.test.ts` | Missing regression coverage for security controls | No issue found | Tests cover source-field omission and accepted-status rejection. |
| `src/app/references/curation/__tests__/page.test.tsx` | Missing UI request coverage | No issue found | Test covers generated payload and template controls. |

## Open Questions And Follow Up

- Continue the broader goal with the next batch-first curation phase: apply safe group decision manifests, regenerate coverage, and keep accepted-only auto-attach validation in the loop.
