# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-candidate-review.mjs` | Repeated recommendations and unsafe candidate promotion | No issue found | Decided groups are skipped by recommendation generation; accepted sources still require bulk candidate import. |
| `scripts/import-candidate-review-group-decisions.mjs` | Batch decision import trust boundary | No issue found | Project-contained input, group membership, fingerprint matching, and source identity rejection remain; empty manifests no-op. |
| `src/data/references/candidate-review-group-decisions.json` | Persistent operator decisions | No issue found | Stores only conflict/deferred decisions with source group fingerprints and no URLs/source IDs. |
| External reference coverage artifacts | Generated data integrity | No issue found | Audit reports 5 applied decisions, 0 remaining recommendations, 0 duplicate rows, and accepted-only auto attach. |
| `/references/curation` browser evidence | Operator UI display | No issue found | Browser QA confirms 5 decisions, 0 recommendations, no console warnings/errors, and no horizontal overflow. |
