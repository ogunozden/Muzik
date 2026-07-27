# Core Domain

Dis dunya efektlerinden bagimsiz, saf alan bilgisi.

- `note-naming.ts` — perde adlandirma (solfej/harf) donusumleri.

## Burada ne YOK, ve neden

Bu klasorde bir sure `ScoreDocument`, `UsulPattern`, `InstrumentProfile` tip
sozlesmeleri durdu. Hicbiri **kullanilmadi**: `index.ts` ucunu yeniden disa
aktariyordu ve `index.ts`i de kimse import etmiyordu — kapali bir dongu.
README ayrica var olmayan bir `PracticeSession`dan soz ediyordu.

2026-07-27'de kaldirildi. Gerekce, projenin kendi kodlama kurali: ihtiyac
dogmadan soyutlama yazilmaz (YAGNI). Gercek tipler bugun kullanildiklari
yerde yasiyor (`data/score-engine/canonical-score.ts`, `engines/usul/data.ts`,
`engines/ses/profiles.ts`) ve oradan tuketiliyor.

Buraya yeni bir sozlesme, ancak **iki ayri katman** ayni tipe ihtiyac
duydugunda tasinmalidir.
