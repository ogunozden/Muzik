# Naming Conventions

## Music Pitch Display

- UI note names use Turkish solfege: `Do Re Mi Fa Sol La Si`.
- Accidentals are explicit symbols in compact UI: `♯` for diyez, `♭` for bemol.
- Screen-reader labels use spoken Turkish: `Do diyez 4. oktav`, `Si bemol 5. oktav`.
- Raw MIDI/SymbTr pitch values stay unchanged in data contracts. Display helpers live in `src/core/domain/note-naming.ts`.

## Asset Names

- Canonical generated names use lowercase ASCII slugs.
- Segment separator is `--`; word separator inside a segment is `-`.
- Piece identity order follows SymbTr: `makam--form--usul--title--composer`.
- Uploaded sample files are stored by fixed slot path, not by user-provided filename.
- Visual score uploads keep the browser object URL at runtime and use a duplicate signature from `title + image filename + size`.

## SymbTr Catalog

- Local SymbTr v3 metadata is normalized into `src/data/symbtr/catalog.generated.json`.
- The catalog key is the original SymbTr identifier. Duplicate ids are not allowed.
- Formats are tracked as `txt`, `mid`, `xml`, `mu2`, `pdf` so UI can later choose the best import source without guessing.
- PDF vector layout candidates live in `src/data/symbtr/layout.generated.json`.
  They are keyed by the same canonical SymbTr identifier and must keep the
  `pdf-vector-candidate` confidence until a visual regression or human review
  promotes them to verified measure boxes.
- Verified PDF measure boxes live in `src/data/symbtr/layout-verification.generated.json`.
  Each box must retain its source candidate row/index and carry a positive
  `measureIndex` so playback can bind the box to a SymbTr measure without
  guessing from visual order alone.

## External References

- External score, recording, archive, GitHub and YouTube references live behind the registry contract in `src/data/references`.
- Reference ids use lowercase ASCII kebab-case, for example `youtube-nwbnzn75br8`.
- Generated official SymbTr v3 references derive ids from the canonical catalog id by collapsing non-alphanumeric separators to kebab-case and appending the source suffix, for example `acem-ilahi-duyek-aldanma-dunya-zekai-dede-symbtr-v3-zenodo`.
- URLs must use HTTPS. YouTube links are deduplicated by video id, not by raw URL string.
- External media is never auto-downloaded. Embedding is disabled unless a source is explicitly marked `embed-allowed` and verified by non-manual metadata.
- Official SymbTr v3 Zenodo/GitHub metadata references are generated for every catalog entry. Curated score page and recording references are reported separately; missing curated references are a data quality backlog, not a reason to scrape media automatically.
- Bulk curated references are imported through `npm run import:external-references -- --input <json>` so candidate ids, HTTPS URLs, YouTube oEmbed verification, duplicate identities, and catalog ids are checked before `src/data/references/external-reference-bulk-candidates.json` changes.
- Newly found source URLs are staged with `npm run stage:external-source -- --url <https-url>` or bulk staged with `npm run stage:external-sources -- --input <json|csv|md|txt>`, then land in `src/data/references/external-source-inbox.json`. `npm run map:external-references` maps the inbox against the full 3000-entry SymbTr catalog, and `npm run sync:external-references` writes only accepted mappings.
