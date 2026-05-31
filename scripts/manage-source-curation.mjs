import {readFileSync} from "node:fs";
import {
  generateAutoAttachedReferences,
  generateSourceQualityStats,
  recordSourceFeedback,
  recordSourceFeedbackBatch,
  upsertEmbedState,
  upsertManualSourceCorrection,
} from "./lib/source-curation-operations.mjs";

function parseCliOptions(args) {
  const options = new Map();
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      options.set(key, next);
      index += 1;
    } else {
      options.set(key, "true");
    }
  }

  return {action: positional[0], options};
}

function readPayload(options) {
  const input = options.get("input");
  if (!input) return {};
  return JSON.parse(readFileSync(input, "utf8"));
}

const {action, options} = parseCliOptions(process.argv.slice(2));
const write = options.get("write") === "true" && options.get("dry-run") !== "true";
const payload = readPayload(options);
let result;

if (action === "auto-attach") {
  result = generateAutoAttachedReferences({write});
} else if (action === "feedback") {
  result = recordSourceFeedback({feedback: payload.feedback ?? payload});
} else if (action === "feedback-batch") {
  result = recordSourceFeedbackBatch({
    feedbackEvents: payload.feedbackEvents ?? payload.feedbackBatch ?? payload.feedbacks ?? payload,
  });
} else if (action === "manual-correction") {
  result = upsertManualSourceCorrection({correction: payload.manualCorrection ?? payload});
} else if (action === "embed-state") {
  result = upsertEmbedState({embedState: payload.embedState ?? payload});
} else if (action === "stats") {
  result = generateSourceQualityStats({write});
} else {
  throw new Error(`Unknown source curation action: ${action ?? "<missing>"}`);
}

console.log(JSON.stringify(result, null, 2));
