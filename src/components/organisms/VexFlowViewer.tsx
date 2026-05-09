"use client";

import React, { useEffect, useRef } from "react";
import type { NotaEvent } from "@/types";

interface VexFlowViewerProps {
  notes: NotaEvent[];
  width?: number;
  height?: number;
}

/**
 * Nota süresini (saniye) VexFlow duration string'ine çevirir.
 * VexFlow: "w" = tam, "h" = yarım, "q" = çeyrek, "8" = sekizlik, "16" = on altılık
 */
function durationToVexDuration(durationSec: number, bpm: number = 120): string {
  const beatDuration = 60 / bpm; // Bir vuruşun süresi (saniye)
  const beats = durationSec / beatDuration;

  if (beats >= 3.5) return "w";
  if (beats >= 1.75) return "h";
  if (beats >= 0.875) return "q";
  if (beats >= 0.4375) return "8";
  return "16";
}

/**
 * NotaEvent pitch stringini VexFlow key formatına çevirir.
 * Desteklenen formatlar: "C4", "C#4", "Eb4", "D4" vb.
 * Çıktı: ["c/4"], ["c#/4"], ["eb/4"] vb.
 */
function pitchToVexKey(pitch: string): { key: string; accidental: string | null } {
  // Regex: nota adı + opsiyonel diyez/bemol + oktav
  const match = pitch.match(/^([A-Ga-g])(#|b)?(\d)$/);
  if (!match) {
    return { key: "c/4", accidental: null }; // fallback
  }

  const [, noteName, acc, octave] = match;
  const key = `${noteName.toLowerCase()}${acc || ""}/${octave}`;
  return { key, accidental: acc || null };
}

export const VexFlowViewer: React.FC<VexFlowViewerProps> = ({ notes, width = 800, height = 200 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || notes.length === 0) return;

    // VexFlow'u dinamik olarak yükle (SSR uyumluluğu)
    let cancelled = false;

    import("vexflow").then((Vex) => {
      if (cancelled || !containerRef.current) return;

      // Clear previous SVG
      containerRef.current.innerHTML = "";

      const VF = Vex.default?.Flow || Vex.Flow;
      if (!VF) return;

      // Genişliği nota sayısına göre ölçekle (en az prop genişliği)
      const calculatedWidth = Math.max(width, notes.length * 60 + 100);

      const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);
      renderer.resize(calculatedWidth, height);
      const context = renderer.getContext();
      context.setFont("Arial", 10);

      // Notaları ölçülere (4 vuruş) böl
      const measuresOfNotes: NotaEvent[][] = [];
      let currentMeasure: NotaEvent[] = [];
      let measureBeatCount = 0;

      for (const note of notes) {
        const beats = Math.max(1, Math.round(durationToBeats(note.duration)));
        if (measureBeatCount + beats > 4 && currentMeasure.length > 0) {
          measuresOfNotes.push(currentMeasure);
          currentMeasure = [];
          measureBeatCount = 0;
        }
        currentMeasure.push(note);
        measureBeatCount += beats;
      }
      if (currentMeasure.length > 0) {
        measuresOfNotes.push(currentMeasure);
      }

      // Her ölçü için bir stave çiz
      let staveX = 10;
      const staveWidth = Math.max(200, (calculatedWidth - 20) / Math.max(1, measuresOfNotes.length));

      measuresOfNotes.forEach((measureNotes, measureIdx) => {
        const stave = new VF.Stave(staveX, 40, staveWidth);
        if (measureIdx === 0) {
          stave.addClef("treble").addTimeSignature("4/4");
        }
        stave.setContext(context).draw();

        const staveNotes = measureNotes.map((note) => {
          const { key, accidental } = pitchToVexKey(note.pitch);
          const vexDuration = durationToVexDuration(note.duration);

          const vfNote = new VF.StaveNote({
            clef: "treble",
            keys: [key],
            duration: vexDuration,
          });

          if (accidental) {
            vfNote.addModifier(new VF.Accidental(accidental));
          }

          return vfNote;
        });

        if (staveNotes.length > 0) {
          try {
            const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
            voice.addTickables(staveNotes);
            new VF.Formatter().joinVoices([voice]).format([voice], staveWidth - 30);
            voice.draw(context, stave);
          } catch {
            // Eğer vuruş sayısı tutmuyorsa sessizce geç
          }
        }

        staveX += staveWidth;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [notes, width, height]);

  return (
    <div
      ref={containerRef}
      className="vexflow-container border rounded bg-white shadow-sm overflow-x-auto"
      style={{ minHeight: height }}
    />
  );
};

function durationToBeats(durationSec: number, bpm: number = 120): number {
  const beatDuration = 60 / bpm;
  return durationSec / beatDuration;
}
