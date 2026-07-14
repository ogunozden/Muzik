# ScoreEngine Design QA

- source visual truth path: same-piece focused crop board plus reference corpus
  - exact same-piece source: https://neyzen.com/images/notalar/hicazkar/hicazkar_p_osman_bey01.gif
  - focused source crops: `output/playwright/score-engine-focused-crops/source-page-1-clef-key-meter.png`, `output/playwright/score-engine-focused-crops/source-page-1-dense-beams.png`, `output/playwright/score-engine-focused-crops/source-page-2-section-repeat-candidates.png`, `output/playwright/score-engine-focused-crops/source-page-3-ending-candidates.png`
  - https://www.rossdaly.gr/resources/Music_Scores/Pesrev/Hica%CC%82z%20Pesrev.pdf
  - https://neyzen.com/nota_arsivi/02_klasik_eserler/037_hicaz_humayun/hicaz_humayun_pesrev_osman_bey_tanburi_buyuk.pdf
  - https://dosyalar.semazen.net/ayinnotalar/Rast-Nota.pdf
  - https://abcnotation.com/tunePage?a=trillian.mit.edu%2F~jc%2Fmusic%2Fabc%2Fmirror%2FSeymourShlien%2Fmakams%2Fmakamu10%2F0054
- external notation/data policy references:
  - https://w3c.github.io/musicxml/musicxml-reference/data-types/accidental-value/
  - https://w3c.github.io/musicxml/musicxml-reference/elements/key-accidental/
  - https://github.com/MTG/SymbTr
- implementation screenshot path: `output/playwright/score-engine-engraving-audit.png`
- focused implementation path: `output/playwright/score-engine-focused-crops/implementation-first-systems.png`, `output/playwright/score-engine-focused-crops/implementation-density-systems.png`
- comparison board path: `output/playwright/score-engine-focused-crops/comparison-board.png`
- symbolic corpus audit path: `output/score-engine/symbolic-glyph-corpus-summary.json`
- viewport: desktop 1440x1000, mobile 390x844
- state: `/studio/score-engine`, Hicazkar Pesrev selected, default layers on, playback smoke after render
- full-view comparison evidence: `npm run audit:score-engine-engraving`
- focused region comparison evidence: `npm run audit:score-engine-focused-crops`
- strict glyph gate evidence: `npm run audit:score-engine-focused-crops:strict` currently fails by design until required glyph classes are covered

## Findings

- [P1] The motor is layout-stable, but not yet musician-grade engraving-final.
  Location: ScoreEngine QA workflow.
  Evidence: The focused board compares Neyzen Hicazkar Pesrev page-1 crops with the current canonical VexFlow surface. The implementation splits the 28/4 measure into readable render systems and exposes `#4`, `b5`, rest and dotted tokens, but the source crop still shows richer Turkish score context: key-signature accidentals, usul/hane text, dense beams and source-specific engraving conventions.
  Impact: The current screen can be used to test canonical playback/layout safety, but a musician could still reject it as a final notation surface.
  Fix: Add glyph-class fixtures and checks for Turkish key-signature policy, inline koma accidentals, natural/rest/dot/beams, repeat signs, volta endings, slur/tie/triplet and section/usul labels.

- [P2] Glyph-class coverage is explicit, but the remaining classes are source-class problems, not just drawing problems.
  Location: `scripts/audit-score-engine-focused-crops.mjs`.
  Evidence: `audit:score-engine-focused-crops` now captures all three same-piece source pages, four source crops, two implementation crops and a glyph-class coverage matrix. The board includes source class columns and the JSON summary records `sourceClass`, `catalogSourceClass`, `sourcePolicyStatus`, evidence and required action. Non-strict artifact checks pass; strict glyph coverage now fails on `repeat-volta-endings`, `slur-tie-triplet` and `natural-accidental`. `section-usul-labels` is covered by rendered section/usul markers plus `score-glyph-class-map`.
  Impact: The board prevents blind visual claims, but it is not yet a full design-fidelity pass.
  Fix: Import/render only source-proven glyph classes; keep image-only cues as evidence until a canonical source, policy or user correction validates them. Require `audit:score-engine-focused-crops:strict` to pass before changing this file to `final result: passed`.

- [P1] The deeper issue is a TXT-only canonical importer, not only staff placement.
  Location: `scripts/audit-score-engine-symbolic-glyph-corpus.mjs`.
  Evidence: `audit:score-engine-symbolic-corpus` scanned 2200 TXT, 2200 MusicXML and 2200 mu2 files. TXT has 851003 note rows but also 38083 non-note rows and 411 `Kod=51` usul changes that the current note-only parser can drop. MusicXML has 4544 key-accidental tags, 238934 accidental tags and 23677 tuplet/time-modification tags; Hicazkar itself has key accidentals but no repeat/slur/tie/tuplet tags.
  Impact: A rendered screen can look active while still missing key signature policy, metadata rows, usul transitions, source-specific tuplets or correction-only glyphs. Drawing the missing marks from a crop would be hallucinated notation.
  Fix: Add MusicXML/mu2 source-feature ingestion, preserve unsupported non-note rows as validation issues, and classify every glyph as `source-proven`, `policy-derived`, or `evidence-only`.

## Patches Made Since Previous QA Pass

