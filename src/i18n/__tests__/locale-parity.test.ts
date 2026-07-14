import {describe, expect, it} from "vitest";
import tr from "../locales/tr.json";
import en from "../locales/en.json";

/**
 * i18n parite kapisi (F5.4): tr ve en ayni anahtar agacini tasimali. Bir dile
 * eklenip digerine eklenmeyen anahtar = ceviri kacagi; bu test onu yakalar.
 */

type JsonValue = string | number | boolean | null | {[key: string]: JsonValue} | JsonValue[];

function collectKeys(value: JsonValue, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    collectKeys(child as JsonValue, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n locale parity", () => {
  const trKeys = new Set(collectKeys(tr as JsonValue));
  const enKeys = new Set(collectKeys(en as JsonValue));

  it("has every Turkish key present in English", () => {
    const missingInEn = [...trKeys].filter((key) => !enKeys.has(key));
    expect(missingInEn, `EN'de eksik anahtarlar: ${missingInEn.join(", ")}`).toEqual([]);
  });

  it("has every English key present in Turkish", () => {
    const missingInTr = [...enKeys].filter((key) => !trKeys.has(key));
    expect(missingInTr, `TR'de eksik anahtarlar: ${missingInTr.join(", ")}`).toEqual([]);
  });

  it("has no empty translation values", () => {
    const emptyTr = collectKeys(tr as JsonValue).filter((key) => {
      const parts = key.split(".");
      let node: JsonValue = tr as JsonValue;
      for (const part of parts) node = (node as {[k: string]: JsonValue})[part];
      return typeof node === "string" && node.trim() === "";
    });
    expect(emptyTr).toEqual([]);
  });
});
