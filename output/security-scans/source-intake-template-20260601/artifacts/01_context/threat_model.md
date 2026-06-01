# Threat Model: Muzik

## Assets
- SymbTr catalog metadata, curated external reference manifests, auto-attached references, source feedback, manual corrections, generated coverage reports, and local curation operation endpoints.
- Browser-rendered local admin surfaces under `/references/curation` and `/api/external-references`.

## Trust Boundaries
- Local operator input enters through import textareas and local-only API operations.
- Generated review/search artifacts are not trusted source evidence until validated by import scripts.
- External URLs are untrusted until HTTPS, research-profile match, duplicate identity, verification, and checked-at rules pass.

## Attacker Model
- A malicious or mistaken operator could paste malformed manifests, stale fingerprints, duplicate URLs, or source URLs into a review artifact.
- A remote site referenced by search candidates is not trusted and must not become auto-attached without validation.

## Security Invariants
- Review queues and source intake templates must not carry accepted source IDs or source URLs.
- Accepted attachment must remain limited to validated bulk candidate manifests.
- Generated artifacts must be deterministic and covered by validation gates so stale or tampered packets fail before attach.
