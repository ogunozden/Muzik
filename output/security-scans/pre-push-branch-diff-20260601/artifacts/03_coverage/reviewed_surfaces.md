# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/samples/route.ts` | Unauthenticated file mutation | Rejected after fix | POST/DELETE now require `SAMPLE_OPERATIONS_TOKEN` via `x-sample-operations-token`; no-token DELETE returned 401 and tokened invalid-slot DELETE reached normal 404 without writing/deleting real data. |
| `src/shared/security/local-operations.ts` | Token guard correctness | No issue found | Central helper uses environment-controlled enablement, production token requirement, loopback-only unsafe local escape, and constant-time token comparison. |
| `src/app/api/external-references/route.ts` | Regression in existing ops token gate | No issue found | Existing external reference operation gate was refactored to the central helper; targeted route tests still pass. |
| `src/app/samples/page.tsx` | Operator token handling | No issue found | UI stores token only in component state and sends it as a header for upload/delete; Playwright confirmed password input and no console warnings/errors. |
| `scripts/lib/external-metadata-fetch.mjs` | SSRF/external fetch | No issue found | Fetch helper validates HTTPS and policy-backed source profile rules before metadata fetch. |
| `scripts/import-external-reference-candidates.mjs` | Candidate import trust | No issue found | Import validates HTTPS URLs, catalog IDs, accepted-only statuses, and project-contained input path. |
| `scripts/extract-symbtr-pdf-measures.mjs` | Archive/path handling | No issue found | ZIP/PDF extraction reads fixed local SymbTr archive entries and asserts generated output paths stay inside the project. |
| `next.config.mjs` | Browser security headers | No issue found | Build-time CSP and baseline security headers are configured and covered by tests. |
