import type { ReactNode } from "react";

export function ProgressBar({ step, total, label }: { step: number; total: number; label: string }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-xs font-medium text-navy/60">
        <span className="font-data uppercase tracking-wide">{label}</span>
        <span>
          {step} of {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy/10">
        <div
          className="h-full rounded-full bg-terracotta transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StepShell({
  eyebrow,
  question,
  hint,
  children,
  stepKey,
}: {
  eyebrow?: string;
  question: string;
  hint?: string;
  children: ReactNode;
  stepKey: string | number;
}) {
  return (
    <div key={stepKey} className="map-step">
      {eyebrow && <p className="font-data text-xs uppercase tracking-wide text-terracotta">{eyebrow}</p>}
      <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-[1.7rem]">{question}</h2>
      {hint && <p className="mt-2 text-sm text-navy/60">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function OptionCard({
  selected,
  onClick,
  children,
  sublabel,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "flex w-full items-center justify-between gap-3 rounded-[12px] border px-5 py-4 text-left text-sm font-medium transition-colors",
        selected
          ? "border-terracotta bg-rose text-navy"
          : "border-navy/12 bg-white text-navy/85 hover:border-terracotta/40 hover:bg-rose/40",
      ].join(" ")}
    >
      <span>
        {children}
        {sublabel && <span className="mt-0.5 block text-xs font-normal text-navy/55">{sublabel}</span>}
      </span>
      <span
        aria-hidden="true"
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-terracotta bg-terracotta" : "border-navy/20 bg-transparent",
        ].join(" ")}
      >
        {selected && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="m5 13 4 4L19 7" />
          </svg>
        )}
      </span>
    </button>
  );
}

export function OptionGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5">{children}</div>;
}

export function StepNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  onSkip,
  skipLabel = "Skip this one",
  showBack = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  showBack?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
      <div>
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-navy/60 transition-colors hover:text-navy"
          >
            &larr; Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {onSkip && (
          <button type="button" onClick={onSkip} className="text-sm font-medium text-navy/50 hover:text-navy/75">
            {skipLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="rounded-full bg-terracotta px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

export function AgeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-center">
        <span className="font-display text-5xl font-semibold text-terracotta">{value}</span>
        <span className="ml-1 text-lg text-navy/60">years old</span>
      </div>
      <input
        type="range"
        min={18}
        max={80}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="map-slider mt-6 w-full"
        aria-label="Your age"
      />
      <div className="mt-1 flex justify-between text-xs text-navy/45">
        <span>18</span>
        <span>80</span>
      </div>
    </div>
  );
}

export function ToggleRow({
  question,
  value,
  onChange,
}: {
  question: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[12px] border border-navy/10 bg-white px-5 py-4">
      <span className="text-sm font-medium text-navy/85">{question}</span>
      <div className="flex shrink-0 gap-2">
        {[
          { v: true, label: "Yes" },
          { v: false, label: "No" },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.v)}
            aria-pressed={value === opt.v}
            className={[
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              value === opt.v ? "bg-terracotta text-white" : "bg-cream text-navy/70 hover:bg-rose",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  min,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy/55">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="w-full rounded-[10px] border border-navy/15 bg-white px-4 py-2.5 text-sm text-navy placeholder:text-navy/35 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25"
        />
        {unit && <span className="shrink-0 text-sm text-navy/50">{unit}</span>}
      </div>
    </label>
  );
}
