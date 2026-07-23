// Central sub-brand identity for the six reader "paths." Beyond Diagnosis is the
// parent brand; each path has its own named identity (kicker on its hub page,
// label in nav) plus a plain-language descriptor so the purpose is never unclear.

export type PathIcon = "worried" | "plan" | "checkin" | "treatment" | "risk" | "rebuilding" | "caregiver";

export interface PathMeta {
  key: string;
  href: string;
  /** Sub-brand name — shown as an uppercase kicker on the hub page and in nav. */
  subbrand: string;
  /** Short punchy line — the H1 on the hub page. */
  tagline: string;
  /** Plain-language descriptor — used in nav and as the homepage card description. */
  plain: string;
  icon: PathIcon;
}

export const PATHS: PathMeta[] = [
  {
    key: "checkin",
    href: "/paths/checkin",
    subbrand: "The Quick Read",
    tagline: "Five minutes. No rabbit holes.",
    plain: "Just checking in",
    icon: "checkin",
  },
  {
    key: "worried",
    href: "/paths/worried",
    subbrand: "On Watch",
    tagline: "Something feels off.",
    plain: "Something feels off",
    icon: "worried",
  },
  {
    key: "plan",
    href: "/paths/plan",
    subbrand: "The Screening Room",
    tagline: "Know what to get, and when.",
    plain: "Ready to get screened",
    icon: "plan",
  },
  {
    key: "risk",
    href: "/paths/risk",
    subbrand: "Ground Rules",
    tagline: "Lower the odds where you can.",
    plain: "Lowering my risk",
    icon: "risk",
  },
  {
    key: "treatment",
    href: "/paths/treatment",
    subbrand: "Second Opinion",
    tagline: "You're in it now.",
    plain: "I'm in treatment",
    icon: "treatment",
  },
  {
    key: "caregiver",
    href: "/paths/caregiver",
    subbrand: "In Their Corner",
    tagline: "You're in it too.",
    plain: "Supporting someone? You're in it too.",
    icon: "caregiver",
  },
  {
    key: "rebuilding",
    href: "/paths/rebuilding",
    subbrand: "The Rebuild",
    tagline: "Recovery has its own timeline.",
    plain: "Rebuilding after treatment",
    icon: "rebuilding",
  },
];
