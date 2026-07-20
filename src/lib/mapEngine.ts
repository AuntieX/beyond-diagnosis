// The Map's ruleset — pure, client-side, no network calls. Everything here is
// a simplification of general screening guidelines for a starting-point tool,
// not a diagnostic instrument. See the on-page disclaimer for the framing.
import type { FactorNote, FamilyHistoryType, MapAnswers, MapResult, NextMove, ScreeningItem, WatchItem } from "./mapTypes";
import { ENVIRONMENT, GUIDES, PATHS_HREF, watchHref } from "./mapContent";

function hasFamilyHistory(a: MapAnswers, type: FamilyHistoryType): boolean {
  return a.familyHistory.includes(type);
}

function anyFamilyHistory(a: MapAnswers): boolean {
  return a.familyHistory.length > 0 && !a.familyHistory.includes("None");
}

function familyHistoryLabel(a: MapAnswers): string {
  const types = a.familyHistory.filter((t) => t !== "None");
  if (types.length === 0) return "";
  if (types.length === 1) return types[0];
  return `${types.slice(0, -1).join(", ")} and ${types[types.length - 1]}`;
}

export function computeBmi(heightFt: number | null, heightIn: number | null, weightLb: number | null): number | null {
  if (!heightFt || !weightLb) return null;
  const totalInches = heightFt * 12 + (heightIn ?? 0);
  if (totalInches <= 0) return null;
  return Math.round(((703 * weightLb) / (totalInches * totalInches)) * 10) / 10;
}

function waistThreshold(a: MapAnswers): number {
  return a.sex === "male" ? 40 : 35;
}

function status(age: number, startAge: number, endAge?: number): ScreeningItem["status"] {
  if (endAge && age > endAge) return "pastWindow";
  if (age >= startAge) return "now";
  if (startAge - age <= 5) return "soon";
  return "later";
}

