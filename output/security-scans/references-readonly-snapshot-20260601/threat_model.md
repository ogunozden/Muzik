# Threat Model: References Read-Only Snapshot

## Scope

Diff-scoped review for the `/references` server-rendered snapshot and extracted client operations dashboard.

## Assets

- Operator ops token and token-protected external reference operations.
- Staged external source inbox data.
- Accepted curated reference state and 3000-entry coverage reports.
- Browser-rendered user/operator HTML.

## Trust Boundaries

- Public browser request to `/references`.
- Server-side reads from fixed local artifact paths under the repository/runtime working directory.
- Client POST/GET calls to `/api/external-references`, which remain guarded by the existing ops token policy.
- External source URLs stored in artifact files, which must not be exposed by the tokenless snapshot.

## Security Invariants Reviewed

- Tokenless `/references` may expose aggregate operational state and source titles/providers only.
- Raw staged source URLs must not be included in the initial snapshot HTML.
- Stage, map, sync, audit and token-protected state refresh must continue to require the existing ops token/API guard.
- Server-side artifact reads must use fixed paths, not request-controlled paths.
- Rendering artifact data must preserve React escaping and avoid raw HTML injection.
