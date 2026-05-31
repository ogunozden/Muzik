# External Source Operations Strategy Audit

## Objective

Make external score, archive and recording sources operational from the frontend,
without requiring backend or CLI work for normal curation.

## Confidence Boundary

The strategy is considered complete for a local/admin operations workflow:

- operators can stage single or bulk sources in `/references`;
- operators can run map, sync and audit from the same page;
- the API only dispatches fixed scripts;
- unsafe or ambiguous mappings stay out of the product manifest;
- operations require an ops token by default;
- production exposure is denied unless explicitly enabled and tokened.

It is not a public multi-user curation product. A future public admin deployment
would still need real authentication, roles, audit logs and durable job storage.

## Loopholes Found And Fixed

| Loophole | Fix | Evidence |
| --- | --- | --- |
| Anyone who could reach the dev/prod app could call operations. | `/api/external-references` now requires an ops token by default and denies production unless explicitly enabled and tokened. | `src/app/api/external-references/route.ts`; route tests cover default localhost token requirement, token missing, token accepted, LAN rejected and IPv6 loopback escape-hatch behavior. |
| Loopback checks based on request host are not a strong boundary because direct clients can spoof `Host`. | Tokenless local use is no longer default. It requires explicit `EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL=true` and is documented as unsafe. | Route tests prove default localhost is rejected without a token. |
| Arbitrary command execution risk. | API dispatches only fixed `stage`, `map`, `sync`, `audit` script arrays through `execFile`; request body cannot pass a command. | Route test asserts `map` args equal `["scripts/map-external-source-inbox.mjs"]`. |
| Bulk pasted text could leave temp files behind. | Temporary UI input files are deleted in `finally` after stage execution. | Route test asserts `unlink` runs for bulk text. |
| Oversized payload could create large temp files. | Bulk text is capped at 100,000 characters; source fields are capped at 2,048 characters. | Route test rejects 100,001-character bulk input with 413 before `writeFile`. |
| Malformed request bodies could surface as internal operation failures. | Bad JSON now returns 400 before dispatching any script. | Route test asserts malformed JSON does not call `execFile`. |
| Concurrent operations could race manifests. | API has a server-side operation lock and returns 409 while another operation is running. | Route test covers overlapping `map` then `sync`. |
| IPv6 loopback could be rejected by the host guard in the unsafe local escape hatch. | Loopback check accepts `localhost`, `127.0.0.1`, `::1` and `[::1]`. | Route test covers `[::1]` only when unsafe local mode is explicitly enabled. |
| Frontend had no way to provide an ops token. | `/references` now includes an `Ops token` field and sends it on GET/POST. | Page tests cover operations UI and staging request flow. |

## Verification

- `npx vitest run src/app/api/external-references/__tests__/route.test.ts src/app/references/__tests__/page.test.tsx`: 2 files, 14 tests passed.
- `npm run test:run`: 29 files, 250 tests passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Next static Cache-Control warning is closed and the
  Tailwind-origin DEP0205 warning is gone after the UnoCSS Wind4 compiler
  migration.
- `npm run audit:security`: passed, 0 vulnerabilities.
- Playwright MCP opened `/references` with the default token requirement: the
  page did not auto-fire an unauthenticated API request, the ops-token refresh
  controls rendered, console warning/error output stayed clean, and mobile
  viewport width had no horizontal overflow.

## Residual Scope Notes

- This is an admin/local operations tool, not a public moderation platform.
- The in-process operation lock protects this API process. If the same scripts
  are run directly from CLI at the same time, the CLI can still bypass the API
  lock.
- The mapping algorithm is deterministic and guarded, but external source truth
  still depends on visible metadata and review for `needs-review` rows.
