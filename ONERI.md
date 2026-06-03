# Muzik Projesi — Öneri ve Yapılacaklar

> Son güncelleme: 2026-06-04
> Durum: Prod-cycle audit geçti, 400/400 test OK, build OK

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
| PDF candidate-only | 1285 eser | Ratio mismatch, elle inceleme veya görsel regresyon gerek |
| IA discovery | Kapalı | Collection-level false positive'lar nedeniyle disable edildi |

---

## 2. AI Kullanım Önerileri (LM Studio)

### Yapılabilir (Yüksek Değer)

1. **Metadata zenginleştirme (batch)**
   - 3000 eser için varyasyonlar, normalize başlıklar, arama keyword'leri üret
   - `scripts/ai-enrich-catalog.mjs` ile çalıştır
   - Çıktı: `catalog-enriched.generated.json`

2. **Varyasyon kuralları çıkarma**
   - "Hacı Arif Bey" → "H. Arif Bey", "Arif Bey"
   - "Dede Efendi" → "İsmail Dede Efendi"
   - Matcher'a entegre edilir

3. **İngilizce transliteration**
   - "Şehnaz" → "Sehnaz", "Shehnaz"
   - Arama eşleşmesi artar

4. **Admin curation destek**
   - Admin URL eklediğinde AI analiz eder
   - "Başlık %85 eşleşiyor, makam eşleşiyor → ACCEPT önerisi"
   - Otomatik kabul değil, öneri

### Yapılamaz (Gerçekçi Sınırlar)

- Web'de canlı arama yapamaz
- Güncel URL bulamaz
- "Bu eser DivanMakam'da var mı?" bilmiyor
- Collection/bireysel ayıklama yapamaz (site içeriğini görmeden)

### Önerilen Model Değişikliği

Mevcut: `qwen3.5-35b-a3b-main` (35B)
- Yavaş (~155 sn response)
- Türk müziği bilgisi yetersiz ("Zekai Dede" bilmiyor)

**Öneri:** Daha küçük, daha hızlı model
- Örn: `qwen2.5-7b`, `phi-4`, `gemma-3-4b`
- llmfit ile bilgisayar specs'ine göre en uygununu bul
- Batch iş için 7-14B model yeterli

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
