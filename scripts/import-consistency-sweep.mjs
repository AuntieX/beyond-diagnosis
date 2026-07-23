// Beyond Diagnosis — consistency-sweep import (8 new records only).
// Reads beyond_diagnosis_seed_data.json (already merged with the new Thyroid x2 /
// HPV x1 / Articles x5 records via scripts/merge-consistency-sweep.mjs) and
// imports ONLY into WarningSigns, AccessGuides, Environment, and Articles.
//
// De-dupes against the LIVE CMS by slug (queries each collection first) so this
// is safe to re-run: anything whose slug already exists live is SKIPPED, not
// duplicated or overwritten. Prints before/after counts per collection.

import { execSync } from "node:child_process";
import fs from "node:fs";

const CONFIG = JSON.parse(fs.readFileSync("wix.config.json", "utf8"));
const SITE_ID = CONFIG.siteId;
const TOKEN = execSync(`npx @wix/cli@latest token --site "${SITE_ID}"`, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
}).trim();

const BASE = "https://www.wixapis.com";

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "wix-site-id": SITE_ID,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (res.status >= 300) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const data = JSON.parse(fs.readFileSync("beyond_diagnosis_seed_data.json", "utf8"));
const NEW_SLUGS = {
  WarningSigns: ["neck-lump-voice-change-thyroid"],
  AccessGuides: ["why-no-routine-thyroid-screening"],
  Environment: ["hpv-vaccine-prevents-six-cancers"],
  Articles: [
    "the-cancer-vaccine-hiding-in-plain-sight",
    "the-most-expensive-word-in-medicine-is-probably",
    "what-i-wish-id-known-before-my-first-mammogram",
    "five-cancer-myths-that-need-to-die",
    "how-to-read-your-own-screening-results-without-panicking",
  ],
};

async function queryAll(collectionId) {
  const json = await call("POST", "/wix-data/v2/items/query", {
    dataCollectionId: collectionId,
    query: { paging: { limit: 100 } },
  });
  return json?.dataItems ?? [];
}

async function importNewOnly(collectionId, records, allowedSlugs) {
  const before = await queryAll(collectionId);
  const beforeCount = before.length;
  const existingSlugs = new Set(before.map((it) => it.data.slug));

  const candidates = records.filter((r) => allowedSlugs.includes(r.slug));
  const toInsert = [];
  const skipped = [];

  for (const rec of candidates) {
    if (existingSlugs.has(rec.slug)) {
      skipped.push(rec.slug);
    } else {
      const { collection, ...fields } = rec;
      toInsert.push(fields);
    }
  }

  let inserted = 0,
    failed = 0;
  if (toInsert.length) {
    try {
      const res = await call("POST", "/wix-data/v2/bulk/items/insert", {
        dataCollectionId: collectionId,
        dataItems: toInsert.map((d) => ({ data: d })),
        returnEntity: false,
      });
      inserted = res?.bulkActionMetadata?.totalSuccesses ?? 0;
      failed = res?.bulkActionMetadata?.totalFailures ?? 0;
    } catch (err) {
      failed = toInsert.length;
      console.error(`  bulk insert failed for ${collectionId}: ${err.message.slice(0, 300)}`);
    }
  }

  const after = await queryAll(collectionId);
  console.log(
    `${collectionId}: before=${beforeCount}, inserted=${inserted}, skipped(dupe)=${skipped.length}, failed=${failed}, after=${after.length}`,
  );
  if (skipped.length) console.log(`  skipped (already live): ${skipped.join(", ")}`);
  return { beforeCount, inserted, failed, afterCount: after.length };
}

async function ensureArticlesCollection() {
  // Articles already exists live (confirmed via scripts/check-articles-shape.mjs)
  // — no creation needed, this is just a defensive no-op guard.
  try {
    await call("GET", "/wix-data/v2/collections/Articles");
    return true;
  } catch {
    console.log("Articles collection not found live — this script assumes it already exists.");
    return false;
  }
}

async function main() {
  console.log("== Consistency sweep: 8 new records only ==\n");
  await ensureArticlesCollection();

  const results = {};
  for (const collectionId of ["WarningSigns", "AccessGuides", "Environment", "Articles"]) {
    const records = data[collectionId] ?? [];
    results[collectionId] = await importNewOnly(collectionId, records, NEW_SLUGS[collectionId]);
  }

  console.log("\n== Summary ==");
  let totalInserted = 0;
  for (const [id, r] of Object.entries(results)) {
    totalInserted += r.inserted;
  }
  console.log(`Total newly inserted across all 4 collections: ${totalInserted} (expected 8)`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