- Added `scripts/audit-score-engine-engraving.mjs`.
- Added `npm run audit:score-engine-engraving`.
- Added `scripts/audit-score-engine-focused-crops.mjs`.
- Added `npm run audit:score-engine-focused-crops`.
- Added `npm run audit:score-engine-focused-crops:strict`.
- Added `npm run audit:score-engine-symbolic-corpus`.
- Added glyph-class coverage matrix and strict missing-glyph fail gate.
- Added symbolic corpus audit separating TXT, MusicXML and mu2 evidence before rendering missing glyph classes.
- Added source-classified glyph coverage fields to the focused crop summary: focused source class, catalog source class, policy status, evidence and required action.
- Added rendered section/usul markers and `score-glyph-class-map` evidence for existing SymbTr section labels.
- Kept ScoreEngine completion unproven at design-fidelity level until glyph-class focused fixtures exist.
- Product Design skills were used for QA framing. Plugin Creator did not require a Codex plugin scaffold here; the right artifact is project-local QA tooling, not a separate plugin bundle.

## Implementation Checklist

- Run `npm run audit:score-engine-engraving` before claiming ScoreEngine visual correctness.
- Run `npm run audit:score-engine-symbolic-corpus` before focused crop QA so source-class policy is fresh.
- Run `npm run audit:score-engine-focused-crops` before claiming same-piece visual QA coverage.
- Run `npm run audit:score-engine-focused-crops:strict` before claiming glyph-class design QA pass.
- Run `npm run audit:score-engine-symbolic-corpus` before claiming a missing glyph is renderer-only.
- Use `output/playwright/score-engine-engraving-audit.json` for quantitative evidence.
- Use `output/playwright/score-engine-focused-crops/summary.json` and `comparison-board.png` for same-piece visual evidence.
- Use `output/score-engine/symbolic-glyph-corpus-summary.json` to decide whether a glyph should come from TXT, MusicXML, mu2, policy, PDF/image evidence, or manual correction.
- Add glyph-class reference crops before marking typography/glyph fidelity as passed.
- Keep browser screenshot review as a supplement, not the final proof.

## Follow-up Polish

- Close the currently failing glyph classes with source classification: repeat/volta needs explicit source/manual anchor; slur/tie/triplet needs MusicXML/mu2 import where present; natural accidental needs cancellation policy.
- Add a visual diff step once the source crops are stable and copyright-safe for local QA use.

## Latest Validation (2026-07-14, live dev server on 4015)

- `npm run audit:score-engine-symbolic-corpus`: passed, 2200 TXT/MusicXML/mu2 files scanned.
- `npm run audit:score-engine-focused-crops`: passed (`ok:true`, errors empty, out-of-bounds 0); deterministic full-document wait replaced the fixed-delay demo race in the audit script.
- `npm run audit:score-engine-focused-crops:strict`: `natural-accidental` CLOSED — `hasNaturalAccidental:true` via the new policy-derived cancellation renderer (`computePolicyDerivedNaturals` + `Accidental("n")`, `natural-accidental-token:policy-derived` in the glyph map). Remaining blocker is now only `repeat-volta-endings` + `slur-tie-triplet`, both with ZERO local symbolic-source instances (MusicXML repeat/ending/slur/tie = 0) — failing them is the correct behaviour under the no-fabrication rule.
- `npm run audit:score-engine-engraving`: passed for desktop 1440x1000 and mobile 390x844 (`ok:true`, checkFailures empty).
- `npm run guardrails:layout -- --base-url http://localhost:4015`: passed, 16 routes x 2 viewports.
- `npm run audit:studio-follow`: passed (`allRequiredTextsPresent:true`, both viewports).
- New importer coverage since previous pass: MusicXML tuplet/time-modification imported as `unsupported-symbol` source features; natural/cancellation policy documented in `docs/ENGRAVING_POLICY.md` and implemented in the renderer.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test:run`: 85 files / 535 tests passed.
- `npm run build`: passed.

## SymbTr v3 Tour (2026-07-14, second live validation on 4015)

- Sourced corpus data landed: SymbTr v3.0 (Zenodo record 15470412, CC-BY 4.0)
  fetched via `npm run fetch:symbtr-v3` into `symb/SymbTr-3.0/{MusicXML,mu2,txt}`
  (3x3000 files, md5-verified, idempotent).
- `slur-tie-triplet` CLOSED with source proof: the focused piece carries
  `<tied>` start/stop on notes 137-138 (C5) in v3 MusicXML plus two mu2 caret
  markers — two independent formats corroborating; TXT ordinals 136/137 are
  C5-C5, so the ordinal->event pitch validation passes. Chain:
  `extractMusicXmlTieFeatures` -> `computeSourceProvenTies` (mismatch = not
  drawn) -> VexFlow `StaveTie` + `feature:tie:` vex-map line +
  `tie-token:source-proven` manifest token. Live strict run:
  `hasSlurTieOrTriplet:true`, requirement `covered`, blockers empty.
- `npm run audit:score-engine-symbolic-corpus` now scans the v3 root by
  default: slur/tie/tuplet catalog tags 186k+, focused piece `source-available`.
- `npm run audit:score-engine-engraving`: passed after the tie arc (no
  collision regression).
- `npm run audit:score-engine-focused-crops`: passed; strict variant fails
  ONLY `repeat-volta-endings`.
- Full gates: 549 tests / 86 files, typecheck, lint, build, architecture and
  bundle-size guardrails all green.

final result: blocked (source-availability only — single class)

The one remaining glyph class, `repeat-volta-endings`, cannot be closed from
any available symbolic source: v3 carries 9932 repeat + 11059 ending tags
across the catalog but ZERO for this piece (and the mu2 code-14 rows decode as
per-measure beat-grouping patterns, not repeats). The printed segno on page 3
stays visual-evidence-only; drawing it would be fabricated notation. The gate
flips to `passed` when sourced repeat/segno data for this piece or a
validator-passed manual anchor lands — the v3 fetch/import/validation chain
built in this tour will pick it up automatically.
