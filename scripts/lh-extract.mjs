import fs from "node:fs";

const file = process.argv[2];
const report = JSON.parse(fs.readFileSync(file, "utf8"));
const cats = report.categories;
const scores = {
  performance: Math.round(cats.performance.score * 100),
  accessibility: Math.round(cats.accessibility.score * 100),
  "best-practices": Math.round(cats["best-practices"].score * 100),
  seo: Math.round(cats.seo.score * 100),
};
console.log(JSON.stringify({ url: report.finalUrl, scores }, null, 2));

console.log("\n--- Non-passing audits (score < 1, binary/numeric, not informative/N-A) ---");
for (const [id, audit] of Object.entries(report.audits)) {
  if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "informative" && audit.scoreDisplayMode !== "notApplicable") {
    console.log(`[${audit.score}] ${id}: ${audit.title}`);
  }
}
