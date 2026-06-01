## Assets

- SymbTr PDF vector measure candidate registry and generated layout artifacts.
- `layout-verification-review-template.json`, which must cover every current candidate entry without promoting candidates.
- `layout-verification.generated.json`, the only source allowed to promote verified PDF measure boxes.
- Eser Takip UI state that must distinguish unreviewed PDF candidates from verified boxes.

## Trust Boundaries

- CLI script defaults decide which local candidate entries become review artifacts.
- Generated review template rows are untrusted until human-reviewed or visual-regression-approved.
- SymbTr TXT measure summaries are local archive-derived evidence and must match template metadata before promotion.

## Security Invariants

- The default review command must be batch-first and must not silently omit candidate entries.
- Validation must fail if a review template is missing a candidate entry or includes a non-candidate entry.
- Review templates must keep `measureBoxes` empty and must not mutate the verification manifest.
- Generated artifacts must not add secrets or external data transfer.
