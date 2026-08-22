import {Usul} from "@/core/domain/models";
import {DU, ME, makeUsul, shift} from "@/engines/usul/data/core";
import {
  AKSAK,
  AKSAK_SEMAI,
  BEKTASI_DEVRI_REVAN,
  BERAFSAN,
  BESTE_DEVRI_REVAN,
  CEMBER,
  CENGI_HARBI,
  CIFTE_DUYEK,
  CIFTE_DUYEK_16,
  DARBITURKI,
  DEVRI_KEBIR,
  DEVRI_REVAN,
  DUYEK,
  EVFER,
  EVSAT,
  FAHTE,
  FERI_MUHAMMES,
  FRENGIFER,
  HEZEC,
  IKIZ_AKSAK,
  MUHAMMES,
  NIM_DEVIR,
  NIM_EVSAT,
  NIM_SAKIL,
  REMEL,
  SARKI_DEVRI_REVAN,
  TEK_VURUS,
  YURUK_SEMAI,
  MUSEMMEN,
} from "@/engines/usul/data/strokes";
import {
  AKSAK_SEMAI_VELVELE,
  AKSAK_VELVELE,
  BEKTASI_DEVRI_REVAN_VELVELE,
  BEREFSAN_VELVELE,
  BESTE_DEVRI_REVAN_VELVELE,
  CEMBER_VELVELE,
  CIFTE_DUYEK_VELVELE,
  DEVRI_HINDI_VELVELE,
  DEVRI_KEBIR_VELVELE,
  DEVRI_REVAN_VELVELE,
  DEVRI_TURAN_VELVELE,
  DUYEK_VELVELE,
  EVFER_VELVELE,
  EVSAT_VELVELE,
  FAHTE_VELVELE,
  FERI_MUHAMMES_VELVELE,
  FRENKCIN_VELVELE,
  HAFIF_VELVELE,
  HEZEC_VELVELE,
  IKIZ_AKSAK_VELVELE,
  LENK_FAHTE_VELVELE,
  MUHAMMES_VELVELE,
  MUSEMMEN_VELVELE,
  NIM_BERAFSAN_VELVELE,
  NIM_CEMBER_VELVELE,
  NIM_DEVIR_VELVELE,
  NIM_EVSAT_VELVELE,
  NIM_HAFIF_VELVELE,
  NIM_SAKIL_VELVELE,
  OYNAK_VELVELE,
  RAKSAN_VELVELE,
  REMEL_VELVELE,
  SARKI_DEVRI_REVAN_VELVELE,
  TEK_VURUS_VELVELE,
  TURKI_DARB_VELVELE,
  YURUK_SEMAI_VELVELE,
  FRENGIFER_VELVELE,
} from "@/engines/usul/data/velveles";

