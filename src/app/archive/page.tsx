"use client";

import {useTranslation} from "react-i18next";
import {Card, CardBody} from "@heroui/react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {tokens} from "@/lib/tokens";
import {Badge} from "@/components/atoms/Badge";

export default function ArchivePage() {
  const {t} = useTranslation();

  return (
    <UnifiedLayout>
      <div className={`max-w-4xl mx-auto px-4 py-8 ${tokens.colors.background.base}`}>
        <h1 className={`text-3xl font-bold ${tokens.colors.text.primary} mb-4`}>
          {t("archive.title")}
        </h1>
        
        <p className={`text-lg ${tokens.colors.text.secondary} mb-8`}>
          {t("archive.description")}
        </p>

        <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
          <CardBody className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Badge color="warning" ariaLabel={t("archive.emptyState")}>
                {t("archive.emptyState")}
              </Badge>
              <p className={`mt-4 text-sm ${tokens.colors.text.secondary}`}>
                {t("archive.searchPlaceholder")}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </UnifiedLayout>
  );
}
