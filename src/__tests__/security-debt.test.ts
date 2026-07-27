import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

/**
 * DEV GUVENLIK BORCU IZLENEBILIR OLSUN (PLAN.md §10/F4)
 *
 * `docs/SECURITY-AUDIT.md` bir borcu belgeliyor: 9 yuksek bulgu, hepsi tek
 * kokten — `brace-expansion` ReDoS'u, `minimatch@3` uzerinden `eslint-*`
 * paketlerine bagli. Bugun yamalanamiyor: tek yamali surum (`5.0.8`) ESM-only
 * default export'a gectigi icin `minimatch@3`un `require()` beklentisini
 * kiriyor; ESLint 10 yukseltmesi de `eslint-plugin-react` yuzunden patliyor.
 *
 * Belge yazip beklemek izleme degildir — kimse geri donup bakmaz. Bu test
 * borcu OLCER ve durum degistiginde kirilir.
 *
 * ── NEDEN `npm audit` CAGIRMIYOR ────────────────────────────────────────
 * `npm audit` ag ister; CI'da yavas ve kirilgan olur, uzaktaki advisory
 * veritabani degistiginde testin sonucu bizim degisikligimiz olmadan doner.
 * Bunun yerine borcun KOKU kilit dosyasindan okunur: cevrimdisi, deterministik
 * ve dogrudan belgede yazan sebebe bagli.
 *
 * ── BU TEST NE ZAMAN KIRILIR ────────────────────────────────────────────
 * 1. Borc AZALIRSA (eslint zinciri `minimatch@3`ten kurtulursa) — sevinilecek
 *    durum; belge guncellenmeli ve bu test kaldirilmali/daraltilmali.
 * 2. Borc BUYURSE (acik surum uretim agacina sizarsa) — bu gercek bir
 *    regresyondur ve derhal durdurulmali.
 */

interface LockEntry {
  readonly version?: string;
  readonly dev?: boolean;
}

const lockfile = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8"),
) as {packages: Record<string, LockEntry>};

/** Advisory araligi: `<=5.0.7`. 1.x ve 2.x tumuyle bu araligin icinde. */
function isVulnerable(version: string): boolean {
  const [major, minor, patch] = version.split(".").map(Number);
  if (major > 5) return false;
  if (major < 5) return true;
  return minor === 0 && patch <= 7;
}

const braceExpansionEntries = Object.entries(lockfile.packages)
  .filter(([specifier]) => specifier.endsWith("node_modules/brace-expansion"))
  .map(([specifier, entry]) => ({
    specifier,
    version: entry.version ?? "0.0.0",
    isDevOnly: entry.dev === true,
  }));

describe("Güvenlik borcu — brace-expansion ReDoS (F4)", () => {
  it("borcun kokleri hala kilit dosyasinda duruyor", () => {
    // Bu iddia BUGUN dogru. Yarin yanlis olursa test kirilir ve
    // `docs/SECURITY-AUDIT.md` guncellenmesi gerektigini soyler.
    const vulnerable = braceExpansionEntries.filter((entry) => isVulnerable(entry.version));

    expect(vulnerable.length).toBeGreaterThan(0);
    // Belgede yazan sebep: dordu de `eslint` zincirinden geliyor.
    for (const entry of vulnerable) {
      expect(entry.specifier).toMatch(/eslint/);
    }
  });

  it("acik surumlerin HEPSI yalniz gelistirme agacinda", () => {
    // Asil kapi bu. `audit:security` (`--omit=dev`) zaten CI'yi bloke ediyor;
    // burada ayni sinir kilit dosyasi duzeyinde de sabitleniyor, boylece
    // uretim agacina sizma sessizce olamaz.
    const leakedToProduction = braceExpansionEntries
      .filter((entry) => isVulnerable(entry.version) && !entry.isDevOnly)
      .map((entry) => entry.specifier);

    expect(leakedToProduction).toEqual([]);
  });

  it("yamali surum (5.0.8) neden zorlanamiyor — sebep hala gecerli", () => {
    // `minimatch@3` CommonJS `require()`in fonksiyon dondurmesini bekliyor;
    // `brace-expansion@5` ESM-only default export. Sebep buysa `minimatch@3`
    // agacta olmali. Kalkarsa override yeniden denenebilir.
    const legacyMinimatch = Object.entries(lockfile.packages).filter(
      ([specifier, entry]) =>
        specifier.endsWith("node_modules/minimatch") && (entry.version ?? "").startsWith("3."),
    );

    expect(legacyMinimatch.length).toBeGreaterThan(0);
  });

  it("belge olculen durumla tutarli", () => {
    const document = fs.readFileSync(path.join(process.cwd(), "docs", "SECURITY-AUDIT.md"), "utf8");

    // Belgenin kok teshisi ile olculen kok ayni olmali; belge bayatlarsa
    // yanlis yonlendirir.
    expect(document).toContain("brace-expansion");
    expect(document).toContain("minimatch");
    expect(document).toContain("npm run audit:security:dev");
  });
});