export function computeScreeningTimeline(a: MapAnswers): ScreeningItem[] {
  const items: ScreeningItem[] = [];
  const { age, sex } = a;

  if (sex === "female") {
    const breastElevated = hasFamilyHistory(a, "Breast") || hasFamilyHistory(a, "Ovarian");
    const breastStart = breastElevated ? 30 : 40;
    items.push({
      id: "breast",
      label: "Mammogram",
      status: status(age, breastStart),
      startAge: breastStart,
      frequency: breastElevated ? "Annual mammogram, plus breast MRI" : "Every 1–2 years",
      why: breastElevated
        ? "Starting earlier and adding MRI because of your family history — ask about genetic counseling too."
        : undefined,
      guideHref: GUIDES.mammogram,
      guideLabel: "How to get it fully covered",
    });

    items.push({
      id: "cervical",
      label: "Pap test / HPV co-test",
      status: status(age, 21, 65),
      startAge: 21,
      endAge: 65,
      frequency: "Every 3 years (Pap), or every 5 years if co-tested with HPV",
      guideHref: GUIDES.papHpv,
      guideLabel: "Get it at zero cost",
    });
  }

  const colorectalElevated = hasFamilyHistory(a, "Colorectal");
  const colorectalStart = colorectalElevated ? 40 : 45;
  items.push({
    id: "colorectal",
    label: "Colonoscopy or FIT test",
    status: status(age, colorectalStart, 75),
    startAge: colorectalStart,
    endAge: 75,
    frequency: "Colonoscopy every 10 years, or a FIT test every year",
    why: colorectalElevated
      ? "Starting earlier because of your family history — some doctors start even sooner, 10 years before your relative's age at diagnosis. Ask."
      : undefined,
    guideHref: GUIDES.colonoscopy,
    guideLabel: "How to get it fully covered",
  });

  if (sex === "male") {
    const prostateElevated = hasFamilyHistory(a, "Prostate");
    const prostateStart = prostateElevated ? 45 : 50;
    items.push({
      id: "prostate",
      label: "PSA conversation",
      status: status(age, prostateStart),
      startAge: prostateStart,
      frequency: "A shared decision with your doctor, then roughly yearly if you start",
      why: prostateElevated
        ? "Starting earlier because of your family history. It's also worth knowing that Black men face higher prostate cancer risk independent of family history — ask your doctor either way."
        : "Ask your doctor about starting earlier if you're Black or have a family history — both independently move this up to 45.",
      guideHref: GUIDES.psa,
      guideLabel: "When your doctor won't order it",
    });
  }

  if (a.tobacco === "current" || a.tobacco === "former") {
    const heavyEnough = a.packYears === "moderate" || a.packYears === "heavy";
    const recentEnough = a.tobacco === "current";
    const lungStatus = status(age, 50, 80);
    let why: string;
    if (heavyEnough && recentEnough) {
      why = "Your smoking history and age put you in range for annual low-dose CT screening.";
    } else if (heavyEnough && !recentEnough) {
      why = "You may still qualify if you quit within the last 15 years — worth asking regardless of exactly how long it's been.";
    } else {
      why = "You're close on pack-years — screening eligibility usually starts around 20 pack-years. Ask your doctor either way, especially with other risk factors.";
    }
    items.push({
      id: "lung",
      label: "Low-dose CT lung screening",
      status: lungStatus === "now" ? "now" : lungStatus,
      startAge: 50,
      endAge: 80,
      frequency: "Annually, if you qualify",
      why,
      guideHref: GUIDES.lungCt,
      guideLabel: "Who qualifies free",
    });
  }

  const skinElevated = Boolean(a.tanningBedUse || a.frequentSunburns || a.fairSkin);
  items.push({
    id: "skin",
    label: "Skin check",
    status: "now",
    startAge: age,
    frequency: skinElevated ? "Annually, with a dermatologist" : "Know your skin — ask for a check at your next physical",
    why: skinElevated
      ? "Your sun history moves this from 'nice to have' to 'worth scheduling.'"
      : undefined,
    guideHref: GUIDES.skinCheck,
    guideLabel: "Get a skin check without insurance",
  });

  const order = ["breast", "cervical", "prostate", "colorectal", "lung", "skin"];
  items.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  return items;
}

/** True when nothing in the timeline is urgent yet — used to soften the framing for young/low-risk users. */
export function isEarlyAndLowRisk(timeline: ScreeningItem[]): boolean {
  return timeline.every((item) => item.id === "skin" || item.status === "later" || item.status === "soon");
}

