import Link from "next/link";
import {StatusScreen} from "@/shared/ui/feedback/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      tone="empty"
      title="Sayfa bulunamadı"
      description="Aradığınız sayfa taşınmış veya hiç var olmamış olabilir."
      action={
        <Link
          href="/"
          className="inline-flex rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{backgroundColor: "var(--color-primary-500)"}}
        >
          Ana sayfaya dön
        </Link>
      }
    />
  );
}
