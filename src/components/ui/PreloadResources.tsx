/**
 * PreloadResources - Kritik kaynak yükleme optimizasyonu
 */

"use client";

import {useEffect} from "react";

interface PreloadLink {
  href: string;
  as: "style" | "script" | "image" | "font";
  crossOrigin?: "anonymous" | "use-credentials";
}

interface DnsPrefetch {
  host: string;
}

/**
 * Kritik kaynakları preload/prefetch eder
 */
export function PreloadResources() {
  useEffect(() => {
    // Critical CSS preload
    const preloadLinks: PreloadLink[] = [];

    // Dinamik link oluşturma
    preloadLinks.forEach((link) => {
      if (!document.querySelector(`link[href="${link.href}"]`)) {
        const linkEl = document.createElement("link");
        linkEl.rel = "preload";
        linkEl.as = link.as;
        linkEl.href = link.href;
        if (link.crossOrigin) {
          linkEl.crossOrigin = link.crossOrigin;
        }
        document.head.appendChild(linkEl);
      }
    });

    // DNS prefetch
    const dnsPrefetch: DnsPrefetch[] = [];

    dnsPrefetch.forEach(({host}) => {
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${host}"]`)) {
        const linkEl = document.createElement("link");
        linkEl.rel = "dns-prefetch";
        linkEl.href = host;
        document.head.appendChild(linkEl);
      }
    });
  }, []);

  return null;
}
