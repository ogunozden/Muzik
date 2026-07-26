"use client";

import {useState, useMemo} from "react";
import {PageShell, Badge} from "@/shared/ui";
import exerciseIndex from "@/data/exercise-index.json";

interface Exercise {
  makam: string;
  form: string;
  title: string;
  ocr_page: number;
  usul: string;
}

const exercises: Exercise[] = exerciseIndex.exercises;

const ALL_MAKAMS = [...new Set(exercises.map((e) => e.makam))].sort();

export default function ExerciseIndexPage() {
  const [selectedMakam, setSelectedMakam] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!selectedMakam) return exercises;
    return exercises.filter((e) => e.makam === selectedMakam);
  }, [selectedMakam]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageShell>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          Alıştırma Dizini
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Gönül, Türk Musikisinde Usuller ve Kudüm — {exercises.length} alıştırma indekslendi.
          280 sayfa taranabilir.
        </p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className={`rounded-md px-3 py-1.5 text-sm ${!selectedMakam ? "bg-[var(--color-primary-600)] text-white" : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]"}`}
            onClick={() => setSelectedMakam("")}
          >
            Tümü
          </button>
          {ALL_MAKAMS.map((m) => (
            <button
              key={m}
              className={`rounded-md px-3 py-1.5 text-sm ${selectedMakam === m ? "bg-[var(--color-primary-600)] text-white" : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]"}`}
              onClick={() => setSelectedMakam(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Indexed exercises */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex, i) => (
            <button
              key={i}
              className="rounded-lg border border-[var(--color-border-default)] bg-white p-4 text-left shadow-sm transition hover:shadow-md"
              onClick={() => setSelectedPage(ex.ocr_page)}
            >
              <div className="text-base font-semibold text-[var(--color-text-primary)]">
                {ex.makam}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ex.form && (
                  <Badge variant="solid" size="sm">
                    {ex.form}
                  </Badge>
                )}
                <Badge variant="outline" size="sm">
                  {ex.usul}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                Sayfa {ex.ocr_page}
              </div>
            </button>
          ))}
        </div>

        {/* Page viewer */}
        {selectedPage && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Sayfa {selectedPage}
              </h2>
              <button
                className="rounded-md bg-[var(--color-bg-muted)] px-3 py-1 text-sm text-[var(--color-text-secondary)]"
                onClick={() => setSelectedPage(null)}
              >
                Kapat
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-white shadow">
              <img
                src={`/exercises/page_${String(selectedPage).padStart(3, "0")}.png`}
                alt={`Sayfa ${selectedPage}`}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Page browser */}
        {!selectedPage && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              Tüm Sayfalar
            </h2>
            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              Kitabın tamamı (~280 sayfa) taranabilir. Alıştırmalar sayfa 100-280 arasındadır.
            </p>
            <div className="flex flex-wrap gap-1">
              {Array.from({length: 280}, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  className="flex h-8 w-10 items-center justify-center rounded border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
                  onClick={() => setSelectedPage(pg)}
                >
                  {pg}
                </button>
              ))}
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}
