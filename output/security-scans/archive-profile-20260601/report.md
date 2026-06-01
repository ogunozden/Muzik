# Security Review: Muzik archive-profile-20260601

## Scope

- Scan mode: scoped working-tree security review for the Internet Archive provider profile and regenerated batch review queue artifacts.
- In-scope code and artifacts: `src/data/references/research-source-profiles.json`, `scripts/lib/source-curation-validation.mjs`, related tests, generated coverage artifacts, source quality stats, and `output/playwright/references-curation-archive-profile-20260601.png`.
- Runtime and validation status: focused tests, full tests, lint, typecheck, build, curation validation, external-reference audit, security audit, SymbTr measure verification, layout guard, and browser evidence were run for this phase.
- Context: the threat model was generated during Phase 1 for this scoped change and saved at `artifacts/01_context/threat_model.md`.
- External reference checked: Internet Archive search documentation confirms archive.org search/query URLs are supported for search workflows.
- Explicit exclusions: unrelated old untracked screenshots, `.agents/`, and raw `symb/` archive files were not part of this scoped phase.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | 10/10 scoped rows closed in `artifacts/02_discovery/work_ledger.jsonl` |
| Validation mode | Source review, generated artifact review, automated validation, browser evidence, and secret-pattern scan |

## Threat Model

## Assets

- Central research source profile registry.
- 3000-eser external reference coverage summary.
- Candidate review queue artifacts.
- Auto-attached accepted reference manifest.
- Operator-facing `/references/curation` UI evidence.

## Trust Boundaries

- Provider profile configuration crosses into generated search URLs and review queue rows.
- Review-only archive search candidates must not be treated as accepted source evidence.
- Generated queue artifacts cross into API/UI pagination, filtering, and export.

## Security Invariants

- New provider profile URLs must be HTTPS and centrally validated.
- Archive candidates must stay review-only until imported as accepted source evidence.
- Auto-attached reference count must not grow from adding a search profile.
- Candidate review queue counts must match summary and per-profile validation.
- No secrets or local operation tokens may be committed.

## Reviewed Scope

- `src/data/references/research-source-profiles.json`
- `scripts/lib/source-curation-validation.mjs`
- `output/external-reference-coverage/summary.json`
- `output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json`
- `src/data/references/source-quality-stats.generated.json`
- Browser evidence for `/references/curation`

## Findings

| Severity | Confidence | Title |
| --- | --- | --- |
| none | high | No reportable findings |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings

No reportable findings survived discovery. The new Internet Archive profile expands review-only search coverage for the 2,978 missing curated-reference entries, while validation and browser evidence confirm accepted auto-attach remains at 7 and generated review queue counts are reconciled at 14,890 rows.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Research source profile registry | Provider policy, HTTPS URL safety | No issue found | Internet Archive is configured as a central HTTPS archive profile. |
| Candidate review validation | Unsafe promotion, confidence drift | No issue found | `needs-context` is accepted only for review-only rows, not auto-attached references. |
| Generated coverage artifacts | Count drift, profile drift, accidental accepted source evidence | No issue found | Summary and validation report 5 profiles, 14,890 review rows, and 7 accepted references. |
| Browser evidence | Operator UI truthfulness | No issue found | UI shows archive profile and larger review queue while accepted auto-attach remains unchanged. |
