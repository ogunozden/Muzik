# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-reporting.mjs` | Coverage reporting, dedupe accounting, unsafe promotion | No issue found | Pure report builders keep review-only data separate and require injected accepted identity normalization. |
| `scripts/lib/external-reference-audit.mjs` | Refactor integration and policy preservation | No issue found | Existing export surface remains; dedupe report receives `getReferenceIdentity` from the audit module. |
| `scripts/lib/__tests__/external-reference-reporting.test.mjs` | Regression coverage | No issue found | Covers duplicate URL identity accounting and coverage matrix no-source-field invariant. |
