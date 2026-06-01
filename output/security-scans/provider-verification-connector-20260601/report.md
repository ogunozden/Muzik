# Provider Verification Connector Security Diff Scan

Generated at: 2026-06-01

Scope:
- `scripts/verify-external-source-providers.mjs`
- `scripts/audit-prod-cycle.mjs`
- `scripts/audit-references-curation-runtime.mjs`
- `src/app/api/external-references/route.ts`
- `src/app/references/curation/page.tsx`
- `src/features/references/ReferencesCurationDashboard.tsx`

Findings: 0

Validation evidence:
- `npm run audit:security`: 0 vulnerabilities.
- `npm run audit:prod-cycle`: `ok: true`, warnings `[]`, errors `[]`.
- `npm run audit:references-curation-runtime`: `ok: true`, provider verification panel/artifact/command present.
- Browser console evidence: `/references/curation` and `/studio/follow` each report 0 warnings and 0 errors.

Reviewed controls:
- Provider verification uses the fixed Internet Archive advancedsearch endpoint, not arbitrary user-provided server-side fetch targets.
- Multi-provider verification covers the configured provider profile allowlist and records deferred packets when a provider has no validated source URL to probe.
- `provider-verification-plan.json` accounts for the full 2978-group backlog and emits the next resumable batch command.
- `provider-verification-coverage.json` records cumulative provider progress; the current Internet Archive network-backed cache covers 50 groups, while non-URL providers are classified without fetching arbitrary search results.
- Provider rate limits from `external-source-discovery-policy.json` are enforced for non-cached network requests.
- The provider worker is dry-run by default and writes only project-local output artifacts.
- No media, PDF, audio or video content is downloaded.
- No external source body/content is copied into product data.
- Direct auto-attach count is explicitly reported as 0 and enforced by prod-cycle validation.
- Accepted-ready output remains an import manifest candidate only; product attachment still requires accepted-only import validation.
- UI renders artifact paths and aggregate counts as text; no raw source packet HTML is injected.
- Runtime payload guard confirms the raw 14890+ review queue is not hydrated into `/references/curation`.

Residual risk:
- Future provider connectors must keep the same allowlist, timeout, response-size, dry-run and no-direct-attach contract before being added to `npm run audit:prod-cycle`.
