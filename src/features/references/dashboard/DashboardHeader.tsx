"use client";

import {Button, Input} from "@/shared/ui";
import {tokens} from "@/shared/tokens";
import {CurationTabs} from "../CurationTabs";
import {formatDate} from "../curation-helpers";
import type {ExternalReferenceState, CurationAction} from "../curation-dashboard-types";

interface DashboardHeaderProps {
  state: ExternalReferenceState;
  opsToken: string;
  setOpsToken: (value: string) => void;
  isBusy: boolean;
  message: string;
  refresh: () => Promise<void> | void;
  runOperation: (action: CurationAction, payload?: Record<string, unknown>) => Promise<unknown>;
}

export function DashboardHeader({
  state,
  opsToken,
  setOpsToken,
  isBusy,
  message,
  refresh,
  runOperation,
}: DashboardHeaderProps) {
  return (
    <>
      <CurationTabs />
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${tokens.colors.text.primary}`}>Kaynak kürasyonu</h1>
          <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
            {formatDate(state.curation?.summary?.statsGeneratedAt)}
          </p>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void refresh();
          }}
        >
          <input
            type="text"
            name="username"
            value="external-reference-ops"
            readOnly
            autoComplete="username"
            className="sr-only"
            tabIndex={-1}
          />
          <Input
            label="Ops token"
            type="password"
            autoComplete="new-password"
            value={opsToken}
            onChange={(event) => setOpsToken(event.target.value)}
            className="sm:w-64"
          />
          <Button type="submit" variant="outline" disabled={isBusy}>
            Yenile
          </Button>
          <Button type="button" variant="primary" disabled={isBusy} onPress={() => void runOperation("curation-auto-attach")}>
            Auto-attach
          </Button>
          <Button type="button" variant="secondary" disabled={isBusy} onPress={() => void runOperation("curation-stats")}>
            Stats
          </Button>
        </form>
      </header>

      {message && (
        <div className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} px-4 py-3 text-sm ${tokens.colors.text.primary}`}>
          {message}
        </div>
      )}
    </>
  );
}
