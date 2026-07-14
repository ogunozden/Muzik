"use client";

import {useTranslation} from "react-i18next";
import {routes} from "@/shared/config";
import {HubTabs} from "@/shared/ui/HubTabs";

/**
 * Kürasyon hub sekmeleri (F7.2): kürasyon konsolu + operasyon tek yuzey gibi
 * gezilir. Etiketler nav i18n anahtarlarindan gelir (hardcode yok).
 */
export function CurationTabs() {
  const {t} = useTranslation();
  return (
    <HubTabs
      label={t("nav.hubCuration")}
      tabs={[
        {href: routes.referencesCuration, label: t("nav.referencesCuration")},
        {href: routes.references, label: t("nav.references")},
      ]}
    />
  );
}
