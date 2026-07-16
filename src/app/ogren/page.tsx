/**
 * /ogren — Rehberli usul ogrenme akisi (F14.6).
 *
 * Usul-merkezli mufredat: sifirdan ogrenen kullanici kucukten buyuge usulleri
 * adim adim ogrenir (darp + velvele + calim + "ogrendim" isaretleme). Ilerleme
 * localStorage'da kalir. Ansiklopedi (/rhythm) tam referans; bu sayfa kurgulu
 * ogrenme yoludur.
 */

"use client";

import {PageHeader, PageShell} from "@/shared/ui";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {LearningStepper} from "@/features/learn/LearningStepper";

export default function OgrenPage() {
  return (
    <UnifiedLayout>
      <PageShell className="max-w-4xl">
        <PageHeader
          meta="Rehberli ogrenme"
          title="Usul ogren"
          description="Kucukten buyuge, adim adim usul calismasi. Her adimda darpi dinle, velveleyi dene, ogrendiginde isaretle."
        />
        <LearningStepper />
      </PageShell>
    </UnifiedLayout>
  );
}