// Tum usul tanimlari (dogrulanmis + kaynak-bekleyen). Bu ham liste dogrudan
// UI'ya GITMEZ; USUL_DATA asagida PENDING_USUL_IDS haric filtrelenir.
const ALL_USULS: Usul[] = [
  // --- Kucuk usuller ---
  makeUsul("nimsofyan", "Nimsofyan", "Nimsofyan", 2, "4", [[1, "dum", 1], [2, "tek", 1]],
    [[1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5]]), // s.11
  makeUsul("yuruksofyan", "Yürük Sofyan", "Yuruk Sofyan", 2, "4", [[1, "dum", 1], [2, "tek", 1]],
    [[1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5]]), // Ozalp/Karadeniz: Nim Sofyan'in diger adi (Yürük/Tek Sofyan)
  makeUsul("semai", "Semai", "Semai", 3, "4", [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1]],
    [[1, "dum", 1], [2, "tek", 1], [3, "te", 0.5], [3.5, "ke", 0.5]]), // s.15
  makeUsul("sofyan", "Sofyan", "Sofyan", 4, "4", [[1, "dum", 2], [3, "te", 1], [4, "ke", 1]],
    [[1, "dum", 2], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 0.5], [4.5, "ka", 0.5]]), // s.18
  makeUsul("turkaksagi", "Türk Aksağı", "Turkish Aksak", 5, "8", [[1, "dum", 2], [3, "tek", 2], [5, "tek", 1]],
    [DU(1), ME(1.5), [2, "dum", 1], [3, "hek", 1], [4, "tek", 2]]), // s.20
  makeUsul("zafer", "Zafer", "Zafer", 5, "8", [[1, "dum", 1], [2, "tek", 2], [4, "dum", 1], [5, "tek", 1]],
    [[1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 1.5], [4, "dum", 1], [5, "tek", 1]]), // s.23
  makeUsul("yuruksemai", "Yürüksemâî", "Yuruk Semai", 6, "8", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // s.25
  makeUsul("senginsemai", "Sengin Semai", "Sengin Semai", 6, "4", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // s.25: YS 2. mertebesi
  makeUsul("agirsemai", "Ağır Semai", "Agir Semai", 6, "2", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // s.25: YS 3. mertebesi (agir semai)
  makeUsul("agirsenginsemai", "Ağır Sengin Semai", "Agir Sengin Semai", 6, "2", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // Sengin Semai ailesi 6/2 mertebe; ayni darp
  makeUsul("devirhindi", "Devr-i Hindi", "Devr-i Hindi", 7, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2],
  ], DEVRI_HINDI_VELVELE), // s.34
  makeUsul("devirituran", "Devr-i Turan", "Devr-i Turan", 7, "8", [
    [1, "dum", 2], [3, "tek", 2], [5, "tek", 3],
  ], DEVRI_TURAN_VELVELE), // s.37 (yaygin mertebesi 7/16; 7/8 de gosterilir)
  makeUsul("duyek", "Düyek", "Duyek", 8, "8", DUYEK, DUYEK_VELVELE), // s.40 (birinci mertebe 8/8)
  makeUsul("agirduyek", "Ağırdüyek", "Agir Duyek", 8, "4", DUYEK, DUYEK_VELVELE), // s.40: duyek 2. mertebesi
  makeUsul("musemmen", "Müsemmen", "Musemmen", 8, "8", MUSEMMEN, MUSEMMEN_VELVELE), // s.44
  makeUsul("musemmenii", "Müsemmen II", "Musemmen II", 8, "8", MUSEMMEN, MUSEMMEN_VELVELE), // TDV: Musemmen kanonik 8/8; 2. mertebe etiketi ayni darp
  makeUsul("katikofti", "Katıkofti", "Katikofti", 8, "8", MUSEMMEN, MUSEMMEN_VELVELE), // Adana Musiki Dernegi ?pnum=363: "Müsemmen (Katakofti)" = ayni usul
  makeUsul("aksak", "Aksak", "Aksak", 9, "8", AKSAK, AKSAK_VELVELE), // s.47
  makeUsul("ciftesofyan", "Çiftesofyan", "Cifte Sofyan", 9, "8", AKSAK, AKSAK_VELVELE), // s.46: aksagin yurukce vurulusu
  makeUsul("agiraksak", "Ağır Aksak", "Agir Aksak", 9, "4", AKSAK, AKSAK_VELVELE), // s.46-47: aksak 2. mertebesi
  makeUsul("evfer", "Evfer", "Evfer", 9, "8", EVFER, EVFER_VELVELE), // s.53: aksaktan farki son iki tek'in deger degisimi
  makeUsul("agirevfer", "Ağır Evfer", "Agir Evfer", 9, "4", EVFER, EVFER_VELVELE), // TDV evfer: 2. mertebe 9/4 (= Mevlevi evferi)
  makeUsul("mevlevievferi", "Mevlevî Evferi", "Mevlevi Evferi", 9, "4", EVFER, EVFER_VELVELE), // TDV: 2. mertebeye agir evfer/Mevlevi evferi denir; Mevlevi ayini 2./4. selam
  makeUsul("raksaksagi", "Raks Aksağı", "Raks Aksagi", 9, "8", [
    [1, "dum", 2], [3, "tek", 3], [6, "dum", 2], [8, "tek", 2], // Düüm Teeek Düüm Teek (2+3+2+2)
  ]), // TDV raks-aksagi + dergipark: 2+3+2+2; velvele kaynakta net cikarilamadi -> darp-only
  makeUsul("aydin", "Aydın", "Aydin", 9, "8", [
    [1, "dum", 2], [3, "tek", 2], [5, "dum", 2], [7, "tek", 3], // Düüm Teek Düüm Teeek (2+2+2+3)
  ]), // usuller.com (Devr-i Bendir) nota gorseli + SymbTr 9/8; velvele net degerlenmedi -> darp-only
  makeUsul("oynak", "Oynak", "Oynak", 9, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2], [8, "tek", 2],
  ], OYNAK_VELVELE), // s.63 (darp) + Gonul s.102 (velvele)
  makeUsul("aksaksemai", "Aksaksemâî", "Aksak Semai", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // s.67
  makeUsul("agiraksaksemai", "Ağır Aksak Semâî", "Agir Aksak Semai", 10, "4", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // Adana ?pnum=369: Aksak Semai'nin 10/4 agir mertebesi, ayni darp
  makeUsul("aksaksemaiii", "Aksak Semâî III", "Aksak Semai III", 10, "2", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // Aksak Semai 3. mertebe (10/2), ayni darp
  makeUsul("aksaksemaievferi", "Aksaksemâî Evferi", "Aksak Semai Evferi", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // SymbTr .mu2 duzum=212221 = Aksak Semai darpi birebir; ayni darp
  // Curcuna = 10/8 (gercek notasyon). Kitap (s.66) onu Aksak Semai'nin 10/16
  // mertebesi sayar ama SymbTr v3 korpusundaki curcuna eserlerinin TAMAMI 10/8
  // notalidir; pedagoji de 10/8 der (darp: 3+2+2+3 = Düm2 Te1 Kâ2 Düm2 Tek2
  // Tek1, Aksak Semai ile ayni desen — kaynaklar ikisini esitler; curcuna
  // livelier/hizli karakterdir). 10/16 curcuna'yi 2x hizli caliyordu.
  makeUsul("curcuna", "Curcuna", "Curcuna", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // s.66-67 + korpus 10/8
  makeUsul("devrisureyyasofyani", "Devr-i Süreyyâ Sofyanî", "Devr-i Sureyya Sofyani", 10, "16", [[1, "dum", 5], [6, "tek", 2], [8, "tek", 3]]), // SymbTr clustering [5,2,3] otoriter (onceki Curcuna esitlemesi ritimle celisiyordu); darp yapisal
  makeUsul("lenkfahte", "Lenk Fahte", "Lenk Fahte", 10, "4", [
    [1, "dum", 2], [3, "tek", 3], [6, "dum", 1], [7, "tek", 2], [9, "te", 1], [10, "ke", 1],
  ], LENK_FAHTE_VELVELE), // s.76 (darp) + Gonul s.102 (velvele)
  makeUsul("cengiharbi", "Çeng-i Harbî", "Cengi Harbi", 10, "4", CENGI_HARBI), // Gonul s.103 (2+2+3+3); velvelesiz mehter usulu, korpusta repertuvari var
  makeUsul("tekvurus", "Tek Vuruş", "Tek Vurus", 11, "8", TEK_VURUS, TEK_VURUS_VELVELE), // Gonul s.103 (5+6); korpusta repertuvari var
  makeUsul("frenkcin", "Frenkçin", "Frenkcin", 12, "4", [
    [1, "dum", 1], [2, "dum", 2], [4, "dum", 1], [5, "dum", 2],
    [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1], [11, "tek", 1], [12, "ka", 1],
  ], FRENKCIN_VELVELE), // s.85 (darp) + Gonul s.103 (velvele)
  makeUsul("nimcember", "Nim Çember", "Nim Cember", 12, "8", [
    [1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2],
    [7, "ta", 2], [9, "hek", 2], [11, "te", 1], [12, "ke", 1],
  ], NIM_CEMBER_VELVELE), // s.90 (darp) + Gonul s.103 (velvele)
  makeUsul("ikizaksak", "İkiz Aksak", "Ikiz Aksak", 12, "8", IKIZ_AKSAK, IKIZ_AKSAK_VELVELE), // Gonul s.103 (7+5); korpusta repertuvari var
  makeUsul("nimevsat", "Nim Evsat", "Nim Evsat", 13, "8", NIM_EVSAT, NIM_EVSAT_VELVELE), // Gonul s.104 (5+4+4); korpusta repertuvari var
  makeUsul("sarkidevrirevani", "Şarkı Devr-i Revânî", "Sarki Devr-i Revani", 13, "8", SARKI_DEVRI_REVAN, SARKI_DEVRI_REVAN_VELVELE), // Gonul s.104 (3+4+4+2)
  makeUsul("bektasidevrirevani", "Bektâşî Devr-i Revânî", "Bektasi Devr-i Revani", 13, "8", BEKTASI_DEVRI_REVAN, BEKTASI_DEVRI_REVAN_VELVELE), // Gonul s.104 (4+5+4)
  makeUsul("devrirevan", "Devrirevan", "Devr-i Revan", 14, "8", DEVRI_REVAN, DEVRI_REVAN_VELVELE), // s.101 (darp, Mevlevi) + Gonul s.104 (velvele)
  makeUsul("ayindevrirevani", "Âyin Devr-i Revânî", "Ayin Devr-i Revani", 14, "8", DEVRI_REVAN, DEVRI_REVAN_VELVELE), // Mevlevi ayinlerinde ayni devr-i revan; korpusta ayri repertuvar
  makeUsul("devrirevanihindi", "Devr-i Revân-ı Hindî", "Devr-i Revan-i Hindi", 14, "8", DEVRI_REVAN, DEVRI_REVAN_VELVELE), // Devr-i Revan'in Hindi alt-turu (14/8, 12 eser); ayni Devr-i Revan darpi
  makeUsul("raksan", "Raksan", "Raksan", 15, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "te", 1], [7, "ka", 2],
    [9, "dum", 2], [11, "tek", 2], [13, "te", 1], [14, "ka", 2],
  ], RAKSAN_VELVELE), // s.103 (darp) + Gonul s.104 (velvele, Raksan 2)
  // --- Buyuk usuller ---
  makeUsul("nimberafsan", "Nim Berafsan", "Nim Berefsan", 16, "4", [
    [1, "dum", 2], [3, "tek", 1], [4, "dum", 2], [6, "tek", 1], [7, "dum", 2],
    [9, "dum", 1], [10, "tek", 1], [11, "dum", 1], [12, "dum", 1], [13, "tek", 2],
    [15, "tek", 1], [16, "ka", 1],
  ], NIM_BERAFSAN_VELVELE), // s.121 (darp) + Gonul s.107 (velvele)
  makeUsul("nimhafif", "Nim Hafif", "Nim Hafif", 16, "4", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 2], [5, "dum", 1], [6, "tek", 1], [7, "tek", 2],
    [9, "dum", 1], [10, "tek", 1], [11, "dum", 1], [12, "dum", 1],
    [13, "ta", 1], [14, "hek", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "te", 0.5], [16.5, "ke", 0.5],
  ], NIM_HAFIF_VELVELE), // s.227 (darp) + Gonul s.107 (velvele)
  makeUsul("darbiturki", "Darb-ı Türkı", "Darb-i Turki", 18, "4", DARBITURKI, TURKI_DARB_VELVELE), // Gonul s.105 (darp 6+4+4+4) + s.106 (velvele)
  makeUsul("turkdarbi", "Türk Darbı", "Turk Darbi", 18, "4", DARBITURKI, TURKI_DARB_VELVELE), // Türk Darbı = Darb-ı Türkî (ayni usul, kelime sirasi)
  makeUsul("cifteduyek", "Çifte Düyek", "Cifte Duyek", 16, "4", CIFTE_DUYEK_16, CIFTE_DUYEK_VELVELE), // Gonul s.105 (8+8); korpusta repertuvari var
  makeUsul("ferimuhammes", "Fer'î Muhammes", "Feri Muhammes", 16, "4", FERI_MUHAMMES, FERI_MUHAMMES_VELVELE), // Gonul s.104 (4+4+4+4)
  makeUsul("fer", "Fer", "Fer", 16, "4", FERI_MUHAMMES, FERI_MUHAMMES_VELVELE), // Gonul s.104: Fer = Fer'î Muhammes (ayni desen)
  makeUsul("nimdevir", "Nim Devir", "Nim Devir", 18, "4", NIM_DEVIR, NIM_DEVIR_VELVELE), // Gonul s.106 (6+4+4+4); korpusta repertuvari var

  makeUsul("fahte", "Fahte", "Fahte", 20, "4", FAHTE, FAHTE_VELVELE), // s.139 (darp) + Gonul s.105
  // Durak Evferi = Türk Aksağı(5) + 4 Sofyan(16) = 21 (TDV + sufi.gen.tr belgeli
  // yapi). Bilesenlerin GERCEK darpindan kuruldu (zincir gibi); dini muside na't/durak.
  makeUsul("durakevferi", "Durak Evferi", "Durak Evferi", 21, "4", [
    [1, "dum", 2], [3, "tek", 2], [5, "tek", 1], // Türk Aksağı
    [6, "dum", 2], [8, "te", 1], [9, "ke", 1], // Sofyan 1
    [10, "dum", 2], [12, "te", 1], [13, "ke", 1], // Sofyan 2
    [14, "dum", 2], [16, "te", 1], [17, "ke", 1], // Sofyan 3
    [18, "dum", 2], [20, "te", 1], [21, "ke", 1], // Sofyan 4
  ]), // TDV: 21 zamanli; yapi = Türk Aksağı + 4 Sofyan
  makeUsul("hezec", "Hezeç", "Hezec", 22, "4", HEZEC, HEZEC_VELVELE), // Gonul s.106 (6+4+4+4+4); korpus repertuvari yok, pedagojik
  makeUsul("cember", "Çember", "Cember", 24, "4", CEMBER, CEMBER_VELVELE), // s.157
  makeUsul("agircenber", "Ağır Çenber", "Agir Cenber", 24, "2", CEMBER, CEMBER_VELVELE), // TDV/Ozkan: Cenber'in 2. mertebesi (24/2), ayni darp
  makeUsul("nimsakil", "Nim Sakîl", "Nim Sakil", 24, "4", NIM_SAKIL, NIM_SAKIL_VELVELE), // Gonul s.107 (4+6+6+4+4); korpusta repertuvari var
  makeUsul("evsat", "Evsat", "Evsat", 26, "4", EVSAT, EVSAT_VELVELE), // Gonul s.107 (5+4+4+5+4+4); korpusta repertuvari var
  makeUsul("bestedevrirevani", "Beste Devr-i Revânî", "Beste Devr-i Revani", 26, "4", BESTE_DEVRI_REVAN, BESTE_DEVRI_REVAN_VELVELE), // Gonul s.108 (5+4+4+5+4+4); korpusta repertuvari var
  makeUsul("devrikebir", "Devr-i Kebir", "Devr-i Kebir", 28, "4", DEVRI_KEBIR, DEVRI_KEBIR_VELVELE), // s.181
  makeUsul("remel", "Remel", "Remel", 28, "4", REMEL, REMEL_VELVELE), // Gonul s.109 (4+6+4+6+2+4+2); korpusta repertuvari var
  makeUsul("firengifer", "Frengifer", "Frengifer", 28, "4", FRENGIFER, FRENGIFER_VELVELE), // Gonul s.109 (6+6+4+4+4+4); korpusta repertuvari var
  makeUsul("hafif", "Hafif", "Hafif", 32, "4", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 2], [5, "dum", 1], [6, "tek", 1], [7, "tek", 2],
    [9, "dum", 2], [11, "tek", 1], [12, "ka", 1], [13, "dum", 1], [14, "tek", 1], [15, "tek", 2],
    [17, "dum", 2], [19, "tek", 1], [20, "ka", 1], [21, "dum", 1], [22, "dum", 1],
    [23, "tek", 1], [24, "te", 0.5], [24.5, "ke", 0.5],
    [25, "dum", 1], [26, "tek", 1], [27, "te", 0.5], [27.5, "ke", 0.5],
    [28, "dum", 1], [29, "ta", 1], [30, "hek", 1],
    [31, "te", 0.5], [31.5, "ke", 0.5], [32, "te", 0.5], [32.5, "ke", 0.5],
  ], HAFIF_VELVELE), // s.199 (darp) + Gonul s.109 (velvele)
  makeUsul("muhammes", "Muhammes", "Muhammes", 32, "4", MUHAMMES, MUHAMMES_VELVELE), // Gonul s.110 (8+8+8+8)
  makeUsul("berafsan", "Berafsan", "Berefsan", 32, "4", BERAFSAN, BEREFSAN_VELVELE), // s.208 (darp) + Gonul s.110 (velvele)
  // Sakil = 48 zamanli, Beste yapiminda en buyuk usullerden. Heper Kudum kitabi
  // "ZAMAN VE VURGULARI" tablosundan (repo symb/…KUDUM OCR) birebir; toplam=48.
  // Kitap: "usulun bunyesinde zaten velvele mevcuttur" -> darp-only.
  makeUsul("sakil", "Sakîl", "Sakil", 48, "4", [
    [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 1], [8, "ka", 1],
    [9, "tek", 1], [10, "ka", 1], [11, "dum", 2], [13, "tek", 1], [14, "ka", 1], [15, "dum", 1],
    [16, "tek", 2], [18, "tek", 2], [20, "dum", 2], [22, "dum", 2], [24, "dum", 2],
    [26, "tek", 2], [28, "dum", 2], [30, "tek", 2], [32, "tek", 2], [34, "tek", 2],
    [36, "dum", 2], [38, "tek", 1], [39, "ka", 1], [40, "dum", 1], [41, "dum", 1], [42, "tek", 1],
    [43, "dum", 1], [44, "tek", 1], [45, "ke", 1], [46, "dum", 1], [47, "ta", 1], [48, "hek", 1],
  ]), // Heper "Turk Musikisinde Usuller ve Kudum" (repo symb/) Sakil ZAMAN VE VURGULARI
  // Havi = 64 zamanli. Heper kitabi s.220 "ZAMAN VE VURGULARI" 1.sekil (8 satir
  // x 8 zaman); te-ke onaltilik (0.25) veya sekizlik (0.5). Toplam=64.
  makeUsul("havi", "Hâvî", "Havi", 64, "4", [
    // s1: Düm2 Tek Kâ | düm te ke dü(0.5) tek te ke dü | Tek2
    [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 0.5], [5.5, "tek", 0.5], [6, "te", 0.25], [6.25, "ke", 0.25], [6.5, "dum", 0.5], [7, "tek", 2],
    // s2
    [9, "dum", 2], [11, "tek", 1], [12, "ka", 1], [13, "tek", 1], [14, "ka", 1], [15, "dum", 2],
    // s3
    [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1], [21, "dum", 0.5], [21.5, "tek", 0.5], [22, "te", 0.25], [22.25, "ke", 0.25], [22.5, "dum", 0.5], [23, "tek", 2],
    // s4
    [25, "dum", 2], [27, "dum", 2], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
    // s5
    [33, "dum", 2], [35, "tek", 1], [36, "ka", 1], [37, "dum", 1], [38, "dum", 1], [39, "tek", 1], [40, "te", 0.5], [40.5, "ke", 0.5],
    // s6
    [41, "dum", 1], [42, "tek", 1], [43, "te", 0.5], [43.5, "ke", 0.5], [44, "dum", 1], [45, "ta", 1], [46, "hek", 1], [47, "te", 0.5], [47.5, "ke", 0.5], [48, "te", 0.5], [48.5, "ke", 0.5],
    // s7
    [49, "dum", 1], [50, "tek", 1], [51, "tek", 2], [53, "dum", 1], [54, "tek", 1], [55, "tek", 2],
    // s8
    [57, "dum", 1], [58, "tek", 1], [59, "dum", 1], [60, "dum", 1], [61, "ta", 1], [62, "hek", 1], [63, "te", 0.5], [63.5, "ke", 0.5], [64, "te", 0.5], [64.5, "ke", 0.5],
  ]), // Heper s.220 (1.sekil); tam=64
  // Darbeyn = iki buyuk usulun ardarda vurulusu (mürekkep sinif). En yaygin/
  // standart bicim: Devr-i Kebir (28) + Berefsan (32) = 60 (TDV Darbeyn maddesi;
  // ITU tezi 22 eser incelemesi). Zincir gibi bilesenlerin darbindan kurulur.
  makeUsul("darbeyn", "Darbeyn", "Darbeyn", 60, "4", [
    ...DEVRI_KEBIR,
    ...shift(BERAFSAN, 28),
  ]), // TDV Darbeyn + ITU tezi: Devr-i Kebir + Berefsan; korpus 60/4
  makeUsul("darbifeth", "Darb-ı Feth", "Darb-i Fetih", 88, "4", [
    [1, "dum", 2], [3, "tek", 1], [4, "tek", 1], [5, "dum", 2], [7, "tek", 1], [8, "tek", 1],
    [9, "tek", 1], [10, "ka", 1], [11, "dum", 2], [13, "tek", 1], [14, "tek", 1], [15, "dum", 2],
    [17, "tek", 2], [19, "dum", 2], [21, "tek", 2], [23, "dum", 2],
    [25, "tek", 1], [26, "ka", 1], [27, "dum", 1], [28, "te", 0.5], [28.5, "ke", 0.5], [29, "tek", 2], [31, "tek", 2],
    [33, "dum", 2], [35, "tek", 1], [36, "ka", 1], [37, "tek", 1], [38, "ka", 1], [39, "dum", 2],
    [41, "tek", 1], [42, "ka", 1], [43, "dum", 1], [44, "te", 0.5], [44.5, "ke", 0.5], [45, "tek", 2], [47, "dum", 2],
    [49, "dum", 2], [51, "dum", 2], [53, "tek", 1], [54, "ka", 1], [55, "tek", 1], [56, "ka", 1],
    [57, "dum", 2], [59, "tek", 1], [60, "ka", 1], [61, "dum", 1], [62, "dum", 1],
    [63, "tek", 1], [64, "te", 0.5], [64.5, "ke", 0.5],
    [65, "dum", 1], [66, "tek", 1], [67, "te", 0.5], [67.5, "ke", 0.5],
    [68, "dum", 1], [69, "ta", 1], [70, "hek", 1],
    [71, "te", 0.5], [71.5, "ke", 0.5], [72, "te", 0.5], [72.5, "ke", 0.5],
    [73, "dum", 1], [74, "tek", 1], [75, "tek", 2], [77, "dum", 1], [78, "tek", 1], [79, "tek", 2],
    [81, "dum", 1], [82, "tek", 1], [83, "dum", 1], [84, "dum", 1],
    [85, "ta", 1], [86, "hek", 1],
    [87, "te", 0.5], [87.5, "ke", 0.5], [88, "te", 0.5], [88.5, "ke", 0.5],
  ]), // s.228 (1. sekil; son 16 zaman = Nim Hafif dizilisi)
  makeUsul("zincir", "Zincir", "Zincir", 120, "4", [
    ...CIFTE_DUYEK,
    ...shift(FAHTE, 16),
    ...shift(CEMBER, 36),
    ...shift(DEVRI_KEBIR, 60),
    ...shift(BERAFSAN, 88),
  ], [
    // velvele de bilesen velvelelerinden kurulur (darp ile ayni offsetler)
    ...DUYEK_VELVELE,
    ...shift(DUYEK_VELVELE, 8),
    ...shift(FAHTE_VELVELE, 16),
    ...shift(CEMBER_VELVELE, 36),
    ...shift(DEVRI_KEBIR_VELVELE, 60),
    ...shift(BEREFSAN_VELVELE, 88),
  ]), // s.234: bes usulun zinciri (16+20+24+28+32 = 120; onceki 88/4 kaydi yanlisti)
  // --- SymbTr ritim-otoriter, darp ONAYLANMAMIS (yapisal) ---
  // usul_extended.json (SymbTr-extras) clustering'inden sure dizisi OTORITER;
  // ancak dum/tek stroke tipi hicbir makine-okunur kaynakta yok (deneysel
  // kanit: sureden turetme duyek/aksaksemai/yuruksemai'de yanlis). 1. dum
  // kesin, kalan tek yapisal; geleneksel nota geldiginde duzeltilecek.
  makeUsul("azeriyuruksemai", "Âzerî Yürüksemâî", "Azeri Yuruksemai", 6, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 1], [5, "tek", 2]]),
  makeUsul("bektasiraksani", "Bektâşî Raksânı", "Bektasi Raksani", 15, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 2], [6, "tek", 2], [8, "tek", 1], [9, "tek", 2], [11, "tek", 2], [13, "tek", 2], [15, "tek", 1]]), // SymbTr düzüm [2,1,2,2,1,2,2,2,1]=15/8; dum/tek Özkan s.704 ile teyit bekliyor
  // Darp: Heper "Türk Musikisinde Usuller ve Kudüm" s.267 (nota) + SymbTr-extras
  // clustering [1,1,1,2,1,1,1]. Iki otoriter kaynak birebir hizali (7 vurus, 8 zaman).
  makeUsul("bulgardarbi", "Bulgar Darbı", "Bulgar Darbi", 8, "8", [[1, "dum", 1], [2, "tek", 1], [3, "dum", 1], [4, "tek", 2], [6, "dum", 1], [7, "tek", 1], [8, "tek", 1]]),
  makeUsul("devriaryan", "Devr-i Âryân", "Devr-i Aryan", 14, "8", [[1, "dum", 4], [5, "tek", 6], [11, "tek", 4]]),
  makeUsul("devrihindiii", "Devr-i Hindî II", "Devr-i Hindi II", 7, "8", [[1, "dum", 3], [4, "tek", 2], [6, "tek", 2]]),
  makeUsul("devrisureyya", "Devr-i Süreyyâ", "Devr-i Sureyya", 10, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 1], [5, "tek", 2], [7, "tek", 2], [9, "tek", 2]]),
  makeUsul("devrituranii", "Devr-i Turan II", "Devr-i Turan II", 14, "16", [[1, "dum", 4], [5, "tek", 4], [9, "tek", 6]]),
  makeUsul("iraksak", "İraksak", "Iraksak", 18, "8", [[1, "dum", 2], [3, "tek", 4], [7, "tek", 2], [9, "tek", 4], [13, "tek", 6]]),
  makeUsul("muasser", "Muasser", "Muasser", 10, "4", [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "tek", 1], [5, "tek", 2], [7, "tek", 2], [9, "tek", 1], [10, "tek", 1]]),
  makeUsul("nazliduyek", "Nazlı Düyek", "Nazli Duyek", 12, "8", [[1, "dum", 1], [2, "tek", 4], [6, "tek", 1], [7, "tek", 3], [10, "tek", 3]]),
  makeUsul("raksaksagiii", "Raks Aksağı II", "Raks Aksagi II", 18, "16", [[1, "dum", 4], [5, "tek", 6], [11, "tek", 4], [15, "tek", 4]]),
  makeUsul("sturkaksagi", "S. Türk Aksağı", "S. Turk Aksagi", 10, "4", [[1, "dum", 4], [5, "tek", 4], [9, "tek", 2]]),
  makeUsul("yuruksemaiii", "Yürüksemâî II", "Yuruksemai II", 6, "8", [[1, "dum", 1], [2, "tek", 2], [4, "tek", 1], [5, "tek", 2]]),
  // .mu2 code-14 duzum'unden (usul_extended clustering'i bos olanlar); ayni yapisal kural.
  makeUsul("dolap", "Dolap", "Dolap", 12, "8", [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "tek", 2], [6, "tek", 1], [7, "tek", 2], [9, "tek", 2], [11, "tek", 2]]),
  makeUsul("gulsen", "Gülşen", "Gulsen", 6, "8", [[1, "dum", 3], [4, "tek", 1], [5, "tek", 1], [6, "tek", 1]]),
  makeUsul("cevher", "Cevher", "Cevher", 10, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 2], [6, "tek", 2], [8, "tek", 1], [9, "tek", 2]]),
  // Darp: Heper "Türk Musikisinde Usuller ve Kudüm" s.269 (nota), 16/8:
  // DÜM DÜM TEK DÜM TEK DÜM TEK / 3 2 2 2 2 3 2. Web arastirmasi (2026-07-16,
  // TDV İslam Ans. + musikoloji makaleleri) dogruladi: "Bektaşi Raksı" 16 zamanli
  // buyuk usuldur; kaynaklar "Raksı"/"Raksanı" isimlerini karistirir; 15-zamanli
  // Raksanı (bektasiraksani, SymbTr [2,1,2,2,1,2,2,2,1]) AYRI bir formdur. 16-zaman
  // darp 16-zaman girise (Raksı) atanir — zaman-tutarli, isim kaviyatindan bagimsiz.
  makeUsul("bektasiraksi", "Bektâşî Raksı", "Bektasi Raksi", 16, "8", [[1, "dum", 3], [4, "dum", 2], [6, "tek", 2], [8, "dum", 2], [10, "tek", 2], [12, "dum", 3], [15, "tek", 2]]),
  makeUsul("bektasiraksievferi", "Bektâşî Raksı Evferi", "Bektasi Raksi Evferi", 16, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 2], [6, "tek", 2], [8, "tek", 2], [10, "tek", 2], [12, "tek", 2], [14, "tek", 1], [15, "tek", 2]]),
  makeUsul("murekkepsofyan", "Mürekkep Sofyan", "Murekkep Sofyan", 12, "8", [[1, "dum", 1], [2, "tek", 2], [4, "tek", 1], [5, "tek", 2], [7, "tek", 2], [9, "tek", 1], [10, "tek", 2], [12, "tek", 1]]),
  makeUsul("turkmen", "Türkmen", "Turkmen", 18, "8", [[1, "dum", 2], [3, "tek", 2], [5, "tek", 2], [7, "tek", 2], [9, "tek", 2], [11, "tek", 2], [13, "tek", 2], [15, "tek", 2], [17, "tek", 2]]),
  makeUsul("kcurcuna", "K. Curcuna", "K. Curcuna", 10, "8", [[1, "dum", 5], [6, "tek", 2], [8, "tek", 3]]),
];

