# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
|---|---|---|---|
| scripts/lib/external-reference-candidate-review.mjs | Generated artifact could smuggle accepted source data | No issue found | Source intake rows use `needs-source-url`; source fields are blank. |
| scripts/lib/external-reference-audit.mjs | Audit could write trusted accepted data | No issue found | Writes separate intake artifact and summary counts only. |
| scripts/lib/source-curation-validation.mjs | Validator bypass or stale artifact drift | No issue found | Checks packet rows, active groups, fingerprints, blank source fields, no URL/source id. |
| src/app/api/external-references/route.ts | Local API exposure | No issue found | Adds read metadata for source intake; no new operation action. |
| src/app/references/curation/page.tsx | Server-rendered data exposure | No issue found | Reads generated metadata for local curation UI; no source URLs are introduced. |
| src/features/references/ReferencesCurationDashboard.tsx | Client-side unsafe import affordance | No issue found | Displays import contract; accepted import remains existing validated manifest textarea. |
| output/external-reference-coverage/symbtr-curated-reference-source-intake-template.json | Generated data safety | No issue found | 119 packets, 2973 blank source rows; no accepted/sourceUrl/sourceId keys. |
