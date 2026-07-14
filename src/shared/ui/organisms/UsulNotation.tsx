/**
 * UsulNotation - usul vurus akisinin porte gorunumu.
 *
 * Yerlesim VURUS POZISYONUNA orantilidir (dizin sirasina degil): Sofyan'da
 * Düm 2 vurus kaplar ve Tek 3. vurusta gorunur; esit-aralik varsayimi
 * imleci kaydiriyordu (2026-07-14 yeniden tasarimi). Oynatma imleci
 * `progressBeat` (kesirli vurus, 0..beats) ile surekli akar; aktif darp
 * `currentBeat` (sembol dizini) ile vurgulanir.
 */

"use client";

import React, {useEffect, useRef} from "react";
import type {UsulSymbol} from "@/types";

/**
 * Darbin (1-tabanli, kesirli olabilir) porte uzerindeki YATAY MERKEZI.
 * Her vurus-sutunu perBeat genisligindedir; nota sutunun ortasina cizilir.
 */
export function usulBeatCenterX(gridStart: number, perBeat: number, beat: number): number {
  return gridStart + (beat - 1) * perBeat + perBeat / 2;
}

/**
 * Oynatma cizgisinin x'i. `progressBeat` 0-tabanli gecen vurustur
 * (0 = muzikal 1. vurus); cizgi o an DUYULAN darbin NOTA MERKEZINDE olmali,
 * yani beatCenterX(progressBeat + 1). Eski surum `gridStart + p*perBeat`
 * kullaniyordu (yarim sutun sola kayik: cizgi, yanan notanin solunda
 * goruunuyordu — kullanici ekran goruntusuyle bildirdi).
 */
export function usulPlayheadX(gridStart: number, perBeat: number, beats: number, progressBeat: number): number {
  return usulBeatCenterX(gridStart, perBeat, Math.min(progressBeat, beats) + 1);
}