// KAYNAK BEKLEYEN usuller: dum/tek darpi hicbir otoriter kaynakta (Heper/Gonul/
// Ozkan-elde) DOGRULANAMADI. Sure/ritim SymbTr'den bilinir ama darp uydurulamaz,
// bu yuzden UI'da GOSTERILMEZLER (USUL_DATA'dan otomatik cikarilir). Kaynak
// bulununca (or. bektasiraksani -> Ozkan s.704) RE-ADD: (1) yukaridaki makeUsul
// darpini gercek dum/tek ile guncelle, (2) id'yi bu listeden cikar -> otomatik
// USUL_DATA'ya girer, UI'da gorunur. Bkz. docs/BEKLEYEN-USULLER.md.
export const PENDING_USUL_IDS: ReadonlySet<string> = new Set([
  // bulgardarbi + bektasiraksi: Heper s.267/s.269 nota ile dogrulandi, aktif oldu.
  // bektasiraksani: SymbTr düzüm [2,1,2,2,1,2,2,2,1]=15/8 ile dogrulandi, aktif oldu (2026-07-26).
  "azeriyuruksemai", "devriaryan", "devrihindiii",
  "devrisureyya", "devrituranii", "iraksak", "muasser", "nazliduyek", "raksaksagiii",
  "sturkaksagi", "yuruksemaiii", "dolap", "gulsen", "cevher",
  "bektasiraksievferi", "murekkepsofyan", "turkmen", "kcurcuna", "devrisureyyasofyani",
]);

