"use client";

import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {PageHeader, PageShell} from "@/shared/ui";
import {LibraryTabs} from "@/features/library/LibraryTabs";
import {tokens} from "@/shared/tokens";
import {useSamples} from "@/app/samples/hooks/useSamples";
import {SampleCoverage} from "@/app/samples/components/SampleCoverage";
import {SampleGroupTabs} from "@/app/samples/components/SampleGroupTabs";
import {SampleInstrumentHeader} from "@/app/samples/components/SampleInstrumentHeader";
import {SampleOpsTokenField} from "@/app/samples/components/SampleOpsTokenField";
import {SampleSlotCards} from "@/app/samples/components/SampleSlotCards";
import {SampleSlotTable} from "@/app/samples/components/SampleSlotTable";

export default function SeslerPage() {
  const {
    slots,
    coverage,
    groups,
    activeGroup,
    setActiveGroup,
    activeSlots,
    activeProvenance,
    installedCount,
    isLoading,
    uploadingKey,
    message,
    opsToken,
    setOpsToken,
    refreshSlots,
    uploadSample,
    deleteSample,
    previewSample,
    testActiveGroup,
  } = useSamples();

  return (
    <UnifiedLayout>
      <PageShell>
        <PageHeader
          meta="Enstrüman sesleri"
          title="Ses Kütüphanesi"
          description="Her slot sabit bir dosya adına yazılır. Sample yüklü değilse test ve çalma akışı synth fallback ile devam eder."
          actions={
            <div
              className={`rounded-md border ${tokens.colors.border.base} ${tokens.colors.background.surface} px-3 py-2 text-sm ${tokens.colors.text.secondary}`}
            >
              {installedCount} / {slots.length} sample hazır
            </div>
          }
        />

        <LibraryTabs />

        <SampleOpsTokenField value={opsToken} onChange={setOpsToken} />

        <SampleCoverage coverage={coverage} />

        {message && (
          <div
            className={`mb-4 border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} px-4 py-3 text-sm ${tokens.colors.text.primary}`}
          >
            {message}
          </div>
        )}

        <SampleGroupTabs groups={groups} activeGroup={activeGroup} onSelect={setActiveGroup} />

        <section
          className={`min-w-0 overflow-hidden border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface}`}
        >
          <SampleInstrumentHeader
            activeGroup={activeGroup}
            provenance={activeProvenance}
            onTest={() => void testActiveGroup()}
            onRefresh={() => void refreshSlots()}
          />

          <SampleSlotCards
            slots={activeSlots}
            isLoading={isLoading}
            uploadingKey={uploadingKey}
            onUpload={uploadSample}
            onPreview={previewSample}
            onDelete={deleteSample}
          />

          <SampleSlotTable
            slots={activeSlots}
            isLoading={isLoading}
            uploadingKey={uploadingKey}
            onUpload={uploadSample}
            onPreview={previewSample}
            onDelete={deleteSample}
          />
        </section>
      </PageShell>
    </UnifiedLayout>
  );
}
