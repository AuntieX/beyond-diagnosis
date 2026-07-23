// Merges scripts/.tmp-consistency-sweep.json (the 8 new records: Thyroid x2,
// HPV x1, Articles x5) into beyond_diagnosis_seed_data.json, de-duping by slug
// against what's already in the local seed file so re-runs are safe.
import fs from "node:fs";

const mainPath = "beyond_diagnosis_seed_data.json";
const newPath = "scripts/.tmp-consistency-sweep.json";

const main = JSON.parse(fs.readFileSync(mainPath, "utf8"));
const incoming = JSON.parse(fs.readFileSync(newPath, "utf8"));

for (const collectionId of Object.keys(incoming)) {
  if (collectionId === "meta") continue;
  const existingArr = Array.isArray(main[collectionId]) ? main[collectionId] : [];
  const existingSlugs = new Set(existingArr.map((r) => r.slug));
  const newRecords = incoming[collectionId];
  const toAdd = newRecords.filter((r) => !existingSlugs.has(r.slug));
  const skipped = newRecords.filter((r) => existingSlugs.has(r.slug));
  main[collectionId] = [...existingArr, ...toAdd];
  console.log(`${collectionId}: before=${existingArr.length}, adding=${toAdd.length}, skipped(dupe)=${skipped.length}, after=${main[collectionId].length}`);
  if (skipped.length) console.log(`  skipped slugs: ${skipped.map((r) => r.slug).join(", ")}`);
}

fs.writeFileSync(mainPath, JSON.stringify(main, null, 2));
console.log("\nWrote merged file:", mainPath);
