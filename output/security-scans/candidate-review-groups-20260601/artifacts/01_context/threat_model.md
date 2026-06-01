# Threat Model

## Assets

- 3000-eser SymbTr catalog and external-reference coverage artifacts.
- Candidate review queue and new candidate review group artifacts.
- Accepted-only auto-attach manifest and source curation registries.
- Operator `/references/curation` UI and token-gated external reference API.

## Trust Boundaries

- Generated provider-profile search candidates cross from deterministic catalog metadata into operator review surfaces.
- Review-only candidates must not cross into accepted source manifests without validated import and accepted status.
- Token-gated curation API reads generated artifacts and exposes only safe operational state to localhost operators.
- Generated CSV/JSON artifacts are committed as evidence and must not contain secrets or accepted source URLs for review-only candidates.

## Security Invariants

- Auto-attach remains accepted-only; `needs-review`, `conflict`, and grouped candidates are never promoted automatically.
- Candidate review groups must reconcile with candidate review queue rows and summary counts.
- Search URLs remain HTTPS and provider-profile classified.
- Operation tokens are read from environment/runtime input and are not committed.
- UI rendering must avoid misleading operators into treating search candidates as verified source evidence.

