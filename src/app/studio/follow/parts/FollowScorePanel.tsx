import {SourceSubmissionForm} from "@/features/references/SourceSubmissionForm";
import {tokens} from "@/shared/tokens";
import {getCurrentScoreEvent, parseSymbtrScore, type PieceDefinition} from "@/data/pieces/hicazkarPesrev";
import {
  createVisualMeasureSegments,
  getActiveVisualMeasureSegment,
  getVisualBeatPosition,
} from "@/data/pieces/visual-map";
import {getActiveVisualBand} from "./follow-helpers";
import type {useSymbtrPieceBundle} from "@/features/studio/useSymbtrPieceBundle";
import {Panel, Pill} from "./FollowPrimitives";
import {formatBeatLabel, isHttpUrl} from "./follow-helpers";

/**
 * ESER TAKIP — nota/gorsel paneli (PLAN.md §11/H6)
 *
 * ── NEDEN AYRILDI ───────────────────────────────────────────────────────
 * `follow/page.tsx` 1024 satirdi ve ratchet tavani 800. Sag sutun (ipucu,
 * tempo, parca ekleme, katmanlar) daha once ayrilmisti; kalan yukun buyuk
 * kismi bu tek panelde toplaniyordu (357 satir). Ayrildiktan sonra sayfa
 * 1024 -> 689 satira indi.
 *
 * ── NEDEN JSX HIC DEGISMEDI ─────────────────────────────────────────────
 * Panel on sekiz ayri degeri okuyor. Prop ADLARI ebeveyndeki degisken
 * adlariyla BIREBIR ayni tutuldu; boylece JSX govdesi tek karakter
 * degistirilmeden tasindi. Tasima sirasinda sessiz bir hata yapma ihtimali
 * bu sekilde en aza indi. Proje bu deseni `CurationReviewSections`te de
 * kullandi.
 *
 * ── TIPLER NEDEN `ReturnType` ───────────────────────────────────────────
 * On sekiz tipi elle yazmak, ebeveynle sessizce ayrisabilecek ikinci bir
 * gercek kaynagi olurdu. Bunun yerine tipler ureten fonksiyonlardan
 * TURETILIYOR: yardimcinin donus tipi degisirse burasi da degisir.
 */

type PieceBundle = ReturnType<typeof useSymbtrPieceBundle>;
type ScoreEvents = ReturnType<typeof parseSymbtrScore>;
type VisualMeasureSegments = ReturnType<typeof createVisualMeasureSegments>;
type BundleData = NonNullable<PieceBundle["data"]>;
type VerifiedPdfMeasureBoxes = BundleData["verifiedMeasureBoxes"];

export interface FollowScorePanelProps {
  selectedPiece: PieceDefinition;
  visibleScoreEvents: ScoreEvents;
  currentEvent: ReturnType<typeof getCurrentScoreEvent>;
  activeVisualBand: ReturnType<typeof getActiveVisualBand>;
  activeVisualBandProgress: number | null;
  activeVisualBeatPosition: ReturnType<typeof getVisualBeatPosition> | null;
  activeVisualMeasureSegment: ReturnType<typeof getActiveVisualMeasureSegment>;
  activeVisualNoteLabel: string | null;
  activeVisualPageIndex: number;
  visualMeasureSegments: VisualMeasureSegments;
  visualTrackingIsExact: boolean;
  referenceSources: BundleData["externalReferences"];
  selectedSymbTrSourceReferences: BundleData["sourceReferences"];
  selectedSymbTrPdfLayout: BundleData["layout"] | null;
  selectedSymbTrPdfLayoutVerificationStatus: BundleData["verificationStatus"] | null;
  selectedSymbTrVerifiedPdfMeasureBoxes: VerifiedPdfMeasureBoxes;
  activeVerifiedPdfMeasureBox: VerifiedPdfMeasureBoxes[number] | null;
}

