# Finding Discovery Report

Scan mode: local patch diff.

Reviewed diff rows:
- `output/external-reference-coverage/summary.json`
- `output/external-reference-coverage/symbtr-curated-reference-candidate-review-group-decision-recommendations.json`
- `scripts/lib/__tests__/external-reference-audit.test.mjs`
- `scripts/lib/__tests__/source-curation-validation.test.mjs`
- `scripts/lib/external-reference-audit.mjs`
- `scripts/lib/source-curation-validation.mjs`
- `scripts/validate-source-curation.mjs`
- `src/app/api/external-references/__tests__/route.test.ts`
- `src/app/api/external-references/route.ts`
- `src/app/references/curation/__tests__/page.test.tsx`
- `src/features/references/ReferencesCurationDashboard.tsx`

Result: no technically plausible security findings survived discovery.

Security-relevant controls observed:
- Recommendation generation is deterministic and derives only from generated review group state plus existing curation decision traces.
- Recommendations are limited to `conflict` and `deferred`; no `accepted` recommendation is generated.
- Recommendation rows intentionally contain no `sourceId`, `sourceUrl`, or `url` fields.
- `curation:validate` now loads the recommendation artifact and enforces version/type, status allowlist, catalog/group identity, reason/reviewer/date fields, source-field absence, group-status drift, and coverage-summary count drift.
- `summary.json.batchReport` includes `recommendedReviewGroupDecisions` and the new recommendation drift validation gate.
- The new API action is read-only, uses the existing authenticated operations POST boundary, reads only the generated recommendation artifact, applies existing group filters, and reuses the 5,000-row export bound.
- The UI calls the existing `runOperation` token/header path and writes the recommendation manifest into the same dry-run import textarea; importing still goes through the existing decision import script and dry-run/write switch.
- Browser QA confirmed dry-run import did not modify `src/data/references/candidate-review-group-decisions.json`.

No validation or attack-path phase was opened because discovery produced zero candidate findings.
