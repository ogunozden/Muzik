# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/lib/external-reference-audit.mjs` | Unsafe recommendation policy, accepted promotion, generated artifact corruption | No issue found | Generator emits only `conflict` or `deferred`, derives from review group state, and writes deterministic generated artifact data. |
| `scripts/lib/source-curation-validation.mjs` | Validation bypass, source-field leakage, summary drift | No issue found | Validator rejects accepted/source fields and enforces count/status/group drift checks. |
| `src/app/api/external-references/route.ts` | Unauthorized export, unsafe mutation, data leakage | No issue found | Action is token-gated, read-only, bounded, and reads only the generated recommendation artifact. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Unsafe bulk UI operation | No issue found | UI uses existing operation token flow and dry-run decision import path. |
| Generated recommendation artifact | Real-data safety | No issue found | Current artifact has 5 recommendations, no accepted/source URL/source ID fields. |
| Tests | Regression coverage | No issue found | Unit and page tests cover safe generation, API export, UI action, and unsafe accepted/source-field rejection. |
