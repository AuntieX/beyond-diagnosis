import type { ReactNode } from "react";
import type {
  ActivityLevel,
  AlcoholLevel,
  DietFrequency,
  FamilyHistoryType,
  FirstPeriodAge,
  MapAnswers,
  OccupationalExposure,
  PackYearBand,
  RadonStatus,
  SymptomCategory,
  TobaccoStatus,
} from "../../lib/mapTypes";
import { SYMPTOM_CATEGORIES } from "../../lib/mapContent";
import { AgeSlider, NumberField, OptionCard, OptionGrid, StepShell, ToggleRow } from "./ui";

export interface StepDef {
  id: string;
  render: (a: MapAnswers, update: (patch: Partial<MapAnswers>) => void) => ReactNode;
  isComplete: (a: MapAnswers) => boolean;
  showIf?: (a: MapAnswers) => boolean;
}

const FAMILY_TYPES: { id: FamilyHistoryType; label: string }[] = [
  { id: "Breast", label: "Breast" },
  { id: "Colorectal", label: "Colorectal" },
  { id: "Ovarian", label: "Ovarian" },
  { id: "Prostate", label: "Prostate" },
  { id: "Pancreatic", label: "Pancreatic" },
  { id: "Other", label: "Other cancer" },
  { id: "None", label: "None that I know of" },
];

