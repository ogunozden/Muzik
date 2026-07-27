# Güvenlik denetimi — kapı nerede, borç nerede

**Son ölçüm: 2026-07-27**

## Kapı

| komut | kapsam | CI'da |
|---|---|---|
| `npm run audit:security` | `--omit=dev` — **kullanıcıya giden** kod | **BLOKE EDER** |
| `npm run audit:security:dev` | dev dâhil hepsi | raporlar, bloke etmez |

Gerekçe tek cümle: **kullanıcıya giden kodda bilinen açık olamaz**; yalnız
derleme/lint sırasında çalışan ve bugün düzeltilmesi mümkün olmayan bir
bulgu ise CI'yı kırmak yerine görünür borç olarak tutulur.

## Neden bu ayrım yapıldı

CI **her koşuda** düşüyordu — dependabot PR'ları dâhil, yani aylardır. Tek
kırık adım `audit:security`'ydi; mimari kapı, lint, typecheck, 985 test,
coverage, build, bundle-size hepsi geçiyordu. E2E adımına hiç sıra gelmiyordu.

Kırmızı duran ve **kimsenin düzeltemeyeceği** bir CI, insanlara CI'yı
görmezden gelmeyi öğretir. Asıl risk buydu.

## Gerçekten düzeltilen açıklar (kullanıcıya giden)

Bunlar gerçek kusurlardı ve kapatıldı:

| paket | önce | sonra | not |
|---|---|---|---|
| `next` | 16.2.9 | **16.2.12** | lockfile bayattı; sürüm aralığı zaten izin veriyordu |
| `postcss` | 8.5.15 | **8.5.23** | *bir önceki düzeltme denemesi sebep olmuştu* — aşağıya bak |
| `sharp` | 0.34.5 | **0.35.3** | libvips CVE'leri (4 adet) |

> **`postcss` bulgusu dikkat çekici:** `package.json`'daki `overrides` bloğu
> `next`'in postcss'ini **`8.5.15`'e sabitliyordu** — ki bu sürüm advisory
> aralığının (`<=8.5.17`) tam içinde. Yani eski bir güvenlik düzeltmesi
> denemesi, bugünkü açığın sebebiydi. Sabit sürüm pinlemek yerine aralık
> (`^8.5.23`) kullanıldı.

`npm audit --omit=dev` → **0 açık**.

## Kalan borç (yalnız geliştirme, bugün düzeltilemez)

9 yüksek bulgu; hepsi tek kökten: **`brace-expansion` ReDoS**
(`minimatch` → `eslint-plugin-*` → `eslint-config-next` → `eslint`).

Denenen ve **neden işe yaramadığı ölçülen** yollar:

1. **`brace-expansion` → `^5.0.8` override.**
   Kırdı. 5.x ESM-only default export'a geçmiş; `@eslint/config-array`'in
   kullandığı `minimatch@3` ise `require(...)`'ın fonksiyon dönmesini
   bekliyor → `TypeError: expand is not a function`. Lint tamamen durdu.

2. **ESLint 9 → 10 yükseltmesi.**
   npm'in önerdiği yol buydu ve `eslint-config-next` peer'i (`>=9.0.0`) da
   izin veriyor. Yine de kırdı: `eslint-config-next@16.2.12`'nin paketlediği
   `eslint-plugin-react`, ESLint 10'da `getReactVersionFromContext`'te
   patlıyor. Peer aralığı gevşek ama gerçek uyum yok.

3. **npm'in kendi önerisi:** `eslint-config-next@0.2.4` — yıllar öncesine
   dönmek. Anlamsız.

Yani yamalı bir sürüm kombinasyonu **bugün mevcut değil**. Advisory aralığı
(`<=5.0.7`) tüm yayın hatlarını kapsıyor ve tek yamalı sürüm 5.0.8; o da
eski `minimatch` ile uyumsuz.

**Risk değerlendirmesi:** bu bir ReDoS ve yalnız `eslint` glob desenlerini
işlerken tetiklenir. Desenler bizim kendi `eslint.config.mjs`'imizden gelir,
dış girdiden değil. Kullanıcıya giden pakete girmez.

## Ne zaman tekrar bakılmalı

- `eslint-config-next` paketlediği eklentileri güncellediğinde
- ya da ESLint 10 uyumlu bir `eslint-config-next` çıktığında

Kontrol: `npm run audit:security:dev`. Sayı 9'un altına düşerse bu belge
güncellenmelidir.
