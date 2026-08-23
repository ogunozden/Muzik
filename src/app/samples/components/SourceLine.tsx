import {tokens} from "@/shared/tokens";
import type {FolderProvenance} from "@/app/samples/components/types";

/**
 * Bu klasorun sesi NEREDEN geldi? (PLAN.md §11/H4)
 *
 * Kayit `public/samples/provenance.json`de durur. Amac klasorleri "belgeli"
 * gostermek degil, belgesizligi GORUNUR kilmak: kaynagi bilinmeyen klasor
 * bos gecilmez, "bilinmiyor" yazar.
 */
export function SourceLine({record}: {record: FolderProvenance | null}) {
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
      {record.nextRescanAt ? <> · sonraki tarama: {record.nextRescanAt}</> : null}
    </p>
  );
}
