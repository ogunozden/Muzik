# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `src/shared/ui/index.ts` | Unsafe module boundary | No issue found | Exports are direct component paths; no dynamic import or token-bearing code was added. |
| `src/features/references/ReferencesCurationDashboard.tsx` | UI runtime regression | No issue found | Imports now use `@/shared/ui`; behavior covered by route tests and browser smoke. |
| `src/features/references/ReferencesCurationDetail.tsx` | UI runtime regression | No issue found | Imports now use `@/shared/ui`; behavior covered by route tests and browser smoke. |
| `scripts/validate-architecture.mjs` | Guard bypass | No issue found | Guard now fails if `shared/ui` returns to the `@/components` barrel bridge. |
