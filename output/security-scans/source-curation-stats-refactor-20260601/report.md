# Security Review: Muzik source curation stats refactor

## Scope

- Scan mode: local staged patch diff against `HEAD` on branch `codex/batch-curation-pipeline`.
- In-scope code: `PROJECT_PLAN.md`, `scripts/lib/source-curation-events.mjs`, `scripts/lib/source-curation-operations.mjs`, and `scripts/lib/source-curation-stats.mjs`.
- Supporting artifacts: `output/security-scans/source-curation-stats-refactor-20260601/artifacts/02_discovery/deep_review_input.csv`, `output/security-scans/source-curation-stats-refactor-20260601/artifacts/02_discovery/work_ledger.jsonl`, and `output/security-scans/source-curation-stats-refactor-20260601/artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test status: focused curation operation tests, curation validation, and external reference audit passed before report assembly.
- Explicit exclusions: unrelated untracked screenshots, `.agents/`, `symb/`, and broader product surfaces not changed by this diff.
- Threat model source: generated during this scan from repository evidence and copied into the per-scan context artifact.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no finding for reviewed diff rows |
| Coverage | 4 of 4 `deep_review_input.csv` rows closed in `work_ledger.jsonl` |
| Validation mode | Source review plus focused curation tests and batch validation gates |

## Threat Model

# Muzik Repository Threat Model

## Assets

- Trusted 3000-entry SymbTr catalog, source curation registries, auto-attached references, review queues, and generated source quality stats.
- Local operator scripts that can write curation manifests when invoked with explicit write flags or action payloads.
- Validation, audit, and security evidence used as release gates.

## Trust Boundaries

- Source feedback, manual corrections, embed state, and source quality stats cross from local operator input or generated analysis into trusted repository manifests.
- Accepted auto-attached references are trusted product data; needs-review and conflict candidates are not trusted source attachments.
- Generated stats are derived evidence and must stay validator-gated before being written.

## Attacker-Controlled Inputs

- Local JSON payloads passed to source curation management scripts.
- Curation registry JSON files, external source URLs, source identifiers, and event metadata.
- Script flags such as write/dry-run and generated audit artifacts.

## Security Invariants

- Source quality stats must be derived from central profile policy, not brittle source id text guesses.
- Registry writes must run through `validateCurrent` before persistence.
- Event, manual correction, embed state, and stats generation boundaries must remain explicit so future batch actions cannot bypass validation or accepted-only attachment policy.

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

No reportable findings survived discovery. The diff extracts existing source quality stats generation into a dedicated module while preserving centralized profile mapping, `validateCurrent` gating, fixed output paths, and the backward-compatible operations import surface.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `PROJECT_PLAN.md` | Documentation integrity | Not applicable | Records the module split only. |
| `scripts/lib/source-curation-events.mjs` | Curation event mutation boundary | No issue found | Removing stats generation does not change write authorization or validation behavior. |
| `scripts/lib/source-curation-operations.mjs` | CLI import compatibility surface | No issue found | Existing CLI imports continue through the same operations barrel. |
| `scripts/lib/source-curation-stats.mjs` | Generated source quality stats | No issue found | Stats remain derived from central profiles and validator-gated before writes. |