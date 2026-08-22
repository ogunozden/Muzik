import "server-only";

import {unlink} from "node:fs/promises";
import {NextResponse} from "next/server";

import {writeCandidateManifestInput, writeCandidateReviewGroupDecisionInput} from "../route-io";
import type {OperationBody} from "../route-types";
import {runNodeScript} from "./runtime";

export async function importCandidateManifest(body: OperationBody): Promise<unknown> {
  const candidateManifestText =
    typeof body.candidateManifestText === "string"
      ? body.candidateManifestText
      : typeof body.candidateManifest === "object" && body.candidateManifest !== null
        ? JSON.stringify(body.candidateManifest)
        : "";
  let tempInputFilePath: string | null = null;

  try {
    const tempInput = await writeCandidateManifestInput(candidateManifestText);
    tempInputFilePath = tempInput.filePath;

    const args = ["scripts/import-external-reference-candidates.mjs", "--input", tempInput.relativePath];
    if (body.dryRun) args.push("--dry-run");

    return await runNodeScript(args);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json({error: error.message}, {status: Number((error as Error & {status: unknown}).status)});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

export async function importCandidateReviewGroupDecisionManifest(body: OperationBody): Promise<unknown> {
  const manifestText =
    typeof body.candidateReviewGroupDecisionManifestText === "string"
      ? body.candidateReviewGroupDecisionManifestText
      : typeof body.candidateReviewGroupDecisionManifest === "object" &&
          body.candidateReviewGroupDecisionManifest !== null
        ? JSON.stringify(body.candidateReviewGroupDecisionManifest)
        : "";
  let tempInputFilePath: string | null = null;

  try {
    const tempInput = await writeCandidateReviewGroupDecisionInput(manifestText);
    tempInputFilePath = tempInput.filePath;

    const args = ["scripts/import-candidate-review-group-decisions.mjs", "--input", tempInput.relativePath];
    if (!body.dryRun) args.push("--write");

    return await runNodeScript(args);
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json({error: error.message}, {status: Number((error as Error & {status: unknown}).status)});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}
