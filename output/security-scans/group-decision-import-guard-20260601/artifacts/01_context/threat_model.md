# Muzik Repository Threat Model

## Assets

- Real Turkish music catalog data, curated reference manifests, candidate review queues, and source/provider policy files.
- Local admin and operator workflows that can import or write curation decisions.
- User-facing study surfaces that render SymbTr metadata, notation/PDF candidates, external links, and media embeds.
- Build, validation, and generated audit artifacts used as release evidence.

## Trust Boundaries

- Local/imported JSON manifests cross into trusted repository data only through validation scripts.
- External provider URLs and search candidates are untrusted until accepted by policy and validation.
- Browser-visible media and external links must remain sandboxed, HTTPS-only where required, and clearly separated between candidate and verified data.
- Generated output under `output/` is reproducible audit evidence, not a source of truth unless a script explicitly consumes a validated artifact.

## Attacker-Controlled Inputs

- Candidate review decision import files passed to local scripts.
- External source URLs, provider metadata, and curation manifests.
- Catalog text fields that later appear in generated search URLs, UI tables, and reports.

## Security Invariants

- Only accepted and validated sources may be auto-attached as curated references.
- `needs-review`, `rejected`, `deferred`, and `conflict` candidates must not become trusted user-facing sources.
- Import scripts must reject out-of-project file paths and stale, forged, or mismatched decision records.
- Batch tooling must fail closed when generated artifacts are missing, malformed, or drift from validation contracts.
- Real catalog data must not be overwritten by test/demo/mock data.