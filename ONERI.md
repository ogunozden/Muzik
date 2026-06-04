# Muzik Projesi — Öneri ve Yapılacaklar

> Son güncelleme: 2026-06-04
> Durum: AI batch enrichment tamamlandi, 400/400 test OK, Ollama qwen2.5:14b aktif

---

## 1. Mevcut Durum Özeti

### Çalışanlar (Yeşil)

| Alan | Durum |
|------|-------|
| Katalog | 3000 eser, SymbTr v3 ile eşleşmiş |
| Harici kaynak | 7 doğrulanmış (DivanMakam/OGM) |
| PDF ölçü kutuları | 520 eser, 18.334 doğrulanmış kutu (symbtr-txt-aligned) |
| Layout test | 0 hata, 0 warning |
| Build | OK (Next.js 16.2.7 webpack) |
| Test | 57/57 dosya, 400/400 test geçti |

### Kalanlar (Açık)

| Alan | Eksik | Not |
|------|-------|-----|
| Harici kaynak coverage | 2993 eser | Elle kürasyon veya kullanıcı katılımı gerek |
| PDF candidate-only | 2275 eser | Rapor: output/symbtr-layout-review/candidate-only-review.json, duusuk oncelikli |
| IA discovery | Kapalı | Collection-level false positive'lar nedeniyle disable edildi |

### Yeni Tamamlanan

| Alan | Durum |
|------|-------|
| AI batch enrichment | 3000 eser analiz edildi, output/ai-enrichment/ altında 600 batch JSON |
| AI client | Ollama + Gemini destekli unified client (scripts/lib/ai-client.mjs) |
| AI config | Provider switching (scripts/lib/ai-config.mjs) |
| AI pipeline | Retry + checkpoint + raw error log (scripts/ai-full-batch.mjs) |
| Ollama | qwen2.5:14b lokal model, GPU inference, limitsiz |

---

## 2. AI Altyapısı — Ollama + Gemini Hibrit

### Mevcut Çalışan Kurulum

| Bileşen | Seçim | Detay |
|---------|-------|-------|
| **Lokal model** | Ollama + qwen2.5:14b | RTX 5080 GPU, limitsiz, ücretsiz |
| **Bulut model** | Gemini 2.5 Flash API | Free tier, yedek/fallback |
| **Client** | scripts/lib/ai-client.mjs | Unified: Ollama + Gemini |
| **Config** | scripts/lib/ai-config.mjs | Provider switching, .env'den okur |
| **Batch runner** | scripts/ai-full-batch.mjs | Checkpoint, retry, raw error log |

### Tamamlanan AI İşleri

1. **Metadata zenginleştirme (batch)** ✅
   - 3000 eser analiz edildi (output/ai-enrichment/, 600 batch JSON)
   - Varyasyonlar, İngilizce transliteration, arama keyword'leri
   - 2 hata → root cause: JSON içinde `/* */` yorum → fixlendi

2. **Kalan AI işleri:**
   - DivanMakam/OGM/SalihBora tarama + AI eşleştirme (Playwright + AI)
   - Kullanıcı kaynak bildirim butonu (UI)
   - Admin curation desteği (URL girince AI analiz etme)

---

## 3. Kalan İşler (Öncelik Sırası)

### Yüksek Öncelik

| # | İş | Nasıl | Tahmini Süre |
|---|-----|-------|-------------|
| 1 | **DivanMakam forum thread'leri elle eşleştir** | Katalog ID + URL listesi oluştur, `external-reference-bulk-candidates.json`'a ekle | 2-3 saat (elle) |
| 2 | **Kullanıcı kaynak bildirim butonu** | Eser detay ekranında "Bu eserin notası burada" formu | 1-2 saat |
| 3 | **AI metadata zenginleştirme** | `scripts/ai-enrich-catalog.mjs` çalıştır | 2-3 saat (batch) |

### Orta Öncelik

| # | İş | Nasıl |
|---|-----|-------|
| 4 | **Varyasyon kuralları** | AI çıkarımı + manuel review |
| 5 | **İngilizce transliteration** | AI batch + validate |
| 6 | **SalihBora/OGM ek URL'ler** | Elle tarama + ekleme |

### Düşük Öncelik

| # | İş | Neden Düşük |
|---|-----|-------------|
| 7 | **IA discovery tekrar aç** | Collection filtresi iyileştirilirse |
| 8 | **PDF candidate-only 1285 eser** | İnsan incelemesi veya görsel regresyon gerek |
| 9 | **Daha küçük AI model** | llmfit önerisi sonrası |

---

## 4. Mimari Öneriler

### A. Kaynak Yönetimi Simplify

Mevcut: 5 connector, discovery pipeline, verification cache, batch run, 14.890 review queue

Öneri: Sadeleştir
- Elle doğrulanmış URL listesi (JSON array)
- `accepted` = elle doğrulanmış
- `needs-review` = kullanıcı bildirimi veya AI önerisi
- `rejected` = elle reddedilmiş veya collection-level
- Discovery pipeline kaldır veya basitleştir

### B. AI Entegrasyonu Basitleştir

Mevcut: Prompt → LM Studio → JSON → parse → validate

Öneri:
```
[Script] → [Fetch site HTML] → [AI: "Bu sayfa şu esere ait mi? 1/0"] → [JSON]
```
- AI'ya sadece **karşılaştırma** yaptır
- AI'ya **bilgi sorma** ("Zekai Dede kimdir?")

### C. Batch İş Sıklığı

| İş | Sıklık | Tetikleyici |
|-----|--------|-------------|
| AI metadata zenginleştirme | Bir kez | Manuel |
| AI varyasyon çıkarımı | Bir kez | Manuel |
| Site tarama + AI eşleştirme | Aylık | Cron veya manuel |
| Katalog anomali tespiti | Her release öncesi | CI/CD |

---

## 5. Operasyonel Öneriler

### A. Git Workflow

- Her faz sonunda: `npm run precommit` (guardrails + lint + test)
- Push öncesi: `git status` kontrolü (staged/untracked files)
- Commit mesajı: Türkçe veya İngilizce tutarlı

### B. Test Stratejisi

- Yeni script yazıldığında: Vitest testi ekle
- AI entegrasyonu: Mock LM Studio response ile test
- Browser audit: Playwright screenshot (manuel review)

### C. Veri Yedekleme

- `src/data/` altındaki `.generated.json` dosyaları git'te
- Elle editlenen `.json` dosyaları: commit öncesi diff kontrolü
- Büyük artifact'ler (`output/`): `.gitignore`'da, CI'da archive

---

## 6. Hızlı Başlangıç (Sıradaki İş)

```bash
# 1. AI metadata zenginleştirme (batch)
node scripts/ai-enrich-catalog.mjs --limit=50

# 2. Sonuçları validate et
npm run curation:validate

# 3. Test çalıştır
npm run test:run

# 4. Commit
npm run precommit && git push
```

---

## 7. Reddedilen Fikirler (Neden)

| Fikir | Neden Reddedildi |
|-------|-----------------|
| IA discovery otomasyonu | Collection-level false positive çok yüksek |
| "3000 eserin tamamına kaynak bulma" hedefi | Gerçekçi değil; kaynak yoksa yoktur |
| AI'ya web tarama yaptırma | LM Studio web'e çıkmaz; sadece prompt/response |
| Heuristic auto-accept | Güvenilirlik düşük; kullanıcı/insan incelemesi şart |

---

*Bu dosya canlı dokümandır. Yeni öneri, red veya kapanış oldukça güncellenir.*