export const QUICK_STEPS: StepDef[] = [
  {
    id: "age",
    isComplete: () => true,
    render: (a, update) => (
      <StepShell stepKey="age" eyebrow="The Map · 1 of 5" question="How old are you?">
        <AgeSlider value={a.age} onChange={(age) => update({ age })} />
      </StepShell>
    ),
  },
  {
    id: "sex",
    isComplete: (a) => a.sex !== null,
    render: (a, update) => (
      <StepShell
        stepKey="sex"
        eyebrow="The Map · 2 of 5"
        question="Sex assigned at birth?"
        hint="This is only used to figure out which screenings apply to you — not a statement about identity."
      >
        <OptionGrid>
          <OptionCard selected={a.sex === "female"} onClick={() => update({ sex: "female" })}>
            Female
          </OptionCard>
          <OptionCard selected={a.sex === "male"} onClick={() => update({ sex: "male" })}>
            Male
          </OptionCard>
        </OptionGrid>
      </StepShell>
    ),
  },
  {
    id: "family-history",
    isComplete: (a) => a.familyHistory.length > 0,
    render: (a, update) => {
      const toggle = (type: FamilyHistoryType) => () => {
        if (type === "None") {
          update({ familyHistory: ["None"], familyHistoryBeforeFifty: false });
          return;
        }
        const current = a.familyHistory.filter((t) => t !== "None");
        const has = current.includes(type);
        const next = has ? current.filter((t) => t !== type) : [...current, type];
        update({ familyHistory: next, familyHistoryBeforeFifty: next.length === 0 ? false : a.familyHistoryBeforeFifty });
      };
      const anySelected = a.familyHistory.some((t) => t !== "None");
      return (
        <StepShell
          stepKey="family-history"
          eyebrow="The Map · 3 of 5"
          question="Any family history of cancer?"
          hint="Parents, siblings, or children. Pick everything that applies."
        >
          <OptionGrid>
            {FAMILY_TYPES.map((t) => (
              <OptionCard key={t.id} selected={a.familyHistory.includes(t.id)} onClick={toggle(t.id)}>
                {t.label}
              </OptionCard>
            ))}
          </OptionGrid>
          {anySelected && (
            <div className="mt-4">
              <ToggleRow
                question="Was anyone diagnosed before age 50?"
                value={a.familyHistoryBeforeFifty}
                onChange={(v) => update({ familyHistoryBeforeFifty: v })}
              />
            </div>
          )}
        </StepShell>
      );
    },
  },
  {
    id: "tobacco",
    isComplete: (a) => a.tobacco !== null && (a.tobacco === "never" || a.packYears !== null),
    render: (a, update) => {
      const setTobacco = (v: TobaccoStatus) => () =>
        update({ tobacco: v, packYears: v === "never" ? null : a.packYears });
      const bands: { id: PackYearBand; label: string; sub: string }[] = [
        { id: "light", label: "Light", sub: "roughly under a pack a day, under ~10 years" },
        { id: "moderate", label: "Moderate", sub: "roughly a pack a day for ~15–20 years" },
        { id: "heavy", label: "Heavy", sub: "roughly a pack a day for 20+ years, or more" },
      ];
      return (
        <StepShell stepKey="tobacco" eyebrow="The Map · 4 of 5" question="Tobacco — where do you stand?">
          <OptionGrid>
            <OptionCard selected={a.tobacco === "never"} onClick={setTobacco("never")}>
              Never smoked
            </OptionCard>
            <OptionCard selected={a.tobacco === "former"} onClick={setTobacco("former")}>
              Former smoker
            </OptionCard>
            <OptionCard selected={a.tobacco === "current"} onClick={setTobacco("current")}>
              Current smoker
            </OptionCard>
          </OptionGrid>
          {(a.tobacco === "former" || a.tobacco === "current") && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy/55">Roughly how much?</p>
              <OptionGrid>
                {bands.map((b) => (
                  <OptionCard key={b.id} selected={a.packYears === b.id} onClick={() => update({ packYears: b.id })} sublabel={b.sub}>
                    {b.label}
                  </OptionCard>
                ))}
              </OptionGrid>
            </div>
          )}
        </StepShell>
      );
    },
  },
  {
    id: "symptoms",
    isComplete: () => true,
    render: (a, update) => {
      const toggle = (cat: SymptomCategory) => () => {
        const has = a.symptoms.includes(cat);
        const next = has ? a.symptoms.filter((c) => c !== cat) : [...a.symptoms, cat];
        update({ symptoms: next, justPlanning: next.length > 0 ? false : a.justPlanning });
      };
      return (
        <StepShell
          stepKey="symptoms"
          eyebrow="The Map · 5 of 5"
          question="Anything worrying you today?"
          hint="Totally optional — pick what applies, or skip if you're just planning ahead."
        >
          <OptionGrid>
            {SYMPTOM_CATEGORIES.filter((c) => {
              if (c.id === "Cervical" || c.id === "Ovarian") return a.sex !== "male";
              if (c.id === "Prostate") return a.sex !== "female";
              return true;
            }).map((c) => (
              <OptionCard key={c.id} selected={a.symptoms.includes(c.id)} onClick={toggle(c.id)}>
                {c.label}
              </OptionCard>
            ))}
          </OptionGrid>
          <button
            type="button"
            onClick={() => update({ symptoms: [], justPlanning: true })}
            className={[
              "mt-3 w-full rounded-[12px] border px-5 py-3 text-center text-sm font-semibold transition-colors",
              a.justPlanning ? "border-sage bg-sage/15 text-sage-dark" : "border-navy/12 bg-white text-navy/70 hover:border-sage/40",
            ].join(" ")}
          >
            Just planning ahead — nothing's worrying me
          </button>
        </StepShell>
      );
    },
  },
];

const ALCOHOL_OPTIONS: { id: AlcoholLevel; label: string }[] = [
  { id: "none", label: "None" },
  { id: "occasional", label: "Occasional — a few drinks a month" },
  { id: "weekly", label: "Weekly — a few drinks a week" },
  { id: "mostDays", label: "Most days" },
  { id: "daily", label: "Daily" },
];

const DIET_OPTIONS: { id: DietFrequency; label: string }[] = [
  { id: "rarely", label: "Rarely" },
  { id: "weekly", label: "A few times a week" },
  { id: "mostDays", label: "Most days" },
];

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string }[] = [
  { id: "sedentary", label: "Sedentary — mostly sitting" },
  { id: "some", label: "Some — a bit of movement most weeks" },
  { id: "active", label: "Active — regular exercise" },
  { id: "veryActive", label: "Very active — most days, most weeks" },
];

