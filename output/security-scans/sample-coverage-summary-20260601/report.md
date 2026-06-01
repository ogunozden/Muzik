# Security Review: Muzik sample coverage summary

## Scope

- Scan mode: local staged patch diff against `HEAD` on branch `codex/batch-curation-pipeline`.
- In-scope code: `PROJECT_PLAN.md`, `package.json`, `src/app/api/samples/route.ts`, `src/app/api/samples/__tests__/route.test.ts`, `src/app/samples/page.tsx`, `src/engines/ses/sample-library.ts`, `src/engines/ses/sample-coverage.ts`, and `src/engines/ses/__tests__/sample-coverage.test.ts`.
- Supporting artifacts: `output/security-scans/sample-coverage-summary-20260601/artifacts/02_discovery/deep_review_input.csv`, `output/security-scans/sample-coverage-summary-20260601/artifacts/02_discovery/work_ledger.jsonl`, and `output/security-scans/sample-coverage-summary-20260601/artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test status: focused sample audit, lint, typecheck, production build, architecture guardrails, curation validation, external reference audit, SymbTr measure verification, npm audit, full test suite, API smoke, and browser screenshot evidence passed for this phase.
- Explicit exclusions: unrelated untracked screenshots, `.agents/`, `symb/`, and broader product surfaces not changed by this diff.
- Threat model source: generated during this scan from repository evidence and copied into the per-scan context artifact.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no finding for reviewed diff rows |
| Coverage | 8 of 8 `deep_review_input.csv` rows closed in `work_ledger.jsonl` |
| Validation mode | Source review plus focused sample tests, full gates, API smoke, and browser evidence |

## Threat Model

# Muzik Repository Threat Model

## Assets

- Trusted SymbTr catalog metadata, generated source curation queues, sample slot manifests, and validation reports.
- Local operator endpoints that can mutate sample files or curation manifests when explicitly enabled and token-authorized.
- User-facing study and production screens that render notation, source links, instrument status, rhythm state, and external media metadata.
- Browser, build, test, audit, and security evidence used as release gates.

## Trust Boundaries

- Browser users can read public GET routes, but local mutation endpoints must remain gated by environment controls and operation tokens.
- Files under `public/samples` are local audio assets; upload and delete operations must stay constrained to expected sample slots.
- Generated coverage and curation artifacts are evidence until validators accept them; they must not silently mutate trusted product data.
- External reference URLs and provider metadata are untrusted unless they pass centralized source profile and status policy.

## Attacker-Controlled Inputs

- HTTP request bodies, form data, headers, and route query parameters.
- Uploaded sample files, filenames, and selected sample slot keys.
- External source URLs, catalog/provider metadata, and curation manifest imports.
- Local script arguments and generated JSON/CSV artifacts used by operator workflows.

## Security Invariants

- Sample POST and DELETE must require the configured local operation authorization before filesystem mutation.
- Sample filesystem paths must resolve inside `public/samples` and only for known manifest slots.
- Public GET responses may expose status and coverage counts, but not secrets, local absolute paths, or privileged token state.
- Source auto-attach must remain accepted-only; review/conflict candidates must not be promoted as trusted.
- UI rendering must avoid dangerous HTML injection and must distinguish candidate, missing, and verified data.

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

No reportable findings survived discovery. The changed API path adds a derived sample coverage object to the public GET response without changing the token-gated POST/DELETE mutation boundary. The new coverage helper is pure aggregation, the sample manifest change uses trusted central constants with fixed folder mapping, and the UI renders numeric values through React text nodes.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `PROJECT_PLAN.md` | Documentation integrity | Not applicable | Phase evidence only; no runtime code or secret content. |
| `package.json` | Script execution surface | No issue found | `audit:samples` runs fixed Vitest paths and introduces no install, network, or shell-expansion behavior. |
| `src/app/api/samples/route.ts` | Public GET response and local sample mutation boundary | No issue found | Coverage summary is read-only; POST/DELETE still require operation token and constrained sample slot paths. |
| `src/app/api/samples/__tests__/route.test.ts` | Regression coverage | No issue found | Verifies coverage output and keeps mutation authorization assertions. |
| `src/app/samples/page.tsx` | Browser rendering and local operation token UI | No issue found | Coverage values are rendered as React text; hidden username is static non-secret autocomplete metadata. |
| `src/engines/ses/sample-coverage.ts` | Aggregation helper | No issue found | Counts trusted slot status objects only; no sink or trust-boundary crossing. |
| `src/engines/ses/sample-library.ts` | Sample slot manifest generation | No issue found | Central constants drive a fixed folder map; slot relative paths remain deterministic and validated downstream. |
| `src/engines/ses/__tests__/sample-coverage.test.ts` | Regression coverage | No issue found | Ensures all central instruments are represented and playable by sample or synth fallback. |