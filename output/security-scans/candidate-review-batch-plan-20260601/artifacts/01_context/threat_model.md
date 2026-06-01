# Muzik Repository Threat Model

## Product surfaces
Muzik is a local/admin Turkish music study and production platform with Next.js pages, local data manifests, batch curation scripts, catalog/source validation, audio/studio workflows, and browser-visible curation views.

## Assets and invariants
Real catalog/source data, accepted/needs-review/rejected/conflict status integrity, provider/profile policy, auto-attach safety, local operator tokens, generated evidence, and build/test outputs must not be corrupted, forged, leaked, or silently downgraded. Accepted sources must be the only auto-attached records.

## Trust boundaries
External source manifests, CSV/JSON/Markdown imports, URLs, provider metadata, oEmbed/HTML metadata, operator-entered JSON, browser-rendered text, filesystem paths passed to scripts, and environment variables cross into trusted local processing. Browser UI must treat all external metadata as untrusted display data.

## Attacker-controlled inputs
Source URLs, titles, observed makam/usul/form/composer fields, metadata fields, signals, provider names, candidate manifests, API request bodies, and local CLI inputs may be malformed or adversarial.

## Key failure modes
Wrong auto-attach of low-confidence data, metadata/script injection in UI, path traversal or unintended file writes in tooling, prototype/object pollution via manifest fields, stale policy causing trusted providers to be misclassified, unsafe token exposure, and validation bypasses for accepted candidates.

## Security assumptions
The platform is primarily local/admin-oriented, but all external source data is untrusted. Validation scripts are security-relevant gates and must reject malformed accepted data before it reaches user-facing or auto-attach paths.
