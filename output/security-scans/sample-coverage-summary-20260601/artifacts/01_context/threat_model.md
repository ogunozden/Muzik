# Muzik Repository Threat Model

## Assets

- Trusted SymbTr catalog metadata, generated source curation queues, sample slot manifests, and validation reports.
- Local operator endpoints that can mutate sample files or curation manifests when explicitly enabled and token-authorized.
- User-facing study and production screens that render notation, source links, instrument status, rhythm state, and external media metadata.
- Browser, build, test, audit, and security evidence used as release gates.

## Trust Boundaries

- Browser users can read public GET routes, but local mutation endpoints must remain gated by environment controls and operation tokens.
- Files under `public/samples` are local audio assets; upload and delete operations must stay constrained to expected sample slots.
- Generated coverage and curation artifacts are evidence until validators accept them; they must not silently mutate trusted product data.
- External reference URLs and provider metadata are untrusted unless they pass centralized source profile and status policy.

## Attacker-Controlled Inputs

- HTTP request bodies, form data, headers, and route query parameters.
- Uploaded sample files, filenames, and selected sample slot keys.
- External source URLs, catalog/provider metadata, and curation manifest imports.
- Local script arguments and generated JSON/CSV artifacts used by operator workflows.

## Security Invariants

- Sample POST and DELETE must require the configured local operation authorization before filesystem mutation.
- Sample filesystem paths must resolve inside `public/samples` and only for known manifest slots.
- Public GET responses may expose status and coverage counts, but not secrets, local absolute paths, or privileged token state.
- Source auto-attach must remain accepted-only; review/conflict candidates must not be promoted as trusted.
- UI rendering must avoid dangerous HTML injection and must distinguish candidate, missing, and verified data.