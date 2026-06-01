# Repository Threat Model: Muzik

Product surfaces: Next.js pages and APIs, local/admin curation panels, generated SymbTr artifacts, audio/rhythm engines, PDF/notation review artifacts, and batch scripts that transform catalog or operator data.

Assets: the 3000 eser catalog, accepted external references, operator review decisions, local operation tokens, generated PDF/notation artifacts, and source-provider classification policy.

Trust boundaries: public/tokenless pages versus local/operator actions; operator JSON/CSV imports; generated candidates versus accepted/verified data; external URLs; archive contents; and local filesystem writes under project output paths.

Attacker-controlled or cross-boundary inputs: catalog/provider manifests, curation imports, source URLs, archive member metadata, route/query inputs, browser-rendered generated artifacts, and any manually reviewed batch packet that later feeds accepted data.

Required invariants: candidates must not become accepted or verified implicitly; tokenless snapshots must not leak privileged operator URLs, tokens, or raw secrets; batch decisions cannot carry accepted source IDs or URLs unless validated; imports must validate IDs, statuses, HTTPS policy, dedupe keys, and fingerprints; React rendering must escape user-controlled text; filesystem writes must remain project-contained; and source/provider policy must be centralized and auditable.

Repository-wide security failure modes: unsafe promotion of unreviewed candidate data into trusted manifests, filesystem writes outside the project root, XSS through rendered catalog/source text, SSRF or unsafe outbound reference handling, stale fingerprint acceptance, duplicate or conflicting source attachment, and accidental leakage of local-only operator state.
