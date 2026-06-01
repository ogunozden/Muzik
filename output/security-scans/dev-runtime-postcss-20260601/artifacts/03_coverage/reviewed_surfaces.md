# Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Next dev/runtime configuration | Dev-origin and HMR exposure | No issue found | `allowedDevOrigins` is limited to `127.0.0.1`; production headers remain centrally generated from policy. |
| PostCSS/UnoCSS adapter | Module loading / build pipeline | No issue found | Adapter path is deterministic and project-local; loaded package name is fixed. |
| Curation token controls | Secret handling / operation triggering | No issue found | Token fields gained browser-safe autocomplete semantics; hidden username is constant and non-secret; mutating operations still require explicit button actions and API token enforcement. |
| CSS entrypoint | Client execution surface | Not applicable | Import order change is styling-only. |
