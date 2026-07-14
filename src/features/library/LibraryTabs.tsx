"use client";

import {useTranslation} from "react-i18next";
import {routes} from "@/shared/config";
import {HubTabs} from "@/shared/ui/HubTabs";

/**
 * Kütüphane hub sekmeleri (F7.4): Arsiv + Sesler tek yuzey gibi gezilir.
 * Etiketler nav i18n anahtarlarindan gelir (hardcode yok).
 */
export function LibraryTabs() {
  const {t} = useTranslation();
  return (
    <HubTabs
      label={t("nav.hubLibrary")}
      tabs={[
        {href: routes.archive, label: t("nav.archive")},
        {href: routes.samples, label: t("nav.samples")},
      ]}
    />
  );
}
