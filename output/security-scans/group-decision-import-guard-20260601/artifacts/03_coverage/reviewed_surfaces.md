# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/import-candidate-review-group-decisions.mjs` | Local import trust boundary, path safety, manifest write integrity | No issue found | `--input` is constrained to the project root, incoming decisions must match generated review group pairs, preview validation runs before `--write`, and output path is fixed. |
| `scripts/__tests__/import-candidate-review-group-decisions.test.mjs` | Regression coverage for fail-closed import behavior | No issue found | Covers valid write, unknown generated group rejection, and mismatched `groupId`/`catalogId` rejection. |