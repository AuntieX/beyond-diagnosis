// Lightweight, regex-based enhancement of CMS rich-text HTML for visual hierarchy.
// Deliberately conservative: it only ever wraps existing text in extra markup —
// it never rewrites, removes, or reorders a single word of the seeded copy.

const ASK_MARKERS = /(the exact ask|say the words|the ask|ask directly|ask for it directly)\s*:/i;

// Paragraphs containing URLs, phone numbers, or org/resource directory text
// are never pull-quote candidates — those are lists, not narrative.
const NON_NARRATIVE = /https?:|www\.|\.(com|org|gov|net|edu)\b|\d{3}[-.]?\d{3}[-.]?\d{4}/i;

// The seeded voice is deliberately "advocate-doctor-best-friend": direct address,
// negation, permission-giving. The site's punchiest one-liners reliably carry one
// of these markers — plain descriptive sentences ("Most moles are benign.") don't.
const VOICE_MARKER =
  /\b(you|your|you're|you’re|you’ve|you’ll|don't|don’t|doesn't|doesn’t|isn't|isn’t|not\b|never|always|insist|deserve|allowed|entitled)\b/i;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+(?:["'\u2019\u201d])?/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

function isPunchySentence(sentence: string): boolean {
  if (sentence.length < 20 || sentence.length > 75) return false;
  if (NON_NARRATIVE.test(sentence)) return false;
  if (sentence.includes(":")) return false;
  if ((sentence.match(/[.!?]/g)?.length ?? 0) > 1) return false;
  if (!VOICE_MARKER.test(sentence)) return false;
  return true;
}

interface EnhanceOptions {
  /** Pull out the first standalone punchy sentence as a large pull-quote. Default true. */
  pullQuote?: boolean;
}

/**
 * Enhances CMS rich-text HTML with:
 * 1. "Ask callout" boxes around scripted lines ("The exact ask:", "Say the words:", etc.)
 * 2. At most one pull-quote — the first short, direct-address, declarative sentence found.
 * Everything else passes through completely untouched.
 */
export function enhanceRichText(html: string | null | undefined, options: EnhanceOptions = {}): string {
  if (!html) return "";
  const { pullQuote = true } = options;
  let pullQuoteUsed = false;

  return html.replace(/<p>([\s\S]*?)<\/p>/g, (match, inner: string) => {
    const text = stripTags(inner);

    if (ASK_MARKERS.test(text)) {
      return (
        `<div class="ask-callout"><span class="ask-callout__mark" aria-hidden="true">&ldquo;</span>` +
        `<div class="ask-callout__body"><p>${inner}</p></div></div>`
      );
    }

    if (pullQuote && !pullQuoteUsed && !NON_NARRATIVE.test(text) && !/<(strong|a|em)[\s>]/i.test(inner)) {
      const hit = splitSentences(text).find(isPunchySentence);
      if (hit) {
        const idx = inner.indexOf(hit);
        if (idx !== -1) {
          pullQuoteUsed = true;
          const before = inner.slice(0, idx);
          const after = inner.slice(idx + hit.length);
          return `<p>${before}<strong class="pull-line">${hit}</strong>${after}</p>`;
        }
      }
    }

    return match;
  });
}
