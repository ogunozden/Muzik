import {act, renderHook} from "@testing-library/react";
import {describe, expect, test} from "vitest";
import {useCurationSelection} from "../useCurationSelection";
import type {CurationReference} from "../../curation-dashboard-types";

function makeReference(catalogId: string, sourceId: string): CurationReference {
  return {
    catalogId,
    sourceId,
    catalog: {title: catalogId, makam: "", form: "", usul: "", composer: ""},
    source: {url: `https://example.com/${sourceId}`},
  } as unknown as CurationReference;
}

const refA = makeReference("cat-a", "src-a");
const refB = makeReference("cat-b", "src-b");

describe("useCurationSelection", () => {
  test("starts with an empty selection", () => {
    const {result} = renderHook(() => useCurationSelection([refA, refB]));

    expect(result.current.selectedReferenceKeys).toEqual([]);
    expect(result.current.selectedReferences).toEqual([]);
  });

  test("toggleReferenceSelection adds and removes a single key", () => {
    const {result} = renderHook(() => useCurationSelection([refA, refB]));

    act(() => result.current.toggleReferenceSelection(refA, true));
    expect(result.current.selectedReferences).toEqual([refA]);

    act(() => result.current.toggleReferenceSelection(refA, false));
    expect(result.current.selectedReferences).toEqual([]);
  });

  test("toggleVisibleReferenceSelection selects then clears all filtered rows", () => {
    const {result} = renderHook(() => useCurationSelection([refA, refB]));

    act(() => result.current.toggleVisibleReferenceSelection(true));
    expect(result.current.selectedReferences).toHaveLength(2);

    act(() => result.current.toggleVisibleReferenceSelection(false));
    expect(result.current.selectedReferences).toHaveLength(0);
  });

  test("selectedReferences reflects only rows still present in the filtered list", () => {
    const {result, rerender} = renderHook(
      ({rows}) => useCurationSelection(rows),
      {initialProps: {rows: [refA, refB]}},
    );

    act(() => result.current.toggleVisibleReferenceSelection(true));
    expect(result.current.selectedReferences).toHaveLength(2);

    // refB filtreden düştü → seçili anahtar kalsa da türetilmiş liste yalnız görünür satırı içerir
    rerender({rows: [refA]});
    expect(result.current.selectedReferences).toEqual([refA]);
  });

  test("setSelectedReferenceKeys([]) clears the selection (bulk-feedback akışı)", () => {
    const {result} = renderHook(() => useCurationSelection([refA, refB]));

    act(() => result.current.toggleVisibleReferenceSelection(true));
    expect(result.current.selectedReferenceKeys).toHaveLength(2);

    act(() => result.current.setSelectedReferenceKeys([]));
    expect(result.current.selectedReferenceKeys).toEqual([]);
  });
});
