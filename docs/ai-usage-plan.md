# Muzik AI Kullanım Planı (LM Studio qwen3.5-35b)

> Model: `qwen3.5-35b-a3b-main` @ `192.168.1.16:1234`
> Internet: VAR (script internete çıkar, AI'ya veri getirir)
> Devinim: Bağımsız, etkilenmez

---

## Mimari

```
[Script] → [Internet] → [Fetch site content]
   ↓
[Prompt: catalog entry + site content]
   ↓
[LM Studio AI] → [Analiz et] → [Eşleşme kararı]
   ↓
[JSON output]
```

Script internete çıkar. AI offline analiz eder.

---

## Yapılabilecek İşler

### 1. Site Tarayıp AI'a Eşleştirme Yaptırma

Script DivanMakam/SalihBora/OGM sayfalarını fetch eder, AI'ya verir:

```javascript
// Script yapar:
const pageHtml = await fetch("https://divanmakam.com/forum/...").then(r => r.text());
const prompt = `
Katalog: "Acem İlahi Düyek Aldanma Dünya Zekai Dede"
Site başlığı: "${extractTitle(pageHtml)}"
Site içeriği: "${extractText(pageHtml).slice(0, 2000)}"

Bu site içeriği katalog eserine ait mi? 1 veya 0.
`;
const result = await askAI(prompt);
// result: {match: true, confidence: 0.92, reason: "Başlık ve bestekâr eşleşiyor"}
```

**Değer:** Elle inceleme yerine AI filtreler.

---

### 2. Batch İş: 3000 Eser İçin Arama + AI Eşleştirme

```javascript
// Her eser için:
1. DDG arama yap: "Acem İlahi Düyek Aldanma Dünya Zekai Dede site:divanmakam.com"
2. İlk 5 sonucu fetch et
3. AI'ya ver: "Bu 5 sonuçtan hangisi gerçekten bu esere ait?"
4. AI cevap: {accepted: [...], rejected: [...], needsReview: [...]}
```

**Değer:** Toplu iş, elle 3000'e bakmak yerine AI ön filtreler.

---

### 3. Sayfa İçeriğinden Metadata Çıkarma

AI site HTML'inden yapısal veri çıkarır:

```
Girdi: DivanMakam forum sayfası HTML
Çıktı: {
  "title": "Aldanma Dünya Teni - Zekai Dede - Acem",
  "composer": "Zekai Dede",
  "makam": "Acem",
  "usul": "Düyek",
  "form": "İlahi",
  "confidence": 0.95
}
```

---

### 4. Çelişki Tespiti

AI iki kaynağı karşılaştırır:

```
Kaynak A: "Acem makamı" diyor
Kaynak B: "Hicaz makamı" diyor
AI: ÇELİŞKİ! İnsan incelemesi gerek.
```

---

## Uygulama Planı

| Sıra | İş | Nasıl |
|------|-----|-------|
| 1 | **AI eşleştirme motoru** | Script fetch eder → AI analiz eder → JSON output |
| 2 | **Batch arama + AI filtre** | 3000 eser için arama yap, AI eşleşenleri bul |
| 3 | **AI metadata çıkarıcı** | Site HTML'den yapısal veri |
| 4 | **AI çelişki tespit** | İki kaynak çelişiyorsa flag |

---

## Başla

Hangi işi başlayalım?

**A)** 1 eser için test: Script fetch etsin, AI eşleştirme yapsın (proof of concept)
**B)** Batch iş: İlk 50 eser için arama + AI filtre
**C)** Metadata çıkarıcı: DivanMakam forum sayfasından veri

Karar senin.
