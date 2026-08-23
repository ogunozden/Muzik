import {tokens} from "@/shared/tokens";
import {ProvenanceNotice} from "@/app/samples/components/ProvenanceNotice";
import {formatBytes, formatDate} from "@/app/samples/components/sample-utils";
import type {SampleSlotStatus} from "@/app/samples/components/types";
import type {ChangeEvent} from "react";

interface SampleSlotTableProps {
  slots: SampleSlotStatus[];
  isLoading: boolean;
  uploadingKey: string | null;
  onUpload: (slotKey: string, event: ChangeEvent<HTMLInputElement>) => void;
  onPreview: (slot: SampleSlotStatus) => void;
  onDelete: (slotKey: string) => void;
}

export function SampleSlotTable({slots, isLoading, uploadingKey, onUpload, onPreview, onDelete}: SampleSlotTableProps) {
  return (
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
            slots.map((slot) => (
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
                  <span
                    className={`rounded-sm px-2 py-1 text-xs ${slot.installed ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-border)] text-[var(--color-text-primary)]"}`}
                  >
                    {slot.installed ? "Hazır" : "Eksik"}
                  </span>
                </td>
                <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatBytes(slot.size)}</td>
                <td className={`px-4 py-3 ${tokens.colors.text.secondary}`}>{formatDate(slot.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
