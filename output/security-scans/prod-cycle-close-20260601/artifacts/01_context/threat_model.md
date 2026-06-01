# Threat Model: Muzik

## Product Surfaces

- Next.js app routes for Turkish music study and production workflows: `/studio/follow`, `/references`, `/references/curation`, `/api/external-references`, sample APIs and score APIs.
- Local operator curation workflows that ingest, normalize, dedupe, score and validate external notation, recording and archive source candidates for a 3000-entry SymbTr catalog.
- Generated artifacts under `output/` and curated manifests under `src/data/references/` that influence what references are displayed or auto-attached.
- Browser-rendered notation/PDF/source views where untrusted or semi-trusted metadata must not be promoted to verified data without validation.

## Assets And Invariants

- Real catalog data, accepted source manifests, auto-attached references and verified PDF layout manifests must not be corrupted by review-only candidates.
- Accepted source attachment must remain gated by HTTPS URL, provider profile match, catalog id match, duplicate-safe identity, metadata conflict checks, checkedAt and complete evidence.
- Review queue candidates are leads, not trusted evidence; they must remain non-attached until imported through validation.
- Verified PDF measure boxes are trusted only after explicit verification; empty import dry-runs must prove no write to the verified manifest.
- Operator-only write operations must stay token-gated and local/production policy-gated.

## Trust Boundaries

- Browser/user inputs and external URLs cross into `/api/external-references` and staging/mapping scripts.
- Generated batch artifacts cross from tooling into UI read-only state.
- Source metadata from HTML/oEmbed/schema.org is untrusted until normalized and validated.
- Local scripts may read/write project files, but must constrain paths to the project and avoid accepting arbitrary shell commands.

## Attacker-Controlled Inputs

- URLs, titles, provider labels, metadata fields, source intake manifests, candidate decision imports, feedback and correction payloads.
- Large generated candidate queues and artifact paths if a local operator imports malformed JSON.
- Browser-visible metadata rendered from curated manifests.

## Primary Security Failure Modes

- Unsafe promotion of review-only or conflict candidates into auto-attached accepted references.
- Path traversal or arbitrary file write through import/export tooling.
- Shell command injection through audit orchestration or operation runner code.
- XSS or unsafe rendering from untrusted source metadata.
- SSRF-like behavior from metadata fetchers if URL/profile gates are bypassed.
- Verification bypass where PDF candidate geometry is treated as verified evidence.
