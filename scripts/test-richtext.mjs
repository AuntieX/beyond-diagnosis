import fs from "node:fs";

const ASK_MARKERS = /(the exact ask|say the words|the ask|ask directly|ask for it directly)\s*:/i;
const NON_NARRATIVE = /https?:|www\.|\.(com|org|gov|net)\b|\d{3}[-.]?\d{3}[-.]?\d{4}/i;
// Fierce-advocate / direct-address markers — the voice the seeded content
// deliberately uses for its punchiest lines (see the site's voice guide).
const VOICE_MARKER = /\b(you|your|you're|you’re|you’ve|you’ll|don't|don’t|doesn't|doesn’t|isn't|isn’t|not\b|never|always|insist|deserve|allowed|entitled)\b/i;

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?]+(?:["'\u2019\u201d])?/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

function isPunchySentence(s) {
  if (s.length < 20 || s.length > 75) return false;
  if (NON_NARRATIVE.test(s)) return false;
  if (s.includes(":")) return false;
  if ((s.match(/[.!?]/g)?.length ?? 0) > 1) return false;
  if (!VOICE_MARKER.test(s)) return false;
  return true;
}

function analyze(html, pullQuote = true) {
  if (!html) return { calloutCount: 0, quoteText: null };
  let used = false;
  let quoteText = null;
  let calloutCount = 0;
  html.replace(/<p>([\s\S]*?)<\/p>/g, (match, inner) => {
    const text = stripTags(inner);
    if (ASK_MARKERS.test(text)) {
      calloutCount++;
      return match;
    }
    if (pullQuote && !used && !/<(strong|a|em)[\s>]/i.test(inner)) {
      const hit = splitSentences(text).find(isPunchySentence);
      if (hit) {
        used = true;
        quoteText = hit;
      }
    }
    return match;
  });
  return { calloutCount, quoteText };
}

const data = JSON.parse(fs.readFileSync("beyond_diagnosis_seed_data.json", "utf8"));

const wsFields = [
  "description",
  "what_it_could_mean",
  "what_it_probably_is",
  "commonly_dismissed_note",
  "if_dismissed",
  "family_history_note",
];

console.log("=== WarningSigns: quotes/callouts per record ===");
let totalQuotes = 0;
let totalCallouts = 0;
let recordsWithNoQuote = 0;
for (const rec of data.WarningSigns) {
  let quotesInRecord = 0;
  let calloutsInRecord = 0;
  const quoteLines = [];
  for (const f of wsFields) {
    const r = analyze(rec[f]);
    if (r.quoteText) {
      quotesInRecord++;
      quoteLines.push(`${f}: "${r.quoteText}"`);
    }
    calloutsInRecord += r.calloutCount;
  }
  totalQuotes += quotesInRecord;
  totalCallouts += calloutsInRecord;
  if (quotesInRecord === 0) recordsWithNoQuote++;
  console.log(`${rec.slug} -> quotes: ${quotesInRecord}, callouts: ${calloutsInRecord}`);
  quoteLines.forEach((q) => console.log("    " + q));
}
console.log(`AVG quotes/record: ${(totalQuotes / data.WarningSigns.length).toFixed(2)}`);
console.log(`records with ZERO quote: ${recordsWithNoQuote}/${data.WarningSigns.length}`);
console.log(`AVG callouts/record: ${(totalCallouts / data.WarningSigns.length).toFixed(2)}`);

console.log();
console.log("=== LifeStage collections (body field only) ===");
for (const coll of ["Therapies", "Trials", "Environment", "Recovery"]) {
  for (const rec of data[coll]) {
    const r = analyze(rec.body);
    console.log(`${coll}/${rec.slug} -> quote: ${r.quoteText ? `"${r.quoteText}"` : "none"}, callouts: ${r.calloutCount}`);
  }
}

console.log();
console.log("=== AccessGuides (all fields) ===");
const agFields = ["overview", "steps", "when_applies", "when_not", "resources", "denial_path"];
for (const rec of data.AccessGuides) {
  let quotesInRecord = 0;
  let calloutsInRecord = 0;
  const lines = [];
  for (const f of agFields) {
    const r = analyze(rec[f]);
    if (r.quoteText) {
      quotesInRecord++;
      lines.push(`${f}: "${r.quoteText}"`);
    }
    calloutsInRecord += r.calloutCount;
  }
  console.log(`${rec.slug} -> quotes: ${quotesInRecord}, callouts: ${calloutsInRecord}`);
  lines.forEach((l) => console.log("    " + l));
}
