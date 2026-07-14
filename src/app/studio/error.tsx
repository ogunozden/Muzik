"use client";

import {useEffect} from "react";
import {StatusScreen} from "@/shared/ui/feedback/StatusScreen";

export default function StudioError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  useEffect(() => {
    console.error("[studio] Route render error:", error);
  }, [error]);

  return (
    <StatusScreen
      tone="error"
      title="Çalışma tezgahı yüklenemedi"
      description="Skor/takip yüzeyi hazırlanırken hata oluştu. Tekrar deneyin."
      action={
        <button
          type="button"
          onClick={reset}
          className="inline-flex rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{backgroundColor: "var(--color-primary-500)"}}
        >
          Tekrar dene
        </button>
      }
    />
  );
}
