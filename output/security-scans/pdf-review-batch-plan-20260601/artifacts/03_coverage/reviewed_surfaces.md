# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/render-symbtr-pdf-layout-review.mjs` | Filesystem write and unreviewed candidate promotion | No issue found | Existing project-contained write guard remains in use; batch packets do not write verified data. |
| `scripts/validate-symbtr-layout-verification.mjs` | Trusted manifest validation and fail-closed promotion gate | No issue found | New validator requires exact review-template coverage and rejects `confidence: verified` or non-empty `measureBoxes` anywhere in the batch plan. |
| `scripts/__tests__/render-symbtr-pdf-layout-review.test.mjs` | Regression coverage | No issue found | Test asserts packet/candidate counts and no serialized verified confidence. |
| `output/symbtr-layout-review/layout-verification-review-batch-plan.json` | Generated candidate data | No issue found | Contains unreviewed candidate rows only, grouped into 10 staff-row packets. |
| `output/symbtr-layout-review/layout-verification-summary.json` | Generated validation summary | No issue found | Reports `verifiedMeasureBoxes=0`, `errors=[]`, and batch-plan coverage counts. |
