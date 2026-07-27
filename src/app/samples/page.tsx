"use client";

import {ChangeEvent, useCallback, useEffect, useMemo, useState} from "react";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {clearSampleCache, playNote, playRhythm} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";
import {Button, PageHeader, PageShell} from "@/shared/ui";
import {LibraryTabs} from "@/features/library/LibraryTabs";
import {tokens} from "@/shared/tokens";

interface SampleSlotStatus {
  key: string;
  category: "melodic" | "percussion";
  instrumentId: string;
  instrumentName: string;
  groupLabel: string;
  label: string;
  fileName: string;
  relativePath: string;
  url: string;
  installed: boolean;
  size: number;
  updatedAt: string | null;
  /** Dolu ise bu ses gerçek bir kayıt değil, türetilmiştir (PLAN.md §10/F3). */
  derivedFrom?: string | null;
  /** Dolu ise bu perde kaynak kayıtların dışında, gerilerek üretilmiştir (F2). */
  extrapolatedFrom?: string | null;
  /**
   * Dosya, commit'li manifestodaki hash'i tutuyor mu?
   *
   * `false` ise dosya değişmiştir (tipik olarak buradan yüklenmiştir) ve
   * klasörün kaynak kaydı **bu dosyayı kapsamaz**. `null` = manifestoda yok.
   */
  matchesManifest?: boolean | null;
}

interface SampleCoverageSummary {
  totalSlots: number;
  installedSlots: number;
  missingSlots: number;
  instrumentCount: number;
  playableInstrumentCount: number;
  synthFallbackInstrumentCount: number;
  melodicInstrumentCount: number;
  percussionInstrumentCount: number;
}

/** Bir ses klasorunun kaynagi (PLAN.md §11/H4). */
interface FolderProvenance {
  sourceId: string | null;
  presets: string[] | null;
  producer: string | null;
  confidence: "documented" | "measured" | "claimed" | "unknown";
  note?: string;
  license?: string | null;
  origin?: string | null;
}

