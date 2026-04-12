/**
 * Providers - Optimized
 */

"use client";

import { useState, useEffect, type ReactNode, Suspense } from "react";
import { HeroUIProvider } from "@heroui/react";
import i18n from "@/lib/i18n";
import { I18nextProvider } from "react-i18next";
import { ErrorBoundary } from "@/components/organisms/ErrorBoundary";

// ============================================
// LOADING FALLBACK
// ============================================

function LoadingFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#FAF5F0",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid #E8D5C4",
          borderTopColor: "#8B5A2B",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// HYDRATION SAFE RENDER
// ============================================

function HydrationSafeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FAF5F0",
        }}
      />
    );
  }

  return <>{children}</>;
}

// ============================================
// MAIN PROVIDER
// ============================================

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <HydrationSafeProvider>
        <Suspense fallback={<LoadingFallback />}>
          <I18nextProvider i18n={i18n}>
            <HeroUIProvider>
              {children}
            </HeroUIProvider>
          </I18nextProvider>
        </Suspense>
      </HydrationSafeProvider>
    </ErrorBoundary>
  );
}