export function FollowScorePanel({
  activeVerifiedPdfMeasureBox,
  activeVisualBand,
  activeVisualBandProgress,
  activeVisualBeatPosition,
  activeVisualMeasureSegment,
  activeVisualNoteLabel,
  activeVisualPageIndex,
  currentEvent,
  referenceSources,
  selectedPiece,
  selectedSymbTrPdfLayout,
  selectedSymbTrPdfLayoutVerificationStatus,
  selectedSymbTrSourceReferences,
  selectedSymbTrVerifiedPdfMeasureBoxes,
  visibleScoreEvents,
  visualMeasureSegments,
  visualTrackingIsExact,
}: FollowScorePanelProps) {
  return (
      <Panel className="min-w-0">
          <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Kaynak nota</p>
              <p className={`text-sm ${tokens.colors.text.primary}`}>
                Görsel nota sayfaları; varsa SymbTr sembolik skor verisiyle otomatik takip
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              {referenceSources.length > 0 ? (
                referenceSources.map((source) => (
                  <a
                    key={source.id}
                    className="text-sm text-[var(--color-primary-600)] underline"
                    href={source.url}
                    title={source.title ?? source.label}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.label}
                  </a>
                ))
              ) : (
                <>
                  {isHttpUrl(selectedPiece.sourcePageUrl) && (
                    <a className="text-sm text-[var(--color-primary-600)] underline" href={selectedPiece.sourcePageUrl} target="_blank" rel="noreferrer">
                      Nota kaynağı
                    </a>
                  )}
                  {isHttpUrl(selectedPiece.symbtrPageUrl) && (
                    <a className="text-sm text-[var(--color-primary-600)] underline" href={selectedPiece.symbtrPageUrl} target="_blank" rel="noreferrer">
                      SymbTr
                    </a>
                  )}
                  {selectedPiece.referenceRecordingUrl && (
                    <a className="text-sm text-[var(--color-primary-600)] underline" href={selectedPiece.referenceRecordingUrl} target="_blank" rel="noreferrer">
                      Referans kayıt
                    </a>
                  )}
                </>
              )}
            </div>
            {selectedPiece.symbtrCatalogId && (
              <SourceSubmissionForm
                catalogId={selectedPiece.symbtrCatalogId}
                title={selectedPiece.title}
                makam={selectedPiece.makam}
                composer={selectedPiece.composer}
              />
            )}
            {selectedSymbTrSourceReferences.length > 0 && (
              <details className="mt-3 w-full min-w-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium text-[var(--color-text-primary)]">
                  Yerel SymbTr kaynakları: {selectedSymbTrSourceReferences.filter((source) => source.access === "local-archive").length} format
                </summary>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                  {selectedSymbTrSourceReferences.map((source) => (
                    <div
                      key={source.id}
                      className="min-w-0 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium text-[var(--color-text-primary)]">{source.label}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{source.canonical ? "kanonik" : "referans"}</span>
                      </div>
                      {source.archiveMemberPath ? (
                        <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--color-text-secondary)]" title={source.archiveMemberPath}>
                          {source.archiveMemberPath}
                        </p>
                      ) : source.url ? (
                        <a
                          className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--color-primary-600)] underline"
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div className="max-h-[680px] overflow-auto rounded border border-[var(--color-border-subtle)] bg-white">
            {selectedPiece.scorePageUrls.length > 0 ? (
              selectedPiece.scorePageUrls.map((url, index) => {
                const activePage = activeVisualPageIndex === index;
                const pageBands = selectedPiece.visualMap?.staffBands.filter((band) => band.pageIndex === index) ?? [];
                const pageMeasureSegments = visualMeasureSegments.filter((segment) => segment.pageIndex === index);

                return (
                  <div
                    key={url}
                    aria-current={activePage ? "page" : undefined}
                    className={`relative border-b bg-white ${
                      activePage
                        ? "border-[var(--color-primary-400)] ring-2 ring-inset ring-[var(--color-primary-300)]"
                        : "border-[var(--color-border-subtle)]"
                    }`}
                  >
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-white/95 px-3 py-2 text-xs backdrop-blur">
                      <span className="font-medium text-[var(--color-text-primary)]">{index + 1}. sayfa</span>
                      <span className={activePage ? "text-[var(--color-primary-700)]" : tokens.colors.text.secondary}>
                        {activePage ? (visualTrackingIsExact ? "aktif takip" : "yaklaşık takip") : "bekliyor"}
                      </span>
                    </div>
                    {activePage && (
                      <div className="h-1 bg-[var(--color-primary-100)]">
                        <div
                          className="h-full bg-[var(--color-primary-500)] transition-[width]"
                          style={{width: `${activeVisualBandProgress}%`}}
                        />
                      </div>
                    )}
                    <div className="relative mx-auto max-w-[980px]">
                      {pageBands.map((band) => {
                        const activeBand = activeVisualBand?.id === band.id;
                        const activeLaneTopPercent = band.topPercent + band.heightPercent * 0.12;
                        const activeLaneHeightPercent = Math.max(3, Math.min(6, band.heightPercent * 0.42));
                        return (
                          <div
                            key={band.id}
                            aria-hidden="true"
                            className={`pointer-events-none absolute z-10 rounded-sm transition-colors ${
                              activeBand
                                ? "bg-[var(--color-primary-100)]/40 shadow-[0_0_0_1px_var(--color-primary-300)]"
                                : "bg-transparent"
                            }`}
                            style={{
                              left: `${band.leftPercent}%`,
                              width: `${band.widthPercent}%`,
                              top: `${activeBand ? activeLaneTopPercent : band.topPercent}%`,
                              height: `${activeBand ? activeLaneHeightPercent : band.heightPercent}%`,
                            }}
                          />
                        );
                      })}
                      {pageMeasureSegments.map((segment) => {
                        const activeMeasure = activeVisualMeasureSegment?.id === segment.id;
                        return (
                          <div
                            key={segment.id}
                            aria-hidden="true"
                            className={`pointer-events-none absolute z-20 rounded-sm border-l transition-colors ${
                              activeMeasure
                                ? "border-l-[var(--color-primary-700)]"
                                : "border-l-[var(--color-primary-300)]/70 bg-transparent"
                            }`}
                            style={{
                              left: `${segment.leftPercent}%`,
                              width: `${segment.widthPercent}%`,
                              top: `${segment.topPercent}%`,
                              height: `${segment.heightPercent}%`,
                            }}
                          />
                        );
                      })}
                      {activePage && activeVisualBand && activeVisualBeatPosition && (
                        (() => {
                          const activeLaneTopPercent = activeVisualBand.topPercent + activeVisualBand.heightPercent * 0.12;
                          const activeLaneHeightPercent = Math.max(3, Math.min(6, activeVisualBand.heightPercent * 0.42));

                          return (
                        <div
                          role={activeVisualNoteLabel ? "img" : undefined}
                          aria-label={activeVisualNoteLabel ? `${visualTrackingIsExact ? "Aktif nota" : "Yaklaşık takip"} görsel işareti: ${activeVisualNoteLabel}` : undefined}
                          className="pointer-events-none absolute z-30 -translate-x-1/2"
                          style={{
                            left: `${activeVisualBeatPosition.xPercent}%`,
                            top: `${activeLaneTopPercent}%`,
                            height: `${activeLaneHeightPercent}%`,
                          }}
                        >
                          <span className="block h-full w-0.5 rounded-full bg-[var(--color-primary-700)] shadow-[0_0_0_2px_rgba(255,255,255,0.92)]" />
                          <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 shadow-[0_0_0_2px_var(--color-primary-700),0_0_0_4px_rgba(255,255,255,0.82)]">
                            <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary-700)]" />
                          </span>
                        </div>
                          );
                        })()
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element -- Keep the source notation image untouched; optimization can alter remote GIF rendering. */}
                      <img
                        src={url}
                        alt={`${selectedPiece.displayTitle} kaynak nota sayfası ${index + 1}`}
                        className="block w-full bg-white"
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid min-h-48 place-items-center px-4 text-center text-sm text-[var(--color-text-secondary)]">
                Bu parça için nota görseli eklenmedi; takip SymbTr olay şeridi üzerinden yapılır.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Sayfa eşleme</p>
                <p className={`text-sm ${tokens.colors.text.secondary}`}>
                  {visualTrackingIsExact
                    ? "Vuruş ilerlemesi doğrulanmış nota/ölçü anchor verisine bağlanır."
                    : "Vuruş ilerlemesi yalnız yaklaşık sayfa ve satır bantlarına bağlanır; nota başı doğrulanmış değildir."}
                </p>
                <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                  Aktif satır ve Yakın notalar göstergeleri exact anchor yoksa yaklaşık takip olarak işaretlenir.
                </p>
              </div>
              <Pill tone={currentEvent ? "success" : "secondary"}>
                {activeVisualPageIndex >= 0 ? `${activeVisualPageIndex + 1}. sayfa / ${selectedPiece.scorePageUrls.length}` : "Görsel yok"}
              </Pill>
            </div>
            {activeVisualBand && (
              <div className="mt-3 rounded-md border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 py-2 text-sm text-[var(--color-primary-700)]">
                {visualTrackingIsExact ? "Aktif satır" : "Yaklaşık satır"}: {activeVisualBand.label} · {formatBeatLabel(activeVisualBand.startBeat + 1)}-{formatBeatLabel(activeVisualBand.endBeat)}. vuruş
              </div>
            )}
            {activeVisualBeatPosition && (
              <div className="mt-2 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                {visualTrackingIsExact ? "Takip noktası" : "Yaklaşık takip noktası"}: {activeVisualBeatPosition.label} · x {Math.round(activeVisualBeatPosition.xPercent)}% / y {Math.round(activeVisualBeatPosition.yPercent)}% · satır %{Math.round(activeVisualBeatPosition.progressPercent)}
              </div>
            )}
            {activeVisualMeasureSegment && (
              <div className="mt-2 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                Aktif ölçü: {activeVisualMeasureSegment.measureIndex}. ölçü · {formatBeatLabel(activeVisualMeasureSegment.startBeat + 1)}-{formatBeatLabel(activeVisualMeasureSegment.endBeat)}. vuruş
              </div>
            )}
            {selectedSymbTrPdfLayout && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                PDF vektör ölçü adayları: {selectedSymbTrPdfLayout.summary.measureCandidateCount} aday · {selectedSymbTrPdfLayout.summary.staffRowCount} porte satırı · doğrulama bekliyor.
                <p className="mt-1 text-xs text-amber-800">
                  Kaynak: {selectedSymbTrPdfLayout.source.archiveMemberPath}. Bu veriler kesin ölçü kutusu olarak işaretlenmez.
                </p>
                {selectedSymbTrPdfLayoutVerificationStatus && (
                  <p className="mt-1 text-xs text-amber-800">
                    Doğrulanmış PDF ölçü kutusu: {selectedSymbTrPdfLayoutVerificationStatus.verifiedMeasureBoxCount} · durum {selectedSymbTrPdfLayoutVerificationStatus.status}.
                  </p>
                )}
                {activeVerifiedPdfMeasureBox && (
                  <p className="mt-1 text-xs font-medium text-emerald-800">
                    Aktif doğrulanmış PDF ölçüsü: {activeVerifiedPdfMeasureBox.measureIndex}. ölçü · {activeVerifiedPdfMeasureBox.method} · {activeVerifiedPdfMeasureBox.reviewer}.
                  </p>
                )}
              </div>
            )}
            {selectedSymbTrPdfLayout && selectedSymbTrVerifiedPdfMeasureBoxes.length > 0 && (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-emerald-900">Doğrulanmış PDF ölçü haritası</p>
                  <span className="text-xs text-emerald-800">
                    {selectedSymbTrVerifiedPdfMeasureBoxes.length} kutu · {selectedSymbTrPdfLayout.source.archiveMemberPath}
                  </span>
                </div>
                <div
                  aria-label="Doğrulanmış PDF ölçü kutuları"
                  className="relative mt-3 w-full overflow-hidden rounded-sm border border-emerald-300 bg-white"
                  style={{
                    aspectRatio: `${selectedSymbTrPdfLayout.pageSize.width} / ${selectedSymbTrPdfLayout.pageSize.height}`,
                  }}
                >
                  {selectedSymbTrVerifiedPdfMeasureBoxes.map((box) => {
                    const activeBox = activeVerifiedPdfMeasureBox?.measureIndex === box.measureIndex;

                    return (
                      <div
                        key={`verified-pdf-measure-${box.measureIndex}`}
                        aria-hidden="true"
                        className={`pointer-events-none absolute rounded-[2px] border ${
                          activeBox
                            ? "border-emerald-700 bg-emerald-300/35 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]"
                            : "border-emerald-500/80 bg-emerald-200/20"
                        }`}
                        style={{
                          left: `${box.leftPercent}%`,
                          top: `${box.topPercent}%`,
                          width: `${box.widthPercent}%`,
                          height: `${box.heightPercent}%`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {selectedPiece.scorePageUrls.length > 0 && (
              <div className="mt-3 grid gap-2" style={{gridTemplateColumns: `repeat(${selectedPiece.scorePageUrls.length}, minmax(0, 1fr))`}}>
                {selectedPiece.scorePageUrls.map((url, index) => {
                  const activePage = activeVisualPageIndex === index;
                  return (
                    <div
                      key={`page-map-${url}`}
                      className={`overflow-hidden rounded border text-center text-xs ${
                        activePage
                          ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                          : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <div className="px-2 py-2">{index + 1}. sayfa</div>
                      <div className="h-1 bg-[var(--color-bg-muted)]">
                        <div
                          className="h-full bg-[var(--color-primary-500)] transition-[width]"
                          style={{width: activePage ? `${activeVisualBandProgress}%` : "0%"}}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Yakın notalar</p>
              <span className={`text-xs ${tokens.colors.text.secondary}`}>
                {currentEvent ? `${currentEvent.index}. olay` : "Hazır"}
              </span>
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {visibleScoreEvents.length > 0 ? visibleScoreEvents.map((event) => {
                const active = currentEvent?.index === event.index && currentEvent.startTime === event.startTime;

                return (
                  <div
                    key={`${event.index}-${event.startTime}`}
                    aria-current={active ? "true" : undefined}
                    className={`min-w-40 rounded-md border p-2 text-sm transition-colors ${
                      active
                        ? "border-[var(--color-primary-500)] bg-[var(--color-primary-100)] text-[var(--color-primary-700)] shadow-sm"
                        : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                      <span>#{event.index}</span>
                      <span>{(event.startBeat + 1).toFixed(event.startBeat % 1 === 0 ? 0 : 2)}. vuruş</span>
                    </div>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                  <span className="text-xl" aria-hidden="true">{event.notationSymbol}</span>
                  <span>{event.isRest ? "Es" : event.solfegePitch ?? event.sourcePitch}</span>
                </p>
                <p className="mt-1 text-xs">
                  SymbTr {event.sourcePitch} · {event.playbackPitch ?? "Sustain"} · {event.durationBeats.toFixed(event.durationBeats % 1 === 0 ? 0 : 2)} süre
                </p>
                  </div>
            );
              }) : (
                <div className="min-w-full rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-4 text-sm text-[var(--color-text-secondary)]">
                  Bu parça görsel nota olarak eklendi; otomatik olay şeridi için daha sonra MusicXML veya SymbTr eşlemesi bağlanabilir.
                </div>
              )}
            </div>
          </div>
      </Panel>
  );
}
