"use client";

import {useState, useCallback} from "react";
import {Button, Card, CardBody, Input} from "@heroui/react";
import {useTranslation} from "react-i18next";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {parseSymbTr} from "@/engines/nota/data";
import {tokens} from "@/lib/tokens";

export default function NotaPage() {
  const {t} = useTranslation();
  const [symbTrInput, setSymbTrInput] = useState<string>("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseSymbTr> | null>(null);

  const handleParse = useCallback(() => {
    if (!symbTrInput.trim()) return;
    const result = parseSymbTr(symbTrInput.trim());
    setParsed(result);
  }, [symbTrInput]);

  return (
    <UnifiedLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className={`text-3xl font-bold ${tokens.colors.accent.base} mb-6`}>{t("nota.title")}</h1>

        <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border mb-6`}>
          <CardBody className="p-4">
            <p className={`text-sm ${tokens.colors.text.secondary} mb-4`}>
              SymbTr formatı: <code className={`${tokens.colors.background.base} px-1`}>makam--form--usul--name--composer</code>
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="humayun--sarki--aksaksemai--nihavend--riyazist"
                value={symbTrInput}
                onChange={(e) => setSymbTrInput(e.target.value)}
                className="flex-1"
              />
              <Button className={tokens.colors.accent.base} onPress={handleParse}>
                {t("nota.parse")}
              </Button>
            </div>
          </CardBody>
        </Card>

        {parsed && (
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={tokens.colors.text.secondary}>Makam</p>
                  <p className={`font-semibold ${tokens.colors.text.primary} capitalize`}>{parsed.makam}</p>
                </div>
                <div>
                  <p className={tokens.colors.text.secondary}>Form</p>
                  <p className="font-semibold capitalize">{parsed.form}</p>
                </div>
                <div>
                  <p className={tokens.colors.text.secondary}>Usul</p>
                  <p className="font-semibold capitalize">{parsed.usul}</p>
                </div>
                <div>
                  <p className={tokens.colors.text.secondary}>Eser</p>
                  <p className="font-semibold">{parsed.name}</p>
                </div>
                <div className="col-span-2">
                  <p className={tokens.colors.text.secondary}>Besteci</p>
                  <p className="font-semibold">{parsed.composer}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </UnifiedLayout>
  );
}
