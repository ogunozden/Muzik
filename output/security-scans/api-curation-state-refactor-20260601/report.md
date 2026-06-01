# Security Review: Muzik API Curation State Refactor

## Scope
- Scan mode: local working-tree diff, scoped to the API curation state extraction phase.
- In-scope files: `src/app/api/external-references/route.ts`, `src/app/api/external-references/curation-state.ts`, `PROJECT_PLAN.md`.
- Artifacts reviewed: `artifacts/02_discovery/deep_review_input.csv`, `artifacts/02_discovery/finding_discovery_report.md`, `artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test evidence: `npm run guardrails:architecture`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, `npm run curation:validate`, `npm run audit:external-references`, `npm run audit:security`, and `git diff --check` all passed for this phase.
- Limitation: validation and attack-path phases had no candidate findings to process after diff-scoped discovery.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-findings for reviewed diff scope |
| Coverage | 3/3 scoped rows reviewed |
| Validation mode | No candidates; deterministic gates and focused tests used as counterevidence |

## Threat Model

## Assets
- Real Turkish music catalog metadata, curated source manifests, feedback/manual correction/event logs, and generated batch review artifacts.
- Local operator curation routes guarded by local operation access checks and ops tokens.
- User-facing score/source rendering surfaces, including external links and safe inline media previews.
- Local filesystem data under `src/data/references` and generated `output/external-reference-coverage` artifacts.

## Trust Boundaries
- Browser/API boundary for `/api/external-references` GET and POST requests.
- Local operator boundary enforced by `getLocalOperationAccessError`, environment flags, and ops token headers.
- External source/provider data boundary: URLs, metadata, oEmbed, source titles, and generated candidates are untrusted until validated.
- Filesystem boundary between temporary UI input files and persistent curated manifests.

## Attacker-Controlled Inputs
- API query parameters used for filtering, pagination, and candidate review exports.
- POST bodies for staging sources, importing manifests, and recording curation feedback/manual corrections/embed state.
- External source metadata and provider URLs staged into the batch pipeline.

## Security Invariants
- Production and non-local write operations require the configured access gate and token checks.
- Only accepted curated sources may be auto-attached; needs-review, rejected, conflict, and generated search candidates are not evidence.
- Generated candidate/search data must not be treated as trusted source truth or directly embedded without provider policy validation.
- Filesystem writes must stay within known temp or manifest paths and must not use user-selected arbitrary paths.
- UI/API responses must not expose secrets or bypass the local/admin nature of curation surfaces.

## Findings

| Finding | Severity | Confidence |
| --- | --- | --- |
| No findings | none | high |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable security finding survived discovery. The extraction moved curation state assembly into a pure in-memory module. It does not introduce a new request-controlled path, filesystem write, network fetch, subprocess execution, authorization decision, or auto-attach policy change. The API access gate remains before state reads and operations, and existing validation confirms review-only candidates remain excluded from accepted auto-attach behavior.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Local curation API state response | No issue found | Access gate remains before state read; extraction only delegates in-memory curation state assembly. |
| `src/app/api/external-references/curation-state.ts` | Manifest join and catalog enrichment | No issue found | Pure in-memory transformation; no new sink, no external fetch, no filesystem write, no auto-attach policy change. |
| `PROJECT_PLAN.md` | Documentation | Not applicable | Documentation-only update. |
