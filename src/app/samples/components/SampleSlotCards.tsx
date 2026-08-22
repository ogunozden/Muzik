import {tokens} from "@/shared/tokens";
import {ProvenanceNotice} from "@/app/samples/components/ProvenanceNotice";
import {formatBytes, formatDate} from "@/app/samples/components/sample-utils";
import type {SampleSlotStatus} from "@/app/samples/components/types";
import type {ChangeEvent} from "react";

interface SampleSlotCardsProps {
  slots: SampleSlotStatus[];
  isLoading: boolean;
  uploadingKey: string | null;
  onUpload: (slotKey: string, event: ChangeEvent<HTMLInputElement>) => void;
  onPreview: (slot: SampleSlotStatus) => void;
  onDelete: (slotKey: string) => void;
}

export function SampleSlotCards({slots, isLoading, uploadingKey, onUpload, onPreview, onDelete}: SampleSlotCardsProps) {
  return (
    <div className="space-y-3 p-3 md:hidden">
      {isLoading ? (
        <div className={`${tokens.colors.text.secondary} py-6 text-sm`}>Ses kütüphanesi okunuyor...</div>
      ) : (
        slots.map((slot) => (
          <div key={slot.key} className="rounded-md border border-[var(--color-border)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`font-medium ${tokens.colors.text.primary}`}>{slot.label}</div>
                <div className={`text-xs ${tokens.colors.text.secondary}`}>{slot.category === "melodic" ? "Melodik" : "Vurmalı"}</div>
              </div>
              <span
                className={`shrink-0 rounded-sm px-2 py-1 text-xs ${slot.installed ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-border)] text-[var(--color-text-primary)]"}`}
              >
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
              <label
                className={`cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-2 text-xs ${tokens.colors.text.primary} hover:border-[var(--color-secondary)]`}
              >
                {uploadingKey === slot.key ? "Yükleniyor" : "Yükle"}
                <input
                  type="file"
                  accept="audio/*,.wav,.mp3,.ogg,.flac"
                  className="sr-only"
                  disabled={uploadingKey !== null}
                  onChange={(event) => void onUpload(slot.key, event)}
                />
              </label>
              <button
                type="button"
                disabled={!slot.installed || uploadingKey !== null}
                onClick={() => onPreview(slot)}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-primary)] disabled:opacity-40"
              >
                Dinle
              </button>
              <button
                type="button"
                disabled={!slot.installed || uploadingKey !== null}
                onClick={() => void onDelete(slot.key)}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-error)] disabled:opacity-40"
              >
                Sil
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
