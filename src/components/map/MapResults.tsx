import { useEffect, useState } from "react";
import type { MapAnswers, MapResult, ScreeningItem } from "../../lib/mapTypes";
import { isEarlyAndLowRisk } from "../../lib/mapEngine";

const STATUS_LABEL: Record<ScreeningItem["status"], string> = {
  now: "Due now",
  soon: "Coming up",
  later: "Later",
  pastWindow: "Ask your doctor",
};

const STATUS_CLASS: Record<ScreeningItem["status"], string> = {
  now: "bg-terracotta text-white",
  soon: "bg-sage text-white",
  later: "bg-navy/10 text-navy/60",
  pastWindow: "bg-navy/10 text-navy/60",
};

function ScreeningRow({ item }: { item: ScreeningItem }) {
  return (
    <div className="rounded-[12px] border border-navy/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-navy">{item.label}</h3>
          <p className="mt-0.5 text-sm text-navy/70">{item.frequency}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      {item.why && <p className="mt-3 text-sm text-navy/70">{item.why}</p>}
      {item.guideHref && (
        <a href={item.guideHref} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-terracotta hover:underline">
          {item.guideLabel ?? "Read the guide"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      )}
    </div>
  );
}

/** Shown only in the printed/saved version — hidden on screen. Gives the printout a
 * branded letterhead even though the live page's header/nav is stripped for print. */
function PrintOnlyHeader() {
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
  }, []);

  return (
    <div className="hidden print:mb-6 print:block print:border-b print:border-navy/20 print:pb-4">
      <p className="font-display text-lg font-semibold text-navy">Beyond Diagnosis — Your Map</p>
      <p className="mt-1 text-xs text-navy/60">
        {date ? `Printed ${date} — ` : ""}Not medical advice. Bring this to your doctor to start the conversation.
      </p>
    </div>
  );
}

function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mt-6 inline-flex items-center gap-2 rounded-full border border-navy/20 bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-terracotta/50 hover:text-terracotta-dark print:hidden"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 14h12v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7Z" />
      </svg>
      Print or save this — bring it to your doctor
    </button>
  );
}

function EmailCapture() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setState("done");
      } else {
        setErrorMsg(json.error || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm font-medium text-sage-dark">
        You're in. Watch your inbox — and keep this page bookmarked as your Map.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <label className="sr-only" htmlFor="map-email">
        Email address
      </label>
      <input
        id="map-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full flex-1 rounded-full border border-navy/15 bg-white px-4 py-3 text-sm text-navy placeholder:text-navy/40 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/30"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="shrink-0 rounded-full bg-terracotta px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-terracotta-dark disabled:opacity-60"
      >
        {state === "sending" ? "Sending..." : "Send it to my inbox"}
      </button>
      {state === "error" && <p className="text-sm font-medium text-terracotta-dark">{errorMsg}</p>}
    </form>
  );
}

