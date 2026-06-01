# Security Review: Muzik prod-cycle close

## Scope

- Scan mode: local working-tree diff scan for the batch-first prod-cycle close changes.
- In-scope code: prod-cycle audit orchestration, references curation runtime audit, PDF empty-import SHA256 gate, external references API/page state exposure, references curation dashboard rendering and package script entrypoint.
- Artifacts reviewed: `artifacts/02_discovery/deep_review_input.csv`, `artifacts/02_discovery/work_ledger.jsonl`, `artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime and test status: `npm run audit:prod-cycle`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, `npm run curation:validate`, `npm run verify:symbtr-measures` and `npm run audit:security` passed.
- Explicit exclusions: old unrelated untracked `.agents/`, `symb/` and prior screenshot artifacts were not part of this diff scan.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high no-findings confidence for reviewed diff scope |
| Coverage | 9 diff-scoped surfaces reviewed |
| Validation mode | Static diff review plus full local test/build/audit evidence |

## Threat Model

### Product Surfaces

- Next.js app routes for Turkish music study and production workflows: `/studio/follow`, `/references`, `/references/curation`, `/api/external-references`, sample APIs and score APIs.
- Local operator curation workflows that ingest, normalize, dedupe, score and validate external notation, recording and archive source candidates for a 3000-entry SymbTr catalog.
- Generated artifacts under `output/` and curated manifests under `src/data/references/` that influence what references are displayed or auto-attached.
- Browser-rendered notation/PDF/source views where untrusted or semi-trusted metadata must not be promoted to verified data without validation.

### Assets And Invariants

- Real catalog data, accepted source manifests, auto-attached references and verified PDF layout manifests must not be corrupted by review-only candidates.
- Accepted source attachment must remain gated by HTTPS URL, provider profile match, catalog id match, duplicate-safe identity, metadata conflict checks, checkedAt and complete evidence.
- Review queue candidates are leads, not trusted evidence; they must remain non-attached until imported through validation.
- Verified PDF measure boxes are trusted only after explicit verification; empty import dry-runs must prove no write to the verified manifest.
- Operator-only write operations must stay token-gated and local/production policy-gated.

### Trust Boundaries

- Browser/user inputs and external URLs cross into `/api/external-references` and staging/mapping scripts.
- Generated batch artifacts cross from tooling into UI read-only state.
- Source metadata from HTML/oEmbed/schema.org is untrusted until normalized and validated.
- Local scripts may read/write project files, but must constrain paths to the project and avoid accepting arbitrary shell commands.

## Findings

| Severity | Finding | Confidence |
| --- | --- | --- |
| none | No reportable findings | high |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when follow-up candidates are explicitly requested. |

### No Findings

No reportable vulnerabilities survived discovery. The reviewed diff does not add attacker-selected shell commands, arbitrary file paths, unsafe HTML rendering, network fetches to user-controlled destinations, authentication bypass, or new write endpoints. The PDF changes strengthen file-integrity validation by requiring SHA256 before/after proof that the verified manifest is unchanged. The curation UI/API changes expose summarized fixed-artifact metadata and use React escaping.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/audit-prod-cycle.mjs` | command orchestration | No issue found | Static local npm command list; no attacker-controlled shell string; writes fixed summary artifact. |
| `scripts/audit-references-curation-runtime.mjs` | runtime evidence gate | No issue found | Read-only localhost fetch and string gates; no new mutation or unsafe sink. |
| `scripts/verify-symbtr-layout-review-import.mjs` | file integrity | No issue found | Project-bounded manifest path and SHA256 before/after proof. |
| `scripts/import-symbtr-layout-verification.mjs` | validation flow | No issue found | Skip applies to preview validation only; final validator still enforces hash gate. |
| `scripts/validate-symbtr-layout-verification.mjs` | validation flow | No issue found | Adds stricter SHA256 checks. |
| `src/app/api/external-references/route.ts` | API state exposure | No issue found | Fixed artifact path, summarized fields, no new write action. |
| `src/app/references/curation/page.tsx` | server-rendered state | No issue found | Fixed artifact path, summarized fields, sliced queues. |
| `src/features/references/ReferencesCurationDashboard.tsx` | client rendering | No issue found | React-escaped text rendering; no raw HTML or script execution. |
| `package.json` | script entrypoint | No issue found | Adds local node script command only. |

## Open Questions And Follow Up

None for this diff scope.
