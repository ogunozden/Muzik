import {DU, ME, type Stroke} from "@/engines/usul/data/core";

// Velveleler (ayni sayfalardaki VELVELESI satirlari). Yalniz sekli net
// okunanlar aktarildi; kalanlar icin bkz. TODO "velvele 2. asama".
export const YURUK_SEMAI_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1], DU(4), ME(4.5), [5, "tek", 0.5], [5.5, "ka", 1.5],
]; // s.25
export const DUYEK_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "hek", 1], [8, "te", 0.5], [8.5, "ke", 0.5],
]; // s.40
export const AKSAK_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "hek", 1], [8, "tek", 2],
]; // s.47
export const EVFER_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "hek", 1], [8, "hek", 2],
]; // s.53
export const MUSEMMEN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1],
  DU(6), ME(6.5), [7, "tek", 0.5], [7.5, "ka", 1.5],
]; // s.44-45
export const DEVRI_HINDI_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1], [6, "tek", 1], [7, "ka", 1],
]; // s.34
export const DEVRI_TURAN_VELVELE: Stroke[] = [
  DU(1), ME(1.5), DU(2), ME(2.5), [3, "dum", 2], [5, "tek", 2], [7, "tek", 1],
]; // s.37
// Aksak Semâî velvelesi: DÜM TE KE TEK KÂ TE KE DÜ ME DÜM TEEK TEK. Kaynak:
// Gönül "Türk Mûsikîsi Usûlleri" s.102 (temiz tipografik; Kudüm kitabi s.67
// capraz-referans). Curcuna ayni desendedir (ayni darp). F11.7.
export const AKSAK_SEMAI_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 0.5], [3.5, "ka", 0.5],
  [4, "te", 0.5], [4.5, "ke", 0.5], DU(5, 0.5), ME(5.5, 0.5), [6, "dum", 2], [8, "tek", 2], [10, "tek", 1],
]; // Gonul s.102
// Oynak velvelesi (3+6): DÜM TEK TEK DÜM TE KE TEK KÂ TEK KÂ. Gonul s.102.
export const OYNAK_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "tek", 1], [7, "ka", 1], [8, "tek", 1], [9, "ka", 1],
]; // Gonul s.102
// Nim Çember velvelesi (4+6+2): DÜM TE KE TEK KÂ DÜM DÜM TEK TE KE TEK KÂ TEK KÂ.
export const NIM_CEMBER_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "dum", 1],
  [6, "dum", 1], [7, "tek", 1], [8, "te", 0.5], [8.5, "ke", 0.5], [9, "tek", 1], [10, "ka", 1], [11, "tek", 1], [12, "ka", 1],
]; // Gonul s.103
// Frenkçin velvelesi: DÜM DÜÜM DÜ ME DÜ ME DÜM TE KE TEK KÂ TEK KÂ.
export const FRENKCIN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "dum", 2], DU(4), ME(4.5), DU(5), ME(5.5), [6, "dum", 1],
  [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1], [10, "tek", 1], [11, "ka", 2],
]; // Gonul s.103
// Raksan velvelesi (Raksan 2, 5+5+5): uc esit grup (DÜM TE KE TEK KÂ TE KE).
export const RAKSAN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1], [10, "te", 0.5], [10.5, "ke", 0.5],
  [11, "dum", 1], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], [15, "te", 0.5], [15.5, "ke", 0.5],
]; // Gonul s.104
// Lenk Fahte velvelesi (6+4): DÜM DÜM TE KE TEK KÂ DÜ ME TEK KÂ TEK KÂ.
// Darp-capali: DÜÜM->DÜM DÜM, TEEEK->TE KE TEK KÂ, DÜM->DÜ ME, kalan TEK KÂ.
export const LENK_FAHTE_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1],
  DU(6), ME(6.5), [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
]; // Gonul s.102
// Nim Hafif velvelesi (4+4+4+4): darp-capali 4 grup.
// DÜM TE KE TEK KÂ | DÜM TE KE TEK KÂ | DÜ ME DÜ ME TE KE TE KE | TEK KÂ DÜM TE KE TEK KÂ
export const NIM_HAFIF_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "dum", 1], [6, "te", 0.5], [6.5, "ke", 0.5], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "te", 0.5], [11.5, "ke", 0.5], [12, "te", 0.5], [12.5, "ke", 0.5],
  [13, "tek", 0.5], [13.5, "ka", 0.5], [14, "dum", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "tek", 0.5], [16.5, "ka", 0.5],
]; // Gonul s.107
// Nim Berefşan velvelesi: DÜM TEK KÂ | DÜM TE KE TEK KÂ TE KE | DÜM TE KE |
// DÜ ME DÜ ME | TE KE TE KE TEK KÂ. Darp DÜM'lerine hizali (Gonul s.107).
export const NIM_BERAFSAN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1],
  [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5], [6, "tek", 1], [7, "ka", 1], [8, "te", 0.5], [8.5, "ke", 0.5],
  [9, "dum", 1], [10, "te", 0.5], [10.5, "ke", 0.5], DU(11), ME(11.5), DU(12), ME(12.5),
  [13, "te", 0.5], [13.5, "ke", 0.5], [14, "te", 0.5], [14.5, "ke", 0.5], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.107
