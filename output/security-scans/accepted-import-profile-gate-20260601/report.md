# Security Review: Muzik accepted import profile gate

## Scope

- Scan mode: local staged patch diff against `HEAD` on branch `codex/batch-curation-pipeline`.
- In-scope code: `PROJECT_PLAN.md`, `scripts/import-external-reference-candidates.mjs`, and `scripts/__tests__/import-external-reference-candidates.test.mjs`.
- Supporting artifacts: `output/security-scans/accepted-import-profile-gate-20260601/artifacts/02_discovery/deep_review_input.csv`, `output/security-scans/accepted-import-profile-gate-20260601/artifacts/02_discovery/work_ledger.jsonl`, and `output/security-scans/accepted-import-profile-gate-20260601/artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test status: focused import tests, source curation validation tests, external source tests, curation validation, and external reference audit passed before report assembly.
- Explicit exclusions: unrelated untracked screenshots, `.agents/`, `symb/`, and broader product surfaces not changed by this diff.
- Threat model source: generated during this scan from repository evidence and copied into the per-scan context artifact.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no finding for reviewed diff rows |
| Coverage | 3 of 3 `deep_review_input.csv` rows closed in `work_ledger.jsonl` |
| Validation mode | Source review plus focused import tests and batch validation gates |

## Threat Model

# Muzik Repository Threat Model

## Assets

- Trusted 3000-entry SymbTr catalog and accepted external reference manifests.
- Central research source profiles that define trusted provider hosts, provider types, confidence weights, embed capabilities, and metadata strategies.
- Batch import scripts that can move reviewed external source candidates into manifests consumed by product UI.
- Validation, audit, security, and browser evidence used as release gates.

## Trust Boundaries

- Bulk candidate import JSON is operator-provided input and must not bypass central provider/source policy.
- Accepted candidates can become curated product references, while needs-review, rejected, and conflict candidates remain queue data.
- External URLs are untrusted until matched to an enabled source profile and validated by status-specific rules.

## Attacker-Controlled Inputs

- Local import JSON files passed to `scripts/import-external-reference-candidates.mjs`.
- Candidate source IDs, providers, URLs, labels, verification fields, and timestamps.
- Existing curation manifests when a batch import is run in a dirty or manually edited repository state.

## Security Invariants

- Accepted import rows must map to known catalog IDs and trusted HTTPS source profiles.
- Accepted source provider values must match the central profile provider for the URL host.
- Accepted duplicate URL identities must be rejected or skipped deterministically.
- Review/conflict/rejected rows must not be treated as source evidence or auto-attached references.

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

No reportable findings survived discovery. The diff tightens the accepted bulk import path by requiring accepted source URLs to match enabled central research source profiles and requiring provider values to agree with the matched profile. Existing catalog ID, HTTPS, YouTube oEmbed, input path containment, and duplicate accepted URL identity protections remain in place.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `PROJECT_PLAN.md` | Documentation integrity | Not applicable | Records the profile-bound accepted import gate only. |
| `scripts/import-external-reference-candidates.mjs` | Bulk accepted source import trust boundary | No issue found | New validation fails closed for accepted URLs outside central profiles or mismatched providers. |
| `scripts/__tests__/import-external-reference-candidates.test.mjs` | Regression coverage | No issue found | Tests prove unknown hosts and provider mismatches are rejected before import writes. |