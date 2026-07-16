# Bekleyen Usûller (kaynak bekliyor)

Bu usûllerin **süre/ritmi** SymbTr korpusundan bilinir, ama **düm/tek darpı**
hiçbir otoriter kaynakta (Heper Kudüm, Gönül, elimizdeki Özkan alıntısı)
doğrulanamadı. **Uydurma yasak** ilkesi gereği UI'da **gösterilmezler** —
`USUL_DATA`'dan otomatik çıkarılırlar. Meta verileri (`PENDING_USULS`) korunur;
kaynak bulununca tek adımda geri eklenirler.

## Otomatik re-add (kaynak bulununca)

`src/engines/usul/data.ts`:
1. İlgili `makeUsul(...)` satırındaki darpı gerçek düm/tek ile **güncelle**.
2. Usûl id'sini **`PENDING_USUL_IDS`** kümesinden **çıkar**.

Bu kadar. Usûl otomatik `USUL_DATA`'ya girer, `/rhythm` ve `/ogren`'de görünür.
(Ters yön: bir usûlü gizlemek için id'yi `PENDING_USUL_IDS`'e ekle.) Test
`src/engines/usul/__tests__/data.test.ts` bekleyenlerin UI'da görünmediğini ve
`PENDING_USULS` kayıtlarının korunduğunu doğrular.

## Liste (20 usûl)

| id | ad | zaman | kaynak durumu |
|---|---|---|---|
| `bektasiraksani` | Bektâşî Raksânı | 15/8 | **Özkan s.704** (15 zamanlı) — TOC-teyitli, o sayfa OCR bekliyor. **Tek somut re-add adayı.** |
| `murekkepsofyan` | Mürekkep Sofyan | 12/8 | Özkan s.687 "Bileşik Sofyan" — isim eşdeğerliği belirsiz |
| `azeriyuruksemai` | Âzerî Yürüksemâî | 6/8 | Bilinen kaynak yok |
| `devriaryan` | Devr-i Âryân | 14/8 | Bilinen kaynak yok |
| `devrihindiii` | Devr-i Hindî II | 7/8 | Bilinen kaynak yok ("II" varyantı hiçbir kitapta) |
| `devrisureyya` | Devr-i Süreyyâ | 10/8 | Bilinen kaynak yok |
| `devrituranii` | Devr-i Turan II | 14/16 | Bilinen kaynak yok ("II" varyantı yok) |
| `iraksak` | İraksak | 18/8 | Bilinen kaynak yok |
| `muasser` | Muasser | 10/4 | Bilinen kaynak yok |
| `nazliduyek` | Nazlı Düyek | 12/8 | Bilinen kaynak yok |
| `raksaksagiii` | Raks Aksağı II | 18/16 | Bilinen kaynak yok ("II" varyantı yok) |
| `sturkaksagi` | S. Türk Aksağı | 10/4 | Bilinen kaynak yok (10/4 "S." varyantı yok) |
| `yuruksemaiii` | Yürüksemâî II | 6/8 | Bilinen kaynak yok |
| `dolap` | Dolap | 12/8 | Bilinen kaynak yok (Gönül eşleşmesi şarkı sözü) |
| `gulsen` | Gülşen | 6/8 | Bilinen kaynak yok (Gönül/Heper eşleşmesi şarkı sözü) |
| `cevher` | Cevher | 10/8 | Bilinen kaynak yok (Gönül eşleşmesi şarkı sözü) |
| `bektasiraksievferi` | Bektâşî Raksı Evferi | 16/8 | Bilinen kaynak yok |
| `turkmen` | Türkmen | 18/8 | Bilinen kaynak yok (Gönül eşleşmesi icracı adı) |
| `kcurcuna` | K. Curcuna | 10/8 | Bilinen kaynak yok ("Kısa Curcuna" ayrı form yok) |
| `devrisureyyasofyani` | Devr-i Süreyyâ Sofyanî | 10/16 | Bilinen kaynak yok |

## Not

Çoğu "… II", "S. …", "K. …", "… Sofyanî", "… Raksı Evferi" adları standart usûl
adları değil, **SymbTr veri-seti etiketleridir**; geleneksel notasyon kitaplarında
karşılığı olmaması beklenir. Dış kitap (Arif Sami Toker notları, Şeref Çakar
*Türk Mûsikîsinde Usûl*, tam Özkan usûl bölümü) temin edilirse bu tablo yeniden
değerlendirilir. Kaynak dosyalar: `symb/…KUDÜM…md` (Heper OCR), Gönül/Özkan PDF'leri.
