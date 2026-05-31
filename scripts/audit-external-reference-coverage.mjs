import {getOption, parseCliOptions} from "./lib/external-source-intake.mjs";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_OUT_DIR,
  parsePositiveInteger,
  runExternalReferenceCoverageAudit,
} from "./lib/external-reference-audit.mjs";

const options = parseCliOptions(process.argv.slice(2));

console.log(
  JSON.stringify(
    runExternalReferenceCoverageAudit({
      outDir: getOption(options, "out-dir", DEFAULT_OUT_DIR),
      batchSize: parsePositiveInteger(getOption(options, "batch-size"), DEFAULT_BATCH_SIZE),
    }),
    null,
    2,
  ),
);
