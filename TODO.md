# Muzik — Kalan İşler (2026-06-03)

> Batch-first, evidence-driven. Her madde tamamlandığında kanıtı vardır.

## GRUP 1: Bağımsız Ultra Hızlı ✅ TAMAMLANDI

- [x] 1a: PDF ENOBUFS fix — execFileSync maxBuffer (100MB, `scripts/verify-symbtr-layout-review-import.mjs:142`)
- [x] 1b: Provider verification batch argüman override test (per-provider overrides + configurable threshold, commit `649fff2`)

## GRUP 2: Bağımsız Orta (Paralel) ✅ TAMAMLANDI

- [x] 2a: IA Re-Verify (25/2978 verified, internet-archive tamamlandı)
- [x] 2b: Non-IA Discovery Agent — Playwright chromium ile divanmakam, ogm-materyal, salihbora (scripts/lib/provider-discovery-agent.mjs + 13 test)

## GRUP 3: Pipeline Zinciri (Faz 2)

- [ ] 3a: Provider full scan (119 batch) — sadece internet-archive 25/2978 tamamlandı
- [ ] 3b: Stage + Map pipeline (scripts mevcut, pipeline çalıştırılmadı)

## GRUP 4: Final Gate

- [x] 4a: `npm run audit:prod-cycle` — output/prod-cycle-summary.json var
- [x] 4b: `npx eslint .` — 0 errors ✅
- [x] 4c: `npx tsc --noEmit` — clean ✅
- [x] 4d: `npx vitest run` — 52 files / 378 tests passed ✅
- [x] 4e: `npx gitnexus detect_changes --repo Muzik` — 5 files, 6 symbols, risk LOW ✅
- [x] 4f: Commit + push

---

## Altyapı Tamamlandı ✅

- [x] `.github/workflows/ci.yml` — guardrails:architecture + lint + typecheck + test:run + build + audit:security
- [x] `.github/dependabot.yml` — npm (weekly) + github-actions (monthly)
- [x] `.env.example` — NEXT_PUBLIC_ENABLE_SYNTH_FALLBACK + EXTERNAL_REFERENCE_OPERATIONS_TOKEN
- [x] `AGENTS.md` — GitNexus code intelligence with precommit/quality workflow
