import { useMemo, useState } from "react";
import type { MapAnswers } from "../../lib/mapTypes";
import { defaultMapAnswers } from "../../lib/mapTypes";
import { computeMapResult } from "../../lib/mapEngine";
import { QUICK_STEPS, DEEPER_STEPS } from "./steps";
import { ProgressBar, StepNav } from "./ui";
import { MapResults } from "./MapResults";

type Phase = "intro" | "quick" | "quickResult" | "deeper" | "fullResult";

/**
 * Picks up ?age= and ?sex= carried over from the homepage's live Map starter
 * (see src/components/map/MapStarter.tsx) so a visitor who already dragged
 * the age slider there doesn't have to re-answer it here. Anyone arriving
 * without those params gets the exact same experience as before.
 */
function readCarriedState(): { patch: Partial<MapAnswers>; skipToIndex: number } {
  if (typeof window === "undefined") return { patch: {}, skipToIndex: 0 };
  const params = new URLSearchParams(window.location.search);
  const patch: Partial<MapAnswers> = {};
  let skipToIndex = 0;

  const ageParam = Number(params.get("age"));
  if (Number.isFinite(ageParam) && ageParam >= 18 && ageParam <= 80) {
    patch.age = Math.round(ageParam);
    skipToIndex = 1;
  }

  const sexParam = params.get("sex");
  if (skipToIndex === 1 && (sexParam === "female" || sexParam === "male")) {
    patch.sex = sexParam;
    skipToIndex = 2;
  }

  return { patch, skipToIndex };
}

function Intro({ onStart, carriedAge }: { onStart: () => void; carriedAge?: number }) {
  return (
    <div className="map-step">
      <p className="font-data text-xs uppercase tracking-wide text-terracotta">The Map</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy sm:text-4xl">
        Get your personalized plan in about 60 seconds.
      </h1>
      <p className="mt-4 max-w-xl text-navy/70">
        A few quick questions about your age, history, and habits — and you'll get a screening timeline built for
        you, not a generic checklist. No judgment, no scolding, and no pressure to share anything you'd rather
        keep to yourself.
      </p>
      {carriedAge && (
        <p className="mt-4 max-w-xl text-sm font-medium text-terracotta">
          Got it — {carriedAge} years old. That's already saved, so you'll pick up from the next question.
        </p>
      )}
      <div className="mt-6 flex items-start gap-3 rounded-[12px] border border-sage/30 bg-sage/10 p-4 text-sm text-navy/75">
        <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        <p>Your answers stay in your browser. Nothing is saved or shared unless you ask us to email your Map.</p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-7 rounded-full bg-terracotta px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-dark"
      >
        Start The Map &rarr;
      </button>
    </div>
  );
}

export default function MapQuiz() {
  const [carried] = useState(readCarriedState);
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<MapAnswers>(() => ({ ...defaultMapAnswers(), ...carried.patch }));
  const [quickIndex, setQuickIndex] = useState(carried.skipToIndex);
  const [deeperIndex, setDeeperIndex] = useState(0);

  const update = (patch: Partial<MapAnswers>) => setAnswers((prev) => ({ ...prev, ...patch }));

  const visibleDeeperSteps = useMemo(() => DEEPER_STEPS.filter((s) => !s.showIf || s.showIf(answers)), [answers.sex]);

  const quickResult = useMemo(() => computeMapResult(answers), [answers]);

  function restart() {
    setAnswers(defaultMapAnswers());
    setQuickIndex(0);
    setDeeperIndex(0);
    setPhase("intro");
  }

  if (phase === "intro") {
    return <Intro onStart={() => setPhase("quick")} carriedAge={carried.skipToIndex > 0 ? answers.age : undefined} />;
  }

  if (phase === "quick") {
    const step = QUICK_STEPS[quickIndex];
    const isLast = quickIndex === QUICK_STEPS.length - 1;
    return (
      <div>
        <ProgressBar step={quickIndex + 1} total={QUICK_STEPS.length} label="Quick Map" />
        {step.render(answers, update)}
        <StepNav
          showBack={quickIndex > 0}
          onBack={() => setQuickIndex((i) => Math.max(0, i - 1))}
          onNext={() => {
            if (isLast) setPhase("quickResult");
            else setQuickIndex((i) => i + 1);
          }}
          nextDisabled={!step.isComplete(answers)}
          nextLabel={isLast ? "See my Map" : "Continue"}
        />
      </div>
    );
  }

  if (phase === "quickResult") {
    return (
      <MapResults
        answers={answers}
        result={quickResult}
        variant="quick"
        onGoDeeper={() => setPhase("deeper")}
        onRestart={restart}
      />
    );
  }

  if (phase === "deeper") {
    const step = visibleDeeperSteps[deeperIndex];
    const isLast = deeperIndex === visibleDeeperSteps.length - 1;
    return (
      <div>
        <ProgressBar step={deeperIndex + 1} total={visibleDeeperSteps.length} label="Go Deeper" />
        {step.render(answers, update)}
        <StepNav
          showBack
          onBack={() => {
            if (deeperIndex === 0) setPhase("quickResult");
            else setDeeperIndex((i) => Math.max(0, i - 1));
          }}
          onSkip={() => {
            if (isLast) {
              update({ wentDeeper: true });
              setPhase("fullResult");
            } else setDeeperIndex((i) => i + 1);
          }}
          onNext={() => {
            if (isLast) {
              update({ wentDeeper: true });
              setPhase("fullResult");
            } else setDeeperIndex((i) => i + 1);
          }}
          nextLabel={isLast ? "See my full Map" : "Continue"}
        />
      </div>
    );
  }

  const fullResult = computeMapResult(answers);
  return <MapResults answers={answers} result={fullResult} variant="full" onRestart={restart} />;
}
