import {readFileSync} from "node:fs";
import path from "node:path";
import {validateSourceCurationRegistries} from "./lib/source-curation-validation.mjs";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function sourcesFromMapping(mappingData) {
  return (mappingData?.mappings ?? [])
    .map((mapping) => mapping?.candidate?.source)
    .filter((source) => source?.id);
}

function sourcesFromBulkCandidates(bulkCandidateData) {
  return (bulkCandidateData?.candidates ?? [])
    .map((candidate) => candidate?.source)
    .filter((source) => source?.id);
}

function dedupeSources(sources) {
  return [...new Map(sources.map((source) => [source.id, source])).values()];
}

const result = validateSourceCurationRegistries({
  catalog: readJson("src/data/symbtr/catalog.generated.json"),
  autoAttached: readJson("src/data/references/auto-attached-references.json"),
  feedback: readJson("src/data/references/source-feedback-events.json"),
  manualCorrections: readJson("src/data/references/manual-source-corrections.json"),
  researchProfiles: readJson("src/data/references/research-source-profiles.json"),
  embedStates: readJson("src/data/references/embed-states.json"),
  qualityStats: readJson("src/data/references/source-quality-stats.generated.json"),
  candidateReviewQueue: readJson("output/external-reference-coverage/symbtr-curated-reference-candidate-review-queue.json"),
  candidateReviewGroups: readJson("output/external-reference-coverage/symbtr-curated-reference-candidate-review-groups.json"),
  candidateReviewGroupDecisions: readJson("src/data/references/candidate-review-group-decisions.json"),
  coverageSummary: readJson("output/external-reference-coverage/summary.json"),
  sources: dedupeSources([
    ...sourcesFromMapping(readJson("output/external-reference-coverage/mapped-external-reference-candidates.json")),
    ...sourcesFromBulkCandidates(readJson("src/data/references/external-reference-bulk-candidates.json")),
  ]),
});

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
