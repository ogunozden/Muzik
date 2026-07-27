import type {CanonicalScoreDocument} from "./canonical-score";
import {getCanonicalPlaybackSchedule} from "./canonical-score";
import {summarizeCanonicalValidation} from "./validator";

export type CanonicalQualityMetricStatus = "pass" | "review" | "fail";
export type CanonicalQualityOverallStatus = "ready" | "needs-review" | "blocked";

export interface CanonicalQualityMetric {
  id: string;
  label: string;
  status: CanonicalQualityMetricStatus;
  value: string;
  detail: string;
}

export interface CanonicalScoreQualityReport {
  documentId: string;
  status: CanonicalQualityOverallStatus;
  score: number;
  metrics: CanonicalQualityMetric[];
}

function parseMeterQuarterBeats(meter: string): number | null {
  const match = meter.match(/^(\d+)\/(\d+)$/);
  if (!match) return null;

  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator <= 0 || denominator <= 0) {
    return null;
  }

  return numerator * (4 / denominator);
}

/**
 * Olcunun NE KADARININ dolu oldugunu, yazili mertebeye gore olcer (G8).
 *
 * Eskiden `measure.endBeat - measure.startBeat` ile karsilastiriliyordu; ama
 * ikisi de o olcunun KENDI event'lerinden turetiliyor (`canonical-score.ts`:
 * `startBeat = min(...)`, `endBeat = max(...)`). Bu, "ilk notadan son notaya
 * kadar olan aralik" demekti — olcunun BASINDAKI ya da SONUNDAKI bosluk
 * gorunmuyordu. Yani metrik doluluk degil, event YAYILIMI olcuyordu.
 *
 * Simdi olcunun icindeki SURELERIN TOPLAMI mertebeyle karsilastiriliyor.
 * Bu, `startBeat`/`endBeat`ten bagimsiz bir buyukluk: bar cizgisi bolmesi
 * (G7) calismazsa ya da olcu numarasi yanlis atanirsa BURADA gorunur.
 *
 * Son olcu haric tutulur: eserlerin cogu tam olcuyle bitmez ve bu bir hata
 * degildir (olculdu: kanonik uzunlugu tam olcuye oturan eser %75,8).
 */
function countMeasureSpanMismatches(document: CanonicalScoreDocument): number {
  const expectedQuarterBeats = parseMeterQuarterBeats(document.meter);
  if (!expectedQuarterBeats) return document.measures.length;

  const durationByMeasure = new Map<string, number>();
  for (const event of document.events) {
    durationByMeasure.set(event.measureId, (durationByMeasure.get(event.measureId) ?? 0) + event.durationBeats);
  }

  return document.measures.slice(0, -1).filter((measure) => {
    const filled = durationByMeasure.get(measure.id) ?? 0;
    return Math.abs(filled - expectedQuarterBeats) > 0.001;
  }).length;
}

function metricWeight(status: CanonicalQualityMetricStatus): number {
  if (status === "pass") return 0;
  if (status === "review") return 9;
  return 22;
}

export function evaluateCanonicalScoreQuality(document: CanonicalScoreDocument): CanonicalScoreQualityReport {
  const validation = summarizeCanonicalValidation(document.validationIssues);
  const measureMismatches = countMeasureSpanMismatches(document);
  const verifiedAnchorCount = document.sourceAnchors.filter((anchor) => anchor.status === "verified").length;
  const candidateAnchorCount = document.sourceAnchors.filter((anchor) => anchor.status === "candidate").length;
  const rejectedAnchorCount = document.sourceAnchors.filter((anchor) => anchor.status === "rejected").length;
  const schedule = getCanonicalPlaybackSchedule(document);
  const scheduleIsMonotonic = schedule.every((note, index) => index === 0 || note.startTime >= schedule[index - 1].startTime);
  const pitchIssueCount = document.validationIssues.filter(
    (issue) => issue.code.includes("pitch") || issue.code.includes("vex"),
  ).length;

  const metrics: CanonicalQualityMetric[] = [
    {
      id: "source-fingerprint",
      label: "Kaynak fingerprint",
      status: document.sourceFingerprint.includes("unfingerprinted") ? "review" : "pass",
      value: document.sourceFingerprint.includes("unfingerprinted") ? "gecici" : "kalici",
      detail: document.sourceFingerprint,
    },
    {
      id: "measure-duration-usul",
      label: "Olcu doluluğu / mertebe",
      status: measureMismatches === 0 ? "pass" : "review",
      value: measureMismatches === 0 ? "uyumlu" : `${measureMismatches} review`,
      // Son olcu haric tutuluyor (eserlerin cogu tam olcuyle bitmez).
      detail: `${Math.max(0, document.measures.length - 1) - measureMismatches}/${Math.max(0, document.measures.length - 1)} olcu ${document.meter} mertebesini tam dolduruyor`,
    },
    {
      id: "pitch-vex-mapping",
      label: "Pitch/Vex mapping",
      status: pitchIssueCount === 0 ? "pass" : "fail",
      value: pitchIssueCount === 0 ? "tam" : `${pitchIssueCount} hata`,
      detail: validation.ok ? "Pitch parse ve VexFlow mapping hatasi yok" : "Validator issue listesine bak",
    },
    {
      id: "source-anchors",
      label: "Source anchor",
      status: verifiedAnchorCount > 0 ? "pass" : document.sourceAnchors.length > 0 ? "review" : "review",
      value: verifiedAnchorCount > 0 ? `${verifiedAnchorCount} verified` : `${candidateAnchorCount} aday`,
      detail:
        document.sourceAnchors.length > 0
          ? `${candidateAnchorCount} candidate, ${verifiedAnchorCount} verified, ${rejectedAnchorCount} rejected`
          : "PDF/gorsel anchor yok; sembolik skor yine uydurulmaz",
    },
    {
      id: "usul-cycle",
      label: "Usul cycle",
      status: document.usulCycle.length > 0 ? "pass" : "review",
      value: document.usulCycle.length > 0 ? `${document.usulCycle.length} darb` : "eksik",
      detail: document.usulCycle.length > 0 ? "Darb lane canonical modele bagli" : "Katalog importunda darb pattern review gerekir",
    },
    {
      id: "playback-sync",
      label: "Playback sync",
      status: schedule.length > 0 && scheduleIsMonotonic ? "pass" : "fail",
      value: `${schedule.length} nota`,
      detail: scheduleIsMonotonic ? "Schedule noteId ile monoton ilerliyor" : "Schedule startTime sirasi bozuk",
    },
  ];

  const score = Math.max(0, 100 - metrics.reduce((total, metric) => total + metricWeight(metric.status), 0));
  const hasFail = metrics.some((metric) => metric.status === "fail") || validation.errorCount > 0;
  const hasReview = metrics.some((metric) => metric.status === "review") || validation.warningCount > 0;

  return {
    documentId: document.id,
    status: hasFail ? "blocked" : hasReview ? "needs-review" : "ready",
    score,
    metrics,
  };
}
