# Security Review: Muzik API Curation Query Refactor

## Scope
- Scan mode: local working-tree diff, scoped to the API curation query/facet extraction phase.
- In-scope files: `src/app/api/external-references/route.ts`, `src/app/api/external-references/curation-query.ts`, `src/app/api/external-references/__tests__/curation-query.test.ts`, `PROJECT_PLAN.md`.
- Artifacts reviewed: `artifacts/02_discovery/deep_review_input.csv`, `artifacts/02_discovery/finding_discovery_report.md`, `artifacts/03_coverage/reviewed_surfaces.md`.
- Runtime/test evidence: `npm run guardrails:architecture`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, `npm run curation:validate`, `npm run audit:external-references`, `npm run audit:security`, and `git diff --check` all passed for this phase.
- Limitation: validation and attack-path phases had no candidate findings to process after diff-scoped discovery.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-findings for reviewed diff scope |
| Coverage | 4/4 scoped rows reviewed |
| Validation mode | No candidates; deterministic gates and focused tests used as counterevidence |

## Threat Model

## Assets
- Real Turkish music catalog metadata, curated source manifests, feedback/manual correction/event logs, candidate review manifests, and generated batch coverage artifacts.
- Local operator curation routes guarded by local operation access checks and ops tokens.
- User-facing score/source rendering surfaces, including external links and safe inline media previews.
- Local filesystem data under `src/data/references` and generated `output/external-reference-coverage` artifacts.

## Trust Boundaries
- Browser/API boundary for `/api/external-references` GET and POST requests.
- Local operator boundary enforced by `getLocalOperationAccessError`, environment flags, and ops token headers.
- External source/provider data boundary: URLs, metadata, oEmbed, source titles, generated search candidates, and review groups are untrusted until validated.
- Filesystem boundary between temporary UI input files, generated exports, and persistent curated manifests.

## Attacker-Controlled Inputs
- API query parameters used for filtering, pagination, candidate review queue exports, group exports, recommendation exports, and decision-template exports.
- POST bodies for staging sources, importing manifests, and recording curation feedback/manual corrections/embed state.
- External source metadata and provider URLs staged into the batch pipeline.

## Security Invariants
- Production and non-local write operations require configured access gates and token checks.
- Query/filter helpers must not create accepted source evidence, mutate manifests, or bypass accepted-only auto-attach policy.
- Review-only candidates and review group decisions may classify backlog state but must not auto-attach sources without validated accepted source URLs.
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

No reportable security finding survived discovery. The extraction moved backlog, candidate review, review group, facet, and pagination helper logic into a pure in-memory module. The new module has no filesystem, network, subprocess, mutation, accepted-source creation, or embed-decision sink. The route keeps the existing local operation access gate, bounded export limits, and decision-template status restrictions.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Local curation API exports and state response | No issue found | Access gate and bounded export limits remain in route; extracted helpers only filter loaded rows. |
| `src/app/api/external-references/curation-query.ts` | Batch query/facet helper policy | No issue found | Pure in-memory filter/facet module; no I/O, subprocess, network, mutation, accepted-source creation, or embed decision. |
| `src/app/api/external-references/__tests__/curation-query.test.ts` | Regression coverage | No issue found | Tests exercise scope, filters, facets, and pagination clamp for the extracted policy module. |
| `PROJECT_PLAN.md` | Documentation | Not applicable | Documentation-only update. |
