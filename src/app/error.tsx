"use client";

import {useEffect} from "react";
import {StatusScreen} from "@/shared/ui/feedback/StatusScreen";

/**
 * Kok hata siniri (App Router). Bir route render'inda beklenmeyen hata olursa
 * bos ekran yerine bu yuzey gosterilir ve `reset` ile yeniden denenebilir.
 */
export default function RootError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  useEffect(() => {
    console.error("[app] Route render error:", error);
  }, [error]);

  return (
    <StatusScreen
      tone="error"
      title="Bir şeyler ters gitti"
      description="Bu bölüm yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilirsiniz."
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