export function computeRiskFactors(a: MapAnswers): FactorNote[] {
  const notes: FactorNote[] = [];

  if (a.tobacco === "current") {
    notes.push({
      id: "tobacco-current",
      title: "Smoking",
      body: "You're a current smoker. Tobacco is linked to at least a dozen cancer types, not just lung, and it's the single largest preventable cause of cancer death. Quitting at any age lowers your risk starting almost immediately — it's never too late for it to matter.",
      href: GUIDES.lungCt,
      hrefLabel: "Lung screening eligibility",
    });
  } else if (a.tobacco === "former") {
    notes.push({
      id: "tobacco-former",
      title: "Smoking history",
      body: "You used to smoke. Depending on how much and how recently you quit, some extra lung screening may still apply — see your timeline above. Every year further out from your last cigarette, your risk keeps dropping.",
      href: GUIDES.lungCt,
      hrefLabel: "Check eligibility",
    });
  }

  if (a.alcohol === "weekly" || a.alcohol === "mostDays" || a.alcohol === "daily") {
    const intensity = a.alcohol === "weekly" ? "" : " and it climbs further with more frequent drinking";
    notes.push({
      id: "alcohol",
      title: "Alcohol",
      body: `Alcohol is a Group 1 carcinogen — linked to breast, colorectal, and liver cancer, with risk rising as intake rises${intensity}. Even cutting back meaningfully lowers risk, no matter your starting point.`,
      href: PATHS_HREF.risk,
      hrefLabel: "Ground Rules",
    });
  }

  if (!a.bodyMetrics.skip) {
    const bmi = computeBmi(a.bodyMetrics.heightFt, a.bodyMetrics.heightIn, a.bodyMetrics.weightLb);
    const waist = a.bodyMetrics.waistIn;
    const waistOver = waist != null && waist > waistThreshold(a);
    if ((bmi != null && bmi >= 25) || waistOver) {
      notes.push({
        id: "weight",
        title: "Weight and waist",
        body: "Carrying extra weight, especially around the waist, is linked to several cancers, including breast, colorectal, and pancreatic. This is one factor among many, not a verdict — small, sustainable changes matter more than perfection.",
        href: PATHS_HREF.risk,
        hrefLabel: "Ground Rules",
      });
    }
  }

  if (a.diet === "mostDays") {
    notes.push({
      id: "diet",
      title: "Diet",
      body: "You mentioned eating processed or red meat most days. That's linked to a modestly higher colorectal cancer risk. This isn't about overhauling everything — swapping even a couple of meals a week adds up.",
      href: PATHS_HREF.risk,
      hrefLabel: "Ground Rules",
    });
  }

  if (a.activity === "sedentary") {
    notes.push({
      id: "activity",
      title: "Activity level",
      body: "You mentioned a mostly sedentary routine. Regular movement is one of the most consistently protective habits against cancer risk — and it doesn't have to mean the gym. Walking counts.",
    });
  }

  if (a.tanningBedUse || a.frequentSunburns) {
    const parts: string[] = [];
    if (a.tanningBedUse) parts.push("tanning bed use");
    if (a.frequentSunburns) parts.push("frequent sunburns");
    if (a.fairSkin) parts.push("fair skin");
    notes.push({
      id: "sun",
      title: "Sun exposure",
      body: `You flagged ${parts.join(", ")}. That combination raises melanoma and skin cancer risk meaningfully — a yearly skin check is a quick habit worth building, and it's already reflected in your timeline above.`,
      href: GUIDES.skinCheck,
      hrefLabel: "Get a skin check without insurance",
    });
  }

  const exposures = a.occupationalExposures.filter((e) => e !== "none");
  if (exposures.length > 0) {
    const labels: Record<string, string> = {
      asbestos: "asbestos",
      benzene: "benzene or solvents",
      diesel: "diesel exhaust",
      radiation: "radiation",
      dust: "dust or silica",
    };
    notes.push({
      id: "occupational",
      title: "Workplace exposures",
      body: `You flagged exposure to ${exposures.map((e) => labels[e] ?? e).join(", ")} at work. These are recognized carcinogens — ask your doctor whether your history warrants extra monitoring, and check whether your workplace requires PPE or offers exposure monitoring.`,
      href: ENVIRONMENT.everydayCarcinogens,
      hrefLabel: "Everyday carcinogens you can avoid",
    });
  }

  if (a.radonTested === "no" || a.radonTested === "dontKnow") {
    notes.push({
      id: "radon",
      title: "Radon",
      body: "You haven't tested your home for radon, or aren't sure. Radon is the #2 cause of lung cancer in the U.S. after smoking, and it's completely invisible without a test — which costs about $15.",
      href: ENVIRONMENT.radon,
      hrefLabel: "Test your home",
    });
  }

  if (anyFamilyHistory(a)) {
    const label = familyHistoryLabel(a);
    if (a.familyHistoryBeforeFifty) {
      notes.push({
        id: "family-history",
        title: "Family history",
        body: `You reported family history of ${label} cancer, including a diagnosis before age 50. Early-onset cases in a family can signal an inherited risk — that's worth a conversation about genetic counseling, and it's already shifted your screening timeline above.`,
        href: GUIDES.geneticTesting,
        hrefLabel: "Genetic testing — when it's covered",
      });
    } else {
      notes.push({
        id: "family-history",
        title: "Family history",
        body: `You reported family history of ${label} cancer. It's already adjusted your timeline above. Most family history isn't inherited-syndrome-level risk, but it's worth your doctor knowing the full picture.`,
        href: ENVIRONMENT.familyHistoryMapping,
        hrefLabel: "Mapping your inheritance",
      });
    }
  }

  return notes;
}