// UI'da gosterilen AKTIF usuller: yalniz darpi kaynak-dogrulanmis olanlar.
export const USUL_DATA: Usul[] = ALL_USULS.filter((usul) => !PENDING_USUL_IDS.has(usul.id));

// Kaynak bekleyen usuller (UI'da YOK) — re-add kurgusu icin kayit. Meta veri
// (zaman/olcu/isim/SymbTr sureleri) korunur; kaynak gelince aktive edilir.
export const PENDING_USULS: Usul[] = ALL_USULS.filter((usul) => PENDING_USUL_IDS.has(usul.id));

export function getUsulById(id: string): Usul | undefined {
  return USUL_DATA.find((usul) => usul.id === id);
}

/**
 * Ritmleri önce ölçü (beats/unit) sonra alfabetik gruplar.
 * Ölçü sıralaması: önce beats küçükten büyüğe, eşitse unit küçükten büyüğe (4 < 8 < 16).
 * Grup içi alfabetik: Türkçe localeCompare.
 */
export function getGroupedUsulItems(): Array<{label: string; items: Array<{key: string; label: string}>}> {
  const sorted = [...USUL_DATA].sort((a, b) => {
    if (a.beats !== b.beats) return a.beats - b.beats;
    const unitA = parseInt(a.unit) || 0;
    const unitB = parseInt(b.unit) || 0;
    if (unitA !== unitB) return unitA - unitB;
    return a.name.localeCompare(b.name, "tr");
  });

  const groups = new Map<string, Array<{key: string; label: string}>>();
  for (const usul of sorted) {
    const label = `${usul.beats}/${usul.unit}`;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push({key: usul.id, label: `${usul.name} — ${usul.beats}/${usul.unit}`});
  }

  // Grupları da ölçüye göre sırala (aynı kural)
  return Array.from(groups.entries())
    .sort((a, b) => {
      const [beatsA, unitA] = a[0].split("/").map((n) => parseInt(n) || 0);
      const [beatsB, unitB] = b[0].split("/").map((n) => parseInt(n) || 0);
      if (beatsA !== beatsB) return beatsA - beatsB;
      return unitA - unitB;
    })
    .map(([label, items]) => ({label, items}));
}

export function getUsulItemsSorted(): Array<{key: string; label: string}> {
  return [...USUL_DATA]
    .sort((a, b) => {
      if (a.beats !== b.beats) return a.beats - b.beats;
      const unitA = parseInt(a.unit) || 0;
      const unitB = parseInt(b.unit) || 0;
      if (unitA !== unitB) return unitA - unitB;
      return a.name.localeCompare(b.name, "tr");
    })
    .map((usul) => ({key: usul.id, label: `${usul.name} — ${usul.beats}/${usul.unit}`}));
}
