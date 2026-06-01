# Threat Model: PDF Verification Summary Artifact

## Assets

- SymbTr PDF vector measure candidate registry.
- `layout-verification.generated.json`, which is the only source allowed to promote verified PDF measure boxes.
- Generated `output/symbtr-layout-review/layout-verification-summary.json` evidence.
- Eser Takip UI state that must distinguish unreviewed candidates from verified boxes.

## Trust Boundaries

- CLI output paths cross from operator command arguments into local filesystem writes.
- Generated PDF vector candidates are untrusted until human-reviewed or visual-regression-approved.
- Browser UI consumes layout and verification status and must not present candidates as verified.

## Security Invariants

- Summary output writes must stay inside the project root.
- A summary artifact must not promote or mutate verification manifest contents.
- `candidateStatus` must reflect the real verified box count.
- The Eser Takip UI must show 49 candidates and 0 verified boxes without rendering a verified map.
- No secrets or local operation tokens may be added.

## Reviewed Scope

- `scripts/validate-symbtr-layout-verification.mjs`
- `package.json`
- `PROJECT_PLAN.md`
- `output/symbtr-layout-review/layout-verification-summary.json`
- Browser evidence for `/studio/follow`
