import {tokens} from "@/shared/tokens";

interface SampleOpsTokenFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function SampleOpsTokenField({value, onChange}: SampleOpsTokenFieldProps) {
  return (
    <form
      className={`mb-4 grid gap-2 border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-3 md:max-w-md`}
      onSubmit={(event) => event.preventDefault()}
    >
      <input
        type="text"
        name="username"
        value="local-sample-ops"
        className="hidden"
        readOnly
        autoComplete="username"
        aria-hidden="true"
        tabIndex={-1}
      />
      <label className={`text-xs font-medium ${tokens.colors.text.secondary}`} htmlFor="sample-ops-token">
        Operasyon token
      </label>
      <input
        id="sample-ops-token"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-md border ${tokens.colors.border.base} ${tokens.colors.background.base} px-3 py-2 text-sm ${tokens.colors.text.primary}`}
        autoComplete="new-password"
      />
    </form>
  );
}
