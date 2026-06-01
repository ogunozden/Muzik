# Codex Security Diff Scan - Visible Routes + Review Group Fingerprint

Date: 2026-06-01
Scope: local working-tree diff for route/navigation visibility and external reference candidate review group decision fingerprinting.

## Threat Model

Primary assets in this diff:

- External reference curation manifests and batch review decisions.
- Operator-only `/api/external-references` actions protected by existing local operation token policy.
- Frontend route discovery/navigation state.

Relevant attacker capabilities:

- Submit stale or mismatched candidate review group decision JSON for import.
- Try to make review decisions apply to a different generated candidate set.
- Reach newly visible local/admin route links in the UI.
- Abuse route visibility to discover mutation endpoints.

Security boundaries:

- Route visibility is not authorization; existing `/api/external-references` operation token gate remains the mutation boundary.
- Review group decisions remain metadata-only and must not carry source URLs or accepted source IDs.
- Auto-attach remains limited to accepted validated sources.

## Finding Discovery

Changed security-relevant files reviewed:

- `src/data/references/candidate-review-group-fingerprint.mjs`
- `scripts/import-candidate-review-group-decisions.mjs`
- `scripts/lib/external-reference-audit.mjs`
- `scripts/lib/external-reference-candidate-review.mjs`
- `scripts/lib/source-curation-validation.mjs`
- `src/app/api/external-references/route.ts`
- `src/shared/config/navigation.config.ts`
- `src/shared/config/routes.config.ts`
- `src/components/layout/UnifiedLayout.tsx`
- `src/app/page.tsx`
- `scripts/validate-architecture.mjs`

Discovery result: no technically plausible new security findings.

Notes:

- The new fingerprint uses deterministic SHA-256 over stable generated review group metadata. It does not hash secrets and does not expose source URLs.
- Import and validation now reject missing, malformed, or stale `sourceGroupFingerprint` values.
- Existing checks still reject review group decisions carrying `sourceId`, `sourceUrl`, or `url`.
- The API export only adds the generated fingerprint to a decision template; it does not add a new mutating action or weaken token validation.
- Making `/references` and `/references/curation` visible in navigation does not bypass the existing operation-token gate for mutations.

## Validation

No candidates required validation. Negative controls checked:

- `rg` scan of changed files found no new `dangerouslySetInnerHTML`, `eval`, dynamic `Function`, or new process execution path.
- Filesystem writes remain in existing fixed script/API paths; the diff does not introduce user-controlled arbitrary paths.
- `npm run audit:security` passed with 0 vulnerabilities.
- `npm run curation:validate` passed with 0 errors and confirms 3000 catalog entries, 14890 review queue rows, 2978 review groups, and 5 fingerprinted recommendation rows.
- Browser evidence on `http://localhost:4015` showed 0 console errors/warnings, no document overflow, no duplicate nav labels, and a single active nav item on `/references/curation`.

## Attack Path Analysis

No validated findings reached attack-path analysis.

Potential attack path considered and closed:

- Stale review decision replay: closed by `sourceGroupFingerprint` equality checks in import and validation.
- URL/source smuggling through review group decisions: unchanged rejection remains in `readCandidateReviewGroupDecisions`.
- UI discovery of local/admin pages: not a security boundary; mutation still requires the existing API token policy.

## Final Result

Security diff scan result: PASS.

Reportable findings: 0.
Residual risk: `/references` and `/references/curation` are intentionally discoverable in the frontend, so production safety continues to depend on the existing token gate and production operation policy in `/api/external-references`.
