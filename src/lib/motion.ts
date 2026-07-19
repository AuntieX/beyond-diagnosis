import { Interact, generate } from "@wix/interact/web";
import * as presets from "@wix/motion-presets";

Interact.registerEffects(presets);

export { generate };

export type InteractionDef = Record<string, unknown>;

/** A single element fading/floating up into place, staggered by `delay` ms. */
export function fadeUpReveal(key: string, delay = 0): InteractionDef {
  return {
    key,
    trigger: "viewEnter",
    params: { threshold: 0.15, inset: "0px 0px -60px 0px" },
    effects: [
      {
        triggerType: "once",
        namedEffect: { type: "FloatIn", direction: "bottom" },
        duration: 650,
        delay,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both",
      },
    ],
  };
}

/** Build staggered fade-up interactions for a list of keys (100ms apart by default). */
export function fadeUpGroup(keys: string[], stepMs = 100): InteractionDef[] {
  return keys.map((key, i) => fadeUpReveal(key, i * stepMs));
}

/** Gentle parallax drift for a hero image as the page scrolls past it. */
export function heroParallax(key: string, speed = 0.35): InteractionDef {
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
