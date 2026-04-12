/**
 * UI Components - Dynamic Imports
 * 
 * Heavy componentleri dynamic import ile lazy load
 * Sayfa geçişlerinde performans artışı
 */

import dynamic from "next/dynamic";

/**
 * Virtual Piano - Ağır piyano componenti
 * Sadece nota-editor ve recording sayfalarında kullanılır
 */
export const VirtualPiano = dynamic(
  () => import("../organisms/VirtualPiano").then((mod) => mod.VirtualPiano),
  {
    loading: () => <PianoLoadingSkeleton />,
    ssr: false, // Client-side only (audio API)
  }
);

/**
 * Piano Roll - Nota görselleştirme
 * Sadece nota-editor sayfasında kullanılır
 */
export const PianoRoll = dynamic(
  () => import("../organisms/PianoRollViewer").then((mod) => mod.PianoRollViewer),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false,
  }
);

/**
 * Loading Skeleton - Piyano yüklenirken göster
 */
function PianoLoadingSkeleton() {
  return (
    <div className="flex items-end justify-center gap-1 p-4 bg-[var(--color-primary)] rounded-lg">
      {Array.from({ length: 21 }).map((_, i) => (
        <div
          key={i}
          className="bg-white/50 rounded-b animate-pulse"
          style={{
            width: 46,
            height: `${60 + Math.random() * 80}px`,
          }}
        />
      ))}
    </div>
  );
}
