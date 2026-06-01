# Security Diff Scan: external-source-discovery-dry-run-v1

Date: 2026-06-01
Scope: Local working-tree diff for external source discovery dry-run, prod-cycle gate wiring, `/references/curation` read-only UI/API exposure, generated discovery artifacts, and browser evidence artifacts.

## Result

- Findings: 0
- Severity: none
- Status: pass
- Residual risk: operational provider connectors are intentionally dry-run and do not fetch remote result pages, download media, copy source content, or attach discovered candidates to product data.

## Threat Model

Reviewed trust boundaries:

- Local CLI arguments for discovery output, coverage, and policy paths.
- Server-side `/api/external-references` artifact readers.
- SSR `/references/curation` read-only initial state.
- Browser-rendered discovery/provider metrics.
- Generated JSON artifacts under `output/external-source-discovery`.
- Prod-cycle script command orchestration.

Protected assets:

- Curated external references attached to product data.
- 3000-entry SymbTr catalog coverage state.
- Local repository files outside the intended artifact/policy directories.
- Browser runtime stability and hydration payload size.

Attacker model:

- A local operator can run npm scripts with custom arguments.
- Browser users can view read-only curation data but cannot provide file paths to the server routes in this change.
- Discovery providers are untrusted until a later verified connector supplies complete HTTPS source evidence.

## Reviewed Controls

- Discovery is dry-run only.
- `directAutoAttachCount` is required to stay `0`.
- Accepted-ready output is import-manifest only and currently empty because search leads do not satisfy complete evidence.
- Non-accepted candidates remain `needs-review`, `conflict`, `deferred`, or negative-cache artifacts.
- Discovery CLI path arguments are constrained to project-local paths before read/write.
- API and SSR page read fixed artifact paths; no request-controlled filesystem path is introduced.
- UI renders artifact strings through React text rendering; no raw HTML injection path is introduced.
- Prod-cycle invokes fixed npm scripts through structured command arrays, not interpolated shell strings.
- Security audit gate remains part of `npm run audit:prod-cycle`.

## Discovery Passes

1. CLI/path review: no arbitrary project-external read/write after path boundary hardening.
2. Server route review: no new mutating endpoint, no user-controlled path, no SSRF/fetch behavior.
3. UI review: read-only metrics and links only; raw 14,890+ candidate list is not hydrated.
4. Data integrity review: accepted-only attach policy preserved; discovery artifacts do not mutate curated references.
5. Runtime gate review: prod-cycle validates discovery verification and rejects direct auto-attach.

## Conclusion

No reportable security findings were identified in this diff. The implementation is appropriate for a dry-run discovery phase and preserves the accepted-only attachment boundary.
