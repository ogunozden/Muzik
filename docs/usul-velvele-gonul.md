# Usûl Darp + Velvele Referansı (iki kaynak)

Bu belge usûllerin **darp** (ana vuruş) ve **velvele** (kudüm süsleme) hece
dizilerini iki otoriter kaynaktan toplar. `src/engines/usul/data.ts`'e
transkripsiyon buradan yapılır; her `makeUsul` girdisinde kaynak sayfa notu
tutulur (`// Gönül s.10X` veya `// Heper s.NN`).

**Kaynaklar**
- **Heper** — Sadettin Heper, "Türk Musikisinde Usüller ve Kudüm" (İTÜ TMDK).
  1970'ler baskısı; darp+velvele notada. Tarama; okuma yer yer belirsiz.
- **Gönül** — Mehmet Gönül, "Türk Müziği Solfej-Makam-Usûl-Dikte Alıştırmaları"
  (Necmettin Erbakan Üniv.), s.101-109 "TÜRK MÛSİKÎSİ USÛLLERİ" tablosu. MODERN,
  TİPOGRAFİK; darp+velvele net DÜM/TEK, "Velvele 1/2" etiketli — **daha güvenilir
  okunur**. Kaynak-of-truth olarak Gönül tercih; Heper çapraz-referans.

**Notasyon:** `|` ölçü çizgisi. Uzun heceler (DÜÜM, TEEK) held/2-birim; TE KE
onaltılık (0.5 birim). DÜ/ME velvele düme-çifti. Kod `Stroke = [beat, symbol,
timeValue, syllable?]`; velvele toplamı = beats (döşüm testi).

---

## Çıktı: usûl velvele dizileri (Gönül s.101-109; Sonnet ajanı transkripsiyonu)

> ⚠ Bu diziler koda aktarılırken her biri döşüm testiyle (toplam=beats)
> doğrulanır; tiling tutmuyorsa nota değeri yeniden okunur (gerekirse sayfa
> re-render). Bazı satırlar `[belirsiz]` — kesin okuma için re-render şart.

