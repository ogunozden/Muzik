# Security Review: candidate scoring evidence delta

## Scope

- Scan mode: Codex Security scoped diff scan for the candidate scoring evidence and batch query-field change.
- In-scope files: `scripts/lib/external-source-intake.mjs`, `scripts/lib/external-source-matcher.mjs`, `scripts/lib/external-reference-audit.mjs`, `scripts/lib/source-curation-validation.mjs`, related tests, generated `output/external-reference-coverage` artifacts, `src/features/references/ReferencesCurationDashboard.tsx`, and `PROJECT_PLAN.md`.
- Runtime evidence: `npm run audit:external-references`, `npm run map:external-references`, `npm run curation:validate`, targeted Vitest, full `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run audit:security`, `git diff --check`, route layout guard, and browser/Playwright QA passed.
- GitNexus evidence: pre-edit impact was LOW for `scoreCatalogEntry`, `buildCandidateReviewRows`, `validateSourceCurationRegistries`, `ReferencesCurationDashboard`, and `createSourcesFromCliOptions`.
- Explicit exclusions: this scan does not claim that new external URLs were verified or promoted; it covers the scoring-evidence mechanics and generated review queue contract.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence no-finding for scoped scoring-evidence delta |
| Coverage | Intake metadata fields, matcher scoring evidence, provider-profile review queue, validation gate, dashboard rendering |
| Validation mode | Source review, GitNexus impact, generated artifact validation, tests, build, Browser/Playwright QA, npm audit |

## Threat Model

The scoped change expands batch-first curation explainability: intake can retain lyricist/lyrics observations, matcher scoring can use those observations when present, the provider-profile review queue includes `scoreReasons` and data-aware `queryFields`, and the dashboard renders that evidence. Assets are catalog metadata, accepted source candidates, generated review queues, and the local operator token. Trust boundaries are CLI/source intake, generated artifacts, the operator-authenticated curation API, and browser rendering. The main security invariant is unchanged: review-only rows must not become accepted source evidence or carry source ids/URLs; auto-attach remains accepted-only.

## Findings

### No findings

No reportable security issue was found in this scoped change. The new intake fields are plain observed metadata and are not executed, fetched, embedded, or automatically promoted. The matcher adds non-blocking lyricist/lyrics token evidence but preserves metadata mismatch checks, explicit accepted thresholds, and YouTube oEmbed gating.

The review queue remains safe-by-construction: generated rows have profile-template HTTPS search URLs, profile/provider/trust alignment, bounded confidence scores, `needs-review` or `conflict` statuses only, and no accepted source ids or source URLs. Validation now rejects rows that omit scoring evidence or fail to explain which available catalog fields were used in the query. The dashboard only renders scoring strings and query field names; it does not expose the ops token or add a new mutation path.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-source-intake.mjs` | Source metadata ingestion | No issue found | `lyricist` and `lyrics` are observed fields only. |
| `scripts/lib/external-source-matcher.mjs` | Unsafe auto-accept | No issue found | Extra scoring evidence does not bypass conflict/mismatch rules. |
| `scripts/lib/external-reference-audit.mjs` | Search candidate generation | No issue found | Queue rows remain review-only and profile-template controlled. |
| `scripts/lib/source-curation-validation.mjs` | Validation bypass | No issue found | New evidence/query-field gates make stale or opaque rows fail. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Token or mutation exposure | No issue found | Renders declarative evidence only. |

## Open Questions And Follow Up

- Push still requires explicit current-turn confirmation because it changes remote repository state.
