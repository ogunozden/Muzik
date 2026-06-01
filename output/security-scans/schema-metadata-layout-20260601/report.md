# Schema Metadata + Layout Diff Security Scan

Date: 2026-06-01
Scope: local working-tree diff for schema.org metadata extraction, external source mapping/intake metadata preservation, accepted bulk-candidate metadata validation, and shared navigation layout CSS.

## Threat Model

Relevant assets are source curation integrity, accepted-only auto-attach safety, operator-local batch manifests, browser rendering safety, and local filesystem/artifact integrity. Attacker-controlled inputs in this diff are external HTML metadata fetched from HTTPS source pages, JSON-LD embedded in that HTML, staged CSV/CLI metadata fields, and page text rendered in navigation labels. Important boundaries are: external network content to local metadata parser, review-only candidates to accepted bulk manifests, local ops-token protected curation actions, and React-rendered text to browser DOM.

## Discovery

Reviewed changed source files:

- `scripts/lib/external-metadata-fetch.mjs`
- `scripts/lib/external-source-mapping-pipeline.mjs`
- `scripts/lib/external-source-intake.mjs`
- `scripts/lib/external-source-matcher.mjs`
- `scripts/lib/external-reference-audit.mjs`
- `src/components/layout/UnifiedLayout.tsx`

Supporting controls checked:

- metadata fetch still requires HTTPS, blocks localhost/private hosts, enforces content-type, timeout and byte limit.
- JSON-LD parsing uses `JSON.parse` only; extracted values are normalized to strings and are not evaluated or rendered as HTML.
- new schema metadata is treated as scoring evidence only; accepted writes remain gated by accepted status and existing candidate validation.
- accepted bulk-candidate metadata validation now allows schema fields but still requires non-empty strings and valid signal arrays.
- nav change is CSS-only and renders translated labels as React text, not HTML.

## Candidates

No technically plausible security finding survived discovery.

Potential classes considered and closed:

- SSRF: not introduced; URL validation and private-host blocking remained unchanged.
- XSS/HTML injection: not introduced; JSON-LD values are stored as strings and rendered through React text paths or JSON artifacts, not `dangerouslySetInnerHTML`.
- unsafe auto-attach: not introduced; schema metadata only affects score reasons and accepted-only write policy remains unchanged.
- denial of service from large metadata: not introduced; existing max-byte and timeout controls still bound external HTML fetch.

## Validation

Validation path: focused code review plus runtime/test evidence.

Evidence:

- `npx vitest run scripts/lib/__tests__/external-metadata-fetch.test.mjs scripts/lib/__tests__/external-source-intake.test.mjs scripts/lib/__tests__/external-source-matcher.test.mjs scripts/lib/__tests__/external-source-mapping-pipeline.test.mjs scripts/lib/__tests__/external-reference-audit.test.mjs`: 5 files, 29 tests passed.
- `npm run curation:validate`: ok true, 0 errors.
- `npm run audit:external-references`: 3000 catalog entries, 2978 missing curated entries, duplicate rows 0, accepted bulk candidates 7.
- `npm run audit:security`: found 0 vulnerabilities.
- Browser evidence for `/references/curation`: warning/error logs 0; fixed mobile nav overflow.

## Attack Path Analysis

No candidate reached attack-path analysis. There is no source-to-sink chain in this diff that gives an attacker script execution, internal network access, unsafe source auto-attachment, file access, or privileged state change.

## Final Result

No findings.
