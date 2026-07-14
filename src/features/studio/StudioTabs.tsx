"use client";

import {useTranslation} from "react-i18next";
import {routes} from "@/shared/config";
import {HubTabs} from "@/shared/ui/HubTabs";

/**
 * Çalışma hub sekmeleri (F7.3): Skor Motoru ana yuzey, Eser Takip kanit
 * yuzeyi ve Studio arac yuzeyi tek workbench gibi gezilir. Etiketler nav i18n
 * anahtarlarindan gelir (hardcode yok).
 */
export function StudioTabs() {
  const {t} = useTranslation();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <HubTabs
        label={t("nav.hubStudio")}
        tabs={[
          {href: routes.studioScoreEngine, label: t("nav.studioScoreEngine")},
          {href: routes.studioFollow, label: t("nav.studioFollow")},
          {href: routes.studio, label: t("nav.studio")},
        ]}
      />
    </div>
  );
}
