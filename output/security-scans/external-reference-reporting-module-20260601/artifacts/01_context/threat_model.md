# Threat Model

## Assets
- External reference coverage matrix, dedupe reports, batch summary counts, and generated curation artifacts.
- Accepted source identity policy that prevents duplicate accepted URLs and source ids from being auto-attached.
- Operator-facing `/references/curation` metrics used to decide batch work and safe source promotion.

## Trust Boundaries
- Catalog, provider profile, feedback, and bulk candidate manifests enter reporting scripts as local JSON data.
- Review-only candidate rows must remain separate from accepted source records when rendered into coverage and dedupe reports.
- Generated reports are consumed by validators, UI, and operator review workflows.

## Attacker Model
- A malicious or mistaken operator/contributor can introduce malformed batch manifests or duplicate accepted identities.
- A future code change can weaken dedupe counting or accidentally include accepted source fields in review-only coverage reports.

## Security Objectives
- Preserve accepted-only auto-attach and duplicate identity fail-closed behavior.
- Keep reporting deterministic and side-effect free aside from the audit layer writing generated artifacts.
- Avoid secret handling, process execution, external network access, and unencoded URL construction in reporting helpers.
