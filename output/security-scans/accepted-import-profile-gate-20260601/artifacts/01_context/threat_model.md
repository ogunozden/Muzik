# Muzik Repository Threat Model

## Assets

- Trusted 3000-entry SymbTr catalog and accepted external reference manifests.
- Central research source profiles that define trusted provider hosts, provider types, confidence weights, embed capabilities, and metadata strategies.
- Batch import scripts that can move reviewed external source candidates into manifests consumed by product UI.
- Validation, audit, security, and browser evidence used as release gates.

## Trust Boundaries

- Bulk candidate import JSON is operator-provided input and must not bypass central provider/source policy.
- Accepted candidates can become curated product references, while needs-review, rejected, and conflict candidates remain queue data.
- External URLs are untrusted until matched to an enabled source profile and validated by status-specific rules.

## Attacker-Controlled Inputs

- Local import JSON files passed to `scripts/import-external-reference-candidates.mjs`.
- Candidate source IDs, providers, URLs, labels, verification fields, and timestamps.
- Existing curation manifests when a batch import is run in a dirty or manually edited repository state.

## Security Invariants

- Accepted import rows must map to known catalog IDs and trusted HTTPS source profiles.
- Accepted source provider values must match the central profile provider for the URL host.
- Accepted duplicate URL identities must be rejected or skipped deterministically.
- Review/conflict/rejected rows must not be treated as source evidence or auto-attached references.