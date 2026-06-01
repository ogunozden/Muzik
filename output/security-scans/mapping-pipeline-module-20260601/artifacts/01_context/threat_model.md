# Threat Model

Repository scope: Turkish music study/production platform with local/admin curation tools, sample and score APIs, source mapping/import scripts, generated SymbTr catalog artifacts, browser-rendered curation UIs, and local operator-token protected mutation flows.

Assets: real catalog and curation manifests, accepted/review/conflict status integrity, operator tokens, source profile policy, sample files, score payloads, generated coverage artifacts, and safe external media/embed policy.

Trust boundaries: browser to Next route handlers, local operator token to mutation scripts, external URL/metadata/oEmbed responses into local batch manifests, generated JSON/CSV artifacts into API/UI, and filesystem-backed data manifests into runtime display.

Attacker-controlled inputs: external source URLs, fetched HTML/oEmbed metadata, candidate import manifests, manual correction fields, feedback notes, sample uploads, score route bodies, query/filter params, and generated artifacts consumed by UI/API.

Security invariants: metadata fetch must remain HTTPS/private-host bounded, untrusted metadata must remain data-only, YouTube acceptance requires oEmbed verification, only accepted candidates can be written to bulk manifests, needs-review/conflict rows must stay non-attachable, duplicate accepted identities must be skipped or rejected, and local mutation APIs must remain token-gated.
