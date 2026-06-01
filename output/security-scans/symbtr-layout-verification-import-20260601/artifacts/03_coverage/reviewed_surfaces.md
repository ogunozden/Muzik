# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| `scripts/import-symbtr-layout-verification.mjs` | Local manifest import trust boundary and write integrity | No issue found | Fails closed unless imported verified boxes match generated PDF layout metadata and candidate pairs; writes only fixed product manifest after validator success and `--write`. |
| `scripts/validate-symbtr-layout-verification.mjs` | Validator path override safety | No issue found | Override path is constrained to the project root and reuses the same validation contract. |
| `scripts/__tests__/import-symbtr-layout-verification.test.mjs` | Regression coverage | No issue found | Covers the security-relevant positive and negative paths. |
| `package.json` | CLI exposure | No issue found | New command is local-only and deterministic. |