import {
  createSourcesFromCliOptions,
  getOption,
  getOptionValues,
  parseCliOptions,
  stageExternalSources,
} from "./lib/external-source-intake.mjs";

const options = parseCliOptions(process.argv.slice(2));
const cliSources = createSourcesFromCliOptions(options);
const inputPath = getOption(options, "input");

if (!inputPath && getOptionValues(options, "url").length === 0) {
  throw new Error("Provide --url <https://...> or --input <json|csv|md|txt>.");
}

const summary = stageExternalSources({
  inboxPath: getOption(options, "inbox"),
  inputPath,
  cliSources,
  updateExisting: getOption(options, "update-existing") === "true",
  dryRun: getOption(options, "dry-run") === "true",
});

console.log(JSON.stringify(summary, null, 2));
