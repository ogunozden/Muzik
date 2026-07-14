import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {CanonicalScorePrototype} from "@/features/score-engine/CanonicalScorePrototype";
import {StudioTabs} from "@/features/studio/StudioTabs";

export default function ScoreEnginePage() {
  return (
    <UnifiedLayout>
      <StudioTabs />
      <CanonicalScorePrototype />
    </UnifiedLayout>
  );
}
