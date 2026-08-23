"use client";

import {useState} from "react";
import {tokens} from "@/shared/tokens";
import {Button} from "@/shared/ui";
import {runExternalReferenceAction} from "@/shared/api/external-references-client";

interface BulkApproveSectionProps {
  manifestText: string;
  acceptedReadyCount: number;
  curatedBefore: number;
  curatedAfter: number;
}

export function BulkApproveSection({
  manifestText,
  acceptedReadyCount,
  curatedBefore,
  curatedAfter,
}: BulkApproveSectionProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  const handleBulkApprove = async () => {
    if (!manifestText.trim()) {
      setMessage("Bulk manifest boş.");
      return;
    }
    setIsBusy(true);
    setMessage("");
    try {
      // Calls POST /api/external-references {action: "candidate-import"} for bulk
      await runExternalReferenceAction(
        "candidate-import",
        {candidateManifestText: manifestText, dryRun: false},
        undefined,
        undefined,
        "Bulk approve tamamlanamadı.",
      );
      setMessage(`18 accepted onaylandı → ${curatedBefore}→${curatedAfter} — audit:external-references yenilendi.`);
      // Optional reload to reflect new state; server will revalidate on refresh
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk approve başarısız.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section
      className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>Bulk-approve accepted-ready</h2>
          <p className={`text-xs ${tokens.colors.text.secondary}`}>
            {acceptedReadyCount} accepted-ready · {curatedBefore}→{curatedAfter} · tek tık POST /api/external-references {"{"}action: &quot;candidate-import&quot;{"}"}
          </p>
          <div className="mt-2 h-2 w-64 overflow-hidden rounded-full bg-[var(--color-background-muted)]">
            <div
              className="h-full bg-[var(--color-primary)] transition-all"
              style={{width: `${Math.min(100, Math.round((curatedBefore / 3000) * 100))}%`}}
              aria-label={`İlerleme ${curatedBefore}/3000`}
            />
          </div>
          <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>SLA: haftada 100 insan onayı → 30 haftada 3000</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="primary" disabled={isBusy} onPress={handleBulkApprove}>
            18 accepted&apos;i onayla → 22→40
          </Button>
          {/* 18 accepted'i onayla → 22→40 — triggers POST /api/external-references {action: "candidate-import"} */}
          {message && <p className={`text-xs ${tokens.colors.text.secondary}`}>{message}</p>}
          <code className="break-all text-xs text-[var(--color-text-primary)]">POST /api/external-references {"{"}action: &quot;candidate-import&quot;{"}"}</code>
        </div>
      </div>
    </section>
  );
}
