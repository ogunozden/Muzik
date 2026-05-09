"use client";

import {useState, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {Card, CardBody} from "@/components/atoms/Card";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {tokens} from "@/lib/tokens";
import {Button} from "@/components/atoms/Button";
import {Input} from "@/components/atoms/Input";
import {Badge} from "@/components/atoms/Badge";
import {useEnsemble} from "@/hooks/useEnsemble";

export default function EnsemblePage() {
  const {t} = useTranslation();
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [userName] = useState(() => `user-${Math.random().toString(36).substring(2, 6)}`);
  const [remoteNoteCount, setRemoteNoteCount] = useState(0);

  const handleRemoteNote = useCallback(() => {
    setRemoteNoteCount((count) => count + 1);
  }, []);

  const { isConnected, peers } = useEnsemble({
    roomId: roomCode,
    userName,
    onRemoteNotePlayed: handleRemoteNote,
  });

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
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="mb-4"
              />
              <Button
                variant="secondary"
                ariaLabel={t("ensemble.connect")}
                onPress={() => {
                  if (joinCode.length > 0) {
                    setRoomCode(joinCode);
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
                  {remoteNoteCount > 0 && (
                    <span className={`text-xs ${tokens.colors.text.secondary}`}>
                      {t("ensemble.remoteNotesReceived", {count: remoteNoteCount})}
                    </span>
                  )}
                </div>
                <Button
                  variant="primary"
                  ariaLabel={t("ensemble.disconnect")}
                  onPress={() => setRoomCode("")}
                >
                  {t("ensemble.disconnect")}
                </Button>
              </div>
              {peers.length > 0 && (
                <div className="mt-4">
                  <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>
                    {t("ensemble.connectedUsers", {count: peers.length})}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {peers.map((peer) => (
                      <Badge key={peer} color="default" ariaLabel={peer}>
                        {peer}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </UnifiedLayout>
  );
}
