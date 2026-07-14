import type {PieceDefinition} from "@/data/pieces/hicazkarPesrev";
import type {SymbTrCatalogEntry} from "@/data/symbtr/catalog";
import {tokens} from "@/shared/tokens";
import {Panel, Pill} from "./FollowPrimitives";
import {getCatalogEntryDisplay, type CustomPieceDraft} from "./follow-helpers";

/**
 * Parca ekle paneli (M8.3 JSX bolme): aktif parca secimi, SymbTr katalog
 * aramasi (async dilim; yukleniyor/hata/bos durumlariyla), draft form alanlari,
 * gorsel yukleme listesi ve ekle butonu. Saf gosterim + callback'ler.
 */
export interface FollowPieceAddPanelProps {
  pieceLibrary: readonly PieceDefinition[];
  selectedPieceId: string;
  selectedPieceMakam: string;
  onSelectPiece: (pieceId: string) => void;
  symbtrCatalogCount: number | null;
  customPieceDraft: CustomPieceDraft;
  catalogQuery: string;
  onCatalogQueryChange: (query: string) => void;
  catalogSearchIsLoading: boolean;
  catalogSearchError: string | null;
  catalogResults: readonly SymbTrCatalogEntry[];
  onApplyCatalogEntry: (entry: SymbTrCatalogEntry) => void;
  onUpdateDraftField: (field: "title" | "composer" | "makam" | "form", value: string) => void;
  onScoreImagesSelected: (files: FileList | null) => void;
  onRemoveScoreImage: (name: string, size: number) => void;
  onAddPiece: () => void;
  isAddingPiece: boolean;
  pieceMessage: string | null;
}

export function FollowPieceAddPanel({
  pieceLibrary,
  selectedPieceId,
  selectedPieceMakam,
  onSelectPiece,
  symbtrCatalogCount,
  customPieceDraft,
  catalogQuery,
  onCatalogQueryChange,
  catalogSearchIsLoading,
  catalogSearchError,
  catalogResults,
  onApplyCatalogEntry,
  onUpdateDraftField,
  onScoreImagesSelected,
  onRemoveScoreImage,
  onAddPiece,
  isAddingPiece,
  pieceMessage,
}: FollowPieceAddPanelProps) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Parça ekle</p>
          <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
            Bu bölüm takip edilecek eserin nota görsellerini ekler; TXT bağlantısı gerekmez.
          </p>
        </div>
        <Pill tone="secondary">{pieceLibrary.length} parça</Pill>
      </div>

      <label className="mt-3 grid gap-1 text-sm">
        <span className={tokens.colors.text.secondary}>Aktif parça</span>
        <select
          aria-label="Aktif parça seç"
          value={selectedPieceId}
          onChange={(event) => onSelectPiece(event.target.value)}
          className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
        >
          {pieceLibrary.map((libraryPiece) => (
            <option key={libraryPiece.id} value={libraryPiece.id}>
              {libraryPiece.displayTitle} · {libraryPiece.composer}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">SymbTr katalog</p>
            <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
              {symbtrCatalogCount ?? "…"} yerel eser; sonuçlar kanonik ID ile tekilleştirilir.
            </p>
          </div>
          {customPieceDraft.catalogId && <Pill tone="success">Eşlendi</Pill>}
        </div>
        <label className="mt-3 grid gap-1 text-sm">
          <span className={tokens.colors.text.secondary}>Katalog ara</span>
          <input
            aria-label="SymbTr katalog ara"
            value={catalogQuery}
            onChange={(event) => onCatalogQueryChange(event.target.value)}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
            placeholder="Makam, usul, eser adı veya besteci"
          />
        </label>
        {catalogSearchIsLoading && (
          <p className={`mt-3 text-xs ${tokens.colors.text.secondary}`} role="status">
            Katalog aranıyor…
          </p>
        )}
        {catalogSearchError && (
          <p className="mt-3 text-xs text-[var(--color-error)]" role="alert">
            Katalog araması başarısız: {catalogSearchError}
          </p>
        )}
        {!catalogSearchIsLoading &&
          !catalogSearchError &&
          catalogQuery.trim().length > 0 &&
          catalogResults.length === 0 && (
            <p className={`mt-3 text-xs ${tokens.colors.text.secondary}`}>
              Eşleşen katalog kaydı yok.
            </p>
          )}
        {catalogResults.length > 0 && (
          <div className="mt-3 grid gap-2">
            {catalogResults.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-label={`Katalogdan doldur ${entry.id}`}
                onClick={() => onApplyCatalogEntry(entry)}
                className="rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-left text-sm hover:border-[var(--color-primary-300)]"
              >
                <span className="block font-medium text-[var(--color-text-primary)]">{getCatalogEntryDisplay(entry)}</span>
                <span className={`mt-1 block text-xs ${tokens.colors.text.secondary}`}>
                  {entry.id} · {entry.formats.join(", ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span className={tokens.colors.text.secondary}>Eser adı</span>
          <input
            aria-label="Eser adı"
            value={customPieceDraft.title}
            onChange={(event) => onUpdateDraftField("title", event.target.value)}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
            placeholder="Örn. Rast Peşrev"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className={tokens.colors.text.secondary}>Besteci</span>
          <input
            aria-label="Besteci"
            value={customPieceDraft.composer}
            onChange={(event) => onUpdateDraftField("composer", event.target.value)}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
            placeholder="Opsiyonel"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className={tokens.colors.text.secondary}>Makam</span>
          <input
            aria-label="Makam"
            value={customPieceDraft.makam}
            onChange={(event) => onUpdateDraftField("makam", event.target.value)}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
            placeholder={selectedPieceMakam}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className={tokens.colors.text.secondary}>Form</span>
          <input
            aria-label="Form"
            value={customPieceDraft.form}
            onChange={(event) => onUpdateDraftField("form", event.target.value)}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
            placeholder="Eser"
          />
        </label>
        <label className="col-span-2 grid gap-1 text-sm">
          <span className={tokens.colors.text.secondary}>Nota görselleri</span>
          <input
            aria-label="Nota görselleri"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={(event) => {
              onScoreImagesSelected(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
      {customPieceDraft.scoreImages.length > 0 && (
        <div className="mt-3 grid gap-2">
          {customPieceDraft.scoreImages.map((image) => (
            <div
              key={`${image.name}-${image.size}`}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-[var(--color-text-primary)]">{image.name}</span>
              <button
                type="button"
                onClick={() => onRemoveScoreImage(image.name, image.size)}
                className="shrink-0 text-[var(--color-error)]"
              >
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onAddPiece}
        disabled={isAddingPiece}
        className="mt-4 w-full rounded-md bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-600)]"
      >
        {isAddingPiece ? "Ekleniyor" : "Parçayı ekle ve seç"}
      </button>
      {pieceMessage && (
        <div className="mt-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
          {pieceMessage}
        </div>
      )}
    </Panel>
  );
}
