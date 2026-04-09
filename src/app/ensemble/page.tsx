"use client";

import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Card, CardBody} from "@heroui/react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {tokens} from "@/lib/tokens";
import {Button} from "@/components/atoms/Button";
import {Input} from "@/components/atoms/Input";
import {Badge} from "@/components/atoms/Badge";

export default function EnsemblePage() {
  const {t} = useTranslation();
  const [roomCode, setRoomCode] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  return (
    <UnifiedLayout>
      <div className={`max-w-4xl mx-auto px-4 py-8 ${tokens.colors.background.base}`}>
        <h1 className={`text-3xl font-bold ${tokens.colors.text.primary} mb-4`}>
          {t("ensemble.title")}
        </h1>
        
        <p className={`text-lg ${tokens.colors.text.secondary} mb-8`}>
          {t("ensemble.description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-6">
              <h2 className={`text-lg font-semibold ${tokens.colors.text.primary} mb-4`}>
                {t("ensemble.createRoom")}
              </h2>
              <Button
                variant="primary"
                ariaLabel={t("ensemble.createRoom")}
                onPress={() => {
                  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                  setRoomCode(code);
                }}
              >
                {t("ensemble.createRoom")}
              </Button>
              {roomCode && !isConnected && (
                <div className="mt-4">
                  <Badge color="success" ariaLabel={t("ensemble.roomCode")}>
                    {t("ensemble.roomCode")}: {roomCode}
                  </Badge>
                  <p className={`mt-2 text-sm ${tokens.colors.text.secondary}`}>
                    {t("ensemble.waiting")}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-6">
              <h2 className={`text-lg font-semibold ${tokens.colors.text.primary} mb-4`}>
                {t("ensemble.joinRoom")}
              </h2>
              <Input
                ariaLabel={t("ensemble.enterCode")}
                placeholder={t("ensemble.enterCode")}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="mb-4"
              />
              <Button
                variant="secondary"
                ariaLabel={t("ensemble.connect")}
                onPress={() => {
                  if (roomCode.length > 0) {
                    setIsConnected(true);
                  }
                }}
              >
                {t("ensemble.connect")}
              </Button>
            </CardBody>
          </Card>
        </div>

        {isConnected && (
          <Card className={`mt-6 ${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color="success" ariaLabel={t("ensemble.connected")}>
                    {t("ensemble.connected")}
                  </Badge>
                  <span className={`text-sm ${tokens.colors.text.secondary}`}>
                    {t("ensemble.roomCode")}: {roomCode}
                  </span>
                </div>
                <Button
                  variant="primary"
                  ariaLabel={t("ensemble.disconnect")}
                  onPress={() => setIsConnected(false)}
                >
                  {t("ensemble.disconnect")}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </UnifiedLayout>
  );
}
