import {DU, ME, shift, type Stroke} from "@/engines/usul/data/core";

// Paylasilan cekirdek desenler (mertebeler ve birlesik usuller bunlardan kurulur).
export const DUYEK: Stroke[] = [[1, "dum", 1], [2, "tek", 2], [4, "tek", 1], [5, "dum", 2], [7, "tek", 2]]; // s.40
export const CIFTE_DUYEK: Stroke[] = [...DUYEK, ...shift(DUYEK, 8)]; // s.109: iki duyek ardarda
export const AKSAK: Stroke[] = [[1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2], [7, "tek", 2], [9, "tek", 1]]; // s.47
export const AKSAK_SEMAI: Stroke[] = [[1, "dum", 2], [3, "te", 1], [4, "ka", 2], [6, "dum", 2], [8, "tek", 2], [10, "tek", 1]]; // s.67
export const YURUK_SEMAI: Stroke[] = [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 1], [5, "tek", 2]]; // s.25
export const EVFER: Stroke[] = [
  [1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2], [7, "tek", 1], [8, "tek", 2],
]; // s.53: aksaktan farki son iki tek'in deger degisimi
export const MUSEMMEN: Stroke[] = [[1, "dum", 3], [4, "tek", 2], [6, "tek", 3]]; // s.44 (3+2+3 = Düüüm Teek Teeek)
export const FAHTE: Stroke[] = [
  [1, "dum", 2], [3, "dum", 1], [4, "dum", 1], [5, "tek", 2], [7, "tek", 2],
  [9, "tek", 2], [11, "dum", 2], [13, "ta", 2], [15, "hek", 2],
  [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1],
]; // s.139 (1. sekil)
export const CEMBER: Stroke[] = [
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "dum", 1], [8, "dum", 1],
  [9, "tek", 2], [11, "tek", 2], [13, "tek", 2], [15, "dum", 2],
  [17, "ta", 2], [19, "hek", 2], [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // s.157
export const DEVRI_KEBIR: Stroke[] = [
  [1, "dum", 2], [3, "dum", 2], [5, "tek", 2], [7, "dum", 1], [8, "tek", 1],
  [9, "te", 0.5], [9.5, "ke", 0.5], [10, "dum", 1], [11, "tek", 2], [13, "tek", 2],
  [15, "tek", 2], [17, "dum", 2], [19, "dum", 2], [21, "ta", 2], [23, "hek", 2],
  [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // s.181 (1. sekil)
export const BERAFSAN: Stroke[] = [
  [1, "dum", 4], [5, "tek", 2], [7, "dum", 4], [11, "tek", 2], [13, "dum", 4],
  [17, "dum", 2], [19, "tek", 2], [21, "dum", 2], [23, "dum", 2],
  [25, "ta", 2], [27, "hek", 2], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // s.208
export const MUHAMMES: Stroke[] = [
  // 8+8+8+8 (Kâr, Beste ve Pesrevlerde)
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 2],
  [9, "dum", 2], [11, "dum", 2], [13, "tek", 2], [15, "tek", 1], [16, "ka", 1],
  [17, "dum", 2], [19, "tek", 2], [21, "tek", 1], [22, "ka", 1], [23, "dum", 2],
  [25, "ta", 2], [27, "hek", 2], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.110
export const DEVRI_REVAN: Stroke[] = [
  // 3+4+3+4 (14/8, Mevlevi): Düüüm Düüm Teek | Düüüm Teek Teek
  [1, "dum", 3], [4, "dum", 2], [6, "tek", 2], [8, "dum", 3], [11, "tek", 2], [13, "tek", 2],
]; // s.101 (Kudum) + Gonul s.104
export const DARBITURKI: Stroke[] = [
  // 6+4+4+4 (Gonul s.105): Teek Tek Kâ Tek Kâ | Düüm Düüm | Teek Tek Kâ | Düüm Düm Düm
  [1, "tek", 2], [3, "tek", 1], [4, "ka", 1], [5, "tek", 1], [6, "ka", 1],
  [7, "dum", 2], [9, "dum", 2], [11, "tek", 2], [13, "tek", 1], [14, "ka", 1],
  [15, "dum", 2], [17, "dum", 1], [18, "dum", 1],
]; // Gonul s.105
export const NIM_DEVIR: Stroke[] = [
  // 6+4+4+4 (18/4): Düüm Düüm Teek | Düüm Düüm | Tââ Heek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 2], [5, "tek", 2], [7, "dum", 2], [9, "dum", 2],
  [11, "ta", 2], [13, "hek", 2], [15, "tek", 1], [16, "ka", 1], [17, "tek", 1], [18, "ka", 1],
]; // Gonul s.106
// Cifte Duyek (16/4) — Gonul darp'i "iki duyek ardarda"dan (CIFTE_DUYEK, zincir
// bileseni) FARKLI okunur; yeni usul icin Gonul s.105 dizgisi kullanilir.
export const CIFTE_DUYEK_16: Stroke[] = [
  // 8+8 (Gonul s.105): Düüm Teeeek(bagli 4) Teek | Düüm Düüm Teek Tek Kâ
  [1, "dum", 2], [3, "tek", 4], [7, "tek", 2], [9, "dum", 2], [11, "dum", 2], [13, "tek", 2], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.105
export const FERI_MUHAMMES: Stroke[] = [
  // 4+4+4+4 (16/4): Düüm Tek Kâ | Düüm Teek | Düm Tek dü me Düm | Tâ Hek te ke te ke
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 2],
  [9, "dum", 1], [10, "tek", 1], DU(11), ME(11.5), [12, "dum", 1],
  [13, "ta", 1], [14, "hek", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "te", 0.5], [16.5, "ke", 0.5],
]; // Gonul s.104
export const NIM_EVSAT: Stroke[] = [
  // 5+4+4 (13/8, birim sekizlik): Tek Kâ Tek Kââ | Düüüüm | Düüüüm
  [1, "tek", 1], [2, "ka", 1], [3, "tek", 1], [4, "ka", 2], [6, "dum", 4], [10, "dum", 4],
]; // Gonul s.104
export const SARKI_DEVRI_REVAN: Stroke[] = [
  // 3+4+4+2 (13/8): Düm Tek Kâ | Düüm Teek | Düüm Teek | Tek Kâ
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1], [4, "dum", 2], [6, "tek", 2],
  [8, "dum", 2], [10, "tek", 2], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
export const BEKTASI_DEVRI_REVAN: Stroke[] = [
  // 4+5+4 (13/8): Düüm Tek Kâ | Düüm Teek Tek | Düüm Tek Kâ
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 2], [9, "tek", 1],
  [10, "dum", 2], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
export const TEK_VURUS: Stroke[] = [
  // 5+6 (11/8): Düüm Teek Tek | Düüm Teek Teek
  [1, "dum", 2], [3, "tek", 2], [5, "tek", 1], [6, "dum", 2], [8, "tek", 2], [10, "tek", 2],
]; // Gonul s.103
export const IKIZ_AKSAK: Stroke[] = [
  // 7+5 (12/8): Düm Tek Tek Düüm Teek | Düüm Teek Tek
  [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2],
  [8, "dum", 2], [10, "tek", 2], [12, "tek", 1],
]; // Gonul s.103
export const CENGI_HARBI: Stroke[] = [
  // 2+2+3+3 (10/4): Düm Tek | Düm Tek | Düm Tek Tek | Düm Tek Tek
  [1, "dum", 1], [2, "tek", 1], [3, "dum", 1], [4, "tek", 1], [5, "dum", 1],
  [6, "tek", 1], [7, "tek", 1], [8, "dum", 1], [9, "tek", 1], [10, "tek", 1],
]; // Gonul s.103 (velvelesiz — mehter usulu)
export const NIM_SAKIL: Stroke[] = [
  // 4+6+6+4+4 (24/4, Ver.1): Düüm Tek Kâ | Düüm Tek Kâ Tek Kâ | Düüm Tek Kâ te ke Düm | Taa Heek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
  [11, "dum", 2], [13, "tek", 1], [14, "ka", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "dum", 1],
  [17, "ta", 2], [19, "hek", 2], [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // Gonul s.107 (Ver.1)
export const EVSAT: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): Tek Kâ Tek Kââ | Düüm Teek | Düüm Düüm | Teek Tek Kââ | Düüüüm | Düüüüm
  [1, "tek", 1], [2, "ka", 1], [3, "tek", 1], [4, "ka", 2], [6, "dum", 2], [8, "tek", 2],
  [10, "dum", 2], [12, "dum", 2], [14, "tek", 2], [16, "tek", 1], [17, "ka", 2],
  [19, "dum", 4], [23, "dum", 4],
]; // Gonul s.107
export const BESTE_DEVRI_REVAN: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): Düüüüüm(5) Düüüüm(4) Teeeek(4) Düüüüüm(5) Teeeek(4) Teeeek(4)
  [1, "dum", 5], [6, "dum", 4], [10, "tek", 4], [14, "dum", 5], [19, "tek", 4], [23, "tek", 4],
]; // Gonul s.108
export const REMEL: Stroke[] = [
  // 4+6+4+6+2+4+2 (28/4): Düüm Tek Kâ | Düüm Tek Kâ Tek Kâ | Düüm Tek Kâ | Düüm Düüm Teek | Dü Me | Düm Düm Teek | Tek Kâ
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
  [11, "dum", 2], [13, "tek", 1], [14, "ka", 1], [15, "dum", 2], [17, "dum", 2], [19, "tek", 2],
  DU(21, 1), ME(22, 1), [23, "dum", 1], [24, "dum", 1], [25, "tek", 2], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
export const FRENGIFER: Stroke[] = [
  // 6+6+4+4+4+4 (28/4): Düm Düüüüm | Düüm Düüüüm | Düüm Teek | Düüm Düüm | Taa Heek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 4], [7, "dum", 2], [9, "dum", 4], [13, "dum", 2], [15, "tek", 2],
  [17, "dum", 2], [19, "dum", 2], [21, "ta", 2], [23, "hek", 2], [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
export const HEZEC: Stroke[] = [
  // 6+4+4+4+4 (22/4): Düüm Düm Düm Teek | Düm Düm Teek | Düüm Teek | Düüm Teek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 1], [4, "dum", 1], [5, "tek", 2], [7, "dum", 1], [8, "dum", 1], [9, "tek", 2],
  [11, "dum", 2], [13, "tek", 2], [15, "dum", 2], [17, "tek", 2], [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
]; // Gonul s.106
