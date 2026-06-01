## Assets

- SymbTr PDF vector measure candidate registry and generated layout artifacts.
- `layout-verification.generated.json`, the only source allowed to promote verified PDF measure boxes.
- `layout-verification-review-template.json`, which must remain non-promoting review input.
- Eser Takip UI state that must distinguish unreviewed PDF candidates from verified boxes.
- Local operator filesystem and project artifacts under `output/`.

## Trust Boundaries

- CLI arguments and generated catalog identifiers cross into local filesystem writes.
- PDF vector candidates and review template rows are untrusted until human-reviewed or visual-regression-approved.
- SymbTr TXT measure summaries are local archive-derived evidence and must match review-template metadata before promotion.
- Browser UI consumes layout and verification state and must not present candidates as verified evidence.

## Security Invariants

- Review artifact writes must stay inside the project root.
- Review templates must keep `measureBoxes` empty and must not mutate `layout-verification.generated.json`.
- Verification must fail if review-template rows drift from source PDF candidates or SymbTr TXT measure summaries.
- Generated review artifacts must not add secrets or transmit local data externally.
- Browser evidence must show unreviewed candidates distinctly from verified PDF measure boxes.

## Reviewed Scope

- `scripts/render-symbtr-pdf-layout-review.mjs`
- `scripts/validate-symbtr-layout-verification.mjs`
- `scripts/__tests__/render-symbtr-pdf-layout-review.test.mjs`
- `output/symbtr-layout-review/layout-verification-review-template.json`
- `output/symbtr-layout-review/layout-verification-summary.json`
- Browser evidence for `/studio/follow`
