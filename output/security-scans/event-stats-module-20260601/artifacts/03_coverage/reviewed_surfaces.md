# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/source-curation-registry.mjs` | Project-local registry I/O, path traversal, validation centralization | No issue found | `resolveCurationPath` keeps registry access inside the project root; `validateCurrent` remains the shared validation gate. |
| `scripts/lib/source-curation-events.mjs` | Operator mutation, append-only feedback, manual corrections, embed states, generated stats | No issue found | Mutations validate before write and preserve existing event/status semantics. |
| `scripts/lib/source-curation-operations.mjs` | Public import compatibility, accepted-only auto-attach boundary | No issue found | Compatibility re-exports preserve callers; auto-attach generation remains separate from event/stat writes. |
| `src/data/references/source-quality-stats.generated.json` | Real-data safety and source profile buckets | No issue found | Only generated timestamp changed after stats regeneration; validation reports 3000 catalog entries and 7 auto-attached references. |
| `output/playwright/references-curation-event-stats-module-20260601.png` | Browser/UI evidence | No issue found | UI rendered batch report, backlog, queue, accepted count, and OGM profile stats without browser errors or warnings. |