export function computeProtectiveFactors(a: MapAnswers): FactorNote[] {
  const notes: FactorNote[] = [];

  if (a.tobacco === "never") {
    notes.push({
      id: "no-smoking",
      title: "You don't smoke",
      body: "That's the single biggest cancer-prevention factor there is. Genuinely — nothing else on this list comes close.",
    });
  } else if (a.tobacco === "former") {
    notes.push({
      id: "quit-smoking",
      title: "You quit",
      body: "That decision keeps paying off. Your risk keeps dropping the further out you get from your last cigarette — it doesn't reset to zero, but it never stops improving.",
    });
  }

  if (a.alcohol === "none" || a.alcohol === "occasional") {
    notes.push({
      id: "low-alcohol",
      title: "Little to no alcohol",
      body: "That keeps a real risk factor low — one less thing stacked against you.",
    });
  }

  if (a.activity === "active" || a.activity === "veryActive") {
    notes.push({
      id: "active",
      title: "Your activity level",
      body: "Genuinely protective, and one of the most consistently evidenced habits against cancer risk. Keep it up.",
    });
  }

  if (a.diet === "rarely") {
    notes.push({
      id: "diet-good",
      title: "Your diet",
      body: "You rarely eat processed or red meat — that's a real protective habit, not a small thing.",
    });
  }

  if (a.occupationalExposures.length > 0 && a.occupationalExposures.every((e) => e === "none")) {
    notes.push({
      id: "no-exposures",
      title: "No major workplace exposures",
      body: "One less risk stacked on top of everything else.",
    });
  }

  if (a.radonTested === "yes") {
    notes.push({
      id: "radon-tested",
      title: "You've tested for radon",
      body: "Most people never do. That's real, concrete prevention — not just good intentions.",
    });
  }

  if (a.tanningBedUse === false && a.frequentSunburns === false) {
    notes.push({
      id: "sun-safe",
      title: "You steer clear of tanning beds and burns",
      body: "Your skin thanks you — that meaningfully lowers melanoma risk over a lifetime.",
    });
  }

  if (!a.bodyMetrics.skip) {
    const bmi = computeBmi(a.bodyMetrics.heightFt, a.bodyMetrics.heightIn, a.bodyMetrics.weightLb);
    const waist = a.bodyMetrics.waistIn;
    const waistOk = waist == null || waist <= waistThreshold(a);
    if (bmi != null && bmi >= 18.5 && bmi < 25 && waistOk) {
      notes.push({
        id: "weight-ok",
        title: "Your weight and waist measurements",
        body: "They're in a lower-risk range — genuinely good news, and worth maintaining rather than chasing anything different.",
      });
    }
  }

  if (!anyFamilyHistory(a)) {
    notes.push({
      id: "no-family-history",
      title: "No family history you're aware of",
      body: "That's a lower baseline to work from than a lot of people have.",
    });
  }

  if (a.age < 40 && !anyFamilyHistory(a)) {
    notes.push({
      id: "young-low-risk",
      title: "Your age is on your side",
      body: "Right now, your baseline risk is on the lower end — which makes this a great time to build habits, not a moment to panic about anything.",
    });
  }

  if (notes.length < 2) {
    notes.push({
      id: "showed-up",
      title: "You showed up and asked",
      body: "That's not nothing. Awareness is what catches things early, and you're already doing the hardest part — paying attention.",
    });
  }

  return notes;
}

