# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
|---|---|---|---|
| `scripts/lib/external-source-intake.mjs` | Untrusted metadata import, CSV/CLI parsing, path containment | No issue found | Preserves metadata as normalized strings/signals only; existing HTTPS/provider/date/project-path controls remain intact. |
| `scripts/lib/external-reference-audit.mjs` | Accepted bulk candidate validation | No issue found | New metadata checks reject malformed accepted candidates and do not relax auto-attach gates. |
| Intake/audit tests | Validation regression coverage | No issue found | Adds positive and negative coverage for metadata preservation/rejection. |
| Curation page test | Test harness timeout | No issue found | Timeout change only; no runtime behavior or trust-boundary change. |
