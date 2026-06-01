# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/features/references/ReferencesCurationDetail.tsx` | Unsafe mutation / token bypass | No issue found | Lifecycle buttons call the existing token-protected `curation-feedback` action with fixed event types. |
| `src/features/references/ReferencesCurationDetail.tsx` | Filter injection / data leak | No issue found | Besteci, güfteci, status, and silme filters perform in-memory equality checks and do not build URLs, SQL, shell commands, filesystem paths, or HTML. |
| `src/app/references/curation/[catalogId]/__tests__/page.test.tsx` | Missing regression coverage | No issue found | Tests cover facet visibility and token-bearing `delete-requested` payload shape. |
| Browser `/references/curation/[catalogId]` | Console/layout regression | No issue found | Playwright verified filters/buttons/counter, no horizontal overflow, and 0 warning/error console messages after tokened refresh. |
