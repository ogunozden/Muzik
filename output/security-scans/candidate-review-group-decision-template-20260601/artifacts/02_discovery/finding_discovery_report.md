# Finding Discovery Report

Scan mode: local patch diff.

Reviewed diff rows:
- `src/app/api/external-references/__tests__/route.test.ts`
- `src/app/api/external-references/route.ts`
- `src/app/references/curation/__tests__/page.test.tsx`
- `src/features/references/ReferencesCurationDashboard.tsx`

Result: no technically plausible security findings survived discovery.

Security-relevant controls observed:
- New `candidate-review-group-decision-template-export` action remains inside the existing authenticated POST operation path, guarded by the operations feature flag, local-safety checks, token validation, and operation in-flight guard.
- The action is read-only with respect to project data and emits an import-ready manifest instead of writing decisions.
- Decision template statuses are allowlisted to `rejected`, `conflict`, and `deferred`; `accepted` is rejected at the API boundary.
- Reason and reviewed date are required; reviewed date must be `YYYY-MM-DD`.
- Export size is bounded at 5,000 filtered review groups.
- Template decisions contain only `groupId`, `catalogId`, `status`, `reason`, `reviewedAt`, and `reviewedBy`; source IDs and source URLs are intentionally excluded.
- UI uses the existing `runOperation` token/header path and does not add a new unauthenticated route or external network sink.
- Tests cover safe export, unsafe accepted-status rejection, UI payload generation, and absence of accepted source data in template decisions.

No validation or attack-path phase was opened because discovery produced zero candidate findings.
