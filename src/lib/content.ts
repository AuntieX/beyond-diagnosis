import { items } from "@wix/data";
import { media } from "@wix/sdk";

export const NEWSLETTER_FORM_ID = "8c752429-4dbe-47cf-91d9-131c70f223ba";

export interface WarningSign {
  _id: string;
  title: string;
  slug: string;
  cancer_type: string;
  sign_name: string;
  description: string;
  what_it_could_mean: string;
  what_it_probably_is: string;
  commonly_dismissed_note: string;
  when_to_call_doctor: string;
  when_to_go_to_er: string;
  if_dismissed: string;
  family_history_note: string;
  heroImage?: string;
}

export interface AccessGuide {
  _id: string;
  title: string;
  slug: string;
  topic: string;
  cancer_type: string;
  overview: string;
  steps: string;
  when_applies: string;
  when_not: string;
  resources: string;
  denial_path: string;
  last_reviewed?: string;
  heroImage?: string;
}

export interface Article {
  _id: string;
  title: string;
  slug: string;
  publishDate?: string;
  category: string;
  excerpt: string;
  body: string;
  author: string;
  readMinutes: number;
  heroImage?: string;
}

/** Shared shape for the four life-stage collections: Therapies, Trials, Environment, Recovery. */
export interface LifeStageEntry {
  _id: string;
  title: string;
  slug: string;
  life_stage: string;
  pillar: string;
  cancer_tags: string;
  intro: string;
  body: string;
  heroImage?: string;
}

export type LifeStageCollectionId = "Therapies" | "Trials" | "Environment" | "Recovery" | "Caregiver";

/** Resolve a wix:image:// URI (or a plain https URL) to a real, sized image URL. */
export function imgSrc(value: unknown, w = 1200, h = 800): string {
  if (!value || typeof value !== "string") return "";
  if (value.startsWith("wix:image://")) {
    try {
      return media.getScaledToFillImageUrl(value, w, h, {});
    } catch {
      return "";
    }
  }
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return "";
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[wix-data] query failed:", err);
    return fallback;
  }
}

export async function getWarningSigns(): Promise<WarningSign[]> {
  return safe(async () => {
    const { items: rows } = await items.query("WarningSigns").ascending("title").limit(100).find();
    return rows as unknown as WarningSign[];
  }, []);
}

export async function getWarningSignsByCancerType(cancerType: string): Promise<WarningSign[]> {
  return safe(async () => {
    const { items: rows } = await items
      .query("WarningSigns")
      .eq("cancer_type", cancerType)
      .ascending("title")
      .limit(100)
      .find();
    return rows as unknown as WarningSign[];
  }, []);
}

export async function getWarningSign(slug: string): Promise<WarningSign | null> {
  return safe(async () => {
    const { items: rows } = await items.query("WarningSigns").eq("slug", slug).limit(1).find();
    return (rows[0] as unknown as WarningSign) ?? null;
  }, null);
}

export async function getAccessGuides(): Promise<AccessGuide[]> {
  return safe(async () => {
    const { items: rows } = await items.query("AccessGuides").ascending("title").limit(100).find();
    return rows as unknown as AccessGuide[];
  }, []);
}

export async function getAccessGuide(slug: string): Promise<AccessGuide | null> {
  return safe(async () => {
    const { items: rows } = await items.query("AccessGuides").eq("slug", slug).limit(1).find();
    return (rows[0] as unknown as AccessGuide) ?? null;
  }, null);
}

export async function getArticles(): Promise<Article[]> {
  return safe(async () => {
    const { items: rows } = await items.query("Articles").descending("publishDate").limit(100).find();
    return rows as unknown as Article[];
  }, []);
}

export async function getArticle(slug: string): Promise<Article | null> {
  return safe(async () => {
    const { items: rows } = await items.query("Articles").eq("slug", slug).limit(1).find();
    return (rows[0] as unknown as Article) ?? null;
  }, null);
}

export async function getLifeStageEntries(collectionId: LifeStageCollectionId): Promise<LifeStageEntry[]> {
  return safe(async () => {
    const { items: rows } = await items.query(collectionId).ascending("title").limit(100).find();
    return rows as unknown as LifeStageEntry[];
  }, []);
}

export async function getLifeStageEntry(
  collectionId: LifeStageCollectionId,
  slug: string,
): Promise<LifeStageEntry | null> {
  return safe(async () => {
    const { items: rows } = await items.query(collectionId).eq("slug", slug).limit(1).find();
    return (rows[0] as unknown as LifeStageEntry) ?? null;
  }, null);
}

/**
 * The CMS stores full clinical detail in cancer_type / cancer_tags (e.g. "Skin (Melanoma)",
 * "Prostate / Bladder / Kidney", "Colon / Colorectal"). Filter pills and card badges show a
 * normalized *primary* cancer instead, so "Skin (Melanoma)" and "Skin (Basal & Squamous cell)
 * / Oral / Genital" both collapse to one "Skin" pill. The raw string is still shown in full on
 * the record's own detail page — nothing is deleted, just normalized for grouping.
 */
const CANCER_SYNONYMS: Record<string, string> = {
  breast: "Breast",
  colon: "Colorectal",
  colorectal: "Colorectal",
  skin: "Skin",
  melanoma: "Skin",
  lung: "Lung",
  prostate: "Prostate",
  cervical: "Cervical",
  uterine: "Cervical",
  endometrial: "Cervical",
  vaginal: "Cervical",
  vulvar: "Cervical",
  ovarian: "Ovarian",
  pancreatic: "Pancreatic",
  thyroid: "Thyroid",
};

function tokenize(raw: string): string[] {
  return raw
    .replace(/[()]/g, " ")
    .split(/[/,&]|\band\b/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** The single primary cancer for a record — used for card badges and single-value filter matching. */
export function primaryCancerLabel(raw?: string): string {
  if (!raw) return "General";
  for (const token of tokenize(raw)) {
    for (const word of token.toLowerCase().split(/\s+/)) {
      const match = CANCER_SYNONYMS[word.replace(/[^a-z]/g, "")];
      if (match) return match;
    }
  }
  return "General";
}

/** Every distinct canonical cancer mentioned — used to match multi-cancer_tags records to filter pills. */
export function cancerTagsList(raw?: string): string[] {
  if (!raw) return [];
  const found = new Set<string>();
  for (const token of tokenize(raw)) {
    for (const word of token.toLowerCase().split(/\s+/)) {
      const match = CANCER_SYNONYMS[word.replace(/[^a-z]/g, "")];
      if (match) found.add(match);
    }
  }
  return Array.from(found);
}

/** Distinct normalized primary cancers across warning signs, discovered live (never hardcoded). */
export function distinctCancerTypes(signs: WarningSign[]): string[] {
  return Array.from(new Set(signs.map((s) => primaryCancerLabel(s.cancer_type)))).filter((t) => t !== "General").sort();
}

/** Distinct normalized cancers across cancer_tags-based entries (Therapies/Trials/Environment/Recovery). */
export function distinctCancerTags(entries: LifeStageEntry[]): string[] {
  const found = new Set<string>();
  for (const e of entries) {
    for (const tag of cancerTagsList(e.cancer_tags)) found.add(tag);
  }
  return Array.from(found).sort();
}

export function formatDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