const EXPOSURE_OPTIONS: { id: OccupationalExposure; label: string }[] = [
  { id: "asbestos", label: "Asbestos" },
  { id: "benzene", label: "Benzene or solvents" },
  { id: "diesel", label: "Diesel exhaust" },
  { id: "radiation", label: "Radiation" },
  { id: "dust", label: "Dust or silica" },
  { id: "none", label: "None of these" },
];

const PERIOD_OPTIONS: { id: FirstPeriodAge; label: string }[] = [
  { id: "early", label: "Before age 12" },
  { id: "average", label: "Age 12–13" },
  { id: "late", label: "Age 14 or later" },
  { id: "unknown", label: "Not sure" },
];

export const DEEPER_STEPS: StepDef[] = [
  {
    id: "alcohol",
    isComplete: () => true,
    render: (a, update) => (
      <StepShell stepKey="alcohol" eyebrow="Go Deeper · 1 of 8" question="How often do you drink alcohol?">
        <OptionGrid>
          {ALCOHOL_OPTIONS.map((o) => (
            <OptionCard key={o.id} selected={a.alcohol === o.id} onClick={() => update({ alcohol: o.id })}>
              {o.label}
            </OptionCard>
          ))}
        </OptionGrid>
      </StepShell>
    ),
  },
  {
    id: "body-metrics",
    isComplete: () => true,
    render: (a, update) => {
      const m = a.bodyMetrics;
      const patch = (p: Partial<typeof m>) => update({ bodyMetrics: { ...m, ...p } });
      return (
        <StepShell
          stepKey="body-metrics"
          eyebrow="Go Deeper · 2 of 8"
          question="Height, weight, and waist"
          hint="Completely optional. We only use this to add one line to your Map — nothing is saved anywhere."
        >
          <button
            type="button"
            onClick={() => patch({ skip: !m.skip })}
            className={[
              "mb-4 w-full rounded-[12px] border px-5 py-3 text-center text-sm font-semibold transition-colors",
              m.skip ? "border-sage bg-sage/15 text-sage-dark" : "border-navy/12 bg-white text-navy/70 hover:border-sage/40",
            ].join(" ")}
          >
            {m.skip ? "Skipping this one ✓" : "Prefer not to say — skip this"}
          </button>
          {!m.skip && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumberField label="Height (ft)" value={m.heightFt} onChange={(v) => patch({ heightFt: v })} min={3} max={8} placeholder="5" />
              <NumberField label="Height (in)" value={m.heightIn} onChange={(v) => patch({ heightIn: v })} min={0} max={11} placeholder="6" />
              <NumberField label="Weight" value={m.weightLb} onChange={(v) => patch({ weightLb: v })} unit="lb" min={50} max={600} placeholder="160" />
              <NumberField label="Waist" value={m.waistIn} onChange={(v) => patch({ waistIn: v })} unit="in" min={20} max={70} placeholder="34" />
            </div>
          )}
        </StepShell>
      );
    },
  },
  {
    id: "diet",
    isComplete: () => true,
    render: (a, update) => (
      <StepShell stepKey="diet" eyebrow="Go Deeper · 3 of 8" question="How often is processed or red meat on your plate?">
        <OptionGrid>
          {DIET_OPTIONS.map((o) => (
            <OptionCard key={o.id} selected={a.diet === o.id} onClick={() => update({ diet: o.id })}>
              {o.label}
            </OptionCard>
          ))}
        </OptionGrid>
      </StepShell>
    ),
  },
  {
    id: "activity",
    isComplete: () => true,
    render: (a, update) => (
      <StepShell stepKey="activity" eyebrow="Go Deeper · 4 of 8" question="How would you describe your activity level?">
        <OptionGrid>
          {ACTIVITY_OPTIONS.map((o) => (
            <OptionCard key={o.id} selected={a.activity === o.id} onClick={() => update({ activity: o.id })}>
              {o.label}
            </OptionCard>
          ))}
        </OptionGrid>
      </StepShell>
    ),
  },
  {
    id: "sun",
    isComplete: () => true,
    render: (a, update) => (
      <StepShell stepKey="sun" eyebrow="Go Deeper · 5 of 8" question="Sun exposure and history">
        <div className="flex flex-col gap-3">
          <ToggleRow question="Have you ever used a tanning bed?" value={a.tanningBedUse} onChange={(v) => update({ tanningBedUse: v })} />
          <ToggleRow question="Have you had frequent sunburns?" value={a.frequentSunburns} onChange={(v) => update({ frequentSunburns: v })} />
          <ToggleRow question="Would you describe your skin as fair?" value={a.fairSkin} onChange={(v) => update({ fairSkin: v })} />
        </div>
      </StepShell>
    ),
  },
  {
    id: "occupation",
    isComplete: () => true,
    render: (a, update) => {
      const toggle = (id: OccupationalExposure) => () => {
        if (id === "none") {
          update({ occupationalExposures: ["none"] });
          return;
        }
        const current = a.occupationalExposures.filter((e) => e !== "none");
        const has = current.includes(id);
        update({ occupationalExposures: has ? current.filter((e) => e !== id) : [...current, id] });
      };
      return (
        <StepShell
          stepKey="occupation"
          eyebrow="Go Deeper · 6 of 8"
          question="Any workplace exposures, past or present?"
        >
          <OptionGrid>
            {EXPOSURE_OPTIONS.map((o) => (
              <OptionCard key={o.id} selected={a.occupationalExposures.includes(o.id)} onClick={toggle(o.id)}>
                {o.label}
              </OptionCard>
            ))}
          </OptionGrid>
        </StepShell>
      );
    },
  },
  {
    id: "reproductive",
    isComplete: () => true,
    showIf: (a) => a.sex === "female",
    render: (a, update) => {
      const r = a.reproductive;
      const patch = (p: Partial<typeof r>) => update({ reproductive: { ...r, ...p } });
      return (
        <StepShell
          stepKey="reproductive"
          eyebrow="Go Deeper · 7 of 8"
          question="A few reproductive factors"
          hint="Relevant to breast and ovarian cancer risk. Optional, and only used for this Map."
        >
          <button
            type="button"
            onClick={() => patch({ skip: !r.skip })}
            className={[
              "mb-4 w-full rounded-[12px] border px-5 py-3 text-center text-sm font-semibold transition-colors",
              r.skip ? "border-sage bg-sage/15 text-sage-dark" : "border-navy/12 bg-white text-navy/70 hover:border-sage/40",
            ].join(" ")}
          >
            {r.skip ? "Skipping this one ✓" : "Prefer not to say — skip this"}
          </button>
          {!r.skip && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy/55">
                  Roughly what age did your period start?
                </p>
                <OptionGrid>
                  {PERIOD_OPTIONS.map((o) => (
                    <OptionCard key={o.id} selected={r.ageAtFirstPeriod === o.id} onClick={() => patch({ ageAtFirstPeriod: o.id })}>
                      {o.label}
                    </OptionCard>
                  ))}
                </OptionGrid>
              </div>
              <ToggleRow question="Have you had children?" value={r.hasChildren} onChange={(v) => patch({ hasChildren: v })} />
              <ToggleRow question="Have you used hormone replacement therapy?" value={r.hrtUse} onChange={(v) => patch({ hrtUse: v })} />
            </div>
          )}
        </StepShell>
      );
    },
  },
  {
    id: "radon",
    isComplete: () => true,
    render: (a, update) => {
      const options: { id: RadonStatus; label: string }[] = [
        { id: "yes", label: "Yes, I've tested" },
        { id: "no", label: "No, I haven't" },
        { id: "dontKnow", label: "Not sure" },
      ];
      return (
        <StepShell stepKey="radon" eyebrow="Go Deeper · 8 of 8" question="Have you tested your home for radon?">
          <OptionGrid>
            {options.map((o) => (
              <OptionCard key={o.id} selected={a.radonTested === o.id} onClick={() => update({ radonTested: o.id })}>
                {o.label}
              </OptionCard>
            ))}
          </OptionGrid>
        </StepShell>
      );
    },
  },
];
