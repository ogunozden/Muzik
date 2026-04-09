"use client";

import {useTranslation} from "react-i18next";
import {Card, CardBody, CardHeader} from "@heroui/react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {tokens} from "@/lib/tokens";

export default function HomePage() {
  const {t} = useTranslation();

  return (
    <UnifiedLayout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold ${tokens.colors.text.primary} mb-3`}>
            {t("home.title")}
          </h1>
          <p className={`text-lg ${tokens.colors.text.secondary}`}>{t("home.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border hover:shadow-lg transition-shadow cursor-pointer`}
                isPressable onPress={() => window.location.href = "/makam"}>
            <CardHeader className={`${tokens.colors.primary.base} font-semibold`}>
              {t("home.makamCard")}
            </CardHeader>
            <CardBody className="p-4">
              <p className={tokens.colors.text.secondary}>{t("home.makamDesc")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Rast", "Hüseyni", "Nihavend", "Hicaz"].map((m) => (
                  <span key={m} className={`px-2 py-1 ${tokens.colors.background.base} ${tokens.colors.text.primary} text-xs rounded`}>
                    {m}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border hover:shadow-lg transition-shadow cursor-pointer`}
                isPressable onPress={() => window.location.href = "/usul"}>
            <CardHeader className={`${tokens.colors.secondary.base} font-semibold`}>
              {t("home.usulCard")}
            </CardHeader>
            <CardBody className="p-4">
              <p className={tokens.colors.text.secondary}>{t("home.usulDesc")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Aksak Semai", "Düyek", "Sofyan", "Hafif"].map((u) => (
                  <span key={u} className={`px-2 py-1 ${tokens.colors.background.base} ${tokens.colors.secondary.base} text-xs rounded`}>
                    {u}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border hover:shadow-lg transition-shadow cursor-pointer`}
                isPressable onPress={() => window.location.href = "/nota-editor"}>
            <CardHeader className={`${tokens.colors.accent.base} font-semibold`}>
              {t("home.notaCard")}
            </CardHeader>
            <CardBody className="p-4">
              <p className={tokens.colors.text.secondary}>{t("home.notaDesc")}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </UnifiedLayout>
  );
}