// Fahte velvelesi (4+6+6+4): darp-capali. DÜM DÜ ME DÜM DÜM | TEK TE KE TEK KÂ
// TEK KÂ | DÜ ME DÜM TEK DÜ ME TE KE TEK KÂ | TEK KÂ TEK KÂ (Gonul s.105).
export const FAHTE_VELVELE: Stroke[] = [
  [1, "dum", 1], DU(2), ME(2.5), [3, "dum", 1], [4, "dum", 1],
  [5, "tek", 1], [6, "te", 0.5], [6.5, "ke", 0.5], [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
  DU(11), ME(11.5), [12, "dum", 1], [13, "tek", 1], DU(14), ME(14.5), [15, "te", 0.5], [15.5, "ke", 0.5], [16, "tek", 0.5], [16.5, "ka", 0.5],
  [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1],
]; // Gonul s.105
// Çember velvelesi (4+4+6+6+4 = 4+Fahte): darp-capali. DÜM TE KE TEK KÂ |
// DÜM DÜ ME DÜM DÜM | TEK TE KE TEK KÂ TEK KÂ | DÜ ME DÜM TEK TE KE TEK KÂ |
// TEK KÂ TEK KÂ (Gonul s.106).
export const CEMBER_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "dum", 1], DU(6), ME(6.5), [7, "dum", 1], [8, "dum", 1],
  [9, "tek", 1], [10, "te", 0.5], [10.5, "ke", 0.5], [11, "tek", 1], [12, "ka", 1], [13, "tek", 1], [14, "ka", 1],
  DU(15), ME(15.5), [16, "dum", 1], [17, "tek", 1], [18, "te", 0.5], [18.5, "ke", 0.5], [19, "tek", 1], [20, "ka", 1],
  [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // Gonul s.106
// Devr-i Kebîr velvelesi (6+4+4+6+4+4): darp-capali, Gonul s.108.
export const DEVRI_KEBIR_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], DU(3), ME(3.5), [4, "dum", 1], [5, "tek", 1], [6, "te", 0.5], [6.5, "ke", 0.5],
  [7, "dum", 1], [8, "tek", 1], [9, "te", 0.5], [9.5, "ke", 0.5], [10, "dum", 1],
  [11, "tek", 2], [13, "tek", 2],
  [15, "hek", 1], [16, "tek", 2], [18, "hek", 1], [19, "te", 0.5], [19.5, "ke", 0.5], [20, "tek", 0.5], [20.5, "ka", 0.5],
  DU(21), ME(21.5), DU(22), ME(22.5), [23, "te", 0.5], [23.5, "ke", 0.5], [24, "te", 0.5], [24.5, "ke", 0.5],
  DU(25), ME(25.5), DU(26), ME(26.5), [27, "tek", 0.5], [27.5, "ka", 0.5], [28, "tek", 0.5], [28.5, "ka", 0.5],
]; // Gonul s.108
// Hafif velvelesi (4+4+4+4+4+4+4+4, 32/4): 8 grup, darp-capali. Gonul s.109.
// DÜM TE KE TEK KÂ | DÜM TE KE TEK KÂ | DÜ ME DÜ ME TEK KÂ | DÜM TE KE TEK KÂ |
// DÜ ME DÜ ME TEK KÂ | DÜM TE KE TEK KÂ | HEK TE KE TEK KÂ | TEK KÂ TEK KÂ
export const HAFIF_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "dum", 1], [6, "te", 0.5], [6.5, "ke", 0.5], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "tek", 1], [12, "ka", 1],
  [13, "dum", 1], [14, "te", 0.5], [14.5, "ke", 0.5], [15, "tek", 1], [16, "ka", 1],
  DU(17), ME(17.5), DU(18), ME(18.5), [19, "tek", 1], [20, "ka", 1],
  [21, "dum", 1], [22, "te", 0.5], [22.5, "ke", 0.5], [23, "tek", 1], [24, "ka", 1],
  [25, "hek", 1], [26, "te", 0.5], [26.5, "ke", 0.5], [27, "tek", 1], [28, "ka", 1],
  [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.109
export const BEREFSAN_VELVELE: Stroke[] = [
  // 1. satir (16): Düüm Düüm Teek | te ke te ke | tek kâ tek kâ | Dü Me | dü me dü me
  [1, "dum", 2, "Düüm"], [3, "dum", 2, "Düüm"], [5, "tek", 2, "Teek"],
  [7, "te", 0.5], [7.5, "ke", 0.5], [8, "te", 0.5], [8.5, "ke", 0.5],
  [9, "tek", 1], [10, "ka", 1], [11, "tek", 1], [12, "ka", 1],
  DU(13, 1), ME(14, 1), DU(15), ME(15.5), DU(16), ME(16.5),
  // 2. satir (16): te ke te ke | tek kâ tek kâ | Heek Hek | te ke | tek kâ tek kâ tek kâ
  [17, "te", 0.5], [17.5, "ke", 0.5], [18, "te", 0.5], [18.5, "ke", 0.5],
  [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
  [23, "hek", 2, "Heek"], [25, "hek", 1, "Hek"], [26, "te", 0.5], [26.5, "ke", 0.5],
  [27, "tek", 1], [28, "ka", 1], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.110
export const MUHAMMES_VELVELE: Stroke[] = [
  // 1. satir (16): Düm Düm Tek | te ke | tek kâ tek kâ | Dü Me | dü me dü me | tek kâ tek kâ
  [1, "dum", 1, "Düm"], [2, "dum", 1, "Düm"], [3, "tek", 1],
  [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1], [7, "tek", 1], [8, "ka", 1],
  DU(9, 1), ME(10, 1), DU(11), ME(11.5), DU(12), ME(12.5),
  [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1],
  // 2. satir (16): Heek Heek Hek | te ke | tek kâ | dü me dü me | te ke te ke | tek kâ tek kâ
  [17, "hek", 2, "Heek"], [19, "hek", 2, "Heek"], [21, "hek", 1, "Hek"],
  [22, "te", 0.5], [22.5, "ke", 0.5], [23, "tek", 1], [24, "ka", 1],
  DU(25), ME(25.5), DU(26), ME(26.5),
  [27, "te", 0.5], [27.5, "ke", 0.5], [28, "te", 0.5], [28.5, "ke", 0.5],
  [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.110
export const DEVRI_REVAN_VELVELE: Stroke[] = [
  // 3+4+3+4 (14/8, birim sekizlik): Düm Tek Kâ | Dü Me Tek Kâ | dü me Dü Me | Tek Kâ Tek Kâ
  [1, "dum", 1, "Düm"], [2, "tek", 1], [3, "ka", 1],
  DU(4, 1), ME(5, 1), [6, "tek", 1], [7, "ka", 1],
  DU(8), ME(8.5), DU(9, 1), ME(10, 1),
  [11, "tek", 1], [12, "ka", 1], [13, "tek", 1], [14, "ka", 1],
]; // Gonul s.104
export const TURKI_DARB_VELVELE: Stroke[] = [
  // 6+4+4+4 (18/4): Tek te ke Tek Kâ Tek Kâ | Düm dü me Düm te ke | Düm te ke Tek Kâ | Düm dü me Düm Düm
  [1, "tek", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "tek", 1], [6, "ka", 1],
  [7, "dum", 1], DU(8), ME(8.5), [9, "dum", 1], [10, "te", 0.5], [10.5, "ke", 0.5],
  [11, "dum", 1], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1],
  [15, "dum", 1], DU(16), ME(16.5), [17, "dum", 1], [18, "dum", 1],
]; // Gonul s.106
export const NIM_DEVIR_VELVELE: Stroke[] = [
  // 18/4: Düm te ke Düm Tâ Hek | te ke Dü Me Düm Tâ Hek | te ke Tek Kâ Tek Kâ Tek Kâ
  [1, "dum", 1, "Düm"], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "dum", 1, "Düm"], [4, "ta", 1], [5, "hek", 1],
  [6, "te", 0.5], [6.5, "ke", 0.5], DU(7, 1), ME(8, 1), [9, "dum", 1, "Düm"], [10, "ta", 1], [11, "hek", 1],
  [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1], [17, "tek", 1], [18, "ka", 1],
]; // Gonul s.106
export const CIFTE_DUYEK_VELVELE: Stroke[] = [
  // 16/4 (Velvele-1): Düm te ke Tek Kâ | te ke Tek Kâ | te ke Dü Me dü me | Düm Tek te ke Tek Kâ
  [1, "dum", 1, "Düm"], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "te", 0.5], [5.5, "ke", 0.5], [6, "tek", 1], [7, "ka", 1],
  [8, "te", 0.5], [8.5, "ke", 0.5], DU(9, 1), ME(10, 1), DU(11), ME(11.5),
  [12, "dum", 1, "Düm"], [13, "tek", 1], [14, "te", 0.5], [14.5, "ke", 0.5], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.105 (Velvele-1)
export const FERI_MUHAMMES_VELVELE: Stroke[] = [
  // 16/4: Düm Düm Tek te ke | Tek Kâ Tek Kâ | dü me dü me te ke te ke | Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "tek", 1], [4, "te", 0.5], [4.5, "ke", 0.5],
  [5, "tek", 1], [6, "ka", 1], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "te", 0.5], [11.5, "ke", 0.5], [12, "te", 0.5], [12.5, "ke", 0.5],
  [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.104
export const NIM_EVSAT_VELVELE: Stroke[] = [
  // 5+4+4 (13/8): Tek Kâ Tek Kâ te ke | Düm te ke Tek Kâ | dü me Düm Tek te ke
  [1, "tek", 1], [2, "ka", 1], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1],
  DU(10), ME(10.5), [11, "dum", 1], [12, "tek", 1], [13, "te", 0.5], [13.5, "ke", 0.5],
]; // Gonul s.104
export const SARKI_DEVRI_REVAN_VELVELE: Stroke[] = [
  // 3+4+4+2 (13/8): Düm Tek Kâ | Düm te ke Tek Kâ | dü me Düm Teek | Tek Kâ
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1], [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "tek", 1], [7, "ka", 1], DU(8), ME(8.5), [9, "dum", 1], [10, "tek", 2], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
export const BEKTASI_DEVRI_REVAN_VELVELE: Stroke[] = [
  // 4+5+4 (13/8): Düm te ke Tek Kâ | dü me Düm Teek | te ke Düm te ke Tek Kâ
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "tek", 2], [9, "te", 0.5], [9.5, "ke", 0.5],
  [10, "dum", 1], [11, "te", 0.5], [11.5, "ke", 0.5], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
export const TEK_VURUS_VELVELE: Stroke[] = [
  // 5+6 (11/8): Düm te ke Tek Kâ te ke | Düm te ke Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1], [10, "tek", 1], [11, "ka", 1],
]; // Gonul s.103
export const IKIZ_AKSAK_VELVELE: Stroke[] = [
  // 7+5 (12/8): Düm Tek Tek Düm te ke Tek Kâ | dü me Düm Teek Tek
  [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5], [6, "tek", 1], [7, "ka", 1],
  DU(8), ME(8.5), [9, "dum", 1], [10, "tek", 2], [12, "tek", 1],
]; // Gonul s.103
export const NIM_SAKIL_VELVELE: Stroke[] = [
  // 4+6+6+4+4 (24/4, Velvele 1): darp gruplarina dosum
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "tek", 1], [8, "te", 0.5], [8.5, "ke", 0.5], [9, "tek", 1], [10, "ka", 1],
  [11, "dum", 1], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], DU(15), ME(15.5), [16, "dum", 1],
  [17, "tek", 1], [18, "te", 0.5], [18.5, "ke", 0.5], [19, "tek", 1], [20, "ka", 1],
  [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // Gonul s.107 (Velvele 1)
export const EVSAT_VELVELE: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): Düm Düm te ke Tek Kâ | dü me dü me te ke te ke | Tek Kâ Tek Kâ |
  //                     Tek Kâ dü me dü me dü me | Tek Kâ Tek Kâ | Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1],
  DU(6), ME(6.5), DU(7), ME(7.5), [8, "te", 0.5], [8.5, "ke", 0.5], [9, "te", 0.5], [9.5, "ke", 0.5],
  [10, "tek", 1], [11, "ka", 1], [12, "tek", 1], [13, "ka", 1],
  [14, "tek", 1], [15, "ka", 1], DU(16), ME(16.5), DU(17), ME(17.5), DU(18), ME(18.5),
  [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
  [23, "tek", 1], [24, "ka", 1], [25, "tek", 1], [26, "ka", 1],
]; // Gonul s.107
export const BESTE_DEVRI_REVAN_VELVELE: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): her grup Düm/Hek te ke Tek Kâ (+te ke) dolgusu; G3/G6 Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1],
  [10, "tek", 1], [11, "ka", 1], [12, "tek", 1], [13, "ka", 1],
  [14, "dum", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "tek", 1], [17, "ka", 1], [18, "te", 0.5], [18.5, "ke", 0.5],
  [19, "hek", 1], [20, "te", 0.5], [20.5, "ke", 0.5], [21, "tek", 1], [22, "ka", 1],
  [23, "tek", 1], [24, "ka", 1], [25, "tek", 1], [26, "ka", 1],
]; // Gonul s.108
export const REMEL_VELVELE: Stroke[] = [
  // 28/4: Düm Düm te ke te ke Tek Kâ Tek Kâ | dü me dü me te ke te ke Tek Kâ Tek Kâ | Heek Heek Hek te ke Tek Kâ Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "te", 0.5], [11.5, "ke", 0.5], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1],
  [17, "hek", 2], [19, "hek", 2], [21, "hek", 1], [22, "te", 0.5], [22.5, "ke", 0.5], [23, "tek", 1], [24, "ka", 1], [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
export const FRENGIFER_VELVELE: Stroke[] = [
  // 6+6+4+4+4+4 (28/4): G1/G2 Düüm Düm te ke Tek Kâ; G3+G4 ve G5+G6 = Dü Me dü me dü me Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 1], [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1],
  [7, "dum", 2], [9, "dum", 1], [10, "te", 0.5], [10.5, "ke", 0.5], [11, "tek", 1], [12, "ka", 1],
  DU(13, 1), ME(14, 1), DU(15), ME(15.5), DU(16), ME(16.5), [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1],
  DU(21, 1), ME(22, 1), DU(23), ME(23.5), DU(24), ME(24.5), [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
export const HEZEC_VELVELE: Stroke[] = [
  // 6+4+4+4+4 (22/4): Düm Düm te ke te ke Tek Kâ | dü me dü me te ke te ke | Tek Kâ te ke | Tek Kâ te ke | Tek Kâ Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1],
  DU(7), ME(7.5), DU(8), ME(8.5), [9, "te", 0.5], [9.5, "ke", 0.5], [10, "te", 0.5], [10.5, "ke", 0.5],
  [11, "tek", 1], [12, "ka", 1], [13, "te", 0.5], [13.5, "ke", 0.5], [14, "tek", 1], [15, "ka", 1], [16, "te", 0.5], [16.5, "ke", 0.5],
  [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
]; // Gonul s.106
