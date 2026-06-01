# Muzik Repository Threat Model

## Assets

- Trusted 3000-entry SymbTr catalog, source curation registries, auto-attached references, review queues, and generated source quality stats.
- Local operator scripts that can write curation manifests when invoked with explicit write flags or action payloads.
- Validation, audit, and security evidence used as release gates.

## Trust Boundaries

- Source feedback, manual corrections, embed state, and source quality stats cross from local operator input or generated analysis into trusted repository manifests.
- Accepted auto-attached references are trusted product data; needs-review and conflict candidates are not trusted source attachments.
- Generated stats are derived evidence and must stay validator-gated before being written.

## Attacker-Controlled Inputs

- Local JSON payloads passed to source curation management scripts.
- Curation registry JSON files, external source URLs, source identifiers, and event metadata.
- Script flags such as write/dry-run and generated audit artifacts.

## Security Invariants

- Source quality stats must be derived from central profile policy, not brittle source id text guesses.
- Registry writes must run through `validateCurrent` before persistence.
- Event, manual correction, embed state, and stats generation boundaries must remain explicit so future batch actions cannot bypass validation or accepted-only attachment policy.