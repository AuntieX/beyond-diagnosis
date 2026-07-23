import { useMemo, useState } from "react";
import { computeScreeningTimeline } from "../../lib/mapEngine";
import { defaultMapAnswers, type Sex } from "../../lib/mapTypes";

/**
 * Live, homepage-embedded first step of The Map. Same age input as step 1 of
 * /my-plan, wired to the real screening ruleset so the "what's on the radar"
 * line is genuine, not a mockup. Hydrated with client:visible so it costs
 * nothing until it scrolls into view — see src/pages/index.astro.
 */
export default function MapStarter() {
  const [age, setAge] = useState(45);
  const [sex, setSex] = useState<Sex | null>(null);

  const teaserLine = useMemo(() => {
    const timeline = computeScreeningTimeline({ ...defaultMapAnswers(), age, sex });
    const dueNow = timeline.filter((t) => t.status === "now" && t.id !== "skin");
    const dueSoon = timeline.filter((t) => t.status === "soon");
    const picks = (dueNow.length > 0 ? dueNow : dueSoon).slice(0, 2).map((t) => t.label.toLowerCase());
    if (picks.length === 0) {
      return `At ${age}, you're ahead of most of the screening schedule — a great time to build the habit before you need it.`;
    }
    const joined = picks.length === 1 ? picks[0] : `${picks[0]} and ${picks[1]}`;
    return `At ${age}, here's what's usually on the radar: ${joined}.`;
  }, [age, sex]);

  function continueInMap() {
    const params = new URLSearchParams();
    params.set("age", String(age));
    if (sex) params.set("sex", sex);
    window.location.href = `/my-plan?${params.toString()}`;
  }

  return (
    <div>
      <div className="text-center">
        <span className="font-display text-6xl font-semibold text-rose sm:text-7xl">{age}</span>
        <span className="ml-2 text-lg text-cream/60">years old</span>
      </div>
      <input
        type="range"
        min={18}
        max={80}
        step={1}
        value={age}
        onChange={(e) => setAge(Number(e.target.value))}
        className="map-slider map-slider-dark mt-6 w-full"
        aria-label="Your age"
      />
      <div className="mt-1 flex justify-between text-xs text-cream/70">
        <span>18</span>
        <span>80</span>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {(
          [
            { v: "female" as const, label: "Female" },
            { v: "male" as const, label: "Male" },
          ]
        ).map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => setSex((prev) => (prev === opt.v ? null : opt.v))}
            aria-pressed={sex === opt.v}
            className={[
              "rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
              sex === opt.v
                ? "border-terracotta bg-terracotta text-white"
                : "border-cream/25 bg-transparent text-cream/70 hover:border-cream/50 hover:text-cream",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p
        className="mt-7 rounded-[12px] border border-cream/15 bg-cream/5 px-5 py-4 text-center text-base leading-relaxed text-cream/90 sm:text-lg"
        aria-live="polite"
      >
        {teaserLine}
      </p>

      <div className="mt-7 text-center">
        <button
          type="button"
          onClick={continueInMap}
          className="inline-flex items-center gap-2 rounded-full bg-terracotta px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-dark"
        >
          Continue in The Map
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <p className="mt-3 text-xs text-cream/70">Takes your age with you — no re-entering a thing.</p>
      </div>
    </div>
  );
}
