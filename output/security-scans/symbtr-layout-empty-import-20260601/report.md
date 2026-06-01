# SymbTr Layout Empty Import Security Diff Scan

Date: 2026-06-01
Branch: codex/batch-curation-pipeline
Scope: local diff for SymbTr PDF layout review empty import validation, API/page/dashboard exposure, generated evidence artifacts, and tests.

## Threat Model

Primary assets are real catalog/source data, accepted/needs-review/rejected/conflict state, generated curation manifests, and operator trust in verified PDF measure boxes. The relevant trust boundary is between unverified review artifacts and verified runtime manifests. Operator-supplied import JSON and local generated artifacts must not promote PDF layout candidates unless the explicit verified import policy is satisfied. Browser-visible data must be rendered as text and must not introduce script execution.

## Discovery

Reviewed changed files and supporting sinks:

- `scripts/verify-symbtr-layout-review-import.mjs`
- `scripts/validate-symbtr-layout-verification.mjs`
- `src/app/api/external-references/route.ts`
- `src/app/references/curation/page.tsx`
- `src/features/references/ReferencesCurationDashboard.tsx`
- changed tests and generated artifacts

Sink search covered child process execution, filesystem reads/writes, fetch calls, HTML injection, eval-like execution, and path joins. New script execution is fixed to `process.execPath` plus the local `import-symbtr-layout-verification.mjs`; caller-provided paths are constrained with `assertInsideProject`. The generated empty import template has `entries: {}` and the dry-run invokes the existing importer with `--dry-run`, so it does not write verified manifest data. UI/API changes read fixed project artifact paths and render plain React text.

## Candidate Findings

No technically plausible security finding was discovered in this diff.

## Validation

Validation evidence:

- `npm run verify:symbtr-layout-review-import`: passed, 0 import entries, 0 verified measure boxes.
- `npm run verify:symbtr-measures`: passed, `emptyImportDryRun` present in summary.
- Targeted Vitest: 5 files, 40 tests passed.
- `npm run test:run`: 50 files, 357 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run curation:validate`: ok true, 0 errors.
- `npm run build`: passed.
- `npm run audit:security`: found 0 vulnerabilities.
- `npm run guardrails:layout -- --base-url http://localhost:4015 --routes /references/curation`: passed.
- Browser evidence: `output/playwright/references-curation-symbtr-empty-import-20260601.json`, console warning/error count 0, no horizontal overflow.
- `git diff --check`: passed.

## Attack Path Analysis

No surviving candidate reached attack-path analysis. The main attempted abuse path would be a crafted review packet promoting `measureBoxes` or `confidence: "verified"` into the verified manifest. The new validation rejects that pattern before dry-run, and the empty import path keeps input entries at 0. A path traversal attempt through CLI paths is blocked by project-root containment checks. A browser injection path was not found because the changed frontend renders artifact names and counts as normal React text and does not use HTML injection.

## Result

Final decision: no findings.

Residual risk: this phase proves the no-write empty import discipline. Future verified PDF imports still need separate security and data-integrity review when real `measureBoxes` are intentionally supplied.
