import type {SampleGroup} from "@/app/samples/components/types";

interface SampleGroupTabsProps {
  groups: SampleGroup[];
  activeGroup: string;
  onSelect: (label: string) => void;
}

export function SampleGroupTabs({groups, activeGroup, onSelect}: SampleGroupTabsProps) {
  return (
    <div className="mb-6 flex w-full max-w-full flex-wrap gap-2 pb-2 md:flex-nowrap md:overflow-x-auto">
      {groups.map((group) => (
        <button
          key={group.label}
          type="button"
          onClick={() => onSelect(group.label)}
          className={`min-w-max rounded-md border px-3 py-2 text-sm transition-colors ${
            activeGroup === group.label
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-secondary)]"
          }`}
        >
          {group.label} {group.installed}/{group.total}
        </button>
      ))}
    </div>
  );
}
