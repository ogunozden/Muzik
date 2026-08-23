import "server-only";

import {execFile} from "node:child_process";
import {NextResponse} from "next/server";

import {JSON_MAX_BUFFER_BYTES, PROJECT_ROOT} from "../route-config";

let operationInFlight = false;

export function parseScriptJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

export async function runNodeScript(args: string[]): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        cwd: PROJECT_ROOT,
        maxBuffer: JSON_MAX_BUFFER_BYTES,
        timeout: 120_000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr.trim() || stdout.trim() || error.message;
          reject(new Error(message));
          return;
        }

        try {
          resolve(parseScriptJson(stdout));
        } catch {
          reject(new Error(stdout.trim() || "Operation did not return JSON."));
        }
      },
    );
  });
}

export async function runExclusiveOperation(callback: () => Promise<NextResponse>): Promise<NextResponse> {
  if (operationInFlight) {
    return NextResponse.json(
      {error: "Başka bir harici kaynak operasyonu devam ediyor. Bitince tekrar dene."},
      {status: 409},
    );
  }

  operationInFlight = true;
  try {
    return await callback();
  } finally {
    operationInFlight = false;
  }
}
