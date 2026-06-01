# Reviewed Surfaces

| Surface | Risk Area | Outcome |
| --- | --- | --- |
| `scripts/lib/external-source-intake.mjs` | Untrusted source metadata ingestion | No issue found; new lyricist/lyrics fields are stored as observed metadata only. |
| `scripts/lib/external-source-matcher.mjs` | Unsafe automatic matching | No issue found; extra lyricist/lyrics signals only affect scoring evidence and do not bypass mismatch checks or YouTube oEmbed requirements. |
| `scripts/lib/external-reference-audit.mjs` | Review queue promotion, generated URL safety | No issue found; queue rows remain review-only and search URLs are generated from fixed profile templates. |
| `scripts/lib/source-curation-validation.mjs` | Validation bypass | No issue found; queue rows now require scoring evidence and data-aware query field coverage. |
| `src/features/references/ReferencesCurationDashboard.tsx` | Secret exposure, unsafe operator action | No issue found; UI renders scoring evidence strings and query fields, not ops tokens or accepted-source mutation data. |
