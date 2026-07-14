# SymbTr test fixture korpusu

Bu klasor, `importer-validator` ve kaynak-feature testlerinin ORTAMDAN
BAGIMSIZ kosabilmesi icin tek eserlik bir SymbTr kesitini repo icinde tasir.
Gercek korpus (`symb/`) gitignore'dadir ve CI runner'da bulunmaz; bu fixture
olmadan testler makineye gore farkli sonuc verir (bkz. CI fail 2026-07-14:
keySignature source `musicxml` yerine `mu2` fallback'i).

- Kaynak: SymbTr v3.0 — Turkish maqam music symbolic data,
  https://zenodo.org/records/15470412
- Lisans: Creative Commons Attribution 4.0 (CC-BY 4.0)
- Eser: hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey (MusicXML + mu2)

`vitest.setup.ts`, `MUZIK_SYMBTR_ROOTS` ortam degiskenini bu klasore
sabitler; boylece importer'in yerel-kardes-dosya cozumlemesi testlerde her
zaman ayni veriyi gorur. Uygulama calisma zamaninda degisken bos birakilir ve
`symb/SymbTr-3.0` -> `symb/SymbTr-2.0.0` varsayilan sirasi gecerlidir.
