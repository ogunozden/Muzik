# Muzik Repository Threat Model

## Assets

- SymbTr catalog, generated PDF layout candidates, and verified PDF measure manifests.
- Batch curation and verification scripts that can modify trusted generated data.
- User-facing score-following views that consume verified measure boxes.
- Audit, validation, browser evidence, and build artifacts used as release gates.

## Trust Boundaries

- Operator-provided JSON enters trusted repository manifests only through validation scripts.
- PDF vector candidates are untrusted until human-reviewed or visual-regression-approved.
- Preview and generated output under `output/` are evidence artifacts, not trusted product data unless a validator explicitly accepts them.
- The verified manifest under `src/data/symbtr/layout-verification.generated.json` is trusted by product UI and must not receive stale or unverified boxes.

## Attacker-Controlled Inputs

- Import files passed to `scripts/import-symbtr-layout-verification.mjs`.
- Catalog identifiers, source archive paths, and measure box coordinates inside imported verification manifests.
- Local CLI arguments such as `--input`, `--write`, `--dry-run`, and validator override paths.

## Security Invariants

- Unverified `pdf-vector-candidate` rows must not be promoted to `verified`.
- Verified boxes must map back to generated candidate row/index pairs for the same catalog entry and source PDF.
- Import and validator paths must remain inside the project root.
- Dry-run validation must not mutate trusted generated manifests.
- Final writes must occur only after the project validator accepts the candidate manifest.