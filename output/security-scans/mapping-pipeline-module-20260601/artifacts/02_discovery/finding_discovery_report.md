# Finding Discovery Report

Scope: local patch diff for extracting the external source mapping pipeline from `scripts/map-external-source-inbox.mjs` into `scripts/lib/external-source-mapping-pipeline.mjs`.

Reviewed rows from `deep_review_input.csv`: CLI wrapper, new mapping pipeline module, mapping pipeline tests, generated mapping artifact, and browser screenshot evidence.

Security-relevant review notes:
- The CLI wrapper now delegates to the library module and no longer owns file writes, merge logic, metadata fetch, or candidate rendering.
- The extracted module preserves project-contained output checks via `assertInsideProject`, JSON file existence checks, HTTPS/private-host metadata fetch controls through `fetchExternalHtmlMetadata`, and accepted-only bulk manifest writes.
- `mergeAcceptedCandidates` is now fail-closed: even if a caller passes `needs-review` or another non-accepted row, it is skipped and cannot be merged into the accepted manifest.
- Tests cover HTML/oEmbed provenance enrichment, duplicate accepted URL identity skip, non-accepted skip, and full batch mapping write behavior.
- Browser QA confirms the curation UI still reports 3,000 processed catalog entries, 2,978 backlog rows, 11,912 review queue rows, and 7 accepted candidates after the refactor.

Candidates discovered: 0 reportable or validation-worthy candidates.