```
NİM SOFYAN (2/4)          DARP: DÜM TEK
SEMÂÎ (3/4)               DARP: DÜM TEK TEK KÂ | DÜM TEK TE KE (varyant)
SOFYAN (2+2, 4/4)         DARP: DÜÜM TEK KÂ | DÜM TE KE TEK KÂ
                          VELVELE (mehter, 8'lik): DÜM TEK DÜM TEK | DÜM TE KE TEK KÂ
TÜRK AKSAĞI (2+3, 5/8)    DARP: DÜÜM TEEK TEK
ZAFER (3+2, 5/8)          DARP: DÜM TEK TEK DÜM TEK
TÜRK AKSAĞI EVFERİ (2+3)  DARP: DÜÜM TEK TEEK
YÜRÜK SEMÂÎ (3+3, 6/8)    DARP: DÜM TEK TEK-KÂ DÜM TEEK | DÜM TEK KÂ DÜ ME TEK KÂ (varyant)
DEVR-İ HİNDÎ (3+4, 7/8)   DARP: DÜM TEK KÂ-TEK DÜÜM TEEK | DÜM TEK TE KE DÜ ME DÜM TEK TE KE
DEVR-İ TÛRÂN (4+3, 7/8)   DARP: DÜÜM TEEK TEEEK DÜÜM TEK KÂ
                          VELVELE 1: DÜÜM TEK KÂ
                          VELVELE 2: DÜM TE KE TEK KÂ TEK KÂ TE KE
DÜYEK (4+4, 8/8)          DARP: DÜM TEEK TEK DÜÜM TEEK | DÜM TE KE TEK KÂ DÜ ME DÜM TEK TE KE
MÜSEMMEN (3+5, 8/8)       DARP: DÜÜÜM TEEK TEEEK | DÜM TEK KÂ TEK KÂ TEK KÂ TE KE
AKSAK (4+5, 9/8)          DARP: DÜÜM TEK KÂ DÜÜM TEEK TEK
                          VELVELE: DÜM TE KE TEK KÂ DÜ ME DÜM TEEK TEK
EVFER (4+5, 9/8)          DARP: DÜÜM TEK KÂ DÜÜM TEK TEEK
                          VELVELE: DÜM TE KE TEK KÂ DÜ ME DÜM TEK TEEK
RAKS AKSAĞI (5+4, 9/8)    DARP: DÜÜM TEEEK DÜÜM TEEK
                          VELVELE: DÜM TE KE TEK KÂ TE KE DÜ ME DÜM TEK TE KE
OYNAK (3+6, 9/8)          DARP: DÜM TEK TEK DÜÜM TEEK TEEK
                          VELVELE: DÜM TEK TEK DÜM TE KE TEK KÂ TEK KÂ
AKSAK SEMÂÎ (5+5, 10/8)   DARP: DÜÜM TEK KÂÂ DÜÜM TEEK TEK
                          VELVELE: DÜM TE KE TEK KÂ TE KE DÜ ME DÜM TEEK TEK
CURCUNA (5+5, 10/8)       DARP: DÜÜÜM TEEK DÜÜM TEEEK  (= Aksak Semâî deseni)
A.SEMÂÎ EVFERİ (VELVELE)  VELVELE: DÜM TE KE TEK KÂ TE KE DÜ ME DÜM TEK TEEK
LENK FAHTE (6+4, 10/4)    DARP: DÜÜM TEEEK TEK KÂ | DÜM DÜM TE KE TEK KÂ DÜ ME TEK KÂ TEK KÂ
ÇENG-İ HARBÎ (10/4)       DARP: DÜM TEK DÜM TEK DÜM TEK TEK DÜM TEK TEK
TEK VURUŞ (5+6, 11/8)     DARP: DÜÜM TEEK TEK DÜÜM TEEK TEEK
                          VELVELE: DÜM TE KE TEK KÂ TE KE DÜM TE KE TEK KÂ TEK KÂ
FRENKÇİN (12/8)           DARP: DÜM DÜÜM DÜM DÜÜM TEK KÂ TEK KÂ TEK KÂ
                          VELVELE: DÜM DÜÜM DÜ ME DÜ ME DÜM TE KE TEK KÂ TEK KÂ
                          VELVELE 2: DÜ ME DÜ ME TE KE TE KE DÜ ME DÜ ME TE KE TE KE TEK KÂ TEK KÂ
NİM ÇENBER (4+6+2, 12/8)  DARP: DÜÜM TEK KÂ DÜÜM TAA HEEK TEK KÂ
                          VELVELE: DÜM TE KE TEK KÂ DÜM DÜM TEK TE KE TEK KÂ TEK KÂ
İKİZ AKSAK (7+5, 12/8)    DARP: DÜM TEK TEK DÜÜM TEEK DÜÜM TEEK TEK
                          VELVELE: DÜM TEK TEK DÜM TE KE TEK KÂ DÜ ME DÜM TEEK TEK
                          VELVELE 2: DÜM TEK TE KE DÜM TE KE TEK KÂ DÜM TE KE TEK KÂ TE KE
BİLEŞİK SOFYAN (12/8)     DARP: DÜÜÜM DÜÜÜM TEEEK KÂÂÂ
                          VELVELE: DÜM TEK KÂ DÜ ME TEK KÂ DÜM TE KE TEK KÂ TEK KÂ
NİM EVSAT (5+4+4, 13/8)   DARP: TEK KÂ TEK KÂÂ DÜÜÜM DÜÜÜÜM | TEK KÂ TEK KÂ TE KE DÜM TE KE TEK KÂ DÜ ME DÜM TEK TE KE
ŞARKI DEVR-İ REVÂNİ (13/8) DARP: DÜM TEK KÂ DÜÜM TEEK DÜÜM TEEK TEK KÂ | DÜM TEK KÂ DÜM TE KE TEK KÂ DÜ ME DÜM TEEK TEK KÂ
BEKTÂŞİ DEVR-İ REVÂNİ (13/8) DARP: DÜÜM TEK KÂ DÜÜM TEEK TEK DÜÜM TEK KÂ | DÜM TE KE TEK KÂ DÜ ME DÜM TEEK TE KE DÜM TE KE TEK KÂ
MEVLEVÎ DEVR-İ REVÂNİ (3+4+3+4, 14/8) DARP: DÜÜÜM DÜÜM TEEK DÜÜÜM TEEK TEEK
                          VELVELE: DÜM TEK KÂ DÜ ME TEK KÂ DÜ ME DÜ ME TEK KÂ TEK KÂ
RAKSAN 1 (3+5+4+3, 15/8)  DARP: DÜM TEK KÂ DÜÜM TEK TEEK DÜÜM TEEK DÜM TEEK
                          VELVELE: DÜM TEK KÂ DÜM TE KE TEK KÂ TE KE DÜM TE KE TEK KÂ DÜM TEK KÂ
RAKSAN 2 (5+5+5, 15/8)    DARP: DÜM TE KE TEK KÂ TE KE DÜM TE KE TEK KÂ TE KE DÜM TE KE TEK KÂ TE KE
FER'Î MUHAMMES / FER (16/4) DARP: DÜÜM TEK KÂ DÜÜM TEEK DÜM TEK DÜ ME DÜM TÂ HEK TE KE TE KE
                          VELVELE: DÜM DÜM TEK TE KE TEK KÂ TEK KÂ DÜ ME DÜ ME TE KE TE KE TEK KÂ TEK KÂ
ÇİFTE DÜYEK (8+8, 16/4)   DARP: DÜÜM TEEEEK TEEK DÜÜM DÜÜM TEEK TEK KÂ
                          VELVELE 1: DÜM TE KE TEK KÂ TE KE TEK KÂ TE KE DÜ ME DÜ ME DÜM TEK TE KE TEK KÂ
                          VELVELE 2: DÜM DÜM TE KE TE KE TEK KÂ TEK KÂ DÜ ME DÜ ME TE KE TE KE TEK KÂ TEK KÂ
NİM HAFİF (16/4)          DARP: DÜM TEK TEEK DÜM TEK TEEK DÜÜM TEK KÂ DÜM TEK TEEK
                          VELVELE: DÜM TE KE TEK KÂ DÜM TE KE TEK KÂ DÜ ME DÜ ME TE KE TE KE TEK KÂ DÜM TE KE TEK KÂ
NİM BEREFŞAN (16/4)       DARP: DÜÜM TEK DÜÜM TEK DÜÜM DÜM TEK DÜM DÜM TEEK TEK KÂ
                          VELVELE: DÜM TEK KÂ DÜM TE KE TEK KÂ TE KE DÜM TE KE DÜ ME DÜ ME TE KE TE KE TEK KÂ
TÜRKÎ DARB (18/4)         DARP: TEEK TEK KÂ TEK KÂ DÜÜM DÜÜM TEEK TEK KÂ DÜÜM DÜM DÜM
                          VELVELE: TEK TE KE TEK KÂ TEK KÂ DÜM DÜ ME DÜM TE KE DÜM TE KE TEK KÂ DÜM DÜ ME DÜM DÜM
NİM DEVİR (18/4)          DARP: DÜÜM DÜÜM TEEK DÜÜM DÜÜM TÂÂ HEEK TEK KÂ TEK KÂ
                          VELVELE: DÜM TE KE DÜM TÂ HEK TE KE DÜ ME DÜM TEK DÜM TÂ HEK TE KE TEK KÂ TEK KÂ TEK KÂ
FAHTE (4+6+6+4, 20/4)     DARP: DÜÜM DÜM DÜM TEEK TEEK TEEK DÜÜM TAA HEEK TEK KÂ TEK KÂ
                          VELVELE 1: DÜM DÜ ME DÜM DÜM TEK TE KE TEK KÂ TEK KÂ DÜ ME DÜM TEK DÜ ME TE KE TEK KÂ TEK KÂ TEK KÂ
HEZEC (22/4)              DARP: DÜÜM DÜM DÜM TEEK DÜM DÜM TEEK DÜÜM TEEK DÜÜM TEEK TEK KÂ TEK KÂ
                          VELVELE: DÜM DÜM TE KE TE KE TEK KÂ DÜ ME DÜ ME TE KE TE KE TEK KÂ TE KE TEK KÂ TE KE TEK KÂ TEK KÂ
ÇENBER (24/4)             DARP: DÜÜM TEK KÂ DÜÜM DÜM DÜM TEEK TEEK TEEK DÜÜM TAA HEEK TEK KÂ TEK KÂ
                          VELVELE: DÜM TE KE TEK KÂ DÜM DÜ ME DÜM DÜM TEK TE KE TEK KÂ TEK KÂ DÜ ME DÜM TEK TE KE TEK KÂ TEK KÂ TEK KÂ
NİM SAKÎL (24/4)          DARP: DÜÜM TEK KÂ DÜÜM TEK KÂ TEK KÂ DÜÜM TEK KÂ TE KE DÜM TAA HEEK TEK KÂ TEK KÂ
                          VELVELE: DÜM TE KE TEK KÂ DÜ ME DÜM TEK TE KE TEK KÂ DÜ ME DÜM TEK TE KE TEK KÂ DÜ ME DÜM TEK TE KE TEK KÂ TEK KÂ TEK KÂ
EVSAT (26/4)              DARP: TEK KÂ TEK KÂÂ DÜÜM TEEK DÜÜM DÜÜM TEEK TEK KÂÂ DÜÜÜÜM DÜÜÜÜM
                          VELVELE: DÜM DÜM TE KE TEK KÂ DÜ ME DÜM TE KE TE KE TEK KÂ TEK KÂ DÜ ME DÜM TE KE DÜ ME TEK KÂ TEK KÂ TEK KÂ
BESTE DEVR-İ REVÂNİ (26/4) DARP: DÜÜÜÜÜM DÜÜÜM TEEEEK DÜÜÜÜÜM TEEEEK TEEEEK
                          VELVELE: DÜM TE KE TEK KÂ TE KE DÜM TE KE TEK KÂ TEK KÂ TEK KÂ DÜM TE KE TEK KÂ TE KE HEK TE KE TEK KÂ TEK KÂ TEK KÂ
DEVR-İ KEBÎR (6+4+4+6+4+4, 28/4) DARP: DÜÜM DÜÜM TEEK DÜ ME DÜM TEEK TEEK TEEK DÜÜM DÜÜM TÂÂ HEEK TEK KÂ TEK KÂ
                          VELVELE: DÜM TEK DÜ ME DÜM TEK TE KE DÜM TEK TE KE DÜM TEEK TEEK HEK TEEK HEK TE KE TEK KÂ DÜ ME DÜ ME TE KE TE KE DÜ ME DÜ ME TEK KÂ TEK KÂ
REMEL (28/4)              DARP: DÜÜM TEK KÂ DÜÜM TEK KÂ TEK KÂ DÜÜM TEK KÂ DÜÜM DÜÜM TEEK DÜ ME DÜM DÜM TEEK TEK KÂ
                          VELVELE: DÜM DÜM TE KE TE KE TEK KÂ TEK KÂ DÜ ME DÜ ME TE KE TE KE TEK KÂ TEK KÂ HEEK HEEK HEK TE KE TEK KÂ TEK KÂ TEK KÂ
HAFÎF (32/4)              DARP: DÜM TEK TEEK DÜM TEK TEEK DÜÜM TEK KÂ DÜM TEK TEEK | DÜÜM TEK KÂ DÜM DÜM TEK TE KE DÜM TEK TE KE DÜM TÂ HEK TE KE TE KE
                          VELVELE: DÜM TE KE TEK KÂ DÜM TE KE TEK KÂ DÜ ME DÜ ME TE KE TEK KÂ DÜM TE KE TEK KÂ | DÜ ME DÜ ME TE KE TEK KÂ HEK TE KE TEK KÂ TEK KÂ TEK KÂ
FRENGİFER (28/4)          DARP: [belirsiz]DÜM DÜÜÜM DÜÜM DÜÜÜÜM DÜÜM TEEK DÜÜM DÜÜM TAA HEEK TEK KÂ TEK KÂ
MUZAAF DEVR-İ KEBÎR (56/4) [uzun; ihtiyaç olursa Gönül s.108-109 re-render]
```

## Kaynakta BULUNAMAYAN (s.101-109 dışında; re-render gerekli)
Zincir (120), tam Berefşan, tam Sakîl, Muhammes (tam), Hâvî — Gönül s.109
sonrasında olmalı; koda aktarım için o sayfalar render edilmeli.
