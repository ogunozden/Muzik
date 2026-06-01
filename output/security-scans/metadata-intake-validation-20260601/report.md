# Security Review: Muzik metadata intake local patch

## Scope

- Scan mode: local patch diff for metadata intake and validation changes.
- Repository: `C:\Users\ogunozden\Desktop\Muzik`.
- Diff-scoped source-like files reviewed from `deep_review_input.csv`: `scripts/lib/external-source-intake.mjs`, `scripts/lib/external-reference-audit.mjs`, `scripts/lib/__tests__/external-source-intake.test.mjs`, `scripts/lib/__tests__/external-reference-audit.test.mjs`, and `src/app/references/curation/__tests__/page.test.tsx`.
- Supporting docs reviewed for intent: `PROJECT_PLAN.md` and `docs/EXTERNAL_SOURCE_PIPELINE.md`.
- Runtime gates available for this phase: targeted Vitest, full `npm run test:run`, lint, typecheck, build, curation validation, external reference audit, security audit, SymbTr measure verification, layout guard, and browser console evidence.
- Exclusions: unrelated untracked `.agents/`, `symb/`, and older screenshots were not part of this diff scan.

### Scan Summary

| Field | Value |
|---|---|
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high no-findings confidence for reviewed diff scope |
| Coverage | 5/5 source-like diff rows have completion receipts in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Candidate validation skipped because discovery emitted no candidate findings |
| Final artifacts | `C:\tmp\codex-security-scans\Muzik\metadata-intake-validation-20260601\report.md`, `C:\tmp\codex-security-scans\Muzik\metadata-intake-validation-20260601\report.html` |

## Threat Model

# Muzik Repository Threat Model

## Product surfaces
Muzik is a local/admin Turkish music study and production platform with Next.js pages, local data manifests, batch curation scripts, catalog/source validation, audio/studio workflows, and browser-visible curation views.

## Assets and invariants
Real catalog/source data, accepted/needs-review/rejected/conflict status integrity, provider/profile policy, auto-attach safety, local operator tokens, generated evidence, and build/test outputs must not be corrupted, forged, leaked, or silently downgraded. Accepted sources must be the only auto-attached records.

## Trust boundaries
External source manifests, CSV/JSON/Markdown imports, URLs, provider metadata, oEmbed/HTML metadata, operator-entered JSON, browser-rendered text, filesystem paths passed to scripts, and environment variables cross into trusted local processing. Browser UI must treat all external metadata as untrusted display data.

## Attacker-controlled inputs
Source URLs, titles, observed makam/usul/form/composer fields, metadata fields, signals, provider names, candidate manifests, API request bodies, and local CLI inputs may be malformed or adversarial.

## Key failure modes
Wrong auto-attach of low-confidence data, metadata/script injection in UI, path traversal or unintended file writes in tooling, prototype/object pollution via manifest fields, stale policy causing trusted providers to be misclassified, unsafe token exposure, and validation bypasses for accepted candidates.

## Security assumptions
The platform is primarily local/admin-oriented, but all external source data is untrusted. Validation scripts are security-relevant gates and must reject malformed accepted data before it reaches user-facing or auto-attach paths.


## Findings

| Finding | Severity | Confidence | Status |
|---|---|---|---|
| No findings | none | high | Discovery found no technically plausible security regression in the diff scope. |

### No findings

The diff preserves external metadata as inert structured fields and adds validation that rejects malformed accepted bulk candidate metadata. It does not add network fetches, HTML rendering sinks, shell execution, path joins outside existing guarded project paths, authentication changes, or relaxed auto-attach policy. Existing HTTPS/provider/date/duplicate-identity checks remain in place.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
|---|---|---|---|
| `scripts/lib/external-source-intake.mjs` | Untrusted metadata import, CSV/CLI parsing, path containment | No issue found | Preserves metadata as normalized strings/signals only; existing HTTPS/provider/date/project-path controls remain intact. |
| `scripts/lib/external-reference-audit.mjs` | Accepted bulk candidate validation | No issue found | New metadata checks reject malformed accepted candidates and do not relax auto-attach gates. |
| Intake/audit tests | Validation regression coverage | No issue found | Adds positive and negative coverage for metadata preservation/rejection. |
| Curation page test | Test harness timeout | No issue found | Timeout change only; no runtime behavior or trust-boundary change. |
