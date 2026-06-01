| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-audit.mjs` | Data exposure, unsafe promotion, count drift | No issue found | `batchReport` contains aggregate counts, status/profile summaries, catalog ids already present in accepted manifest summary, and policy text; it does not write new caller-selected paths or promote review rows. |
| `scripts/lib/source-curation-validation.mjs` | Validation bypass, stale summary acceptance | No issue found | New validator checks batch report counts against coverage summary, candidate review row count, missing x enabled profile count, review-only statuses, and non-empty validation gates. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Secret exposure, unsafe operator action | No issue found | UI renders aggregate batch counts and validation gate count only; no token, raw manifest body, or accepted source mutation is introduced. |
| `output/external-reference-coverage/summary.json` | Generated artifact integrity | No issue found | Refreshed via `npm run audit:external-references`; `npm run curation:validate` returned `ok: true` for 3000 catalog entries and 11912 review rows. |
