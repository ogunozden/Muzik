"use client";

import { useEffect, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import { UnifiedLayout } from "@/shared/ui/layout/UnifiedLayout";
import { tokens } from "@/shared/tokens";
import { Badge, Button, Card, CardBody, PageHeader, PageShell } from "@/shared/ui";
import { LibraryTabs } from "@/features/library/LibraryTabs";
import Link from "next/link";
import dynamic from "next/dynamic";
import { NotaEvent } from "@/types";

// Dynamic import for VexFlow Viewer to prevent SSR issues
const VexFlowViewer = dynamic(
  () => import("@/shared/ui/organisms/VexFlowViewer").then((mod) => mod.VexFlowViewer),
  { ssr: false, loading: () => <div className="h-24 bg-gray-100 rounded animate-pulse" /> }
);

interface ScoreRecord {
  id: number;
  title: string;
  composer: string | null;
  makam: string;
  usul: string;
  form: string | null;
  notesData: NotaEvent[];
  createdAt: string;
}

function ArchivePage() {
  const { t } = useTranslation();
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScores() {
      try {
        const res = await fetch("/api/scores");
        if (!res.ok) throw new Error("Veriler yüklenemedi");
        const data = await res.json();
        setScores(data.scores || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScores();
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/scores/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Silme işlemi başarısız");

      setScores((prev) => prev.filter((s) => s.id !== id));
      setPendingDeleteId(null);
      setStatusMessage(t("archive.deleteSuccess"));
    } catch (err) {
      setStatusMessage((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <UnifiedLayout>
      <PageShell className="max-w-6xl">
        <PageHeader
          meta="Yerel arşiv"
          title={t("nav.archive", "Eser Arşivi")}
          description="Veritabanına kaydedilmiş Türk Müziği eserleri."
          actions={(
          <Link href="/studio">
            <Button variant="primary">Yeni Eser Kaydet</Button>
          </Link>
          )}
        />

        <LibraryTabs />

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <Card className={`${tokens.colors.background.surface} border-red-200 border`}>
            <CardBody className="p-6 text-center text-red-500">
              <p>Hata oluştu: {error}</p>
            </CardBody>
          </Card>
        ) : scores.length === 0 ? (
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border text-center p-12`}>
            <CardBody className="flex flex-col items-center justify-center">
              <span className="text-4xl mb-4">📇</span>
              <h3 className="text-xl font-medium mb-2">Arşiv Boş</h3>
              <p className={tokens.colors.text.secondary}>
                Henüz hiç eser kaydedilmemiş. Editör sayfasından eser oluşturup kaydedebilirsiniz.
              </p>
            </CardBody>
          </Card>
        ) : (
          <>
            {statusMessage && (
              <div className={`mb-4 ${tokens.colors.background.surface} ${tokens.colors.border.base} ${tokens.radius.md} border px-4 py-3 text-sm ${tokens.colors.text.primary}`}>
                {statusMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scores.map((score) => (
                <Card key={score.id} className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border hover:shadow-md transition-shadow`}>
                  <CardBody className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold truncate pr-2" title={score.title}>
                        {score.title}
                      </h3>
                      <Badge color="primary" size="sm">{score.makam}</Badge>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <Badge color="secondary" size="sm" variant="outline">Usul: {score.usul}</Badge>
                      <Badge color="secondary" size="sm" variant="outline">
                        {score.notesData.length} Nota
                      </Badge>
                    </div>

                    <div className="flex-1 overflow-hidden opacity-50 pointer-events-none -mx-2 mb-4 h-24 mask-image-bottom">
                      {/* Sadece eserin ufak bir önizlemesi */}
                      {score.notesData && score.notesData.length > 0 && (
                        <VexFlowViewer notes={score.notesData.slice(0, 10)} width={300} height={100} />
                      )}
                    </div>

                    {pendingDeleteId === score.id && (
                      <div className={`mb-3 ${tokens.radius.md} bg-[var(--color-bg-muted)] p-3 text-sm ${tokens.colors.text.primary}`}>
                        {t("archive.deleteConfirm")}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-auto">
                      <span className="text-xs text-gray-400">
                        {new Date(score.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                      <div className="flex flex-wrap justify-end gap-2">
                        {pendingDeleteId === score.id ? (
                          <>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={deletingId === score.id}
                              onPress={() => void handleDelete(score.id)}
                            >
                              {deletingId === score.id ? t("common.loading") : t("common.confirm")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deletingId === score.id}
                              onPress={() => setPendingDeleteId(null)}
                            >
                              {t("common.cancel")}
                            </Button>
                          </>
                        ) : (
                          <Button variant="danger" size="sm" onPress={() => setPendingDeleteId(score.id)}>
                            {t("common.delete")}
                          </Button>
                        )}
                        <Link href={`/studio?load=${score.id}`}>
                          <Button variant="outline" size="sm">{t("common.edit")}</Button>
                        </Link>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </>
        )}
      </PageShell>
    </UnifiedLayout>
  );
}

export default memo(ArchivePage);
