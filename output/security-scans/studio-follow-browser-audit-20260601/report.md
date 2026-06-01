# Studio Follow Browser Audit Security Diff Scan

Date: 2026-06-01
Branch: codex/batch-curation-pipeline
Scope: local diff for `npm run audit:studio-follow`, browser evidence artifacts, and project-plan update.

## Threat Model

The relevant assets are local real catalog data, SymbTr/PDF/source evidence, browser trust in `/studio/follow`, and operator confidence in instrument/usul/source audit evidence. The changed surface is a local validation script that launches a headless browser, reads `http://localhost:4015/studio/follow`, writes JSON/PNG evidence under `output/playwright`, and removes an isolated browser profile under `.layout-guard`.

## Discovery

Reviewed changed files:

- `scripts/audit-studio-follow-browser.mjs`
- `package.json`
- `PROJECT_PLAN.md`
- `output/playwright/studio-follow-browser-audit-20260601.json`
- `output/playwright/studio-follow-browser-audit-20260601.png`

Sink search covered child-process launch, filesystem writes/deletes, WebSocket/CDP usage, network fetches, runtime evaluation, screenshot capture, and path joins. The script does not accept arbitrary remote targets by default, constrains summary/screenshot/profile paths to the project root, does not send source data to external services, and uses a fixed local route. The only process launched is an installed Chrome/Edge/Chromium executable with a temporary isolated profile. Filesystem removal is restricted by `assertInsideProject`.

## Candidate Findings

No technically plausible security finding was discovered in this diff.

## Validation

Validation evidence:

- `npm run audit:studio-follow`: passed, desktop/mobile `ok: true`, browser warning/error count 0.
- Targeted Vitest for studio follow, sample coverage, sample library, usul, notation, and rhythm schedule: 6 files, 52 tests passed.
- `npm run audit:samples`: 3 files, 11 tests passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test:run`: 50 files, 357 tests passed.
- `npm run build`: passed.
- `npm run curation:validate`: ok true, 0 errors.
- `npm run audit:security`: found 0 vulnerabilities.
- `npm run guardrails:layout -- --base-url http://localhost:4015 --routes /studio/follow,/references/curation`: passed.
- `git diff --check`: passed.

## Attack Path Analysis

No surviving candidate reached attack-path analysis. A plausible concern would be arbitrary file deletion or external data transmission through the audit script. Path operations are project-root constrained, the browser profile lives under `.layout-guard`, output artifacts live under `output/playwright`, and network reads target the configured local app. The CDP `Runtime.evaluate` payload is a fixed audit expression, not operator-supplied code.

## Result

Final decision: no findings.

Residual risk: if this audit script is later generalized to arbitrary URLs or arbitrary runtime expressions, that change needs a fresh security review before push.
