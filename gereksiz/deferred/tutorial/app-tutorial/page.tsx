"use client";

import {useTranslation} from "react-i18next";
import {Card, CardBody, CardHeader} from "@/components/atoms/Card";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {tokens} from "@/lib/tokens";
import {Button} from "@/components/atoms/Button";

export default function TutorialPage() {
  const {t} = useTranslation();

  return (
    <UnifiedLayout>
      <div className={`max-w-4xl mx-auto px-4 py-8 ${tokens.colors.background.base}`}>
        <h1 className={`text-3xl font-bold ${tokens.colors.text.primary} mb-4`}>
          {t("tutorial.title")}
        </h1>
        
        <p className={`text-lg ${tokens.colors.text.secondary} mb-8`}>
          {t("tutorial.description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardHeader className={`${tokens.colors.primary.base} font-semibold`}>
              {t("tutorial.noteExercises")}
            </CardHeader>
            <CardBody className="p-4">
              <p className={`text-sm ${tokens.colors.text.secondary} mb-4`}>
                {t("tutorial.comingSoon")}
              </p>
              <Button
                variant="primary"
                size="sm"
                ariaLabel={t("tutorial.startExercise")}
                isDisabled
              >
                {t("tutorial.startExercise")}
              </Button>
            </CardBody>
          </Card>

          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardHeader className={`${tokens.colors.secondary.base} font-semibold`}>
              {t("tutorial.usulExercises")}
            </CardHeader>
            <CardBody className="p-4">
              <p className={`text-sm ${tokens.colors.text.secondary} mb-4`}>
                {t("tutorial.comingSoon")}
              </p>
              <Button
                variant="primary"
                size="sm"
                ariaLabel={t("tutorial.startExercise")}
                isDisabled
              >
                {t("tutorial.startExercise")}
              </Button>
            </CardBody>
          </Card>

          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardHeader className={`${tokens.colors.accent.base} font-semibold`}>
              {t("tutorial.makamExercises")}
            </CardHeader>
            <CardBody className="p-4">
              <p className={`text-sm ${tokens.colors.text.secondary} mb-4`}>
                {t("tutorial.comingSoon")}
              </p>
              <Button
                variant="primary"
                size="sm"
                ariaLabel={t("tutorial.startExercise")}
                isDisabled
              >
                {t("tutorial.startExercise")}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </UnifiedLayout>
  );
}
