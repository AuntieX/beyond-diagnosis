import { Interact, generate } from "@wix/interact/web";
import * as presets from "@wix/motion-presets";

Interact.registerEffects(presets);

export { generate };

export type InteractionDef = Record<string, unknown>;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * A single element fading + drifting up a small distance into place. Kept
 * deliberately subtle (small distance, 200-400ms) — precision, not a TikTok
 * transition. `delay` staggers groups of these (see fadeUpGroup).
 */
export function fadeUpReveal(key: string, delay = 0, duration = 380, distance = 16): InteractionDef {
  return {
    key,
    trigger: "viewEnter",
    params: { threshold: 0.15, inset: "0px 0px -60px 0px" },
    effects: [
      {
        triggerType: "once",
        keyframeEffect: {
          name: `fade-up-${key}`,
          keyframes: [
            { opacity: "0", transform: `translateY(${distance}px)` },
            { opacity: "1", transform: "translateY(0)" },
          ],
        },
        duration,
        delay,
        easing: EASE_OUT,
        fill: "both",
      },
    ],
  };
}

/** Build staggered fade-up interactions for a list of keys (100ms apart by default). */
export function fadeUpGroup(keys: string[], stepMs = 100): InteractionDef[] {
  return keys.map((key, i) => fadeUpReveal(key, i * stepMs));
}

/** A plain, no-movement fade — for hero images and other elements that shouldn't shift. */
export function fadeInReveal(key: string, delay = 0, duration = 320): InteractionDef {
  return {
    key,
    trigger: "viewEnter",
    params: { threshold: 0.1, inset: "0px 0px -40px 0px" },
    effects: [
      {
        triggerType: "once",
        keyframeEffect: {
          name: `fade-in-${key}`,
          keyframes: [{ opacity: "0" }, { opacity: "1" }],
        },
        duration,
        delay,
        easing: "ease-out",
        fill: "both",
      },
    ],
  };
}

/** Build a quick, lightly-staggered fade-in for small inline groups (e.g. filter pills). */
export function fadeInGroup(keys: string[], stepMs = 50): InteractionDef[] {
  return keys.map((key, i) => fadeInReveal(key, i * stepMs, 260));
}

/** Gentle parallax drift for a hero image as the page scrolls past it — slower than the page. */
export function heroParallax(key: string, speed = 0.2): InteractionDef {
  return {
    key,
    trigger: "viewProgress",
    effects: [
      {
        namedEffect: { type: "ImageParallax", speed, isPage: true },
      },
    ],
  };
}

export function buildConfig(interactions: InteractionDef[]) {
  return { interactions };
}
