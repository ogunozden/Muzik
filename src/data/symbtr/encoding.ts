/**
 * SymbTr `mu2` METIN KODLAMASI (PLAN.md §3/G2).
 *
 * `mu2` dosyalari **Windows-1254 (Turkce)** ile yazilmis. `latin1` olarak
 * okundugunda Turkce harfler bozuluyor ve makam/usul/beste adlari kullanilamaz
 * hale geliyor:
 *
 *   ham bayt  41 F0 FD 72 61 6B 73 61 6B
 *   latin1 →  "Aðýraksak"      (bozuk)
 *   cp1254 →  "Ağıraksak"      (dogru)
 *
 * Node'da yerlesik cp1254 cozucusu yok. cp1254, cp1252'den **yalniz alti kod
 * noktasinda** ayrilir (0xD0 0xDD 0xDE 0xF0 0xFD 0xFE); cp1252 de latin1'den
 * yalniz 0x80–0x9F araliginda ayrilir. Ikisini birlikte tablolamak yeterli ve
 * tam dogru.
 */

/** cp1252'nin latin1'den ayrildigi 0x80–0x9F blogu. `null` = tanimsiz. */
const CP1252_HIGH_CONTROL: readonly (string | null)[] = [
  "€", null, "‚", "ƒ", "„", "…", "†", "‡",
  "ˆ", "‰", "Š", "‹", "Œ", null, "Ž", null,
  null, "‘", "’", "“", "”", "•", "–", "—",
  "˜", "™", "š", "›", "œ", null, "ž", "Ÿ",
];

/** cp1254'un cp1252'den ayrildigi alti nokta — Turkce harfler. */
const CP1254_TURKISH: Readonly<Record<number, string>> = {
  0xd0: "Ğ", // Ğ
  0xdd: "İ", // İ
  0xde: "Ş", // Ş
  0xf0: "ğ", // ğ
  0xfd: "ı", // ı
  0xfe: "ş", // ş
};

/**
 * Windows-1254 baytlarini metne cevirir.
 *
 * Girdi bir `Uint8Array` ya da `latin1` olarak okunmus bir dize olabilir;
 * ikisi de ayni sonucu verir (latin1'de her karakter = bir bayt).
 */
export function decodeWindows1254(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string"
      ? Uint8Array.from(input, (character) => character.charCodeAt(0) & 0xff)
      : input;

  let result = "";
  for (const byte of bytes) {
    const turkish = CP1254_TURKISH[byte];
    if (turkish !== undefined) {
      result += turkish;
      continue;
    }
    if (byte >= 0x80 && byte <= 0x9f) {
      result += CP1252_HIGH_CONTROL[byte - 0x80] ?? "�";
      continue;
    }
    result += String.fromCharCode(byte);
  }
  return result;
}
