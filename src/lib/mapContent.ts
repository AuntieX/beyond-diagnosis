// Static content constants for The Map — links out to real Access Guides,
// Environment guides, and On Watch (WarningSigns) hub filters. Keeping these
// slugs in one place means if a guide's slug ever changes, this is the only
// file that needs updating.
import type { SymptomCategory } from "./mapTypes";

export const GUIDES = {
  mammogram: "/access-guides/get-your-mammogram-fully-covered-yes-really",
  denseBreastImaging: "/access-guides/dense-breasts-do-you-qualify-for-free-supplemental-imaging",
  colonoscopy: "/access-guides/get-your-colonoscopy-fully-covered",
  skinCheck: "/access-guides/get-a-skin-check-without-insurance",
  papHpv: "/access-guides/get-a-pap-smear-and-hpv-test-at-zero-cost",
  lungCt: "/access-guides/low-dose-ct-lung-screening-who-qualifies-free",
  psa: "/access-guides/psa-testing-when-your-doctor-wont-order-it",
  geneticTesting: "/access-guides/genetic-testing-brca-lynch-when-its-covered",
  noInsuranceList: "/access-guides/no-insurance-cancer-screening-the-real-list",
} as const;

export const ENVIRONMENT = {
  radon: "/environment/radon-the-2-cause-of-lung-cancer-youve-never-tested-for",
  water: "/environment/water-filters-what-actually-removes-carcinogens",
  everydayCarcinogens: "/environment/everyday-carcinogens-you-can-actually-avoid",
  familyHistoryMapping: "/environment/family-history-and-genetic-risk-mapping-your-inheritance",
} as const;

export const PATHS_HREF = {
  risk: "/paths/risk",
  worried: "/paths/worried",
  plan: "/paths/plan",
} as const;

export const SYMPTOM_CATEGORIES: { id: SymptomCategory; label: string }[] = [
  { id: "Breast", label: "Breast changes" },
  { id: "Colorectal", label: "Bowel or rectal changes" },
  { id: "Skin", label: "A mole or spot that's changed" },
  { id: "Lung", label: "A cough or chest symptom" },
  { id: "Prostate", label: "Urinary changes" },
  { id: "Cervical", label: "Unusual bleeding or discharge" },
  { id: "Ovarian", label: "Bloating or pelvic pressure" },
  { id: "Pancreatic", label: "New digestive changes" },
];

export function watchHref(category: SymptomCategory): string {
  return `${PATHS_HREF.worried}?type=${encodeURIComponent(category)}`;
}
