"use client";

import {ReactNode, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@heroui/react";
import {initAudio} from "@/engines/ses/engine";

interface UnifiedLayoutProps {
  children: ReactNode;
}

export function UnifiedLayout({children}: UnifiedLayoutProps) {
  const {t} = useTranslation();

  useEffect(() => {
    const unlockAudio = async () => {
      await initAudio();
    };

    window.addEventListener("pointerdown", unlockAudio, {once: true});
    window.addEventListener("keydown", unlockAudio, {once: true});

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#5C4033] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xl font-bold">{t("common.appName")}</div>
          <nav className="flex gap-4">
            <Button
              variant="light"
              size="sm"
              className="text-white hover:bg-[#4A3428]"
              onPress={() => window.location.href = "/"}
            >
              {t("nav.home")}
            </Button>
            <Button
              variant="light"
              size="sm"
              className="text-white hover:bg-[#4A3428]"
              onPress={() => window.location.href = "/makam"}
            >
              {t("nav.makam")}
            </Button>
            <Button
              variant="light"
              size="sm"
              className="text-white hover:bg-[#4A3428]"
              onPress={() => window.location.href = "/usul"}
            >
              {t("nav.usul")}
            </Button>
            <Button
              variant="light"
              size="sm"
              className="text-white hover:bg-[#4A3428]"
              onPress={() => window.location.href = "/archive"}
            >
              {t("nav.archive")}
            </Button>
            <Button
              variant="light"
              size="sm"
              className="text-white hover:bg-[#4A3428]"
              onPress={() => window.location.href = "/tutorial"}
            >
              {t("nav.tutorial")}
            </Button>
            <Button
              variant="light"
              size="sm"
              className="text-white hover:bg-[#4A3428]"
              onPress={() => window.location.href = "/ensemble"}
            >
              {t("nav.ensemble")}
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-[#FAF7F2]">
        {children}
      </main>

      <footer className="bg-[#5C4033] text-white py-4 text-center text-sm">
        <p>© 2026 Muzik - Türk Müziği Platformu</p>
      </footer>
    </div>
  );
}
