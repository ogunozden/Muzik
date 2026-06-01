# Threat Model

## Assets

- Candidate review group artifact for 2,978 missing curated-reference catalog entries.
- Token-gated `/api/external-references` local curation API.
- Operator `/references/curation` UI and filtered export payloads.
- Accepted-only auto-attach manifest and bulk candidate import path.

## Trust Boundaries

- Local operator query parameters filter generated review-only group artifacts.
- Filtered export payloads cross from server-side artifact reads into browser-visible JSON text areas.
- Review-only group exports must remain separate from accepted candidate import and auto-attach flows.
- External-reference operations token controls access to curation state and exports.

## Security Invariants

- Group rows and group exports must not carry accepted source IDs or source URLs.
- Group pagination/filter/export must remain read-only and must not trigger auto-attach.
- Query parameters are bounded to prevent unbounded export or render pressure.
- Existing local-operation token guard must protect the new group export action.
- UI must label groups as review work, not verified source evidence.

