import {Button} from "@/shared/ui";
import {tokens} from "@/shared/tokens";
import {SourceLine} from "@/app/samples/components/SourceLine";
import type {FolderProvenance} from "@/app/samples/components/types";

interface SampleInstrumentHeaderProps {
  activeGroup: string;
  provenance: FolderProvenance | null;
  onTest: () => void;
  onRefresh: () => void;
}

export function SampleInstrumentHeader({activeGroup, provenance, onTest, onRefresh}: SampleInstrumentHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
      <div>
        <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>{activeGroup || "Sample slotları"}</h2>
        <p className={`text-xs ${tokens.colors.text.secondary}`}>WAV önerilir; tarayıcının çözdüğü ses formatları da kullanılabilir.</p>
        <SourceLine record={provenance} />
      </div>
      <div className="flex gap-2">
        <Button variant="accent" size="sm" ariaLabel={`${activeGroup} test`} onPress={() => void onTest()}>
          Enstrümanı Test Et
        </Button>
        <Button variant="secondary" size="sm" ariaLabel="Yenile" onPress={() => void onRefresh()}>
          Yenile
        </Button>
      </div>
    </div>
  );
}