interface SamplesResponse {
  total: number;
  installed: number;
  coverage?: SampleCoverageSummary;
  slots: SampleSlotStatus[];
  provenance?: Record<string, FolderProvenance>;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Bu ses gercek bir kayit mi? (PLAN.md §10/F2-F3)
 *
 * Iki ayri durum, ikisi de "bu perdenin gercek kaydi degil" demek:
 *  - `derivedFrom`      : ses baska SESLERDEN sentezlendi (hek = dum+tek).
 *  - `extrapolatedFrom` : gercek kayit var ama BASKA BIR PERDEDEN gerildi.
 *
 * Sayfada iki duzen var (dar ekranda kart, genis ekranda tablo). Uyari tek
 * yerde yazilir ki ikisinden birinde unutulmasin — ilk denemede tam olarak
 * bu oldu: uyari yalniz kart duzenine konmustu ve masaustunde gorunmuyordu.
 */
function ProvenanceNotice({slot}: {slot: SampleSlotStatus}) {
  if (!slot.derivedFrom && !slot.extrapolatedFrom && slot.matchesManifest !== false) return null;

  const noticeClass =
    "mt-2 rounded-sm border border-[var(--color-warning)] px-2 py-1 text-xs text-[var(--color-text-primary)]";

  return (
    <>
      {slot.derivedFrom ? (
        <p className={noticeClass}>
          <strong>Türetilmiş ses</strong> — gerçek kayıt değil, {slot.derivedFrom} ile üretildi.
        </p>
      ) : null}
      {slot.extrapolatedFrom ? (
        <p className={noticeClass}>
          <strong>Gerilmiş perde</strong> — {slot.extrapolatedFrom}.
        </p>
      ) : null}
      {slot.matchesManifest === false ? (
        <p className={noticeClass}>
          <strong>Kaynak kaydı bu dosyayı kapsamıyor</strong> — dosya depodaki
          sürümden farklı (bu ekrandan yüklenmiş olabilir). Klasörün
          &quot;kaynak&quot; bilgisi bu ses için geçerli değildir.
        </p>
      ) : null}
    </>
  );
}

/**
 * Bu klasorun sesi NEREDEN geldi? (PLAN.md §11/H4)
 *
 * Kayit `public/samples/provenance.json`de durur. Amac klasorleri "belgeli"
 * gostermek degil, belgesizligi GORUNUR kilmak: kaynagi bilinmeyen klasor
 * bos gecilmez, "bilinmiyor" yazar.
 */
function SourceLine({record}: {record: FolderProvenance | null}) {
  if (!record) return null;

  if (record.confidence === "unknown") {
    return (
      <p className="mt-1 text-xs text-[var(--color-text-primary)]">
        <strong>Kaynak bilinmiyor</strong> — bu klasörün nereden üretildiği kayıtlı değil.
      </p>
    );
  }

  // Preset YALNIZ soundfont kaynaklarinda var. Kayittan kesilen klasorlerde
  // (`kudum`) preset yok; orada kaynagin kimligi gosterilir — yoksa ekranda
  // "Kaynak:" bos kalirdi.
  const label = record.presets?.join(", ") ?? record.sourceId ?? "bilinmiyor";
  return (
    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
      Kaynak: <strong>{label}</strong>
      {record.license ? <> · {record.license}</> : null}
      {record.confidence === "documented" ? (
        <> · üretici <code>{record.producer}</code> · yeniden üretilebilir</>
      ) : record.confidence === "measured" ? (
        <> · ölçümle doğrulandı · üretim parametreleri kayıtlı değil</>
      ) : (
        <> · üretim parametreleri kayıtlı değil (yalnız preset adı biliniyor)</>
      )}
    </p>
  );
}

export default function SeslerPage() {
  const [slots, setSlots] = useState<SampleSlotStatus[]>([]);
  const [coverage, setCoverage] = useState<SampleCoverageSummary | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [opsToken, setOpsToken] = useState("");
  const [provenance, setProvenance] = useState<Record<string, FolderProvenance>>({});

  const loadSlots = useCallback(async () => {
    clearSampleCache();
    const response = await fetch("/api/samples", {cache: "no-store"});
    return (await response.json()) as SamplesResponse;
  }, []);

  const applySlots = useCallback((data: SamplesResponse) => {
    setSlots(data.slots);
    setCoverage(data.coverage ?? null);
    setProvenance(data.provenance ?? {});
    setActiveGroup((current) => current || data.slots[0]?.groupLabel || "");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadSlots()
      .then((data) => {
        if (!cancelled) applySlots(data);
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Ses kütüphanesi okunamadı.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applySlots, loadSlots]);

  const refreshSlots = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await loadSlots();
      applySlots(data);
    } catch {
      setMessage("Ses kütüphanesi okunamadı.");
      setIsLoading(false);
    }
  }, [applySlots, loadSlots]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SampleSlotStatus[]>();

    for (const slot of slots) {
      const current = grouped.get(slot.groupLabel) ?? [];
      current.push(slot);
      grouped.set(slot.groupLabel, current);
    }

    return Array.from(grouped.entries()).map(([label, groupSlots]) => ({
      label,
      slots: groupSlots,
      installed: groupSlots.filter((slot) => slot.installed).length,
      total: groupSlots.length,
    }));
  }, [slots]);

  const activeSlots = useMemo(
    () => groups.find((group) => group.label === activeGroup)?.slots ?? [],
    [activeGroup, groups],
  );

  /** Aktif enstrumanin ses klasoru (`ney`, `kudum`, ...) ve kaynak kaydi. */
  const activeProvenance = useMemo(() => {
    const relativePath = activeSlots[0]?.relativePath ?? "";
    const folder = relativePath.split("/")[0];
    return folder ? (provenance[folder] ?? null) : null;
  }, [activeSlots, provenance]);

  const installedCount = slots.filter((slot) => slot.installed).length;
  const activeGroupInstalledCount = activeSlots.filter((slot) => slot.installed).length;

  const updateSlot = useCallback((slot: SampleSlotStatus) => {
    setSlots((current) => current.map((item) => (item.key === slot.key ? slot : item)));
    clearSampleCache();
  }, []);

  const uploadSample = useCallback(async (slotKey: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) return;

    setUploadingKey(slotKey);
    setMessage("");

    const formData = new FormData();
    formData.append("slotKey", slotKey);
    formData.append("file", file);

    try {
      const response = await fetch("/api/samples", {
        method: "POST",
        headers: opsToken ? {"x-sample-operations-token": opsToken} : undefined,
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Sample kaydedilemedi.");
      }

      updateSlot(data.slot as SampleSlotStatus);
      setMessage("Sample güncellendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sample kaydedilemedi.");
    } finally {
      setUploadingKey(null);
    }
  }, [opsToken, updateSlot]);

  const deleteSample = useCallback(async (slotKey: string) => {
    setUploadingKey(slotKey);
    setMessage("");

    try {
      const response = await fetch("/api/samples", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(opsToken ? {"x-sample-operations-token": opsToken} : {}),
        },
        body: JSON.stringify({slotKey}),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Sample silinemedi.");
      }

      updateSlot(data.slot as SampleSlotStatus);
      setMessage("Sample silindi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sample silinemedi.");
    } finally {
      setUploadingKey(null);
    }
  }, [opsToken, updateSlot]);

  const previewSample = useCallback((slot: SampleSlotStatus) => {
    if (!slot.installed) return;

    const audio = new Audio(`${slot.url}?v=${Date.now()}`);
    void audio.play().catch(() => setMessage("Önizleme başlatılamadı."));
  }, []);

  const testActiveGroup = useCallback(async () => {
    const firstSlot = activeSlots[0];
    if (!firstSlot) return;

    const instrument = firstSlot.instrumentId as InstrumentType;
    setMessage(
      activeGroupInstalledCount === 0
        ? `${activeGroup || "Bu enstrüman"} için sample yüklü değil; synth fallback ile test ediliyor.`
        : "",
    );

    try {
      if (firstSlot.category === "melodic") {
        await playNote(60, 0.7, instrument);
      } else {
        await playRhythm(
          3,
          [
            {beat: 1, symbol: "dum", isAccent: true},
            {beat: 2, symbol: "tek", isAccent: false},
            {beat: 3, symbol: "ke", isAccent: false},
          ],
          96,
          instrument,
        );
      }
    } catch {
      setMessage("Test sesi başlatılamadı.");
    }
  }, [activeGroup, activeGroupInstalledCount, activeSlots]);

  return (
    <UnifiedLayout>
      <PageShell>
        <PageHeader
          meta="Enstrüman sesleri"
          title="Ses Kütüphanesi"
          description="Her slot sabit bir dosya adına yazılır. Sample yüklü değilse test ve çalma akışı synth fallback ile devam eder."
          actions={(
          <div className={`rounded-md border ${tokens.colors.border.base} ${tokens.colors.background.surface} px-3 py-2 text-sm ${tokens.colors.text.secondary}`}>
            {installedCount} / {slots.length} sample hazır
          </div>
          )}
        />

        <LibraryTabs />

        <form
          className={`mb-4 grid gap-2 border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-3 md:max-w-md`}
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            type="text"
            name="username"
            value="local-sample-ops"
            className="hidden"
            readOnly
            autoComplete="username"
            aria-hidden="true"
            tabIndex={-1}
          />
          <label className={`text-xs font-medium ${tokens.colors.text.secondary}`} htmlFor="sample-ops-token">
            Operasyon token
          </label>
          <input
            id="sample-ops-token"
            type="password"
            value={opsToken}
            onChange={(event) => setOpsToken(event.target.value)}
            className={`w-full rounded-md border ${tokens.colors.border.base} ${tokens.colors.background.base} px-3 py-2 text-sm ${tokens.colors.text.primary}`}
            autoComplete="new-password"
          />
        </form>

        {coverage && (
          <section className="mb-6 grid gap-3 md:grid-cols-4" aria-label="Sample coverage">
            <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-3`}>
              <div className={`text-xs ${tokens.colors.text.secondary}`}>Çalınabilir enstrüman</div>
              <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
                {coverage.playableInstrumentCount} / {coverage.instrumentCount}
              </div>
            </div>
            <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-3`}>
              <div className={`text-xs ${tokens.colors.text.secondary}`}>Sample slot</div>
              <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
                {coverage.installedSlots} / {coverage.totalSlots}
              </div>
            </div>
            <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-3`}>
              <div className={`text-xs ${tokens.colors.text.secondary}`}>Synth fallback</div>
              <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
                {coverage.synthFallbackInstrumentCount}
              </div>
            </div>
            <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-3`}>
              <div className={`text-xs ${tokens.colors.text.secondary}`}>Aileler</div>
              <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
                {coverage.melodicInstrumentCount} ezgi · {coverage.percussionInstrumentCount} vurmalı
              </div>
            </div>
          </section>
        )}

        {message && (
          <div className={`mb-4 border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} px-4 py-3 text-sm ${tokens.colors.text.primary}`}>
            {message}
          </div>
        )}

        <div className="mb-6 flex w-full max-w-full flex-wrap gap-2 pb-2 md:flex-nowrap md:overflow-x-auto">
          {groups.map((group) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveGroup(group.label)}
              className={`min-w-max rounded-md border px-3 py-2 text-sm transition-colors ${
                activeGroup === group.label
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-secondary)]"
              }`}
            >
              {group.label} {group.installed}/{group.total}
            </button>
          ))}
        </div>

        <section className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}>
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>{activeGroup || "Sample slotları"}</h2>
              <p className={`text-xs ${tokens.colors.text.secondary}`}>WAV önerilir; tarayıcının çözdüğü ses formatları da kullanılabilir.</p>
              <SourceLine record={activeProvenance} />
            </div>
            <div className="flex gap-2">
              <Button variant="accent" size="sm" ariaLabel={`${activeGroup} test`} onPress={() => void testActiveGroup()}>
                Enstrümanı Test Et
              </Button>
              <Button variant="secondary" size="sm" ariaLabel="Yenile" onPress={() => void refreshSlots()}>
                Yenile
              </Button>
            </div>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {isLoading ? (
              <div className={`${tokens.colors.text.secondary} py-6 text-sm`}>
                Ses kütüphanesi okunuyor...
              </div>
            ) : (
              activeSlots.map((slot) => (
                <div key={slot.key} className="rounded-md border border-[var(--color-border)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`font-medium ${tokens.colors.text.primary}`}>{slot.label}</div>
                      <div className={`text-xs ${tokens.colors.text.secondary}`}>{slot.category === "melodic" ? "Melodik" : "Vurmalı"}</div>
                    </div>
                    <span className={`shrink-0 rounded-sm px-2 py-1 text-xs ${slot.installed ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-border)] text-[var(--color-text-primary)]"}`}>
                      {slot.installed ? "Hazır" : "Eksik"}
                    </span>
                  </div>

                  <ProvenanceNotice slot={slot} />

                  <code className="mt-3 block break-all text-xs text-[var(--color-text-primary)]">{slot.relativePath}</code>

                  <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${tokens.colors.text.secondary}`}>
                    <div>Boyut: {formatBytes(slot.size)}</div>
                    <div>Güncelleme: {formatDate(slot.updatedAt)}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className={`cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-2 text-xs ${tokens.colors.text.primary} hover:border-[var(--color-secondary)]`}>
                      {uploadingKey === slot.key ? "Yükleniyor" : "Yükle"}
                      <input
                        type="file"
                        accept="audio/*,.wav,.mp3,.ogg,.flac"
                        className="sr-only"
                        disabled={uploadingKey !== null}
                        onChange={(event) => void uploadSample(slot.key, event)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!slot.installed || uploadingKey !== null}
                      onClick={() => previewSample(slot)}
                      className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-primary)] disabled:opacity-40"
                    >
                      Dinle
                    </button>
                    <button
                      type="button"
                      disabled={!slot.installed || uploadingKey !== null}
                      onClick={() => void deleteSample(slot.key)}
                      className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-error)] disabled:opacity-40"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden w-full max-w-full overflow-x-auto md:block">
            <table className="w-full min-w-[840px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-secondary)]">
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Dosya</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Boyut</th>
                  <th className="px-4 py-3 font-medium">Güncelleme</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className={`px-4 py-8 ${tokens.colors.text.secondary}`} colSpan={6}>
                      Ses kütüphanesi okunuyor...
                    </td>
                  </tr>
                ) : (
                  activeSlots.map((slot) => (
                    <tr key={slot.key} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-4 py-3">
                        <div className={`font-medium ${tokens.colors.text.primary}`}>{slot.label}</div>
                        <div className={`text-xs ${tokens.colors.text.secondary}`}>{slot.category === "melodic" ? "Melodik" : "Vurmalı"}</div>
                        <ProvenanceNotice slot={slot} />
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-[var(--color-text-primary)]">{slot.relativePath}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-sm px-2 py-1 text-xs ${slot.installed ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-border)] text-[var(--color-text-primary)]"}`}>
                          {slot.installed ? "Hazır" : "Eksik"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatBytes(slot.size)}</td>
                      <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatDate(slot.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <label className={`cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-2 text-xs ${tokens.colors.text.primary} hover:border-[var(--color-secondary)]`}>
                            {uploadingKey === slot.key ? "Yükleniyor" : "Yükle"}
                            <input
                              type="file"
                              accept="audio/*,.wav,.mp3,.ogg,.flac"
                              className="sr-only"
                              disabled={uploadingKey !== null}
                              onChange={(event) => void uploadSample(slot.key, event)}
                            />
                          </label>
                          <button
                            type="button"
                            disabled={!slot.installed || uploadingKey !== null}
                            onClick={() => previewSample(slot)}
                            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-primary)] disabled:opacity-40"
                          >
                            Dinle
                          </button>
                          <button
                            type="button"
                            disabled={!slot.installed || uploadingKey !== null}
                            onClick={() => void deleteSample(slot.key)}
                            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-error)] disabled:opacity-40"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </PageShell>
    </UnifiedLayout>
  );
}
