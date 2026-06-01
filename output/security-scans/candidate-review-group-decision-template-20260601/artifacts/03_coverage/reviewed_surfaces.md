# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/app/api/external-references/route.ts` | Unauthorized curation mutation, unsafe accepted promotion, source data leakage, unbounded manifest generation | No issue found | Existing operation auth/feature flag remains in force; export is read-only, bounded, non-accepted-only, and strips source URL/source ID data. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Token handling, unsafe bulk UI operation, incorrect status assignment | No issue found | Uses existing operation token path; UI offers only `rejected`, `conflict`, and `deferred` status options for generated templates. |
| `src/app/api/external-references/__tests__/route.test.ts` | Missing regression coverage for security controls | No issue found | Tests cover source-field omission and accepted-status rejection. |
| `src/app/references/curation/__tests__/page.test.tsx` | Missing UI request coverage | No issue found | Test covers generated payload and template controls. |
