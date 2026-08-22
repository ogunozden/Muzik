import "server-only";

import {NextResponse} from "next/server";

import {isExternalReferenceAction} from "../route-feedback";
import {getExternalReferenceState} from "../route-state";
import type {OperationBody} from "../route-types";
import {getAccessError} from "./access";
import {runCurationOperation} from "./curation";
import {
  exportCandidateManifest,
  exportCandidateReviewGroupDecisionRecommendations,
  exportCandidateReviewGroups,
  exportCandidateReviewGroupDecisionTemplate,
  exportCandidateReviewQueue,
} from "./exports";
import {importCandidateManifest, importCandidateReviewGroupDecisionManifest} from "./imports";
import {runExclusiveOperation, runNodeScript} from "./runtime";
import {stageSources} from "./stage";

async function readOperationBody(request: Request): Promise<OperationBody | NextResponse> {
  try {
    return (await request.json()) as OperationBody;
  } catch {
    return NextResponse.json({error: "Geçersiz JSON gövdesi."}, {status: 400});
  }
}

export async function GET(request: Request) {
  try {
    const accessError = getAccessError(request);
    if (accessError) return accessError;

    return NextResponse.json(await getExternalReferenceState(request));
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Harici kaynak durumu okunamadı."},
      {status: 500},
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessError = getAccessError(request);
    if (accessError) return accessError;

    const bodyResult = await readOperationBody(request);
    if (bodyResult instanceof NextResponse) return bodyResult;

    const body = bodyResult;
    if (!isExternalReferenceAction(body.action)) {
      return NextResponse.json({error: "Geçersiz operasyon."}, {status: 400});
    }

    return await runExclusiveOperation(async () => {
      let result: unknown;

      if (body.action === "stage") {
        result = await stageSources(body);
      } else if (body.action === "map") {
        result = await runNodeScript(["scripts/map-external-source-inbox.mjs"]);
      } else if (body.action === "sync") {
        result = await runNodeScript(["scripts/map-external-source-inbox.mjs", "--write"]);
      } else if (body.action === "audit") {
        result = await runNodeScript(["scripts/audit-external-reference-coverage.mjs"]);
      } else if (body.action === "candidate-export") {
        result = await exportCandidateManifest();
      } else if (body.action === "candidate-import") {
        result = await importCandidateManifest(body);
      } else if (body.action === "candidate-review-export") {
        result = await exportCandidateReviewQueue(body);
      } else if (body.action === "candidate-review-group-export") {
        result = await exportCandidateReviewGroups(body);
      } else if (body.action === "candidate-review-group-decision-recommendation-export") {
        result = await exportCandidateReviewGroupDecisionRecommendations(body);
      } else if (body.action === "candidate-review-group-decision-template-export") {
        result = await exportCandidateReviewGroupDecisionTemplate(body);
      } else if (body.action === "candidate-review-group-decision-import") {
        result = await importCandidateReviewGroupDecisionManifest(body);
      } else {
        result = await runCurationOperation(body);
      }

      if (result instanceof NextResponse) return result;

      return NextResponse.json({
        action: body.action,
        result,
        state: await getExternalReferenceState(request),
      });
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Harici kaynak operasyonu başarısız."},
      {status: 500},
    );
  }
}
