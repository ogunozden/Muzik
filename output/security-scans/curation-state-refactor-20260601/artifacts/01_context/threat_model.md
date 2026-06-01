# Repository Threat Model

## Product Surfaces
- Next.js App Router web UI for Turkish music study, eser following, rhythm, audio sample management, external reference management, and local/admin curation.
- Token-protected local operations APIs under `/api/external-references` and `/api/samples` that read/write generated manifests and source curation artifacts.
- Batch-first source curation scripts that read, validate, and write real catalog/reference manifests.

## Assets And Privileges
- Real 3000-entry SymbTr catalog metadata, curated external source manifests, source quality stats, review queues, and feedback/correction logs.
- Local operations tokens and environment configuration; token values must never be exposed in logs, reports, browser output, or committed files.
- User-facing trust signals: accepted vs needs-review/rejected/conflict, safe auto-attach policy, embed/source allowlists, and PDF verification status.

## Trust Boundaries
- Browser users can control UI filters, operation forms, imported candidate manifests, source URLs, and curation feedback requests.
- Operations APIs cross from browser input into local filesystem scripts and generated artifacts; token enforcement and loopback restrictions are critical.
- External URLs and provider metadata are untrusted until classified by central source profiles and validation gates.
- Script modules that mutate manifests must validate references against the catalog and auto-attached source registry before writing.

## Security Invariants
- Mutating operations require the configured operation token or explicitly safe loopback development mode.
- Accepted sources alone may be auto-attached; generated search candidates stay review-only until imported and validated.
- Feedback, manual correction, embed state, and source quality stats remain append/update operations tied to existing auto-attached references.
- Generated reports and logs must not contain secret token values.

## Relevant Failure Modes
- Token bypass or accidental token disclosure in UI, logs, reports, or tests.
- Orphan feedback/correction/embed rows corrupting curation state or misleading operators.
- Incorrect source status transitions causing needs-review/conflict sources to appear as accepted.
- Filesystem script misuse corrupting real curation data or generated manifests without validation gates.
