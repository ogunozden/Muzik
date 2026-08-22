"use client";

import {useCallback, useEffect, useMemo, useState, type ChangeEvent} from "react";
import {clearSampleCache, playNote, playRhythm} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";
import type {FolderProvenance, SampleCoverageSummary, SampleGroup, SampleSlotStatus, SamplesResponse} from "@/app/samples/components/types";

export function useSamples() {
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

  const groups: SampleGroup[] = useMemo(() => {
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

  const activeSlots = useMemo(() => groups.find((group) => group.label === activeGroup)?.slots ?? [], [activeGroup, groups]);

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

  const uploadSample = useCallback(
    async (slotKey: string, event: ChangeEvent<HTMLInputElement>) => {
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
    },
    [opsToken, updateSlot],
  );

  const deleteSample = useCallback(
    async (slotKey: string) => {
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
    },
    [opsToken, updateSlot],
  );

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

  return {
    slots,
    coverage,
    groups,
    activeGroup,
    setActiveGroup,
    activeSlots,
    activeProvenance,
    installedCount,
    isLoading,
    uploadingKey,
    message,
    opsToken,
    setOpsToken,
    refreshSlots,
    uploadSample,
    deleteSample,
    previewSample,
    testActiveGroup,
  };
}
