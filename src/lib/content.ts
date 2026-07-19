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

/** Distinct cancer types across warning signs, discovered live (never hardcoded). */
export function distinctCancerTypes(signs: WarningSign[]): string[] {
  return Array.from(new Set(signs.map((s) => s.cancer_type))).sort();
}

export function formatDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
