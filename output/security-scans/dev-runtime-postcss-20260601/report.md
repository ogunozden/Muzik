# Security Review: Muzik dev-runtime PostCSS local patch

## Scope
- Scan mode: local working-tree patch against `HEAD`.
- In-scope files: `next.config.mjs`, `package.json`, `postcss.config.mjs`, `scripts/postcss-unocss.cjs`, `src/app/globals.css`, `src/app/references/page.tsx`, `src/app/samples/page.tsx`, `src/features/references/ReferencesCurationDashboard.tsx`, `src/features/references/ReferencesCurationDetail.tsx`.
- Runtime and validation evidence: architecture guardrails, external-reference audit, curation validation, SymbTr measure validation, lint, typecheck, Vitest, production build, npm audit, diff whitespace check, dev HTTP smoke, layout guard, and browser screenshot/console review all passed for this phase.
- Explicit exclusions: unrelated untracked `.agents/`, `symb/`, and pre-existing screenshots were not reviewed as part of this diff scan.
- Threat model was generated during Phase 1 for this repository-level scan context.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | no candidates emitted |
| Coverage | 9 diff-scoped source/config files reviewed; every `deep_review_input.csv` row has a `work_ledger.jsonl` completion receipt |
| Validation mode | Discovery-only closure because no plausible candidates survived discovery |
| Primary artifacts | `output/security-scans/dev-runtime-postcss-20260601/artifacts` |

## Threat Model

## Product Surfaces
- Next.js App Router web UI for Turkish music study, eser following, rhythm, audio sample management, external reference management, and local/admin curation.
- Token-protected local operations APIs under `/api/external-references` and `/api/samples` that read/write generated manifests and source curation artifacts.
- Static/generated catalog and curation data under `src/data`, `output`, and generated SymbTr/reference reports.

## Assets And Privileges
- Real 3000-entry SymbTr catalog metadata, curated external source manifests, source quality stats, review queues, and feedback/correction logs.
- Local operations tokens and environment configuration; token values must never be exposed in logs, reports, browser output, or committed files.
- User-facing trust signals: accepted vs needs-review/rejected/conflict, safe auto-attach policy, embed/source allowlists, and PDF verification status.

## Trust Boundaries
- Browser users can control UI filters, operation forms, imported candidate manifests, source URLs, and curation feedback requests.
- Operations APIs cross from browser input into local filesystem scripts and generated artifacts; token enforcement and loopback restrictions are critical.
- External URLs and provider metadata are untrusted until classified by central source profiles and validation gates.
- Build/dev configuration can affect local operator security and the correctness of security headers, CSP, and dev-only origin behavior.

## Security Invariants
- Mutating operations require the configured operation token or explicitly safe loopback development mode.
- Accepted sources alone may be auto-attached; generated search candidates stay review-only until imported and validated.
- URL/embed handling remains HTTPS/provider-policy gated and never downloads external media during batch audits.
- Dev/runtime configuration must not leak secrets, weaken production CSP, or broaden cross-origin access outside explicit local development origins.
- Generated reports and logs must not contain secret token values.

## Relevant Failure Modes
- Token bypass or accidental token disclosure in UI, logs, reports, or tests.
- Incorrect source status transitions causing needs-review/conflict sources to appear as accepted.
- Unsafe URL/provider handling leading to untrusted embeds, SSRF-like fetches, or misleading source trust.
- Build/dev config drift hiding production build failures or creating noisy warnings that mask real runtime issues.
- Filesystem script misuse corrupting real curation data or generated manifests without validation gates.

## Findings

| Finding | Severity | Confidence | Category |
| --- | --- | --- | --- |
| No findings | none | high | none |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | weak or incomplete evidence; include only when the user explicitly wants follow-up candidates in the final report. |

### No Findings
Discovery reviewed all diff-scoped rows and did not identify any technically plausible source-to-sink security issue. The changes are limited to local dev build/runtime configuration, deterministic PostCSS adapter loading, CSS ordering, and browser token-field semantics. The token-related UI changes do not alter API authorization enforcement or expose token values.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Next dev/runtime configuration | Dev-origin and HMR exposure | No issue found | `allowedDevOrigins` is limited to `127.0.0.1`; production headers remain centrally generated from policy. |
| PostCSS/UnoCSS adapter | Module loading / build pipeline | No issue found | Adapter path is deterministic and project-local; loaded package name is fixed. |
| Curation token controls | Secret handling / operation triggering | No issue found | Token fields gained browser-safe autocomplete semantics; hidden username is constant and non-secret; mutating operations still require explicit button actions and API token enforcement. |
| CSS entrypoint | Client execution surface | Not applicable | Import order change is styling-only. |

## Open Questions And Follow Up
None for this diff. Broader repository security review remains a separate future phase if requested by the active project goal.
