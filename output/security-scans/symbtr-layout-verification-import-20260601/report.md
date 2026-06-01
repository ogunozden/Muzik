# Security Review: Muzik SymbTr layout verification import

## Scope

- Scan mode: local patch diff against `HEAD` on branch `codex/batch-curation-pipeline`.
- In-scope code: `scripts/import-symbtr-layout-verification.mjs`, `scripts/validate-symbtr-layout-verification.mjs`, `scripts/__tests__/import-symbtr-layout-verification.test.mjs`, and `package.json`.
- Supporting artifacts: `output/security-scans/symbtr-layout-verification-import-20260601/artifacts/02_discovery/deep_review_input.csv`, `output/security-scans/symbtr-layout-verification-import-20260601/artifacts/02_discovery/work_ledger.jsonl`, and `output/security-scans/symbtr-layout-verification-import-20260601/artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test status: focused import tests, SymbTr measure verification, full test suite, lint, typecheck, production build, npm audit, and browser review evidence passed.
- Explicit exclusions: unrelated untracked screenshots, `.agents/`, `symb/`, and broader product surfaces not changed by this diff.
- Threat model source: generated during this scan from repository evidence and copied into the per-scan context artifact.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no finding for reviewed diff rows |
| Coverage | 4 of 4 `deep_review_input.csv` rows closed in `work_ledger.jsonl` |
| Validation mode | Source review plus focused regression tests, SymbTr verification, full gates, and browser evidence |

## Threat Model

# Muzik Repository Threat Model

## Assets

- SymbTr catalog, generated PDF layout candidates, and verified PDF measure manifests.
- Batch curation and verification scripts that can modify trusted generated data.
- User-facing score-following views that consume verified measure boxes.
- Audit, validation, browser evidence, and build artifacts used as release gates.

## Trust Boundaries

- Operator-provided JSON enters trusted repository manifests only through validation scripts.
- PDF vector candidates are untrusted until human-reviewed or visual-regression-approved.
- Preview and generated output under `output/` are evidence artifacts, not trusted product data unless a validator explicitly accepts them.
- The verified manifest under `src/data/symbtr/layout-verification.generated.json` is trusted by product UI and must not receive stale or unverified boxes.

## Attacker-Controlled Inputs

- Import files passed to `scripts/import-symbtr-layout-verification.mjs`.
- Catalog identifiers, source archive paths, and measure box coordinates inside imported verification manifests.
- Local CLI arguments such as `--input`, `--write`, `--dry-run`, and validator override paths.

## Security Invariants

- Unverified `pdf-vector-candidate` rows must not be promoted to `verified`.
- Verified boxes must map back to generated candidate row/index pairs for the same catalog entry and source PDF.
- Import and validator paths must remain inside the project root.
- Dry-run validation must not mutate trusted generated manifests.
- Final writes must occur only after the project validator accepts the candidate manifest.

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

No reportable findings survived discovery. The new import path is local-only, project-bounded, fixed-output, verified-only, and validator-gated. Dry-run validation uses a preview manifest through `--verification-path`, so it does not mutate trusted generated product data.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/import-symbtr-layout-verification.mjs` | Local manifest import trust boundary and write integrity | No issue found | Fails closed unless imported verified boxes match generated PDF layout metadata and candidate pairs; writes only fixed product manifest after validator success and `--write`. |
| `scripts/validate-symbtr-layout-verification.mjs` | Validator path override safety | No issue found | Override path is constrained to the project root and reuses the same validation contract. |
| `scripts/__tests__/import-symbtr-layout-verification.test.mjs` | Regression coverage | No issue found | Covers the security-relevant positive and negative paths. |
| `package.json` | CLI exposure | No issue found | New command is local-only and deterministic. |