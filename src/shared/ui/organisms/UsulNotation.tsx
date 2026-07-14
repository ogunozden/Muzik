/**
 * UsulNotation - Professional Musical Staff Visualization
 * 
 * Oynatma sırasında aktif vuruşu takip eder
 * Video'daki gibi dinamik animasyon
 */

"use client";

import React, {useRef, useEffect} from "react";
import type {UsulSymbol} from "@/types";

interface UsulNotationProps {
  symbols: UsulSymbol[];
  unit: string;
  beats: number;
  isPlaying?: boolean;
  currentBeat?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const COLORS = {
  staff: "#3E2723",
  note: "#5D4037",
  noteHead: "#3E2723",
  stem: "#3E2723",
  beam: "#5D4037",
  accent: "#8B5A2B",
  ledger: "#9E9E9E",
  playing: "#D4A574",
  playingGlow: "#FFB74D",
  inactive: "#BDBDBD",
};

// Note positions on staff
const NOTE_POSITIONS: Record<string, number> = {
  dum: 6,
  tek: 2,
  ke: -2,
};

const NOTE_COLORS: Record<string, string> = {
  dum: COLORS.accent,
  tek: COLORS.note,
  ke: "#9E9E9E",
};

export function UsulNotation({
  symbols,
  unit,
  beats,
  isPlaying = false,
  currentBeat = -1,
  size = "md",
  className = "",
}: UsulNotationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Size configurations
  const configs = {
    sm: {lineSpacing: 10, noteWidth: 28},
    md: {lineSpacing: 14, noteWidth: 36},
    lg: {lineSpacing: 18, noteWidth: 44},
  };
  
  const config = configs[size];
  const staffHeight = 4 * config.lineSpacing;
  const clefWidth = config.lineSpacing * 2.5;
  const timeWidth = config.lineSpacing * 2;
  const noteAreaStart = clefWidth + timeWidth + 20;
  const noteAreaWidth = symbols.length * config.noteWidth;
  const totalWidth = noteAreaStart + noteAreaWidth + 100;
  const totalHeight = staffHeight + config.lineSpacing * 6 + 60;
  const staffY = config.lineSpacing * 2;
  
  // Scroll to current beat when playing
  useEffect(() => {
    if (isPlaying && currentBeat >= 0 && scrollRef.current) {
      const scrollTo = Math.max(0, currentBeat * config.noteWidth - 100);
      scrollRef.current.scrollTo({
        left: scrollTo,
        behavior: "smooth",
      });
    }
  }, [currentBeat, isPlaying, config.noteWidth]);

  return (
    <div className={className}>
      {/* Time signature header */}
      <div 
        className="flex items-center gap-2 mb-2"
        style={{marginBottom: "var(--space-2)"}}
      >
        <span 
          className="font-bold"
          style={{fontSize: "1.25rem", color: COLORS.staff, fontFamily: "Times New Roman, serif"}}
        >
          {beats}
        </span>
        <span 
          style={{fontSize: "1.25rem", color: COLORS.staff, fontFamily: "Times New Roman, serif"}}
        >
          /
        </span>
        <span 
          style={{fontSize: "1.25rem", color: COLORS.staff, fontFamily: "Times New Roman, serif"}}
        >
          {unit}
        </span>
        <span 
          className="ml-2 text-sm"
          style={{color: COLORS.inactive}}
        >
          𝄞
        </span>
      </div>
      
      {/* Scrolling notation area */}
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={{
          overflowX: "auto",
          maxHeight: totalHeight,
          scrollBehavior: "smooth",
          borderRadius: "var(--radius-md)",
          backgroundColor: "white",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <svg
          width={totalWidth}
          height={totalHeight}
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          style={{overflow: "visible"}}
        >
          {/* Staff lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`staff-${i}`}
              x1={noteAreaStart - 10}
              y1={staffY + i * config.lineSpacing}
              x2={totalWidth - 20}
              y2={staffY + i * config.lineSpacing}
              stroke={COLORS.staff}
              strokeWidth="1"
              opacity="0.4"
            />
          ))}
          
          {/* Notes */}
          {symbols.map((sym, idx) => {
            const noteX = noteAreaStart + idx * config.noteWidth + config.noteWidth / 2;
            const position = NOTE_POSITIONS[sym.symbol] || 0;
            const noteY = staffY + 2 * config.lineSpacing - (position * config.lineSpacing / 2);
            const isCurrent = isPlaying && currentBeat === idx;
            const isPast = isPlaying && currentBeat > idx;
            const color = isCurrent 
              ? COLORS.playingGlow 
              : isPast 
                ? COLORS.inactive 
                : NOTE_COLORS[sym.symbol] || COLORS.note;
            
            // Ledger lines
            const ledgerLines: React.ReactNode[] = [];
            if (position > 4) {
              for (let p = 6; p <= position; p += 2) {
                const ledgerY = staffY + 2 * config.lineSpacing - (p * config.lineSpacing / 2);
                ledgerLines.push(
                  <line
                    key={`ledger-above-${idx}-${p}`}
                    x1={noteX - config.noteWidth / 3}
                    y1={ledgerY}
                    x2={noteX + config.noteWidth / 3}
                    y2={ledgerY}
                    stroke={COLORS.ledger}
                    strokeWidth="1"
                    opacity={isPast ? 0.3 : 0.5}
                  />
                );
              }
            }
            if (position < -4) {
              for (let p = -6; p >= position; p -= 2) {
                const ledgerY = staffY + 2 * config.lineSpacing - (p * config.lineSpacing / 2);
                ledgerLines.push(
                  <line
                    key={`ledger-below-${idx}-${p}`}
                    x1={noteX - config.noteWidth / 3}
                    y1={ledgerY}
                    x2={noteX + config.noteWidth / 3}
                    y2={ledgerY}
                    stroke={COLORS.ledger}
                    strokeWidth="1"
                    opacity={isPast ? 0.3 : 0.5}
                  />
                );
              }
            }
            
            return (
              <g key={`note-${idx}`}>
                {/* Ledger lines */}
                {ledgerLines}
                
                {/* Highlight background for current note */}
                {isCurrent && (
                  <rect
                    x={noteX - config.noteWidth / 2 - 4}
                    y={staffY - config.lineSpacing}
                    width={config.noteWidth + 8}
                    height={staffHeight + config.lineSpacing * 2}
                    fill={COLORS.playingGlow}
                    opacity="0.15"
                    rx="4"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.15;0.25;0.15"
                      dur="0.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                
                {/* Note head */}
                <ellipse
                  cx={noteX}
                  cy={noteY}
                  rx={config.lineSpacing * 0.5}
                  ry={config.lineSpacing * 0.4}
                  fill={sym.timeValue >= 2 ? color : "none"}
                  stroke={color}
                  strokeWidth={sym.isAccent ? 2.5 : 1.5}
                  transform={`rotate(-15, ${noteX}, ${noteY})`}
                  style={{
                    filter: isCurrent ? `drop-shadow(0 0 8px ${COLORS.playingGlow})` : undefined,
                    transition: "all 0.15s ease-out",
                  }}
                />
                
                {/* Stem */}
                {sym.timeValue >= 2 && (
                  <line
                    x1={noteX + config.lineSpacing * 0.35}
                    y1={noteY}
                    x2={noteX + config.lineSpacing * 0.35}
                    y2={noteY - config.lineSpacing * 2.5}
                    stroke={color}
                    strokeWidth="1.5"
                    style={{
                      opacity: isPast ? 0.4 : 1,
                      transition: "all 0.15s ease-out",
                    }}
                  />
                )}
                
                {/* Accent indicator */}
                {sym.isAccent && (
                  <circle
                    cx={noteX}
                    cy={staffY + staffHeight + config.lineSpacing * 0.8}
                    r={isCurrent ? 5 : 3}
                    fill={isCurrent ? COLORS.playingGlow : COLORS.accent}
                    style={{
                      filter: isCurrent ? `drop-shadow(0 0 6px ${COLORS.playingGlow})` : undefined,
                      transition: "all 0.15s ease-out",
                    }}
                  />
                )}
                
                {/* Beat number */}
                <text
                  x={noteX}
                  y={staffY + staffHeight + config.lineSpacing * 1.5}
                  textAnchor="middle"
                  fontSize={config.lineSpacing * 0.6}
                  fill={isCurrent ? COLORS.accent : COLORS.inactive}
                  fontWeight={isCurrent ? 700 : 400}
                  style={{
                    opacity: isPast ? 0.4 : 1,
                    transition: "all 0.15s ease-out",
                  }}
                >
                  {sym.beat}
                </text>
              </g>
            );
          })}
          
          {/* Beam connecting notes */}
          <rect
            x={noteAreaStart + config.lineSpacing * 0.35}
            y={staffY - config.lineSpacing * 0.3}
            width={noteAreaWidth - config.lineSpacing}
            height={config.lineSpacing * 0.35}
            fill={COLORS.beam}
            opacity={isPlaying ? 0.8 : 0.4}
          />
          
          {/* Current position indicator */}
          {isPlaying && currentBeat >= 0 && currentBeat < symbols.length && (
            <line
              x1={noteAreaStart + currentBeat * config.noteWidth + config.noteWidth / 2}
              y1={staffY - config.lineSpacing * 0.5}
              x2={noteAreaStart + currentBeat * config.noteWidth + config.noteWidth / 2}
              y2={staffY + staffHeight + config.lineSpacing}
              stroke={COLORS.playingGlow}
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.6"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;8"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </line>
          )}
        </svg>
      </div>
      
      {/* Legend */}
      <div 
        className="flex items-center justify-center gap-4 mt-2"
        style={{
          marginTop: "var(--space-2)",
          gap: "var(--space-4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span className="flex items-center gap-1 text-xs" style={{color: COLORS.inactive}}>
          <span style={{color: COLORS.accent, fontSize: "1rem"}}>●</span>
          Düm
        </span>
        <span className="flex items-center gap-1 text-xs" style={{color: COLORS.inactive}}>
          <span style={{color: COLORS.note, fontSize: "1rem"}}>●</span>
          Tek
        </span>
        <span className="flex items-center gap-1 text-xs" style={{color: COLORS.inactive}}>
          <span style={{color: "#9E9E9E", fontSize: "1rem"}}>●</span>
          Ke
        </span>
      </div>
    </div>
  );
}

// ============================================
// COMPACT VERSION
// ============================================

interface UsulNotationCompactProps {
  symbols: UsulSymbol[];
  unit: string;
  beats: number;
  isPlaying?: boolean;
  currentBeat?: number;
  className?: string;
}

export function UsulNotationCompact({
  symbols,
  unit,
  beats,
  isPlaying = false,
  currentBeat = -1,
  className = "",
}: UsulNotationCompactProps) {
  const lineSpacing = 8;
  const noteWidth = 20;
  const staffY = 20;
  const clefWidth = 24;
  const timeWidth = 16;
  const noteAreaStart = clefWidth + timeWidth + 8;
  const totalWidth = noteAreaStart + symbols.length * noteWidth + 16;
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <svg
        width={totalWidth}
        height={56}
        viewBox={`0 0 ${totalWidth} 56`}
        className="flex-shrink-0"
      >
        {/* Staff lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="8"
            y1={staffY + i * lineSpacing}
            x2={totalWidth - 8}
            y2={staffY + i * lineSpacing}
            stroke={COLORS.staff}
            strokeWidth="0.75"
            opacity="0.4"
          />
        ))}
        
        {/* Treble clef */}
        <text
          x="12"
          y={staffY + 18}
          fontSize="20"
          fontFamily="Georgia, serif"
          fill={COLORS.staff}
        >
          𝄞
        </text>
        
        {/* Time signature */}
        <text
          x={clefWidth + 4}
          y={staffY + 14}
          fontSize="12"
          fontWeight="bold"
          fill={COLORS.staff}
        >
          {beats}
        </text>
        <text
          x={clefWidth + 4}
          y={staffY + 26}
          fontSize="12"
          fontWeight="bold"
          fill={COLORS.staff}
        >
          {unit}
        </text>
        
        {/* Notes */}
        {symbols.map((sym, idx) => {
          const noteX = noteAreaStart + idx * noteWidth;
          const position = NOTE_POSITIONS[sym.symbol] || 0;
          const noteY = staffY + 16 - (position * lineSpacing / 2);
          const isCurrent = isPlaying && currentBeat === idx;
          const isPast = isPlaying && currentBeat > idx;
          const color = isCurrent 
            ? COLORS.playingGlow 
            : isPast 
              ? COLORS.inactive 
              : NOTE_COLORS[sym.symbol] || COLORS.note;
          
          return (
            <g key={idx}>
              {/* Highlight */}
              {isCurrent && (
                <rect
                  x={noteX - 2}
                  y={staffY - 4}
                  width={noteWidth + 4}
                  height={40}
                  fill={COLORS.playingGlow}
                  opacity="0.15"
                  rx="2"
                />
              )}
              
              {/* Note head */}
              <ellipse
                cx={noteX + noteWidth / 2}
                cy={noteY}
                rx="4"
                ry="3"
                fill={sym.timeValue >= 2 ? color : "none"}
                stroke={color}
                strokeWidth="1.5"
                transform={`rotate(-15, ${noteX + noteWidth / 2}, ${noteY})`}
                style={{
                  filter: isCurrent ? `drop-shadow(0 0 4px ${COLORS.playingGlow})` : undefined,
                }}
              />
              
              {/* Stem */}
              {sym.timeValue >= 2 && (
                <line
                  x1={noteX + noteWidth / 2 + 3}
                  y1={noteY}
                  x2={noteX + noteWidth / 2 + 3}
                  y2={noteY - 12}
                  stroke={color}
                  strokeWidth="1"
                />
              )}
              
              {/* Accent dot */}
              {sym.isAccent && (
                <circle
                  cx={noteX + noteWidth / 2}
                  cy={staffY + 38}
                  r={isCurrent ? 3 : 2}
                  fill={isCurrent ? COLORS.playingGlow : COLORS.accent}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
