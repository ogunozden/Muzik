# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/features/references/ReferencesCurationDetail.tsx` | Unsafe URL/site handling | No issue found | Site facet derives hostname with `new URL()` for display/filtering only; invalid URLs become empty facets. |
| `src/features/references/ReferencesCurationDetail.tsx` | Filter injection / data leak | No issue found | Provider, site, confidence, and manual-note filters are local equality/scope checks over authorized state. |
| `src/features/references/ReferencesCurationDetail.tsx` | Manual note exposure | No issue found | Manual-note facet exposes only the presence/count of correction notes/tags already available in the operator detail state. |
| `src/app/references/curation/[catalogId]/__tests__/page.test.tsx` | Missing regression coverage | No issue found | Test covers provider, site, confidence, and manual-note controls. |
| Browser `/references/curation/[catalogId]` | Console/layout regression | No issue found | Playwright verified controls, detail fields, no horizontal overflow, and 0 warning/error console messages after tokened refresh. |
