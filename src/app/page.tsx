"use client";

import {useTranslation} from "react-i18next";
import Link from "next/link";
import {Card, CardBody, CardHeader} from "@heroui/react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {tokens} from "@/lib/tokens";
import {MAKAM_DATA} from "@/engines/makam/data";
import {USUL_DATA} from "@/engines/usul/data";

export default function HomePage() {
  const {t} = useTranslation();

  const displayMakams = MAKAM_DATA.slice(0, 4);
  const displayUsuls = USUL_DATA.slice(0, 4);

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
          <Link href="/makam" className="block">
            <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border hover:shadow-lg transition-shadow cursor-pointer`}>
              <CardHeader className={`${tokens.colors.primary.base} font-semibold`}>
                {t("home.makamCard")}
              </CardHeader>
              <CardBody className="p-4">
                <p className={tokens.colors.text.secondary}>{t("home.makamDesc")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayMakams.map((m) => (
                    <span key={m.id} className={`px-2 py-1 ${tokens.colors.background.base} ${tokens.colors.text.primary} text-xs rounded`}>
                      {m.name}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          </Link>

          <Link href="/usul" className="block">
            <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border hover:shadow-lg transition-shadow cursor-pointer`}>
              <CardHeader className={`${tokens.colors.secondary.base} font-semibold`}>
                {t("home.usulCard")}
              </CardHeader>
              <CardBody className="p-4">
                <p className={tokens.colors.text.secondary}>{t("home.usulDesc")}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayUsuls.map((u) => (
                    <span key={u.id} className={`px-2 py-1 ${tokens.colors.background.base} ${tokens.colors.text.primary} text-xs rounded`}>
                      {u.name}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          </Link>

          <Link href="/nota-editor" className="block">
            <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border hover:shadow-lg transition-shadow cursor-pointer`}>
              <CardHeader className={`${tokens.colors.accent.base} font-semibold`}>
                {t("home.notaCard")}
              </CardHeader>
              <CardBody className="p-4">
                <p className={tokens.colors.text.secondary}>{t("home.notaDesc")}</p>
              </CardBody>
            </Card>
          </Link>
        </div>
      </div>
    </UnifiedLayout>
  );
}
