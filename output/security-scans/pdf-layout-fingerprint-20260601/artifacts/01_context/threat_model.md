# Repository Threat Model

## Product Surfaces
- Next.js web application routes for music study, source curation, score display, sample management, and local/admin batch workflows.
- Local batch scripts that read/write generated catalog, source curation, SymbTr layout, and validation artifacts.
- Browser-rendered review artifacts under `output/` used by operators for PDF measure candidate review.

## Assets And Invariants
- Real Turkish music catalog data, SymbTr source mappings, accepted external references, verified PDF measure boxes, sample files, and generated audit artifacts must not be silently corrupted or promoted from unverified data.
- Accepted/needs-review/rejected/conflict boundaries must remain fail-closed; only accepted sources can be auto-attached.
- PDF vector measure candidates must never be treated as verified measure boxes without human or visual-regression approval tied to current generated source geometry.
- Script inputs must remain project-local and deterministic, with no arbitrary filesystem writes outside the repo.

## Trust Boundaries
- Operator-provided import manifests cross into local generated registries.
- External URLs and provider metadata cross into curation queues but must not become accepted source evidence without validation.
- Generated HTML/PDF/SVG review artifacts are opened in a browser but should not execute untrusted script.
- Local archives under `symb/` are trusted dataset inputs for deterministic extraction and validation.

## Attacker-Controlled Inputs
- Import JSON paths and manifest content supplied to batch scripts.
- External source URLs, metadata, and curation decisions before validation.
- Browser route query parameters and API request payloads in app routes.

## Security-Relevant Failure Modes
- Stale or forged verification manifests promoting wrong PDF geometry into verified measure boxes.
- Path traversal or out-of-project reads/writes in batch scripts.
- XSS or active content in generated review HTML from unescaped catalog/source data.
- SSRF or unsafe embedding from untrusted external references.
- Dependency vulnerabilities or route authorization mistakes in local/admin mutation APIs.
