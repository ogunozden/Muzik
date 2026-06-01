# Threat Model

Repository scope: Turkish music study/production platform with local/admin curation tools, sample upload/delete APIs, score APIs, external source ingestion/mapping scripts, generated SymbTr catalog artifacts, browser-rendered curation UIs, and local operator-token protected mutation flows.

Assets: real catalog and curation data, operator tokens, source manifests, sample files, score payloads, generated coverage reports, browser preview/embed policy, and user-visible trusted/accepted source status.

Trust boundaries: browser to Next route handlers, local operator token to mutation scripts, external URL/metadata fetchers to local batch manifests, generated JSON/CSV artifacts to UI/API, filesystem-backed data manifests to runtime display, and third-party media/embed URLs to sandboxed browser previews.

Attacker-controlled inputs: external source URLs, fetched HTML/oEmbed metadata, import manifests, manual correction fields, feedback notes, sample upload payloads, score route bodies, search/query filters, and any generated artifact consumed by UI/API.

Security invariants: private/loopback metadata fetch targets must stay blocked, only HTTPS references are eligible, YouTube auto-accept requires oEmbed verification, untrusted metadata must stay data-only and React-escaped, needs-review/conflict rows must not become auto-attached sources, accepted duplicate identities must fail validation, generated artifacts must not embed secrets, and local mutation APIs must remain token-gated.
