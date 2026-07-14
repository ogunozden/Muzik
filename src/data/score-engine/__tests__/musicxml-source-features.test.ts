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

/**
 * F8.7 tie kanali (SymbTr v3): <tied> start/stop ciftleri nota-ordinal'iyle
 * source-proven feature olur; eslesmeyen stop dusurulur (uydurma yok);
 * repeat/ending/segno/slur sayimlari unsupported kanit olarak tasinir.
 */
describe("extractMusicXmlSourceFeatures tie channel (F8.7 / SymbTr v3)", () => {
  const note = (body: string) => `<note>${body}</note>`;
  const pitch = (step: string, octave: number) =>
    `<pitch><step>${step}</step><octave>${octave}</octave></pitch>`;

  it("extracts a start/stop tied pair as a source-proven tie with note ordinals", () => {
    const raw = [
      note(pitch("B", 4)),
      note(`${pitch("C", 5)}<notations><tied type="start"/></notations>`),
      note(`${pitch("C", 5)}<notations><tied type="stop"/></notations>`),
    ].join("");

    const ties = extractMusicXmlSourceFeatures(raw, "sample.xml").filter((feature) => feature.kind === "tie");

    expect(ties).toHaveLength(1);
    expect(ties[0]).toMatchObject({
      status: "source-proven",
      source: "symbtr-musicxml",
      value: "1:2:C5",
    });
    expect(ties[0].evidence).toContain("notes 2-3");
  });

  it("drops an unmatched tied stop instead of fabricating a pair", () => {
    const raw = note(`${pitch("D", 5)}<notations><tied type="stop"/></notations>`);

    const ties = extractMusicXmlSourceFeatures(raw, "sample.xml").filter((feature) => feature.kind === "tie");

    expect(ties).toHaveLength(0);
  });

  it("keeps repeat/ending/segno/slur counts as unsupported evidence features", () => {
    const raw = [
      '<repeat direction="forward"/>',
      '<ending number="1" type="start"/>',
      "<segno/>",
      '<slur type="start"/>',
    ].join("");

    const markers = extractMusicXmlSourceFeatures(raw, "sample.xml").filter(
      (feature) => feature.kind === "unsupported-symbol",
    );

    expect(markers.map((feature) => feature.id).sort()).toEqual([
      "musicxml-ending",
      "musicxml-repeat",
      "musicxml-segno",
      "musicxml-slur",
    ]);
    for (const marker of markers) expect(marker.status).toBe("unsupported");
  });
});
