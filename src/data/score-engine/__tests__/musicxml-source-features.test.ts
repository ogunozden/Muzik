import {describe, expect, it} from "vitest";
import {extractMu2SourceFeatures, extractMusicXmlSourceFeatures} from "../importer";

/**
 * E1/V1.10 kaynak-feature importu: MusicXML key-signature ve
 * tuplet/time-modification cikariminin sozlesme testi (F10.5).
 */
describe("extractMusicXmlSourceFeatures", () => {
  it("extracts key accidentals as source-proven features", () => {
    const raw = `
      <key>
        <key-step>B</key-step>
        <key-accidental>slash-flat</key-accidental>
        <key-step>F</key-step>
        <key-accidental>sharp</key-accidental>
      </key>
    `;

    const features = extractMusicXmlSourceFeatures(raw, "sample.xml");
    const keys = features.filter((feature) => feature.kind === "key-signature");

    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatchObject({
      source: "symbtr-musicxml",
      status: "source-proven",
      value: "B:slash-flat",
    });
    expect(keys[1].value).toBe("F:sharp");
  });

  it("extracts tuplet time-modifications grouped by ratio with counts (unsupported status)", () => {
    const raw = `
      <note><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note>
      <note><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note>
      <note><time-modification><actual-notes>5</actual-notes><normal-notes>4</normal-notes></time-modification></note>
    `;

    const features = extractMusicXmlSourceFeatures(raw, "sample.xml");
    const tuplets = features.filter((feature) => feature.kind === "unsupported-symbol");

    expect(tuplets).toHaveLength(2);

    const triplet = tuplets.find((feature) => feature.value === "3:2");
    expect(triplet).toMatchObject({
      source: "symbtr-musicxml",
      status: "unsupported",
      label: "tuplet 3:2",
    });
    expect(triplet?.evidence).toContain("x2");

    const quintuplet = tuplets.find((feature) => feature.value === "5:4");
    expect(quintuplet?.evidence).toContain("x1");
  });

  it("returns no features for MusicXML without keys or tuplets", () => {
    expect(extractMusicXmlSourceFeatures("<score-partwise/>", "empty.xml")).toEqual([]);
  });
});

describe("extractMu2SourceFeatures", () => {
  it("extracts caret secondary markers as unsupported slur/tie source features (F8.7 alternative sourcing)", () => {
    // mu2 satirlari tab-ayrilmis; kolon 0 = code, kolon 8 = ikincil isaret.
    const raw = [
      "9\tPay\tPayda\tx\tx\tx\tx\tx\t\tSoz",
      "9\tPay\tPayda\tx\tx\tx\tx\tx\t^\tSoz",
      "9\tPay\tPayda\tx\tx\tx\tx\tx\t^\tSoz",
    ].join("\n");

    const features = extractMu2SourceFeatures(raw, "sample.mu2");
    const carets = features.filter((feature) => feature.label === "slur/tie caret marker");

    expect(carets).toHaveLength(2);
    expect(carets[0]).toMatchObject({
      kind: "unsupported-symbol",
      source: "symbtr-mu2",
      status: "unsupported",
      value: "^",
    });
    expect(carets[0].evidence).toContain("sample.mu2");
  });

  it("still extracts code-50 key and code-51 meter rows alongside carets", () => {
    const raw = [
      "50\t\t\t\tB4b1/F5#4",
      "51\t\t28\t4\t\t\t\tDevr-i Kebir",
      "9\ta\tb\tc\td\te\tf\tg\t^\tsoz",
    ].join("\n");

    const features = extractMu2SourceFeatures(raw, "sample.mu2");

    expect(features.filter((feature) => feature.kind === "key-signature")).toHaveLength(2);
    expect(features.filter((feature) => feature.kind === "meter")).toHaveLength(1);
    expect(features.filter((feature) => feature.value === "^")).toHaveLength(1);
  });
});
