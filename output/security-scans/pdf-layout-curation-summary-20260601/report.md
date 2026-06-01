# Codex Security Diff Scan - PDF Layout Curation Summary

Scan target: local patch on `codex/batch-curation-pipeline`.

Changed surfaces reviewed:
- `src/app/api/external-references/route.ts`
- `src/app/references/curation/page.tsx`
- `src/features/references/ReferencesCurationDashboard.tsx`
- `src/app/api/external-references/__tests__/route.test.ts`
- `src/app/references/curation/__tests__/page.test.tsx`

Threat model focus:
- Local/admin curation UI and API expose read-only artifact summaries plus token-gated write operations.
- New change only reads existing local JSON artifacts and renders text into React-managed DOM.
- No new network sink, dynamic command execution, credential handling, raw HTML injection, or write/import endpoint was added.

Discovery:
- Reviewed file reads and displayed fields for path traversal, XSS, command injection, secret exposure, and unsafe promotion of unverified PDF layout data.
- `readJsonOrNull` uses fixed project-local artifact paths.
- Dashboard renders values as React text nodes/code nodes; no `dangerouslySetInnerHTML` or `innerHTML` was introduced.
- `targetScript` is displayed as operator guidance only and is not executed by the browser or API.
- PDF measure boxes are still reported as `unreviewed-candidates-only`; no candidate is promoted to verified by this patch.

Validation:
- `git diff --check`: pass.
- `npm run audit:security`: pass, 0 vulnerabilities.
- Browser console warning/error check on `http://localhost:4015/references/curation`: 0 logs.
- Validation artifacts show `validationErrorCount: 0` and the PDF validator reports `errors: []`.

Attack path analysis:
- No plausible attacker-controlled input reaches a script execution sink, HTML sink, filesystem write sink, or credential sink through the new code.
- The only displayed command string is static text in the admin UI and does not trigger a state-changing operation.
- The new API state is read-only and preserves the verified/unverified separation.

Result: No security findings.