export function MapResults({
  answers,
  result,
  variant,
  onGoDeeper,
  onRestart,
}: {
  answers: MapAnswers;
  result: MapResult;
  variant: "quick" | "full";
  onGoDeeper?: () => void;
  onRestart: () => void;
}) {
  const earlyHeadsUp = isEarlyAndLowRisk(result.timeline);

  return (
    <div className="map-step">
      <PrintOnlyHeader />
      <p className="font-data text-xs uppercase tracking-wide text-terracotta print:hidden">
        {variant === "quick" ? "Your Quick Map is ready" : "Your full Map"}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy sm:text-4xl print:mt-0 print:text-2xl">
        Here's what we'd tell a friend in your shoes.
      </h1>
      <p className="mt-3 max-w-2xl text-navy/70">
        Built from your age, {answers.sex ? "sex, " : ""}family history, and what you shared — nothing more, nothing
        stored.
      </p>
      <PrintButton />

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-navy">Your screening timeline</h2>
        {earlyHeadsUp && (
          <p className="mt-2 text-navy/70">
            You're a bit early for most screenings — here's what to know now, and when the rest will kick in.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          {result.timeline.map((item) => (
            <ScreeningRow key={item.id} item={item} />
          ))}
        </div>
      </section>

      {result.watchList.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-navy">Worth watching</h2>
          <p className="mt-2 text-navy/70">You flagged something today. Don't sit on it — here's what it could mean.</p>
          <div className="mt-4 flex flex-col gap-3">
            {result.watchList.map((w) => (
              <a
                key={w.category}
                href={w.href}
                className="flex items-center justify-between rounded-[12px] border border-terracotta/30 bg-rose/50 px-5 py-4 text-sm font-semibold text-navy transition-colors hover:bg-rose"
              >
                {w.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            ))}
          </div>
        </section>
      )}

      {result.riskFactors.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-navy">What's raising your risk</h2>
          <p className="mt-2 text-navy/70">Only the factors you actually shared — factual, not a scolding.</p>
          <div className="mt-4 flex flex-col gap-3">
            {result.riskFactors.map((f) => (
              <div key={f.id} className="rounded-[12px] bg-white p-5 shadow-[var(--shadow-card)]">
                <h3 className="font-display text-base font-semibold text-terracotta-dark">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy/75">{f.body}</p>
                {f.href && (
                  <a href={f.href} className="mt-2 inline-block text-sm font-semibold text-terracotta hover:underline">
                    {f.hrefLabel ?? "Read more"} &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-navy">What's protecting you</h2>
        <div className="mt-4 flex flex-col gap-3">
          {result.protectiveFactors.map((f) => (
            <div key={f.id} className="rounded-[12px] border border-sage/30 bg-sage/10 p-5">
              <h3 className="font-display text-base font-semibold text-sage-dark">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy/75">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[12px] bg-navy p-6 text-cream sm:p-8 print:border print:border-navy/20 print:bg-white print:p-0 print:text-navy print:shadow-none">
        <h2 className="font-display text-xl font-semibold text-rose print:text-navy">Your next moves</h2>
        <div className="mt-4 flex flex-col gap-4">
          {result.nextMoves.map((m, i) => (
            <div key={m.id} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/15 font-data text-xs font-semibold text-rose print:border print:border-navy/30 print:bg-white print:text-navy">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-cream print:text-navy">{m.title}</p>
                <p className="mt-1 text-sm text-cream/75 print:text-navy/70">{m.body}</p>
                {m.href && (
                  <a href={m.href} className="mt-1.5 inline-block text-sm font-semibold text-rose hover:underline print:text-terracotta-dark">
                    {m.hrefLabel ?? "Go"} &rarr;
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {variant === "quick" && onGoDeeper && (
        <section className="mt-10 rounded-[12px] border border-terracotta/30 bg-rose/40 p-6 text-center sm:p-8 print:hidden">
          <h2 className="font-display text-xl font-semibold text-navy">Want a fuller picture?</h2>
          <p className="mt-2 text-navy/70">
            The more you share, the more personal your Map gets — lifestyle, exposures, and a few more factors that
            move the needle. Still completely optional, still just for you.
          </p>
          <button
            type="button"
            onClick={onGoDeeper}
            className="mt-5 rounded-full bg-terracotta px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-dark"
          >
            Go Deeper &rarr;
          </button>
        </section>
      )}

      <section className="mt-10 rounded-[12px] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8 print:hidden">
        <h2 className="font-display text-lg font-semibold text-navy">Want a copy?</h2>
        <p className="mt-1.5 text-sm text-navy/70">Send your Map to your inbox — plus one honest email a week after that. Totally optional.</p>
        <div className="mt-4">
          <EmailCapture />
        </div>
      </section>

      <div className="mt-10 rounded-[12px] border border-navy/10 bg-cream p-5 text-xs leading-relaxed text-navy/60 print:mt-6 print:bg-white print:p-0">
        The Map is a starting point, not medical advice. It's built on general screening guidelines — your doctor
        knows your full picture. Bring this with you and start the conversation.
      </div>

      <div className="mt-6 text-center print:hidden">
        <button type="button" onClick={onRestart} className="text-sm font-medium text-navy/50 hover:text-navy/75">
          Start over
        </button>
      </div>
    </div>
  );
}
