import {tokens} from "@/shared/tokens";
import {ALL_FILTER_VALUE} from "./curation-helpers";

/**
 * Kurasyon konsolu filtre secici (M8.2 bolme). Erisilebilir label/select
 * ciftini standardize eder; "Tümü" secenegi tum degeri temsil eder.
 */
export function CurationFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const id = `curation-filter-${label.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-")}`;

  return (
    <label htmlFor={id} className={`flex flex-col gap-1 text-sm ${tokens.colors.text.secondary}`}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
      >
        <option value={ALL_FILTER_VALUE}>Tümü</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
