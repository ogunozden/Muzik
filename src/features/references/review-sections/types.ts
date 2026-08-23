import type {
  CandidateReviewGroup,
  CandidateReviewGroupPage,
  CandidateReviewPage,
  CandidateReviewRow,
  CurationReference,
  ExternalReferenceState,
} from "../curation-dashboard-types";

type Curation = NonNullable<ExternalReferenceState["curation"]>;
type SetStr = (value: string) => void;
type SetNum = (value: number) => void;

/**
 * CurationReviewSectionsCtx — atomik paylasim tipi
 * TEK KAYNAK: burasi. Uc review section ayni ctx'u alir.
 */
export interface CurationReviewSectionsCtx {
  isBusy: boolean;
  refresh: (backlogOffset?: number, candidateOffset?: number, groupOffset?: number) => Promise<void> | void;
  filterOptions: {
    statuses: string[];
    providers: string[];
    makams: string[];
    forms: string[];
    usuls: string[];
    composers: string[];
    priorityGroups: string[];
    candidateStatuses: string[];
    candidateProfiles: string[];
    candidateGroupStatuses: string[];
  };
  backlogOffset: number;
  candidateOffset: number;
  candidateReviewBatchPlanManifest: Curation["candidateReviewBatchPlanManifest"];
  sourceIntakeTemplateManifest: Curation["sourceIntakeTemplateManifest"];
  sourceIntakeAcceptedImportDryRunManifest: Curation["sourceIntakeAcceptedImportDryRunManifest"];
  symbtrLayoutVerificationManifest: Curation["symbtrLayoutVerificationManifest"];
  exportCandidateReviewGroups: () => void;
  exportCandidateReviewQueue: () => void;
  exportCandidateReviewGroupDecisionTemplate: () => void;
  exportCandidateReviewGroupDecisionRecommendations: () => void;
  importCandidateReviewGroupDecisions: () => void;
  recordBulkFeedback: (eventType: "user-approved" | "user-prioritized" | "user-removed") => void;
  selectedReferenceCount: number;
  visibleSelectableCount: number;
  candidateReviewGroups: CandidateReviewGroup[];
  candidateReviewGroupPage: CandidateReviewGroupPage;
  candidateReviewGroupManifest: Curation["candidateReviewGroupManifest"];
  candidateReviewGroupDecisionManifest: Curation["candidateReviewGroupDecisionManifest"];
  candidateReviewGroupDecisionRecommendationManifest: Curation["candidateReviewGroupDecisionRecommendationManifest"];
  candidateGroupExportText: string;
  candidateGroupDecisionText: string;
  setCandidateGroupDecisionText: SetStr;
  candidateGroupDecisionStatus: string;
  setCandidateGroupDecisionStatus: SetStr;
  candidateGroupDecisionReason: string;
  setCandidateGroupDecisionReason: SetStr;
  candidateGroupDecisionReviewedAt: string;
  setCandidateGroupDecisionReviewedAt: SetStr;
  candidateGroupDecisionDryRun: boolean;
  setCandidateGroupDecisionDryRun: (value: boolean) => void;
  candidateGroupDecisionStatusOptions: string[];
  candidateGroupStatusFilter: string;
  setCandidateGroupStatusFilter: SetStr;
  candidateGroupStatuses: string[];
  candidateGroupLimit: number;
  setCandidateGroupLimit: SetNum;
  candidateGroupOffset: number;
  setCandidateGroupOffset: SetNum;
  candidateReviewRows: CandidateReviewRow[];
  candidateReviewPage: CandidateReviewPage;
  candidateReviewExportText: string;
  candidateStatusFilter: string;
  setCandidateStatusFilter: SetStr;
  candidateProfileFilter: string;
  setCandidateProfileFilter: SetStr;
  candidateLimit: number;
  setCandidateLimit: SetNum;
  setCandidateOffset: SetNum;
  filteredReferences: CurationReference[];
  query: string;
  setQuery: SetStr;
  statusFilter: string;
  setStatusFilter: SetStr;
  providerFilter: string;
  setProviderFilter: SetStr;
  makamFilter: string;
  setMakamFilter: SetStr;
  formFilter: string;
  setFormFilter: SetStr;
  usulFilter: string;
  setUsulFilter: SetStr;
  composerFilter: string;
  setComposerFilter: SetStr;
  deletionFilter: string;
  setDeletionFilter: SetStr;
  priorityGroupFilter: string;
  setPriorityGroupFilter: SetStr;
  deletionFilterOptions: string[];
  selectedReferenceKeys: string[];
  allVisibleReferencesSelected: boolean;
  toggleReferenceSelection: (reference: CurationReference, checked: boolean) => void;
  toggleVisibleReferenceSelection: (checked: boolean, keys?: string[]) => void;
  recordFeedback: (reference: CurationReference, eventType: "user-approved" | "user-prioritized" | "user-removed") => void;
}
