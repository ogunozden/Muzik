import {HICAZKAR_PESREV, parseSymbtrScore} from "@/data/pieces/hicazkarPesrev";
import {buildCanonicalScoreFromSymbtrEvents} from "./canonical-score";

export const SCORE_ENGINE_DEMO_SYMBTR = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset",
  "1\t51\t\t\t0\t0\t28\t4\t0\t60\t0\tDevr-i Kebir\t0.0",
  "2\t9\tFa5#4\tF5#4\t344\t344\t1\t4\t833\t95\t96\t1. HANE\t0.1",
  "3\t9\tLa5\tA5\t358\t358\t1\t4\t833\t95\t96\t\t0.25",
  "4\t9\tSol5\tG5\t352\t352\t3\t16\t625\t95\t96\t\t0.45",
  "5\t9\tSib5b5\tB5b5\t349\t349\t1\t16\t208\t95\t96\t\t0.55",
  "6\t9\tLa5\tA5\t358\t358\t1\t8\t417\t95\t96\t\t0.7",
  "7\t9\tSol5\tG5\t352\t352\t1\t8\t417\t95\t96\t\t0.85",
  "8\t9\tFa5#4\tF5#4\t344\t344\t1\t4\t833\t95\t96\t\t1.1",
  "9\t9\tMi5\tE5\t335\t335\t1\t4\t833\t95\t96\t\t1.35",
  "10\t9\tRe5\tD5\t326\t326\t1\t4\t833\t95\t96\t\t1.6",
  "11\t9\tFa5#4\tF5#4\t344\t344\t1\t8\t417\t95\t96\t\t1.85",
  "12\t9\tSol5\tG5\t352\t352\t1\t8\t417\t95\t96\t\t2.1",
  "13\t9\tLa5\tA5\t358\t358\t1\t4\t833\t95\t96\t\t2.35",
  "14\t9\tSol5\tG5\t352\t352\t1\t4\t833\t95\t96\t\t2.6",
  "15\t9\tFa5#4\tF5#4\t344\t344\t1\t2\t1667\t95\t96\t\t2.85",
  "16\t9\tEs\tEs\t0\t0\t1\t4\t833\t95\t96\t\t3.1",
].join("\n");

export const SCORE_ENGINE_DEMO_EVENTS = parseSymbtrScore(
  SCORE_ENGINE_DEMO_SYMBTR,
  HICAZKAR_PESREV.bpm,
  HICAZKAR_PESREV.playbackAhenk?.koma53Offset ?? 0,
);

export const SCORE_ENGINE_DEMO_DOCUMENT = buildCanonicalScoreFromSymbtrEvents(
  HICAZKAR_PESREV,
  SCORE_ENGINE_DEMO_EVENTS,
  {
    scoreId: "score-engine-demo:hicazkar-pesrev",
    sourceReference: "inline-demo:symbtr:first-hane-excerpt",
  },
);
