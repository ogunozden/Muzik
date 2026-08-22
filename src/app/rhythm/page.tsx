/**
 * Usul sayfasi - usul secimi ve ritim pratigi.
 *
 * Oynatma denetleyicisi (2026-07-14 yeniden yazimi):
 * - Vurus suresi OLCU BIRIMINE gore hesaplanir ve ayni birim ses motoruna da
 *   gecirilir; onceki surumde motor ceyreklik varsayip 8'lik 14 usulde
 *   gorselden 2x ayrisiyordu.
 * - Imlec sembol DIZINI degil vurus POZISYONU uzerinden ilerler (Sofyan'da
 *   Düm 2 vurus kaplar; esit-aralik varsayimi imleci kaydiriyordu).
 * - Ses hazirlanmadan (init + sample preload) gorsel sayac baslamaz.
 * - Dongu: startRhythmLoop tum vuruslari WebAudio saatinde ileriye-bakisli
 *   planlar (tur basi setTimeout dikisi yok).
 * - Imlec requestAnimationFrame ile okunur; "DUYULAN" saat (getOutputTimestamp)
 *   -> ses-gorsel senkron (bkz. heardContextTime).
 * - Imlec IMPERATIF surulur: her karede notationRef.setProgress ile DOGRUDAN
 *   DOM'a yazilir (SVG re-render yok); vurgu/sayaci yalniz DEGISINCE setState.
 *   (arastirma: yuksek-frekansli animasyonu ref ile sur, state ile degil.)
 * - Kalibrasyon: outputLatency her cihazda dogru bildirilmez; kullanici
 *   "ses-gorsel ofset" kaydiricisiyla kendi sistemini ayarlar (kalici).
 */

"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {LabeledSelect, LabeledSlider, PageHeader, PageShell, PageSurface, UsulPanel} from "@/shared/ui";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {USUL_DATA, getGroupedUsulItems, getUsulBeatDuration, getUsulGrouping} from "@/engines/usul/data";
import type {InstrumentType} from "@/engines/ses/engine";
import {startRhythmLoop, stopAll, type RhythmLoopController} from "@/engines/ses/engine";
import {VolumeControl, usePlaybackVolume} from "@/shared/ui/organisms/VolumeControl";
import type {UsulNotationHandle} from "@/shared/ui/organisms/UsulNotation";
import {useEditorStore} from "@/store/editorStore";
import {INSTRUMENTS, PERCUSSION_INSTRUMENTS} from "@/shared/config/instruments";

const SYMBOL_LABELS: Record<string, string> = {
  dum: "Düm",
  tek: "Tek",
  te: "Te",
  ke: "Ke",
  ka: "Kâ",
  ta: "Ta",
  hek: "Hek",
};

// Ses-gorsel senkron ofseti: outputLatency her sistemde dogru bildirilmez
// (Bluetooth/hoparlor/OS'e gore degisir), otomatik olarak tam tutmasi fiziksel
// olarak imkansizdir — her ciddi ritim uygulamasi manuel kalibrasyon acar.
// Pozitif = "ses gorselden gec geliyor" -> imleci geri kaydir (imlec sesin
// onundeyse artir). localStorage'da kalici.
const SYNC_OFFSET_KEY = "muzik.rhythm.syncOffsetMs";
const SYNC_OFFSET_MAX_MS = 300;

function readStoredSyncOffset(): number {
  try {
    const stored = Number(window.localStorage?.getItem(SYNC_OFFSET_KEY));
    return Number.isFinite(stored) ? stored : 0;
  } catch {
    return 0;
  }
}

function persistSyncOffset(value: number): void {
  try {
    window.localStorage?.setItem(SYNC_OFFSET_KEY, String(value));
  } catch {
    // localStorage kullanilamiyor (gizli mod / kisitli ortam) — sessizce gec.
  }
}

