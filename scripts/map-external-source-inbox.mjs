import {
  DEFAULT_MAPPING_CSV_OUTPUT,
  DEFAULT_MAPPING_INPUT,
  DEFAULT_MAPPING_OUTPUT,
  runExternalSourceMappingPipeline,
} from "./lib/external-source-mapping-pipeline.mjs";

function parseCliOptions(args) {
  const options = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

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

  return options;
}

const options = parseCliOptions(process.argv.slice(2));
const summary = await runExternalSourceMappingPipeline({
  inputPath: options.get("input") ?? DEFAULT_MAPPING_INPUT,
  outputPath: options.get("output") ?? DEFAULT_MAPPING_OUTPUT,
  csvOutputPath: options.get("csv-output") ?? DEFAULT_MAPPING_CSV_OUTPUT,
  shouldWrite: options.get("write") === "true" && options.get("dry-run") !== "true",
  verifyYoutubeOembed: options.get("verify-youtube-oembed") === "true",
  fetchPageMetadataEnabled: options.get("fetch-page-metadata") === "true",
});

console.log(JSON.stringify(summary, null, 2));
