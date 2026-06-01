# Security Review: Muzik dedupe report diff

## Scope

- Scan mode: working-tree diff scan for the dedupe report batch curation phase.
- In scope: `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, `scripts/validate-source-curation.mjs`, `src/features/references/ReferencesCurationDashboard.tsx`, supporting route/UI tests, `output/external-reference-coverage/summary.json`, and `output/external-reference-coverage/symbtr-curated-reference-dedupe-report.json`.
- Runtime and test status: targeted tests, full tests, build, curation validation, layout/browser evidence, and npm audit passed before this report was finalized.
- Explicit exclusions: unrelated untracked local artifacts and unchanged curation write/import paths outside the diff.
- Threat model source: generated during Phase 1 for this repository and copied to `artifacts/01_context/threat_model.md`.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 10 deep-review rows completed |
| Validation mode | Discovery-only closure because no plausible candidates survived finding discovery |
| Artifacts | `output/security-scans/dedupe-report-20260601` |

## Threat Model

Assets: SymbTr catalog metadata, curated external-reference manifests, generated curation coverage artifacts, local operator tokens, source feedback/manual correction registries, screenshots/reports, and user-facing curation pages.

Trust boundaries: local operator browser/API boundary, filesystem-backed JSON registries, generated output artifacts, external source URLs/search queries, and Next.js rendered UI. Operations that mutate curation data are guarded by loopback and ops-token checks.

Attacker-controlled or risky inputs: staged external source URLs and metadata, bulk candidate manifests, generated review queues, candidate group decisions, source feedback/manual correction payloads, local operator form input, and stale or tampered output artifacts.

Primary invariants: auto-attach must remain accepted-only; review-only candidates must not carry source URLs as evidence; duplicate accepted identities must fail closed before attachment; generated artifact counts must drift-check against source registries; filesystem writes must stay under intended project output paths; operation tokens must not be exposed or weakened.

Security failure modes: unsafe source promotion, validation drift masking bad data, token-gated local operations becoming reachable without authorization, unsafe URL/embed handling, raw HTML/script injection in curation UI, path traversal in generated artifact writes, shell/script dispatch with user-controlled paths, and dependency or build-time regressions.

## Findings

| Finding | Severity | Confidence | Category |
| --- | --- | --- | --- |
| No findings | none | high | none |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No findings

Finding discovery reviewed every diff-scoped row and did not identify a plausible security regression. The change adds aggregate duplicate accounting and drift validation; it does not add new network fetches, source attachment writes, accepted-source promotion, token handling, shell dispatch, user-controlled filesystem paths, or raw HTML rendering.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-audit.mjs` | Generated artifact writes, accepted-source promotion | No issue found | Dedupe report is derived from existing rows and written under the existing guarded output directory. |
| `scripts/lib/source-curation-validation.mjs` | Fail-open validation, unsafe duplicate acceptance | No issue found | Drift checks compare report values against bulk candidates and review queue and require duplicate rows to be zero before auto-attach. |
| `scripts/validate-source-curation.mjs` | File path control | No issue found | Reads fixed project-relative artifacts only. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Token flow, raw HTML/data exposure | No issue found | Displays aggregate path/count text only; no mutation or HTML injection path added. |
| Supporting tests and generated artifacts | Regression coverage and sensitive data exposure | No issue found | Tests cover report generation, drift rejection, API pass-through and UI visibility; generated report contains aggregate counts and empty duplicate groups. |

## Open Questions And Follow Up

- Keep the existing separate follow-up for Next dev webpack/PostCSS runtime behavior; production build and `next start` browser evidence passed for this phase.
