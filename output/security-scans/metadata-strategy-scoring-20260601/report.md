# Security Review: metadata strategy scoring

## Scope

- Scan mode: Codex Security scoped local-patch diff scan for external source metadata/oEmbed scoring and candidate-review validation.
- In-scope files: `scripts/lib/external-metadata-fetch.mjs`, `scripts/map-external-source-inbox.mjs`, `scripts/lib/external-source-matcher.mjs`, `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, related tests, `PROJECT_PLAN.md`, generated candidate review/summary artifacts, and browser/security evidence.
- Runtime evidence: focused Vitest, full `npm run test:run`, `npm run guardrails:architecture`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run audit:security`, `npm run audit:external-references`, `npm run curation:validate`, `npm run verify:symbtr-measures`, `git diff --check`, route layout guard, and Playwright browser QA passed.
- Secret scan: added-line keyword hits are matcher `token-match` scoring labels/function names only; no secret, API key, bearer token, password, or private key was introduced.
- Explicit exclusions and limitations: this scan covers the metadata scoring/validation delta. It does not claim completion of PDF internal metadata parsing, verified PDF measure promotion, or full 3000-catalog source coverage closure.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for scoped metadata scoring delta |
| Coverage | 9 changed source-like diff rows plus generated artifact, validation, layout, and browser evidence |
| Validation mode | Source review, deterministic local-patch worklist, secret-pattern scan, tests, build, npm audit, curation validation, layout/browser QA |

## Threat Model

The scoped change affects external source metadata ingestion, scoring evidence, review queue generation, and validation. Assets are real curation manifests, operator-visible accepted/review/conflict states, generated queue artifacts, source profile policy, and browser-rendered curation UI. Trust boundaries are external HTML/oEmbed responses into local batch manifests, generated JSON/CSV artifacts into API/UI, and accepted-only manifests into auto-attach flows. Security invariants are HTTPS/private-host metadata fetch protection, data-only untrusted metadata handling, YouTube oEmbed verification before acceptance, no automatic attach for needs-review/conflict rows, duplicate accepted identity rejection, and token-gated local operations.

## Findings

### No Findings

No reportable security issue was found in the scoped patch.

The metadata fetcher keeps the existing URL validation, private/loopback host rejection, timeout, content-type, and byte-limit controls. Newly extracted HTML description/author and oEmbed provider/author/title values are stored as structured metadata and scoring evidence only; they are not executed, parsed as code, downloaded as media, or used to weaken request authorization.

The matcher uses metadata to raise confidence and explainability, but existing mismatch handling still forces `needs-review`, and YouTube sources still cannot become accepted unless `oembedVerified` is true. The candidate review queue remains search-only and non-attachable, and the validator now fails closed when `metadataStrategy` drifts from the central research profile or when metadata strategy evidence is missing.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when explicitly requested for follow-up candidates. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-metadata-fetch.mjs` | SSRF / untrusted HTML metadata | No issue found | HTTPS, credential, private-host, content-type, timeout, and max-byte controls remain before extraction. |
| `scripts/map-external-source-inbox.mjs` | External oEmbed metadata trust | No issue found | oEmbed metadata is provenance evidence; accepted-only write path and oEmbed gate remain unchanged. |
| `scripts/lib/external-source-matcher.mjs` | Incorrect auto-attach promotion | No issue found | Metadata affects score/reasons; conflicts and unverified YouTube sources still stay out of accepted auto-attach. |
| `scripts/lib/external-reference-audit.mjs` | Review queue drift into source data | No issue found | Queue rows carry metadata strategy and remain review-only without source ids or source URLs. |
| `scripts/lib/source-curation-validation.mjs` | Validation bypass | No issue found | Metadata strategy/profile drift and missing metadata evidence fail validation. |

## Open Questions And Follow Up

- Continue the broader `goal.md` backlog: PDF internal metadata parsing, verified PDF measure promotion, source pipeline modularization, and real curated coverage expansion remain open.
