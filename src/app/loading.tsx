import {StatusScreen} from "@/shared/ui/feedback/StatusScreen";

export default function RootLoading() {
  return <StatusScreen tone="loading" title="Yükleniyor…" description="İçerik hazırlanıyor." />;
}
