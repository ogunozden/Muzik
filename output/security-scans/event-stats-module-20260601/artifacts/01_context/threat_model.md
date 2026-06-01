# Threat Model: Event And Stats Module Extraction

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
