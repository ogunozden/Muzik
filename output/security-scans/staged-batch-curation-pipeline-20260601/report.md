# Security Review: Muzik staged batch curation pipeline

## Scope

- Scan mode: Codex Security diff scan over the staged local patch for `codex/batch-curation-pipeline`.
- In-scope code and artifacts: staged curation API/UI, external reference source policy, batch ingest/map/import/validate scripts, SymbTr generated catalog/layout artifacts, sample route changes, Next security headers, generated external-reference coverage artifacts, and supporting tests/docs.
- GitNexus scope signal: `detect_changes(scope=staged)` reported `CRITICAL` breadth with 179 changed files, 1656 changed symbols, 235 affected flows. This is treated as release-level scope, not a narrow patch.
- Runtime evidence already collected for this staged phase: `npm run guardrails:architecture`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run audit:security`, `npm run curation:validate`, `npm run audit:external-references`, `npm run verify:symbtr-measures`, `npm run build`, route layout validation for `/references/curation`, filtered API smoke, Browser QA, and `git diff --cached --check` passed.
- Generated scan artifacts: `output/security-scans/staged-batch-curation-pipeline-20260601/artifacts/02_discovery/rank_input.csv` and `deep_review_input.csv` contain 151 source-like diff rows generated from the local patch.
- Explicit exclusions and limitations: raw `symb/`, `.agents/`, `output/playwright/`, and `output/runtime/` remain unstaged; push was not attempted because it requires explicit current-turn confirmation. This report is a risk-focused staged diff scan with review receipts for the changed security boundaries, not a claim that every future catalog source has been human-accepted.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | high confidence for reviewed curation/security-boundary surfaces; medium confidence for broad release regression because GitNexus scope is CRITICAL |
| Coverage | Curation API auth and scripts, manifest import/export, source policy, queue validation, CSP headers, generated artifact data exposure, sample route path controls, candidate-vs-verified data boundary |
| Validation mode | Source review, GitNexus staged impact, dependency audit, full test/build gates, generated curation validation, API smoke, browser QA |

## Threat Model

The repository is a local-first Turkish music study and production platform with browser-facing study screens, Web Audio instrument and rhythm engines, generated SymbTr catalog data, PDF/notation alignment artifacts, and local/admin external-reference curation workflows. Primary assets are the 3000-entry SymbTr catalog, accepted external reference manifests, generated backlog and review queue artifacts, operator curation actions, sample library files, score/piece payloads, and browser-rendered external links or embeds. Trust boundaries include browser-to-Next API requests, local environment flags and operation tokens, operator-supplied JSON/CSV/text manifests, generated project artifacts under `output/`, public external URLs, locally uploaded sample audio, and generated code/data imported by the frontend. Security invariants are: production curation operations require explicit enablement and an operation token; caller input must not choose arbitrary filesystem paths or scripts; script execution must use fixed commands and argument arrays; imported candidates must stay project-contained and HTTPS-only; `needs-review` and `conflict` rows must never auto-attach; generated queue artifacts must not contain secrets or downloaded media; browser embeds must be provider/policy gated; sample upload/delete endpoints must remain path-contained; security headers must be generated from central policy; and generated catalog/PDF data must remain candidate or verified according to its validation state.

## Findings

### No findings

No reportable security finding survived the staged diff review. The highest-risk boundary is `/api/external-references`: it checks production enablement and operation token before state reads or operations, compares configured tokens with `timingSafeEqual`, accepts tokenless local access only behind an explicit non-production unsafe flag and loopback host check, parses action names through a fixed allowlist, and runs only fixed Node scripts via `execFile(process.execPath, args)` with argument arrays, timeout, hidden Windows window, and bounded output buffer. Operator text/JSON inputs are written to random temp files under the project output path, size-capped, and deleted in `finally` blocks. Candidate review export reads only the fixed generated queue artifact, applies in-memory filters, and refuses exports above 20000 rows.

Manifest import and source policy code preserve the real-data safety boundary. Import input paths are resolved under the project root before reading; candidates are validated against the generated catalog ids; source URLs must parse and use HTTPS; YouTube entries require oEmbed verification; accepted duplicate identities are skipped; and only `accepted` candidates can be merged into auto-attached references. Validation now rejects candidate review rows that drift into accepted/source-bearing data, profile/provider/trust mismatches, confidence overflow, and `summary.json` count drift. Generated queue artifacts contain catalog metadata, profile ids, confidence/status fields, and safe search URLs only; they do not include credentials, downloaded media, or accepted sources.

Browser-facing embed and header controls are centrally policy-bound. `next.config.mjs` builds CSP from the external-reference policy and the test suite verifies frame-src/media-src behavior. The curation dashboard keeps filtered queue export in a separate read-only JSON area and does not render operation tokens or promote review rows. PDF/SymbTr measure data remains candidate unless listed in the verification manifest, so unverified extraction output is not presented as confirmed score geometry.

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Authorization, fixed script execution, path traversal, payload size, unbounded export | No issue found | Production requires enablement and token, token comparison is timing-safe, script args are fixed arrays, temp files are generated under project output, candidate review export uses a fixed queue file and a 20000-row cap. |
| `scripts/import-external-reference-candidates.mjs` | Manifest import path traversal, unsafe accepted source import, duplicate handling | No issue found | Input path is resolved under project root, catalog ids and HTTPS source policy are validated before merge, accepted duplicate identities are skipped. |
| `scripts/lib/source-curation-validation.mjs` and `scripts/validate-source-curation.mjs` | Unsafe auto-attach, profile drift, generated artifact drift | No issue found | Validation rejects review rows carrying accepted/source URL data, profile/provider/trust mismatches, confidence overflow, and summary count drift. |
| `src/data/references/*` | URL/embed policy, accepted manifest safety, source profile classification | No issue found | Policy is central, curated sources validate HTTPS and oEmbed requirements, OGM/source profile classification is covered by curation validation. |
| `src/features/references/*` and `/references/curation` pages | Token exposure, unsafe operator action, unbounded long lists | No issue found | Token is held in UI state and not exported, queue export is read-only JSON, table data is paginated/filtered and review-only candidates do not auto-attach. |
| `next.config.mjs` | Security headers and external frame/media policy | No issue found | CSP is generated from central external-reference policy and tested by `next-config-security.test.mjs`. |
| `src/app/api/samples/route.ts` | Sample upload/delete path containment and file type validation | No issue found | Existing tests cover rejected invalid writes and expected slot path writes; this staged phase did not expose arbitrary caller-selected filesystem paths. |
| Generated `output/external-reference-coverage/*` artifacts | Sensitive data exposure, unsafe data promotion | No issue found | Artifacts contain catalog metadata, search URLs, status/profile fields, and coverage counts; no credentials, media payloads, or accepted promotion from review rows. |
| Generated SymbTr catalog/layout artifacts | Candidate-vs-verified data boundary | No issue found | PDF measure outputs remain candidate unless present in the verification manifest; validation reports 0 verified boxes and does not present candidates as accepted truth. |
| Broad staged product/UI/audio/config changes | Diff breadth and regression risk | Needs follow-up | GitNexus reports CRITICAL staged scope due 179 files and 235 affected flows. Functional gates passed, but this remains a large release commit rather than a small security-reviewable patch. |

## Open Questions And Follow Up

- Split future work into narrower commits after this production-near baseline so GitNexus and Codex Security can produce lower-noise impact reports for individual API, UI, audio, and generated-data changes.
- Before any push, obtain explicit current-turn confirmation and rerun `npm run audit:security`, `git diff --cached --check`, and a final `git status --short --branch` against the exact commit to be published.
