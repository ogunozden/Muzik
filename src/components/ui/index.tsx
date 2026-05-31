/**
 * UI Components - Dynamic Imports
 * 
 * Heavy componentleri dynamic import ile lazy load
 * Sayfa geçişlerinde performans artışı
 */

import dynamic from "next/dynamic";

const PIANO_LOADING_KEY_HEIGHTS = [
  62, 104, 78, 126, 92, 138, 70,
  116, 86, 132, 98, 144, 74, 120,
  90, 136, 82, 112, 100, 128, 68,
];

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
            height: `${PIANO_LOADING_KEY_HEIGHTS[i]}px`,
          }}
        />
      ))}
    </div>
  );
}