export default function UsulPage() {
  const {t, i18n} = useTranslation();
  const {
    selectedUsulObj,
    selectedPercussionInstrument,
    bpm,
    setSelectedUsul,
    setBpm,
    setSelectedPercussionInstrument,
  } = useEditorStore();
  const [isRhythmPlaying, setIsRhythmPlaying] = useState(false);
  const [isLoopEnabled, setIsLoopEnabled] = useState(true);
  const [isVelveleEnabled, setIsVelveleEnabled] = useState(false);
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(-1);
  const [cycleCount, setCycleCount] = useState(0);
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);
  const [volume, setVolume] = usePlaybackVolume();
  const isPlayingRef = useRef(false);
  const isLoopRef = useRef(true);
  const cursorRafRef = useRef<number | null>(null);
  const loopControllerRef = useRef<RhythmLoopController | null>(null);
  const notationRef = useRef<UsulNotationHandle>(null);
  const syncOffsetRef = useRef(0);
  // Oynatilan vurus suresi (saniye): canli tempo degisiminde (F12.2) rAF imleci
  // dogru ofset hesaplasin diye ref'te tutulur; retune ile guncellenir.
  const playbackBeatSecondsRef = useRef(0);
  // Yalniz DEGISINCE setState (her karede degil): imperatif imlecin yaninda
  // vurgu/sayaci ucuz tutar.
  const activeIndexRef = useRef(-1);
  const cycleCountRef = useRef(0);

  // Kalici kalibrasyon ofsetini mount'ta yukle. SSR/hidrasyon uyumu icin
  // ilk render 0'dir, kalici deger client'ta effect'te alinir (bu, kalici
  // durum yukleme icin dogru desendir; lint kurali burada bilincli kapali).
  useEffect(() => {
    const stored = readStoredSyncOffset();
    if (stored !== 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSyncOffsetMs(stored);
      syncOffsetRef.current = stored;
    }
  }, []);

  // Gruplandırma: önce ölçü (2/4 → 120/4) sonra alfabetik (tr locale)
  const usulGroups = getGroupedUsulItems();

  // Velvele modu: kitaptaki susleme dizilisi varsa ve secildiyse onu cal/goster.
  const hasVelvele = Boolean(selectedUsulObj?.velvele?.length);
  const symbols =
    isVelveleEnabled && selectedUsulObj?.velvele?.length ? selectedUsulObj.velvele : selectedUsulObj?.symbols;
  const activeSymbol = currentSymbolIndex >= 0 ? symbols?.[currentSymbolIndex] : null;
  const percussionItems = INSTRUMENTS.filter((instrument) =>
    (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id as string)
  ).map((instrument) => ({
    key: instrument.id as string,
    label: i18n.language === "tr" ? instrument.nameTr : instrument.nameEn,
  }));

  const stopRhythm = useCallback(() => {
    isPlayingRef.current = false;
    if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    cursorRafRef.current = null;
    loopControllerRef.current?.stop();
    loopControllerRef.current = null;
    stopAll();
    notationRef.current?.clearProgress();
    activeIndexRef.current = -1;
    cycleCountRef.current = 0;
    setIsRhythmPlaying(false);
    setCurrentSymbolIndex(-1);
    setCycleCount(0);
  }, []);

  const playSelectedUsul = useCallback(async () => {
    const usul = selectedUsulObj;
    if (!usul || isPlayingRef.current) return;
    const pattern = isVelveleEnabled && usul.velvele?.length ? usul.velvele : usul.symbols;

    // Dikissiz dongu: tum vuruslar WebAudio saatinde ileriye-bakisli
    // planlanir; gorsel imlec de ayni saatten okunur (drift/dikis yok).
    const controller = await startRhythmLoop(
      usul.beats,
      pattern,
      bpm,
      selectedPercussionInstrument,
      usul.unit,
      isLoopRef.current,
    );
    if (!controller || isPlayingRef.current) {
      controller?.stop();
      return;
    }

    loopControllerRef.current = controller;
    controller.setVolume(volume);
    isPlayingRef.current = true;
    activeIndexRef.current = 0;
    cycleCountRef.current = 1;
    setIsRhythmPlaying(true);
    setCurrentSymbolIndex(0);
    setCycleCount(1);
    notationRef.current?.setProgress(0);

    playbackBeatSecondsRef.current = getUsulBeatDuration(usul, bpm);

    // Imlec requestAnimationFrame ile ekran tazelemesine hizali; her karede
    // "duyulan" saati (getPositionBeats -> getOutputTimestamp) taze okur.
    // Cizgi IMPERATIF (notationRef.setProgress) surulur — SVG re-render yok;
    // vurgu/sayaci yalniz DEGISINCE setState edilir. Kalibrasyon ofseti
    // (syncOffsetRef) "duyulan" konumu kaydirir.
    const tick = () => {
      if (!isPlayingRef.current) return;
      const beatSeconds = playbackBeatSecondsRef.current;
      const offsetBeats = beatSeconds > 0 ? syncOffsetRef.current / 1000 / beatSeconds : 0;
      const positionBeats = controller.getPositionBeats() - offsetBeats;
      if (!isLoopRef.current && positionBeats >= usul.beats) {
        stopRhythm();
        return;
      }
      const beatInCycle = ((positionBeats % usul.beats) + usul.beats) % usul.beats;
      notationRef.current?.setProgress(beatInCycle);

      let active = 0;
      for (let index = 0; index < pattern.length; index += 1) {
        if (pattern[index].beat <= beatInCycle + 1 + 1e-6) active = index;
      }
      if (active !== activeIndexRef.current) {
        activeIndexRef.current = active;
        setCurrentSymbolIndex(active);
      }
      const cycle = controller.getCycleCount();
      if (cycle !== cycleCountRef.current) {
        cycleCountRef.current = cycle;
        setCycleCount(cycle);
      }
      cursorRafRef.current = requestAnimationFrame(tick);
    };
    cursorRafRef.current = requestAnimationFrame(tick);
  }, [bpm, isVelveleEnabled, selectedPercussionInstrument, selectedUsulObj, stopRhythm, volume]);

  useEffect(() => {
    if (!selectedUsulObj) setSelectedUsul("sofyan");
  }, [selectedUsulObj, setSelectedUsul]);

  useEffect(() => stopRhythm, [stopRhythm]);

  // Klavye kisayollari: Space = oynat/duraklat, ArrowUp/Down = BPM ±10 (A2).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (event.key === " ") {
        event.preventDefault();
        if (isPlayingRef.current) {
          stopRhythm();
        } else {
          void playSelectedUsul();
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setBpm((prev) => Math.min(200, prev + 10));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setBpm((prev) => Math.max(40, prev - 10));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playSelectedUsul, stopRhythm, setBpm]);

  return (
    <UnifiedLayout>
      <PageShell className="max-w-4xl">
        <PageHeader
          meta="Ritim motoru"
          title={t("usul.title")}
          description={t("usul.subtitle")}
        />

        {selectedUsulObj && (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-text-secondary)]">
            <span>
              <strong className="text-[var(--color-text-primary)]">{selectedUsulObj.name}</strong>
              {" — "}{selectedUsulObj.beats}/{selectedUsulObj.unit}
            </span>
            <span>Vurgu: {getUsulGrouping(selectedUsulObj).join("+")}</span>
            {selectedUsulObj.defaultBpm ? <span>Tempo: ~{selectedUsulObj.defaultBpm}</span> : null}
            {selectedUsulObj.velvele?.length ? <span>Velvele: var</span> : null}
            {/* `opacity-70` metni zemine karistiriyordu: kontrast 3,86 (esik 4,5).
                Token dogrudan kullanilinca 8,49. Saydamlik yerine RENK. */}
            <span className="ml-auto text-[var(--color-text-secondary)]">{USUL_DATA.length} usûl</span>
          </div>
        )}

        <UsulPanel
          ref={notationRef}
          usulSelectAriaLabel={t("usul.selectUsul")}
          symbolGridAriaLabel={t("usul.symbolGrid")}
          playButtonAriaLabel={isRhythmPlaying ? t("common.stop") : t("usul.playRhythm")}
          usulGroups={usulGroups}
          selectedUsul={selectedUsulObj?.id}
          onUsulChange={(key) => {
            stopRhythm();
            setSelectedUsul(key);
            // Usulun korpus-turevli karakteristik temposuna gec (curcuna
            // hizli, aksaksemai yavas — ayni desen, farkli tempo).
            const nextBpm = USUL_DATA.find((usul) => usul.id === key)?.defaultBpm;
            if (nextBpm) setBpm(nextBpm);
          }}
          symbols={symbols}
          onPlay={isRhythmPlaying ? stopRhythm : () => void playSelectedUsul()}
          beats={selectedUsulObj?.beats}
          unit={selectedUsulObj?.unit}
          isPlaying={isRhythmPlaying}
          currentBeat={currentSymbolIndex}
          className="mb-6"
        />

        <PageSurface className="mb-6 grid gap-4 p-5 sm:grid-cols-[2fr_2fr_1fr_1fr] sm:items-end">
          <LabeledSelect
            label={t("makam.instrument")}
            ariaLabel={t("makam.selectInstrument")}
            items={percussionItems}
            value={selectedPercussionInstrument}
            onChange={(key) => setSelectedPercussionInstrument(key as InstrumentType)}
            placeholder={t("makam.instrumentPlaceholder")}
          />
          <LabeledSlider
            label={`BPM: ${bpm}`}
            ariaLabel={t("usul.bpm")}
            value={bpm}
            onChange={(v) => {
              const next = Number(v);
              setBpm(next);
              // Canli tempo degisimi (F12.2): calarken durdurma — dikissiz gec.
              // Usul pratiginde tempoyu HISSEDEREK ayarlamak dogal akistir.
              if (isPlayingRef.current && loopControllerRef.current && selectedUsulObj) {
                loopControllerRef.current.retune(next);
                playbackBeatSecondsRef.current = getUsulBeatDuration(selectedUsulObj, next);
              }
            }}
            minValue={40}
            maxValue={200}
            step={10}
            size="sm"
          />
          <div className="flex flex-col gap-2 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                aria-label="Döngü"
                checked={isLoopEnabled}
                onChange={(event) => {
                  isLoopRef.current = event.target.checked;
                  setIsLoopEnabled(event.target.checked);
                }}
                className="h-4 w-4 accent-[var(--color-primary-600)]"
              />
              Döngü
            </label>
            {hasVelvele && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
                <input
                  type="checkbox"
                  aria-label="Velvele"
                  checked={isVelveleEnabled}
                  onChange={(event) => {
                    stopRhythm();
                    setIsVelveleEnabled(event.target.checked);
                  }}
                  className="h-4 w-4 accent-[var(--color-primary-600)]"
                />
                Velvele
              </label>
            )}
          </div>
          <VolumeControl
            volume={volume}
            onVolumeChange={(next) => {
              setVolume(next);
              loopControllerRef.current?.setVolume(next);
            }}
          />
        </PageSurface>

        {/* Ses-gorsel kalibrasyonu: sistem gecikmesi cihazdan cihaza degistigi
            icin (Bluetooth/hoparlor) otomatik senkron tam tutmayabilir; imlec
            sesin onundeyse artir, gerideyse azalt. Deger kalicidir. */}
        <PageSurface className="mb-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label htmlFor="sync-offset" className="text-sm text-[var(--color-text-primary)]">
                Ses-görsel ofset
              </label>
              <span id="sync-offset-hint" className="ml-2 text-xs text-[var(--color-text-secondary)]">
                imleç sesin önündeyse artır
              </span>
            </div>
            <span className="tabular-nums text-sm font-semibold text-[var(--color-text-primary)]">
              {syncOffsetMs > 0 ? "+" : ""}
              {syncOffsetMs} ms
            </span>
          </div>
          <input
            id="sync-offset"
            type="range"
            aria-describedby="sync-offset-hint"
            aria-valuetext={`${syncOffsetMs > 0 ? "+" : ""}${syncOffsetMs} ms`}
            min={-SYNC_OFFSET_MAX_MS}
            max={SYNC_OFFSET_MAX_MS}
            step={5}
            value={syncOffsetMs}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSyncOffsetMs(next);
              syncOffsetRef.current = next;
              persistSyncOffset(next);
            }}
            className="mt-2 w-full accent-[var(--color-primary-600)]"
          />
        </PageSurface>

        {selectedUsulObj && (
          <PageSurface className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">{t("usul.beats")}</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {selectedUsulObj.beats}/{selectedUsulObj.unit}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Aktif darp</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {activeSymbol
                  ? `${activeSymbol.syllable ?? SYMBOL_LABELS[activeSymbol.symbol] ?? activeSymbol.symbol} (${activeSymbol.beat}. vuruş)`
                  : "Hazır"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Tur</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isRhythmPlaying ? cycleCount : "—"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--color-text-secondary)]">Döngü</p>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isRhythmPlaying ? (isLoopEnabled ? "Sürekli çalıyor" : "Tek tur") : "Durdu"}
              </p>
            </div>
          </PageSurface>
        )}
      </PageShell>
    </UnifiedLayout>
  );
}
