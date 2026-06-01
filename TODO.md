# Active TODO

This is the live remaining-work list for the batch-first production-near close. It is intentionally evidence-driven: an item is only complete when the named artifact or gate proves it.

## In Progress

- [ ] Full backlog provider verification batches: `npm run verify:external-source-providers:continue` now resumes the five-provider dry-run queue, respects provider rate policy, writes cumulative coverage, and has advanced Internet Archive network verification to 75/2978 groups; next resumable batch starts at offset 75.

## Remaining

- [ ] Run provider verification across the full 2978 missing-source backlog in resumable batches, keeping cache/rate-limit artifacts and never writing product attachments directly.
- [ ] Promote only complete evidence to accepted import manifests: HTTPS URL, provider profile match, catalog-id or deterministic metadata match, duplicate-safe identity, checkedAt, provider-specific verification and conflict-free metadata.
- [ ] Import accepted-ready provider verification manifests through dry-run first, then write only after validation proves accepted-only behavior and no duplicate identity drift.
- [ ] Keep search-only candidates in `needs-review`, `conflict`, `deferred`, `rejected` or negative-cache queues; never count them as curated coverage.
- [ ] Produce provider coverage deltas after each full batch: processed count, result count, accepted-ready count, needs-review count, rejected count, deferred count, cache hit count and warning count.
- [ ] Add verified PDF measure boxes only after human or visual-regression approval. Current verified measure box target remains 0 until that evidence exists.
- [ ] Keep final close gates green after every batch: `npm run audit:prod-cycle`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`, `npm run curation:validate`, `npm run audit:security`, browser evidence, Codex Security diff scan, GitNexus detect changes, commit and push.

## Done Evidence

- [x] Full visible-page design pass completed: added shared `PageShell`, `PageHeader` and `PageSurface` primitives, converted home to an operational product center instead of duplicated marketing cards, aligned rhythm/archive/samples page headers to the same system, fixed archive heading color misuse, reduced home main links from duplicated quick links to 7 purposeful entries, and verified `/`, `/rhythm`, `/samples`, plus all 15 app routes with Browser/Layout evidence on fixed port 4015.
- [x] Frontend information architecture cleanup completed: visible navigation is limited to 7 real product surfaces, legacy redirect aliases remain route-compatible but are not exposed as duplicate pages, browser evidence on `http://127.0.0.1:4015/` reports navCount 7, navRows 1, zero visible legacy alias links, zero main legacy alias links and no horizontal overflow; `npm run guardrails:architecture`, `npm run guardrails:layout -- --base-url http://127.0.0.1:4015 --routes /,/studio,/studio/follow,/references,/references/curation,/rhythm,/samples,/archive`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build` and `npm run audit:security` passed.
- [x] Batch-first discovery dry-run v1 exists and is pushed: `npm run discover:external-sources`, `npm run verify:external-source-discovery`, `output/external-source-discovery/*`.
- [x] Prod-cycle gate exists and reports accepted-only attach, 3000 catalog entries, 2978 missing curated entries, duplicate-after-dedupe 0, PDF verified 0 and browser/security gates.
- [x] `/references/curation` shows discovery, backlog, intake, PDF and prod-cycle artifacts without hydrating the raw 14890+ review queue.
- [x] `/references/curation` exposes provider verification run/evidence/import/coverage/batch-run artifacts; `npm run audit:references-curation-runtime` confirms the panel, artifacts, base command and continue command are present.
- [x] Provider verification dry-run v1 is wired into `npm run audit:prod-cycle`; current Internet Archive run processed 25 eligible groups, produced 0 accepted-ready rows, 25 rejected rows, 0 warnings, 0 direct auto-attach, 0 media download and 0 copied source content.
- [x] Current phase close gates are green: `npm run lint`, `npm run typecheck`, targeted curation/API tests, `npm run test:run`, `npm run build`, `npm run curation:validate`, `npm run audit:security`, `npm run audit:references-curation-runtime`, `npm run audit:prod-cycle` and browser evidence for `/references/curation` plus `/studio/follow`.
- [x] Provider verification connector v2 covers Internet Archive, DivanMakam, OGM Materyal, Salih Bora and YouTube oEmbed profiles in one dry-run command; current batch writes 125 evidence packets for 25 groups, accounts for all 2978 backlog groups, produces a next-batch command, and keeps accepted-ready/direct-attach/media-copy counts at 0.
- [x] Provider verification coverage artifact exists: `output/external-source-discovery/provider-verification-coverage.json` tracks cumulative provider progress, current Internet Archive cache coverage is 75 groups, non-URL providers are safely classified as source-URL-required deferred, and `/references/curation` plus `npm run audit:prod-cycle` require the coverage artifact.
- [x] Provider verification continue runner exists: `npm run verify:external-source-providers:continue` writes `output/external-source-discovery/provider-verification-batch-run.json`, keeps direct attach/media/source-copy counts at 0, and is visible in `/references/curation`.
- [x] Public-repo safety scan completed for this phase: `.env.local` is ignored and untracked, `.env.example` contains placeholder local values only, broad key/token regex scan returned no hits, and `npm run audit:security` reports 0 vulnerabilities.
