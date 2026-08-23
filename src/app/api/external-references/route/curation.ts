import "server-only";

import {unlink} from "node:fs/promises";
import {NextResponse} from "next/server";

import {recordSourceTerminalFeedback} from "../route-feedback";
import {writeJsonPayloadInput} from "../route-io";
import type {OperationBody} from "../route-types";
import {runNodeScript} from "./runtime";
import {requiredArrayPayload, requiredObjectPayload} from "./validation";

export async function runCurationPayloadAction(
  action: "feedback" | "feedback-batch" | "manual-correction" | "embed-state",
  payload: unknown,
): Promise<unknown> {
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({error: "Kürasyon operasyon girdisi gerekli."}, {status: 400});
  }

  let tempInputFilePath: string | null = null;
  try {
    const tempInput = await writeJsonPayloadInput(payload);
    tempInputFilePath = tempInput.filePath;
    return await runNodeScript(["scripts/manage-source-curation.mjs", action, "--input", tempInput.relativePath]);
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as Error & {status: unknown}).status === 413) {
      return NextResponse.json({error: error.message}, {status: 413});
    }
    throw error;
  } finally {
    if (tempInputFilePath) {
      await unlink(tempInputFilePath).catch(() => undefined);
    }
  }
}

export async function runCurationOperation(body: OperationBody): Promise<unknown> {
  if (body.action === "curation-auto-attach") {
    const args = ["scripts/manage-source-curation.mjs", "auto-attach"];
    if (!body.dryRun) args.push("--write");
    return await runNodeScript(args);
  }

  if (body.action === "curation-stats") {
    const args = ["scripts/manage-source-curation.mjs", "stats"];
    if (!body.dryRun) args.push("--write");
    return await runNodeScript(args);
  }

  if (body.action === "curation-validate") {
    return await runNodeScript(["scripts/validate-source-curation.mjs"]);
  }

  if (body.action === "curation-feedback") {
    const feedback = requiredObjectPayload(body.feedback, "Feedback girdisi");
    if (feedback instanceof NextResponse) return feedback;
    return await runCurationPayloadAction("feedback", {feedback});
  }

  if (body.action === "curation-feedback-batch") {
    const feedbackEvents = requiredArrayPayload(body.feedbackEvents, "Toplu feedback girdisi");
    if (feedbackEvents instanceof NextResponse) return feedbackEvents;
    return await runCurationPayloadAction("feedback-batch", {feedbackEvents});
  }

  if (body.action === "source-terminal-feedback") {
    const sourceTerminalFeedback = requiredObjectPayload(
      body.sourceTerminalFeedback,
      "Terminal kaynak feedback girdisi",
    );
    if (sourceTerminalFeedback instanceof NextResponse) return sourceTerminalFeedback;
    return await recordSourceTerminalFeedback(sourceTerminalFeedback);
  }

  if (body.action === "curation-manual-correction") {
    const manualCorrection = requiredObjectPayload(body.manualCorrection, "Manuel düzeltme girdisi");
    if (manualCorrection instanceof NextResponse) return manualCorrection;
    return await runCurationPayloadAction("manual-correction", {manualCorrection});
  }

  const embedState = requiredObjectPayload(body.embedState, "Embed state girdisi");
  if (embedState instanceof NextResponse) return embedState;
  return await runCurationPayloadAction("embed-state", {embedState});
}
