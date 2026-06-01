# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-candidate-review.mjs` | Candidate generation, URL encoding, unsafe promotion | No issue found | Review rows are derived from backlog/profile data, search queries are URL-encoded, and no accepted source fields are emitted. |
| `scripts/lib/external-reference-audit.mjs` | Refactor integration and export compatibility | No issue found | Existing audit flow delegates to the extracted module; write paths and validation behavior remain in the audit layer. |
| `scripts/lib/__tests__/external-reference-candidate-review.test.mjs` | Regression coverage for data safety | No issue found | Test covers conflict/needs-review grouping and asserts no `sourceId`/`sourceUrl` on generated candidates. |
