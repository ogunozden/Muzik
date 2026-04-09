"use client";

import {useState, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {Button, Card, CardBody, Badge} from "@heroui/react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {PianoRoll} from "@/components/ui/PianoRoll";
import {useRecordingEngine} from "@/hooks/useRecordingEngine";
import {PitchDetectionResult} from "@/engines/ses/recording";
import {tokens} from "@/lib/tokens";

export default function RecordingPage() {
  const {t} = useTranslation();
  const [detectedPitches, setDetectedPitches] = useState<PitchDetectionResult[]>([]);
  const [duration, setDuration] = useState(5);

  const handlePitchDetected = useCallback((result: PitchDetectionResult) => {
    setDetectedPitches((prev) => [...prev.slice(-50), result]);
  }, []);

  const {
    isRecording,
    isProcessing,
    isSupported,
    recordedEvents,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  } = useRecordingEngine({
    durationSeconds: duration,
    onPitchDetected: handlePitchDetected,
  });

  return (
    <UnifiedLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className={`text-3xl font-bold ${tokens.colors.accent.base} mb-6`}>{t("recording.title")}</h1>

        <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border mb-6`}>
          <CardBody className="p-4">
            {!isSupported ? (
              <p className={`text-sm ${tokens.colors.feedback.error}`}>
                Mikrofon desteği bulunamadı. Lütfen tarayıcınızın mikrofon erişimine izin verdiğinden emin olun.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button
                        aria-label={t("recording.start")}
                        className="bg-[#C4A77D] text-white"
                        onPress={startRecording}
                        isDisabled={isProcessing}
                      >
                        {isProcessing ? t("recording.processing") : "● Kayıt Başlat"}
                      </Button>
                    ) : (
                      <Button
                        aria-label={t("recording.stop")}
                        className="bg-red-500 text-white"
                        onPress={stopRecording}
                      >
                        ■ Kayıt Durdur
                      </Button>
                    )}
                    <Button
                      variant="bordered"
                      onPress={clearRecording}
                      isDisabled={recordedEvents.length === 0}
                    >
                      Temizle
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="duration-select" className={`text-xs ${tokens.colors.text.secondary}`}>{t("recording.durationLabel")}:</label>
                    <select
                      id="duration-select"
                      aria-label={t("recording.duration")}
                      className={`border ${tokens.colors.border.base} rounded px-2 py-1 text-sm`}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      disabled={isRecording}
                    >
                      <option value={3}>3 sn</option>
                      <option value={5}>5 sn</option>
                      <option value={10}>10 sn</option>
                      <option value={15}>15 sn</option>
                    </select>
                  </div>

                  {isRecording && (
                    <Badge aria-label={t("recording.status")} color="danger" variant="solid">● Kayıtta</Badge>
                  )}
                  {isProcessing && (
                    <Badge aria-label={t("recording.processingStatus")} color="warning" variant="solid">İşleniyor</Badge>
                  )}
                </div>

                {error && (
                  <p className={`text-sm ${tokens.colors.feedback.error}`}>{error}</p>
                )}

                {detectedPitches.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detectedPitches.slice(-20).map((p, idx) => (
                      <span
                        key={`${p.frequency}-${idx}`}
                        className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded font-mono"
                      >
                        {p.noteName} ({Math.round(p.frequency)}Hz)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

                {recordedEvents.length > 0 && (
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-4">
              <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>
                {recordedEvents.length} nota çıkarıldı
              </p>
              <PianoRoll
                notes={recordedEvents}
                width={Math.max(700, recordedEvents.length * 80)}
                height={280}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </UnifiedLayout>
  );
}
