# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-audit.mjs` | Generated artifact writes, accepted-source promotion | No issue found | Dedupe report is derived from existing rows and written under the existing guarded output directory. |
| `scripts/lib/source-curation-validation.mjs` | Fail-open validation, unsafe duplicate acceptance | No issue found | Drift checks compare report values against bulk candidates and review queue and require duplicate rows to be zero before auto-attach. |
| `scripts/validate-source-curation.mjs` | File path control | No issue found | Reads fixed project-relative artifacts only. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Token flow, raw HTML/data exposure | No issue found | Displays aggregate path/count text only; no mutation or HTML injection path added. |
| Supporting tests and generated artifacts | Regression coverage and sensitive data exposure | No issue found | Tests cover report generation, drift rejection, API pass-through and UI visibility; generated report contains aggregate counts and empty duplicate groups. |
