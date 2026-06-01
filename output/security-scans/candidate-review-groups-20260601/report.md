# Security Review: Muzik candidate-review-groups-20260601

## Scope

- Scan mode: scoped working-tree security review for candidate review grouping, validation, API exposure, and curation UI rendering.
- In-scope code and artifacts: `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, `scripts/validate-source-curation.mjs`, `src/app/api/external-references/route.ts`, `src/features/references/ReferencesCurationDashboard.tsx`, related tests, `output/external-reference-coverage/summary.json`, and the new candidate review group CSV/JSON artifacts.
- Runtime and validation status: focused tests, full tests, lint, typecheck, build, curation validation, external-reference audit, security audit, SymbTr measure verification, layout guard, and browser evidence were run for this phase.
- Context: the threat model was generated during Phase 1 for this scoped change and saved at `artifacts/01_context/threat_model.md`.
- Explicit exclusions: unrelated old untracked screenshots, `.agents/`, and raw `symb/` archive files were not part of this scoped phase.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 7/7 scoped rows closed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Source review, generated artifact review, automated validation, browser evidence, and npm audit |

## Threat Model

## Assets

- 3000-eser SymbTr catalog and external-reference coverage artifacts.
- Candidate review queue and new candidate review group artifacts.
- Accepted-only auto-attach manifest and source curation registries.
- Operator `/references/curation` UI and token-gated external reference API.

## Trust Boundaries

- Generated provider-profile search candidates cross from deterministic catalog metadata into operator review surfaces.
- Review-only candidates must not cross into accepted source manifests without validated import and accepted status.
- Token-gated curation API reads generated artifacts and exposes only safe operational state to localhost operators.
- Generated CSV/JSON artifacts are committed as evidence and must not contain secrets or accepted source URLs for review-only candidates.

## Security Invariants

- Auto-attach remains accepted-only; `needs-review`, `conflict`, and grouped candidates are never promoted automatically.
- Candidate review groups must reconcile with candidate review queue rows and summary counts.
- Search URLs remain HTTPS and provider-profile classified.
- Operation tokens are read from environment/runtime input and are not committed.
- UI rendering must avoid misleading operators into treating search candidates as verified source evidence.

## Findings

| Severity | Confidence | Title |
| --- | --- | --- |
| none | high | No reportable findings |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable findings survived discovery. The change adds deterministic review-only grouping for the 14,890 provider-profile search candidates and validates that those rows collapse into 2,978 catalog-level review groups without becoming accepted source evidence. The API continues to require the existing external-reference operations token before exposing state, and the UI group panel is read-only.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-audit.mjs` | Generated artifact safety | No issue found | Groups are derived from existing review-only rows and do not carry accepted source IDs or URLs. |
| `scripts/lib/source-curation-validation.mjs` | Drift and unsafe promotion validation | No issue found | Group count/status/profile drift now fails validation. |
| `scripts/validate-source-curation.mjs` | Release gate coverage | No issue found | `npm run curation:validate` now includes group artifact validation. |
| `src/app/api/external-references/route.ts` | Token-gated data exposure | No issue found | Existing operation access gate remains in front of the new read-only group state. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Operator trust and misleading UI | No issue found | Group panel is read-only and labels conflict rows as requiring resolution before import. |
| Generated coverage artifacts | Count drift, real-data safety | No issue found | Summary reconciles 14,890 queue rows into 2,978 review groups. |
| Browser evidence | Runtime UI health | No issue found | Desktop and mobile screenshots show the new panel with no console errors or overflow. |

