// Shared types for "The Map" — the personalized screening + risk interactive.
// Track 1 (Quick Map) answers are required to reach a result; every Track 2
// (Go Deeper) field is optional and additive, never blocking.

export type Sex = "female" | "male";

export type FamilyHistoryType = "Breast" | "Colorectal" | "Ovarian" | "Prostate" | "Pancreatic" | "Other" | "None";

export type TobaccoStatus = "never" | "former" | "current";

export type PackYearBand = "light" | "moderate" | "heavy";

export type SymptomCategory =
  | "Breast"
  | "Colorectal"
  | "Skin"
  | "Lung"
  | "Prostate"
  | "Cervical"
  | "Ovarian"
  | "Pancreatic";

export interface QuickMapAnswers {
  age: number;
  sex: Sex | null;
  familyHistory: FamilyHistoryType[];
  familyHistoryBeforeFifty: boolean;
  tobacco: TobaccoStatus | null;
  packYears: PackYearBand | null;
  symptoms: SymptomCategory[];
  justPlanning: boolean;
}

export type AlcoholLevel = "none" | "occasional" | "weekly" | "mostDays" | "daily";
export type DietFrequency = "rarely" | "weekly" | "mostDays";
export type ActivityLevel = "sedentary" | "some" | "active" | "veryActive";
export type RadonStatus = "yes" | "no" | "dontKnow";
export type FirstPeriodAge = "early" | "average" | "late" | "unknown";
export type OccupationalExposure = "asbestos" | "benzene" | "diesel" | "radiation" | "dust" | "none";

export interface BodyMetrics {
  skip: boolean;
  heightFt: number | null;
  heightIn: number | null;
  weightLb: number | null;
  waistIn: number | null;
}

export interface ReproductiveAnswers {
  skip: boolean;
  ageAtFirstPeriod: FirstPeriodAge | null;
  hasChildren: boolean | null;
  hrtUse: boolean | null;
}

export interface DeeperAnswers {
  alcohol: AlcoholLevel | null;
  bodyMetrics: BodyMetrics;
  diet: DietFrequency | null;
  activity: ActivityLevel | null;
  tanningBedUse: boolean | null;
  frequentSunburns: boolean | null;
  fairSkin: boolean | null;
  occupationalExposures: OccupationalExposure[];
  reproductive: ReproductiveAnswers;
  radonTested: RadonStatus | null;
}

export interface MapAnswers extends QuickMapAnswers, DeeperAnswers {
  wentDeeper: boolean;
}

export function defaultQuickMapAnswers(): QuickMapAnswers {
  return {
    age: 45,
    sex: null,
    familyHistory: [],
    familyHistoryBeforeFifty: false,
    tobacco: null,
    packYears: null,
    symptoms: [],
    justPlanning: false,
  };
}

export function defaultDeeperAnswers(): DeeperAnswers {
  return {
    alcohol: null,
    bodyMetrics: { skip: false, heightFt: null, heightIn: null, weightLb: null, waistIn: null },
    diet: null,
    activity: null,
    tanningBedUse: null,
    frequentSunburns: null,
    fairSkin: null,
    occupationalExposures: [],
    reproductive: { skip: false, ageAtFirstPeriod: null, hasChildren: null, hrtUse: null },
    radonTested: null,
  };
}

export function defaultMapAnswers(): MapAnswers {
  return { ...defaultQuickMapAnswers(), ...defaultDeeperAnswers(), wentDeeper: false };
}

export type ScreeningStatus = "now" | "soon" | "later" | "pastWindow";

export interface ScreeningItem {
  id: string;
  label: string;
  status: ScreeningStatus;
  startAge: number;
  endAge?: number;
  frequency: string;
  why?: string;
  guideHref?: string;
  guideLabel?: string;
}

export interface FactorNote {
  id: string;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
}

export interface WatchItem {
  category: SymptomCategory;
  label: string;
  href: string;
}

export interface NextMove {
  id: string;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
  priority: number;
}

export interface MapResult {
  timeline: ScreeningItem[];
  riskFactors: FactorNote[];
  protectiveFactors: FactorNote[];
  watchList: WatchItem[];
  nextMoves: NextMove[];
}
