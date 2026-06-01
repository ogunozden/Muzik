# Security Review: pre-push branch diff

## Scope

- Scan mode: Codex Security branch diff scan for `codex/batch-curation-pipeline` against merge-base `f40deb12281c1e936c4e36e8d1933c9a4d2de777`.
- In-scope artifacts: 153-row deterministic diff worklist, generated curation artifacts, `/api/external-references`, `/api/samples`, sample UI, source import/export scripts, metadata fetcher, SymbTr ZIP/PDF extraction scripts, route/page tests, and prior phase security reports.
- Runtime evidence: targeted route tests, full `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run curation:validate`, `npm run audit:security`, route layout guard, API token-gate smoke, and Playwright browser QA passed.
- Corrective action during scan: `/api/samples` POST/DELETE was hardened with the central local operation token helper after discovery found an unauthenticated sample mutation path.
- Explicit exclusions and limitations: raw `symb/`, `.agents/`, old untracked screenshots, and local `.env.local` remain untracked/local; no secret values were printed or copied into this report. Push has not been run in this report artifact.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none after remediation |
| Confidence mix | high confidence no-finding for reviewed diff security boundaries |
| Coverage | 153 changed source-like rows, mutation APIs, token gates, import/export scripts, filesystem sinks, external fetch, security headers, browser evidence |
| Validation mode | Source review, deterministic diff worklist, secret-pattern scan, focused API smoke, tests, typecheck, lint, build, curation validation, npm audit, Playwright QA |

## Threat Model

The platform exposes local/admin curation APIs, sample-management APIs, generated catalog/source artifacts, public study pages, and browser-loaded media. Critical assets are real Turkish music catalog data, accepted external source attachments, operator tokens, local filesystem-backed generated artifacts, uploaded sample files, and build/runtime configuration. Main trust boundaries are browser input, API query/body/form-data parameters, generated JSON/CSV manifests, imported candidate manifests, fetched external URLs, local archive/PDF files, and filesystem writes under the repository. Security invariants: only accepted sources may auto-attach, review/conflict candidates must not be promoted without policy validation, local/operator mutations must require explicit token authorization in production-like environments, untrusted paths must stay inside approved project roots, external metadata fetches must remain HTTPS/profile constrained, and browser-visible data must not leak secrets or treat unverified PDF/layout candidates as verified truth.

## Findings

### No findings

No reportable security issue remains. Discovery found one concrete mutation-control gap: `/api/samples` allowed unauthenticated POST/DELETE operations against fixed sample slots. The implementation already constrained paths to the configured sample root and enforced the central audio upload policy, but it lacked an operator authorization gate. The gap was fixed before final reporting by adding `getLocalOperationAccessError` in `src/shared/security/local-operations.ts`, refactoring the external-reference route onto the same helper, and requiring `SAMPLE_OPERATIONS_TOKEN` for sample POST/DELETE via `x-sample-operations-token`.

Validation after the fix showed no-token sample DELETE returns 401 before slot mutation, tokened invalid-slot DELETE reaches the normal 404 path without deleting real data, targeted route tests cover positive/negative token behavior, and the full validation/build/audit set passed with 0 errors and 0 warnings.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/samples/route.ts` | Unauthenticated file mutation | Rejected after fix | POST/DELETE now require `SAMPLE_OPERATIONS_TOKEN`; no-token DELETE returned 401 and tokened invalid-slot DELETE returned 404. |
| `src/shared/security/local-operations.ts` | Token guard correctness | No issue found | Central helper enforces enablement, production token requirement, loopback-only unsafe local mode, and constant-time comparison. |
| `src/app/api/external-references/route.ts` | Existing curation ops token regression | No issue found | Existing external reference token behavior remains covered by targeted route tests. |
| `src/app/samples/page.tsx` | Operator token UI | No issue found | Token is password input state only and is sent as a header for upload/delete. |
| `scripts/lib/external-metadata-fetch.mjs` | SSRF/external fetch | No issue found | HTTPS/profile validation remains in place. |
| `scripts/import-external-reference-candidates.mjs` | Candidate import/data integrity | No issue found | Import keeps HTTPS, catalog, status, and project path controls. |
| `scripts/extract-symbtr-pdf-measures.mjs` | Archive/path handling | No issue found | Fixed local archive reads and project-contained output assertions were reviewed. |
| `next.config.mjs` | Browser security headers | No issue found | CSP and baseline headers remain configured and tested. |

## Open Questions And Follow Up

- Continue the main `goal.md` backlog after push: external source coverage remains low, PDF verified-box manifest count remains 0, and shared UI/token canonicalization is still open in `PROJECT_PLAN.md`.
