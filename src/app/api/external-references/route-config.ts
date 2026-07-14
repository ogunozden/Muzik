import path from "node:path";

/**
 * external-references route sabitleri (M8.1 bolme): dosya yollari,
 * boyut/limit sinirlari ve ops-token basliklari. Runtime mantigi yok.
 */

export const PROJECT_ROOT = process.cwd();
export const INBOX_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "external-source-inbox.json");
export const MAPPING_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "mapped-external-reference-candidates.json",
);
export const COVERAGE_SUMMARY_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "summary.json");
export const PROD_CYCLE_SUMMARY_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "prod-cycle-summary.json");
export const SOURCE_DISCOVERY_RUN_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "discovery-run.json");
export const SOURCE_DISCOVERY_VERIFICATION_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "discovery-verification.json");
export const SOURCE_DISCOVERY_ACCEPTED_IMPORT_READY_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "accepted-import-ready.json");
export const SOURCE_DISCOVERY_PROVIDER_COVERAGE_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-coverage.json");
export const SOURCE_DISCOVERY_NEGATIVE_CACHE_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "negative-cache.json");
export const SOURCE_DISCOVERY_COVERAGE_DELTA_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "coverage-delta.json");
export const SOURCE_PROVIDER_VERIFICATION_RUN_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-run.json");
export const SOURCE_PROVIDER_VERIFICATION_EVIDENCE_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-evidence.json");
export const SOURCE_PROVIDER_VERIFICATION_ACCEPTED_IMPORT_READY_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-accepted-import-ready.json");
export const SOURCE_PROVIDER_VERIFICATION_PLAN_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-plan.json");
export const SOURCE_PROVIDER_VERIFICATION_COVERAGE_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-coverage.json");
export const SOURCE_PROVIDER_VERIFICATION_BATCH_RUN_FILE = path.join(PROJECT_ROOT, "output", "external-source-discovery", "provider-verification-batch-run.json");
export const SOURCE_PROVIDER_VERIFICATION_CONTINUE_SCRIPT = "npm run verify:external-source-providers:continue";
export const SOURCE_TERMINAL_DECISIONS_FILE = path.join(PROJECT_ROOT, "output", "prod-closure", "source-terminal-decisions.json");
export const SOURCE_TERMINAL_FEEDBACK_FILE = path.join(PROJECT_ROOT, "output", "prod-closure", "source-terminal-feedback-events.json");
export const SOURCE_TERMINAL_FEEDBACK_LOCK_FILE = `${SOURCE_TERMINAL_FEEDBACK_FILE}.lock`;
export const AUTO_ATTACHED_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "auto-attached-references.json");
export const FEEDBACK_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "source-feedback-events.json");
export const MANUAL_CORRECTIONS_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "manual-source-corrections.json");
export const RESEARCH_PROFILES_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "research-source-profiles.json");
export const EMBED_STATES_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "embed-states.json");
export const QUALITY_STATS_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "source-quality-stats.generated.json");
export const BULK_CANDIDATES_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "external-reference-bulk-candidates.json");
export const CANDIDATE_REVIEW_GROUP_DECISIONS_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "candidate-review-group-decisions.json");
export const BACKLOG_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "symbtr-curated-reference-backlog.json");
export const NEXT_BATCH_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "symbtr-curated-reference-next-batch.json");
export const CANDIDATE_REVIEW_QUEUE_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-queue.json",
);
export const CANDIDATE_REVIEW_GROUPS_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-groups.json",
);
export const CANDIDATE_REVIEW_GROUP_DECISION_RECOMMENDATIONS_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-group-decision-recommendations.json",
);
export const CANDIDATE_REVIEW_BATCH_PLAN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-candidate-review-batch-plan.json",
);
export const SOURCE_INTAKE_TEMPLATE_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "symbtr-curated-reference-source-intake-template.json",
);
export const SOURCE_INTAKE_ACCEPTED_DRY_RUN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "external-reference-coverage",
  "source-intake-accepted-import-dry-run.json",
);
export const SYMBTR_LAYOUT_VERIFICATION_SUMMARY_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-summary.json",
);
export const SYMBTR_LAYOUT_REVIEW_TEMPLATE_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-review-template.json",
);
export const SYMBTR_LAYOUT_REVIEW_BATCH_PLAN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-review-batch-plan.json",
);
export const SYMBTR_LAYOUT_EMPTY_IMPORT_DRY_RUN_FILE = path.join(
  PROJECT_ROOT,
  "output",
  "symbtr-layout-review",
  "layout-verification-empty-import-dry-run.json",
);
export const TEMP_INPUT_DIR = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "ui-input");
export const JSON_MAX_BUFFER_BYTES = 1024 * 1024 * 12;
export const MAX_BULK_TEXT_CHARS = 100_000;
export const MAX_CANDIDATE_IMPORT_CHARS = 8_000_000;
export const MAX_CURATION_PAYLOAD_CHARS = 20_000;
export const MAX_SOURCE_FIELD_CHARS = 2_048;
export const DEFAULT_BACKLOG_LIMIT = 100;
export const MAX_BACKLOG_LIMIT = 500;
export const DEFAULT_CANDIDATE_LIMIT = 100;
export const MAX_CANDIDATE_LIMIT = 500;
export const DEFAULT_CANDIDATE_GROUP_LIMIT = 80;
export const MAX_CANDIDATE_GROUP_LIMIT = 500;
export const MAX_CANDIDATE_REVIEW_EXPORT_ROWS = 20_000;
export const MAX_CANDIDATE_REVIEW_GROUP_EXPORT_ROWS = 5_000;
export const MAX_CANDIDATE_REVIEW_GROUP_DECISION_TEMPLATE_ROWS = 5_000;
export const CANDIDATE_REVIEW_GROUP_DECISION_STATUSES = new Set(["rejected", "conflict", "deferred"]);
export const OPS_TOKEN_HEADER = "x-external-reference-ops-token";
export const UNSAFE_LOCAL_FLAG = "EXTERNAL_REFERENCE_OPERATIONS_ALLOW_UNSAFE_LOCAL";