interface UsulNotationProps {
  symbols: UsulSymbol[];
  unit: string;
  beats: number;
  isPlaying?: boolean;
  /** Aktif sembolun dizini (vurgu/etiket için). */
  currentBeat?: number;
  /** Dongu icindeki kesirli vurus konumu (0..beats); oynatma cizgisi bunu izler. */
  progressBeat?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const COLORS = {
  staff: "#8D6E63",
  grid: "#D7CCC8",
  dum: "#8B4513",
  tek: "#2E5D4B",
  ke: "#9E7540",
  playing: "#D84315",
  playhead: "#D84315",
  beatNumber: "#8D6E63",
  label: "#5D4037",
};

const SYMBOL_STYLES: Record<string, {color: string; label: string; position: number}> = {
  // position: orta cizgiden yarim-aralik adimi (pozitif = yukari).
  // Kudum pedagojisi: sag-el kuvvetli darplar (dum/ta) pes hatta, sol-el
  // hafif darplar (tek/te/ke/ka) tiz hatta; hek (cift el) ikisinin ortasinda.
  dum: {color: COLORS.dum, label: "DÜM", position: -2},
  ta: {color: COLORS.dum, label: "TA", position: -2},
  tek: {color: COLORS.tek, label: "TEK", position: 2},
  te: {color: COLORS.tek, label: "TE", position: 2},
  ke: {color: COLORS.ke, label: "KE", position: 3},
  ka: {color: COLORS.ke, label: "KÂ", position: 3},
  hek: {color: COLORS.label, label: "HEK", position: 0},
};

export function UsulNotation({
  symbols,
  unit,
  beats,
  isPlaying = false,
  currentBeat = -1,
  progressBeat = -1,
  size = "md",
  className = "",
}: UsulNotationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const configs = {
    sm: {lineSpacing: 8, minPerBeat: 34, maxPerBeat: 56},
    md: {lineSpacing: 11, minPerBeat: 44, maxPerBeat: 84},
    lg: {lineSpacing: 14, minPerBeat: 52, maxPerBeat: 96},
  };
  const config = configs[size];

  // Az vuruslu usuller genis nefes alir, cok vuruslular sabit yogunlukta
  // yatay kaydirmaya gecer.
  const perBeat = Math.max(config.minPerBeat, Math.min(config.maxPerBeat, Math.round(560 / Math.max(beats, 1))));
  const headStart = config.lineSpacing * 6; // anahtar + olcu rakami alani
  const marginRight = config.lineSpacing * 1.5;
  const gridStart = headStart + config.lineSpacing;
  const totalWidth = gridStart + beats * perBeat + marginRight;

  const staffTop = config.lineSpacing * 2.4;
  const staffHeight = 4 * config.lineSpacing;
  const middleY = staffTop + 2 * config.lineSpacing;
  const labelY = staffTop + staffHeight + config.lineSpacing * 1.9;
  const beatNumberY = staffTop + staffHeight + config.lineSpacing * 3.1;
  const totalHeight = beatNumberY + config.lineSpacing * 1.2;

  const beatX = (beat: number) => usulBeatCenterX(gridStart, perBeat, beat);
  const playheadX = (progress: number) => usulPlayheadX(gridStart, perBeat, beats, progress);
  const beatNumberStep = beats > 32 ? 4 : beats > 16 ? 2 : 1;

  // Oynatma cizgisini gorunurde tut (genis usullerde yatay takip).
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!isPlaying || progressBeat < 0 || !scroller) return;
    const x = usulPlayheadX(gridStart, perBeat, beats, progressBeat);
    const target = Math.max(0, x - scroller.clientWidth / 2);
    scroller.scrollTo({left: target, behavior: "auto"});
  }, [gridStart, isPlaying, perBeat, progressBeat, beats]);

  return (
    <div className={className}>
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-md border border-[var(--color-border-subtle)] bg-white"
      >
        <div className="flex min-w-full justify-center">
          <svg
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            role="img"
            aria-label={`${beats}/${unit} usul kalıbı`}
          >
            {/* Vurus izgarasi: her tam vurusta acik dikey cizgi */}
            {Array.from({length: beats + 1}, (_, i) => (
              <line
                key={`grid-${i}`}
                x1={gridStart + i * perBeat}
                y1={staffTop - config.lineSpacing * 0.6}
                x2={gridStart + i * perBeat}
                y2={staffTop + staffHeight + config.lineSpacing * 0.6}
                stroke={COLORS.grid}
                strokeWidth={i === 0 || i === beats ? 1.4 : 1}
              />
            ))}

            {/* Porte cizgileri */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`staff-${i}`}
                x1={config.lineSpacing}
                y1={staffTop + i * config.lineSpacing}
                x2={totalWidth - config.lineSpacing / 2}
                y2={staffTop + i * config.lineSpacing}
                stroke={COLORS.staff}
                strokeWidth="1"
                opacity="0.55"
              />
            ))}

            {/* Anahtar + olcu rakami portenin USTUNDE degil ICINDE */}
            <text
              x={config.lineSpacing * 1.2}
              y={staffTop + staffHeight - config.lineSpacing * 0.4}
              fontSize={config.lineSpacing * 3.4}
              fontFamily="Georgia, 'Times New Roman', serif"
              fill={COLORS.label}
            >
              𝄞
            </text>
            <text
              x={config.lineSpacing * 4.6}
              y={middleY - config.lineSpacing * 0.35}
              textAnchor="middle"
              fontSize={config.lineSpacing * 1.9}
              fontWeight="bold"
              fontFamily="Georgia, serif"
              fill={COLORS.label}
            >
              {beats}
            </text>
            <text
              x={config.lineSpacing * 4.6}
              y={middleY + config.lineSpacing * 1.55}
              textAnchor="middle"
              fontSize={config.lineSpacing * 1.9}
              fontWeight="bold"
              fontFamily="Georgia, serif"
              fill={COLORS.label}
            >
              {unit}
            </text>

            {/* Darplar (vurus pozisyonunda) */}
            {symbols.map((sym, idx) => {
              const style = SYMBOL_STYLES[sym.symbol];
              if (!style) return null;
              const x = beatX(sym.beat);
              const y = middleY - (style.position * config.lineSpacing) / 2;
              const isCurrent = isPlaying && currentBeat === idx;
              const color = isCurrent ? COLORS.playing : style.color;
              // Standart notasyon: uzun deger (>=2 vurus) BOS kafa, kisa deger dolu.
              const isHollow = (sym.timeValue ?? 1) >= 2;

              return (
                <g key={`sym-${idx}`}>
                  {isCurrent && (
                    <circle cx={x} cy={y} r={config.lineSpacing * 1.5} fill={COLORS.playing} opacity="0.16">
                      <animate attributeName="r" values={`${config.lineSpacing * 1.2};${config.lineSpacing * 1.7};${config.lineSpacing * 1.2}`} dur="0.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <line
                    x1={x + config.lineSpacing * 0.55}
                    y1={y}
                    x2={x + config.lineSpacing * 0.55}
                    y2={y - config.lineSpacing * 2.6}
                    stroke={color}
                    strokeWidth="1.4"
                  />
                  <ellipse
                    cx={x}
                    cy={y}
                    rx={config.lineSpacing * 0.62}
                    ry={config.lineSpacing * 0.46}
                    fill={isHollow ? "white" : color}
                    stroke={color}
                    strokeWidth={isHollow ? 1.8 : 1.4}
                    transform={`rotate(-18, ${x}, ${y})`}
                  />
                  {sym.isAccent && (
                    <text
                      x={x}
                      y={y - config.lineSpacing * 3.1}
                      textAnchor="middle"
                      fontSize={config.lineSpacing * 1.15}
                      fontWeight="bold"
                      fill={color}
                    >
                      &gt;
                    </text>
                  )}
                  <text
                    x={x}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={config.lineSpacing * 0.95}
                    fontWeight={isCurrent ? 800 : 600}
                    fill={isCurrent ? COLORS.playing : style.color}
                    letterSpacing="0.04em"
                  >
                    {(sym.syllable ?? style.label).toLocaleUpperCase("tr")}
                  </text>
                </g>
              );
            })}

            {/* Vurus numaralari */}
            {Array.from({length: beats}, (_, i) => i + 1)
              .filter((beat) => beat === 1 || beat === beats || beat % beatNumberStep === 0)
              .map((beat) => (
                <text
                  key={`beat-${beat}`}
                  x={beatX(beat)}
                  y={beatNumberY}
                  textAnchor="middle"
                  fontSize={config.lineSpacing * 0.85}
                  fill={COLORS.beatNumber}
                >
                  {beat}
                </text>
              ))}

            {/* Oynatma cizgisi: duyulan darbin nota merkezine hizali (playheadX). */}
            {isPlaying && progressBeat >= 0 && (
              <line
                x1={playheadX(progressBeat)}
                y1={staffTop - config.lineSpacing * 1.1}
                x2={playheadX(progressBeat)}
                y2={staffTop + staffHeight + config.lineSpacing * 1.1}
                stroke={COLORS.playhead}
                strokeWidth="2"
                opacity="0.75"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Lejant: yalniz desende gecen darp turleri, gercek renklerle */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
        {Object.keys(SYMBOL_STYLES)
          .filter((key) => symbols.some((sym) => sym.symbol === key))
          .map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
              <span aria-hidden style={{color: SYMBOL_STYLES[key].color, fontSize: "0.9rem", lineHeight: 1}}>●</span>
              {SYMBOL_STYLES[key].label.charAt(0) + SYMBOL_STYLES[key].label.slice(1).toLocaleLowerCase("tr")}
            </span>
          ))}
        <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
          <span aria-hidden className="font-bold" style={{color: COLORS.label}}>&gt;</span>
          Vurgu
        </span>
      </div>
    </div>
  );
}
