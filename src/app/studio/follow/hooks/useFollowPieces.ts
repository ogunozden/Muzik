"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PIECE_LIBRARY, type PieceDefinition} from "@/data/pieces/hicazkarPesrev";
import {createDefaultVisualMap} from "@/data/pieces/visual-map";
import type {SymbTrCatalogEntry} from "@/data/symbtr/catalog";
import {useSymbtrCatalogSearch} from "@/features/studio/useSymbtrCatalogSearch";
import {useSymbtrPieceBundle} from "@/features/studio/useSymbtrPieceBundle";
import {
  DEFAULT_PIECE,
  assertParseableSymbtrScore,
  clampBpm,
  formatCatalogSegment,
  isHttpUrl,
  makeVisualPieceSignature,
  type CustomPieceDraft,
} from "@/app/studio/follow/parts/follow-helpers";

type UseFollowPiecesOptions = {
  stopPlayback?: () => void;
};

export function useFollowPieces(options: UseFollowPiecesOptions = {}) {
  const {stopPlayback} = options;
  const [pieceLibrary, setPieceLibrary] = useState<PieceDefinition[]>(() => [...PIECE_LIBRARY]);
  const [selectedPieceId, setSelectedPieceId] = useState<string>(DEFAULT_PIECE.id);
  const selectedPiece = useMemo(
    () => pieceLibrary.find((libraryPiece) => libraryPiece.id === selectedPieceId) ?? pieceLibrary[0],
    [pieceLibrary, selectedPieceId],
  );
  const [rawScore, setRawScore] = useState("");
  const [bpm, setBpm] = useState<number>(DEFAULT_PIECE.bpm);
  const [customPieceDraft, setCustomPieceDraft] = useState<CustomPieceDraft>({
    title: "",
    composer: "",
    makam: "",
    form: "",
    catalogId: "",
    scoreImages: [],
  });
  const [pieceMessage, setPieceMessage] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [isAddingPiece, setIsAddingPiece] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const isAddingPieceRef = useRef(false);
  const catalogSearch = useSymbtrCatalogSearch(catalogQuery);
  const pieceBundle = useSymbtrPieceBundle(selectedPiece.symbtrCatalogId ?? null);

  const catalogResults = catalogSearch.data?.entries ?? [];
  const symbtrCatalogCount = pieceBundle.data?.catalogCount ?? catalogSearch.data?.catalogCount ?? null;

  const referenceSources = useMemo(
    () =>
      (
        selectedPiece.symbtrCatalogId ? (pieceBundle.data?.externalReferences ?? []) : (selectedPiece.referenceSources ?? [])
      ).filter((source) => isHttpUrl(source.url)),
    [pieceBundle.data?.externalReferences, selectedPiece.referenceSources, selectedPiece.symbtrCatalogId],
  );
  const selectedSymbTrSourceReferences = pieceBundle.data?.sourceReferences ?? [];
  const selectedSymbTrPdfLayout = pieceBundle.data?.layout ?? null;
  const selectedSymbTrPdfLayoutVerificationStatus = pieceBundle.data?.verificationStatus ?? null;
  const selectedSymbTrVerifiedPdfMeasureBoxes = pieceBundle.data?.verifiedMeasureBoxes ?? [];

  const handleBpmChange = useCallback(
    (value: number) => {
      stopPlayback?.();
      setBpm(clampBpm(value, selectedPiece.bpm));
    },
    [selectedPiece.bpm, stopPlayback],
  );

  const selectPiece = useCallback(
    (pieceId: string) => {
      const nextPiece = pieceLibrary.find((libraryPiece) => libraryPiece.id === pieceId);
      if (!nextPiece) return;
      stopPlayback?.();
      setRawScore("");
      setScoreError(null);
      setBpm(nextPiece.bpm);
      setSelectedPieceId(pieceId);
      setPieceMessage(null);
    },
    [pieceLibrary, stopPlayback],
  );

  const updateCustomPieceDraft = useCallback((field: "title" | "composer" | "makam" | "form", value: string) => {
    setCustomPieceDraft((draft) => ({...draft, [field]: value}));
  }, []);

  const applyCatalogEntry = useCallback((entry: SymbTrCatalogEntry) => {
    setCustomPieceDraft((draft) => ({
      ...draft,
      title: formatCatalogSegment(entry.title),
      composer: formatCatalogSegment(entry.composer),
      makam: formatCatalogSegment(entry.makam),
      form: formatCatalogSegment(entry.form),
      catalogId: entry.id,
    }));
    setPieceMessage(`${entry.id} katalog bilgisi forma işlendi; nota görseli ekleyince parça seçilebilir.`);
  }, []);

  const handleCustomScoreImages = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const acceptedImages = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (acceptedImages.length !== files.length) {
      setPieceMessage("Parça eklemek için yalnızca PNG, JPG, GIF veya WebP görselleri seç.");
    }
    setCustomPieceDraft((draft) => {
      const existing = new Set(draft.scoreImages.map((image) => `${image.name}:${image.size}`));
      const nextImages = acceptedImages
        .filter((file) => !existing.has(`${file.name}:${file.size}`))
        .map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
        }));
      return {...draft, scoreImages: [...draft.scoreImages, ...nextImages]};
    });
  }, []);

  const removeCustomScoreImage = useCallback((name: string, size: number) => {
    setCustomPieceDraft((draft) => {
      const removed = draft.scoreImages.find((image) => image.name === name && image.size === size);
      if (removed) URL.revokeObjectURL(removed.url);
      return {
        ...draft,
        scoreImages: draft.scoreImages.filter((image) => image.name !== name || image.size !== size),
      };
    });
  }, []);

  const addCustomPiece = useCallback(() => {
    if (isAddingPieceRef.current) return;
    const title = customPieceDraft.title.trim();
    if (!title || customPieceDraft.scoreImages.length === 0) {
      setPieceMessage("Parça eklemek için eser adı ve en az bir nota görseli gerekli.");
      return null;
    }
    const visualPieceSignature = customPieceDraft.catalogId
      ? `symbtr-catalog:${customPieceDraft.catalogId}`
      : makeVisualPieceSignature(title, customPieceDraft.scoreImages);
    if (pieceLibrary.some((libraryPiece) => libraryPiece.sourcePageUrl === visualPieceSignature)) {
      setPieceMessage(
        customPieceDraft.catalogId ? "Bu SymbTr katalog eseri zaten parça listesinde." : "Bu görsel parça zaten parça listesinde.",
      );
      return null;
    }
    isAddingPieceRef.current = true;
    setIsAddingPiece(true);
    stopPlayback?.();
    const customPiece: PieceDefinition = {
      id: `visual-${Date.now()}`,
      title,
      displayTitle: title,
      composer: customPieceDraft.composer.trim() || "Kullanıcı",
      makam: customPieceDraft.makam.trim() || selectedPiece.makam,
      form: customPieceDraft.form.trim() || "Görsel çalışma",
      usul: selectedPiece.usul,
      usulId: selectedPiece.usulId,
      meter: selectedPiece.meter,
      bpm,
      symbtrCatalogId: customPieceDraft.catalogId || undefined,
      symbtrRawUrl: "",
      symbtrPageUrl: "",
      sourcePageUrl: visualPieceSignature,
      referenceSources: [],
      scorePageUrls: customPieceDraft.scoreImages.map((image) => image.url),
      visualMap: createDefaultVisualMap(customPieceDraft.scoreImages.length, {
        notes: "Kullanıcı görselleri için varsayılan satır bantları otomatik üretildi; nota başı ve ölçü hizalaması doğrulanmış değildir.",
      }),
      melodicLayers: selectedPiece.melodicLayers,
      percussionLayers: selectedPiece.percussionLayers,
      requiredPercussionSymbols: selectedPiece.requiredPercussionSymbols,
    };
    setRawScore("");
    setScoreError(null);
    setBpm(customPiece.bpm);
    setPieceLibrary((pieces) => [...pieces, customPiece]);
    setSelectedPieceId(customPiece.id);
    setCustomPieceDraft({
      title: "",
      composer: "",
      makam: "",
      form: "",
      catalogId: "",
      scoreImages: [],
    });
    setPieceMessage(`${title} görsellerle eklendi ve takip için seçildi.`);
    isAddingPieceRef.current = false;
    setIsAddingPiece(false);
    return customPiece;
  }, [bpm, customPieceDraft, pieceLibrary, selectedPiece, stopPlayback]);

  useEffect(() => {
    let cancelled = false;
    async function loadScore() {
      if (!selectedPiece.symbtrRawUrl) {
        setRawScore("");
        setScoreError(null);
        return;
      }
      try {
        const response = await fetch(selectedPiece.symbtrRawUrl, {cache: "force-cache"});
        if (!response.ok) throw new Error("SymbTr skoru yüklenemedi");
        const raw = await response.text();
        assertParseableSymbtrScore(raw, selectedPiece.bpm);
        if (!cancelled) {
          setRawScore(raw);
          setScoreError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setRawScore("");
          setScoreError((error as Error).message);
        }
      }
    }
    void loadScore();
    return () => {
      cancelled = true;
    };
  }, [selectedPiece]);

  return {
    pieceLibrary,
    setPieceLibrary,
    selectedPiece,
    selectedPieceId,
    setSelectedPieceId,
    rawScore,
    setRawScore,
    bpm,
    setBpm,
    handleBpmChange,
    customPieceDraft,
    pieceMessage,
    catalogQuery,
    setCatalogQuery,
    isAddingPiece,
    scoreError,
    setScoreError,
    catalogSearch,
    catalogResults,
    symbtrCatalogCount,
    pieceBundle,
    referenceSources,
    selectedSymbTrSourceReferences,
    selectedSymbTrPdfLayout,
    selectedSymbTrPdfLayoutVerificationStatus,
    selectedSymbTrVerifiedPdfMeasureBoxes,
    selectPiece,
    updateCustomPieceDraft,
    applyCatalogEntry,
    handleCustomScoreImages,
    removeCustomScoreImage,
    addCustomPiece,
  };
}