export function computeWatchList(a: MapAnswers): WatchItem[] {
  return a.symptoms.map((category) => ({
    category,
    label: category,
    href: watchHref(category),
  }));
}

export function computeNextMoves(a: MapAnswers, timeline: ScreeningItem[], riskFactors: FactorNote[], watchList: WatchItem[]): NextMove[] {
  const candidates: NextMove[] = [];

  if (watchList.length > 0) {
    const first = watchList[0];
    candidates.push({
      id: "watch",
      priority: 1,
      title: `Don't sit on it — check "${first.label}"`,
      body: "You flagged something worth a closer look. See what it could mean and what to say if a doctor brushes it off.",
      href: first.href,
      hrefLabel: "See what it could mean",
    });
  }

  const dueNow = timeline.find((t) => t.status === "now" && t.id !== "skin") ?? timeline.find((t) => t.status === "now");
  if (dueNow?.guideHref) {
    candidates.push({
      id: "due-now",
      priority: 2,
      title: `Book your ${dueNow.label.toLowerCase()}`,
      body: `${dueNow.frequency}. Here's exactly how to get it covered.`,
      href: dueNow.guideHref,
      hrefLabel: dueNow.guideLabel,
    });
  }

  if (a.familyHistoryBeforeFifty && anyFamilyHistory(a)) {
    candidates.push({
      id: "genetic",
      priority: 3,
      title: "Ask about genetic counseling",
      body: "Early-onset cancer in your family is worth a real conversation, not just a note in your chart.",
      href: GUIDES.geneticTesting,
      hrefLabel: "When it's covered",
    });
  }

  if (a.radonTested === "no" || a.radonTested === "dontKnow") {
    candidates.push({
      id: "radon",
      priority: 4,
      title: "Test your home for radon",
      body: "About $15 and 5 minutes to set up. It's the easiest item on this whole list.",
      href: ENVIRONMENT.radon,
      hrefLabel: "How to test",
    });
  }

  if (a.tobacco === "current") {
    candidates.push({
      id: "quit",
      priority: 5,
      title: "Ask about lung screening, and about quitting support",
      body: "Both conversations are worth having at the same appointment — screening for now, and a quit plan for the years ahead.",
      href: GUIDES.lungCt,
      hrefLabel: "Check eligibility",
    });
  }

  const remainingRisk = riskFactors.find((r) => !["tobacco-current", "family-history", "radon"].includes(r.id) && r.href);
  if (remainingRisk?.href) {
    candidates.push({
      id: `follow-up-${remainingRisk.id}`,
      priority: 6,
      title: `Take one small step on ${remainingRisk.title.toLowerCase()}`,
      body: remainingRisk.body,
      href: remainingRisk.href,
      hrefLabel: remainingRisk.hrefLabel,
    });
  }

  candidates.push({
    id: "bookmark",
    priority: 8,
    title: "Bookmark your timeline",
    body: "Come back and rerun The Map any time your history changes — a new diagnosis in the family, a birthday that unlocks a new screening, anything.",
  });
  candidates.push({
    id: "newsletter",
    priority: 9,
    title: "Get one honest email a week",
    body: "No fear, no fluff — just clear, evidence-grounded guidance for people 35 and up.",
    href: "/newsletter",
    hrefLabel: "Sign up",
  });

  candidates.sort((x, y) => x.priority - y.priority);
  return candidates.slice(0, Math.max(2, Math.min(4, candidates.length)));
}

export function computeMapResult(a: MapAnswers): MapResult {
  const timeline = computeScreeningTimeline(a);
  const riskFactors = computeRiskFactors(a);
  const protectiveFactors = computeProtectiveFactors(a);
  const watchList = computeWatchList(a);
  const nextMoves = computeNextMoves(a, timeline, riskFactors, watchList);
  return { timeline, riskFactors, protectiveFactors, watchList, nextMoves };
}
