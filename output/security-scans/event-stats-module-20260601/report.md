# Security Review: Muzik event-stats-module-20260601

## Scope

- Scan mode: scoped working-tree security review for the event/stat module extraction.
- In-scope code and artifacts: `scripts/lib/source-curation-registry.mjs`, `scripts/lib/source-curation-events.mjs`, `scripts/lib/source-curation-operations.mjs`, `src/data/references/source-quality-stats.generated.json`, and `output/playwright/references-curation-event-stats-module-20260601.png`.
- Runtime and validation status: focused tests, full test suite, lint, typecheck, build, curation stats, curation validation, layout guard, external-reference audit, security audit, SymbTr measure verification, and browser evidence were run for this phase.
- Context: the threat model was generated during Phase 1 for this scoped change and saved at `artifacts/01_context/threat_model.md`.
- Explicit exclusions: unrelated old untracked screenshots, `.agents/`, and `symb/` were not part of this scoped phase.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 5/5 scoped rows closed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Source review, diff review, automated validation, browser evidence, and secret-pattern scan |

## Threat Model

## Assets

- Real curation registries under `src/data/references/*`.
- Generated 3000-eser source coverage and quality stats.
- Auto-attached external references, where only accepted candidates may be attached.
- Local operator feedback, manual corrections, and embed-state history.

## Trust Boundaries

- Local operator/API input crosses into append-only feedback, manual correction, and embed-state registry writes.
- Batch-generated mapping and quality stats cross into UI/API reporting.
- File-system I/O must stay project-contained and must not allow arbitrary path access.
- Browser/UI evidence reads generated curation state but must not mutate production-like data outside explicit local operations.

## Security Invariants

- Registry reads and writes must resolve inside the project root.
- Every registry mutation must pass centralized `validateSourceCurationRegistries` validation before writes.
- Auto-attach must remain accepted-only; needs-review, rejected, and conflict candidates must not be attached automatically.
- Event/stat extraction must preserve the existing public import surface for callers.
- Generated source quality stats must remain derived from central research profiles and validated curation registries.
- No secrets or operation tokens may be committed or printed.

## Attacker Model

- A local or API caller may submit malformed feedback, correction, or embed-state payloads.
- A malicious data row may attempt to influence source profile classification, generated stats, or registry relationships.
- A path-control bug could turn a project-local curation operation into arbitrary file access if path containment fails.

## Reviewed Scope

- `scripts/lib/source-curation-registry.mjs`
- `scripts/lib/source-curation-events.mjs`
- `scripts/lib/source-curation-operations.mjs`
- `src/data/references/source-quality-stats.generated.json`
- Browser evidence for `/references/curation`

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

No reportable findings survived discovery. The extraction keeps registry path containment in `source-curation-registry.mjs`, validates all event/stat registry mutations before writes, preserves the existing operations import surface, and leaves accepted-only auto-attach generation isolated from feedback/stat mutations. The generated stats diff only updates `generatedAt`, and the scoped browser evidence confirms the curation UI still renders the 3000-eser batch report, backlog, queue, accepted count, and OGM profile stats.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/source-curation-registry.mjs` | Project-local registry I/O, path traversal, validation centralization | No issue found | `resolveCurationPath` keeps registry access inside the project root; `validateCurrent` remains the shared validation gate. |
| `scripts/lib/source-curation-events.mjs` | Operator mutation, append-only feedback, manual corrections, embed states, generated stats | No issue found | Mutations validate before write and preserve existing event/status semantics. |
| `scripts/lib/source-curation-operations.mjs` | Public import compatibility, accepted-only auto-attach boundary | No issue found | Compatibility re-exports preserve callers; auto-attach generation remains separate from event/stat writes. |
| `src/data/references/source-quality-stats.generated.json` | Real-data safety and source profile buckets | No issue found | Only generated timestamp changed after stats regeneration; validation reports 3000 catalog entries and 7 auto-attached references. |
| `output/playwright/references-curation-event-stats-module-20260601.png` | Browser/UI evidence | No issue found | UI rendered batch report, backlog, queue, accepted count, and OGM profile stats without browser errors or warnings. |
