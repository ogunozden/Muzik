import {tokens} from "@/shared/tokens";
import type {SampleSlotStatus} from "@/app/samples/components/types";

export function ProvenanceNotice({slot}: {slot: SampleSlotStatus}) {
  if (!slot.derivedFrom && !slot.extrapolatedFrom && slot.matchesManifest !== false) return null;

  const noticeClass =
    "mt-2 rounded-sm border border-[var(--color-warning)] px-2 py-1 text-xs text-[var(--color-text-primary)]";

  const isHekDerived = Boolean(slot.derivedFrom && slot.derivedFrom.includes("dum") && slot.derivedFrom.includes("tek"));

  return (
    <>
      {slot.derivedFrom ? (
        <>
          <p className={noticeClass}>
            <strong>Türetilmiş ses</strong> — gerçek kayıt değil, {slot.derivedFrom} ile üretildi.
          </p>
          {isHekDerived ? (
            <p className={`mt-1 text-[10px] ${tokens.colors.text.secondary}`}>
              Gerçek hek kaydı arandı, bulunamadı — 354 bölge tarandı, <code>provenance.json → hekSearch</code> ve{" "}
              <code>hekSearch.kudumRecordingProbe</code> görünür (FAZ D dış girdi).
            </p>
          ) : null}
        </>
      ) : null}
      {slot.extrapolatedFrom ? (
        <p className={noticeClass}>
          <strong>Gerilmiş perde</strong> — {slot.extrapolatedFrom}.
        </p>
      ) : null}
      {slot.matchesManifest === false ? (
        <p className={noticeClass}>
          <strong>Kaynak kaydı bu dosyayı kapsamıyor</strong> — dosya depodaki sürümden farklı (bu ekrandan yüklenmiş
          olabilir). Klasörün &quot;kaynak&quot; bilgisi bu ses için geçerli değildir.
        </p>
      ) : null}
    </>
  );
}
