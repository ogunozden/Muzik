# Threat Model: composer and deletion filter delta

## Scope

This scoped scan covers the `/api/external-references` composer filter/facet change and `/references/curation` dashboard Besteci/Silme filters.

## Assets

- 3000-entry generated backlog and review queue artifacts.
- Auto-attached source records and deletion-related statuses.
- Local operator ops token.

## Security Invariants

- Filters must not mutate curation state.
- Composer filter values must be treated as exact metadata filters, not executable input.
- Deletion filters only narrow already-returned status rows; they do not perform delete or restore operations.
- The ops token must not be displayed or written into artifacts.
