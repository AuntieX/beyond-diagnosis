// Beyond Diagnosis — full content library import (45 records).
// Reads beyond_diagnosis_seed_data.json, migrates the WarningSigns/AccessGuides
// schemas (adds life_stage + pillar; fixes last_reviewed from DATE -> TEXT),
// creates the four new collections (Therapies, Trials, Environment, Recovery),
// then de-dupes and imports every record.
//
// The 3 WarningSigns + 3 AccessGuides seeded earlier used different (placeholder)
// slugs than this authoritative JSON for the SAME concepts (e.g. our
// "persistent-bloating-ovarian-cancer" vs the JSON's "persistent-bloating-that-wont-quit").
// A literal slug-match dedupe would therefore insert duplicates. CONCEPT_MAP below
// maps old-slug -> new-slug so those 6 existing items get UPDATED in place (keeping
// their _id and any already-attached heroImage) instead of being duplicated.

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

async function callOk(method, path, body) {
  try {
    return await call(method, path, body);
  } catch (err) {
    console.log(`  (skip) ${method} ${path}: ${err.message.slice(0, 160)}`);
    return null;
  }
}

const data = JSON.parse(fs.readFileSync("beyond_diagnosis_seed_data.json", "utf8"));

// ---------- STEP 1: schema migration ----------
async function migrateSchema() {
  console.log("\n== Schema migration ==");
  for (const collectionId of ["WarningSigns", "AccessGuides"]) {
    await callOk("POST", "/wix-data/v2/collections/create-field", {
      dataCollectionId: collectionId,
      field: { key: "life_stage", displayName: "Life Stage", type: "TEXT" },
    });
    await callOk("POST", "/wix-data/v2/collections/create-field", {
      dataCollectionId: collectionId,
      field: { key: "pillar", displayName: "Pillar", type: "TEXT" },
    });
  }
  // last_reviewed was created as DATE; the JSON ships "July 2026" (a text label) — recreate as TEXT.
  await callOk("POST", "/wix-data/v2/collections/delete-field", {
    dataCollectionId: "AccessGuides",
    fieldKey: "last_reviewed",
  });
  await callOk("POST", "/wix-data/v2/collections/create-field", {
    dataCollectionId: "AccessGuides",
    field: { key: "last_reviewed", displayName: "Last Reviewed", type: "TEXT" },
  });
  console.log("Schema migration done.");
}

// ---------- STEP 2: create new collections ----------
const NEW_COLLECTIONS = ["Therapies", "Trials", "Environment", "Recovery"];

function sharedFields() {
  return [
    { key: "title", displayName: "Title", type: "TEXT" },
    { key: "slug", displayName: "Slug", type: "TEXT" },
    { key: "life_stage", displayName: "Life Stage", type: "TEXT" },
    { key: "pillar", displayName: "Pillar", type: "TEXT" },
    { key: "cancer_tags", displayName: "Cancer Tags", type: "TEXT" },
    { key: "intro", displayName: "Intro", type: "TEXT" },
    { key: "body", displayName: "Body", type: "RICH_TEXT" },
    { key: "heroImage", displayName: "Hero Image", type: "IMAGE" },
  ];
}

async function createNewCollections() {
  console.log("\n== Create new collections ==");
  for (const id of NEW_COLLECTIONS) {
    const res = await callOk("POST", "/wix-data/v2/collections", {
      collection: {
        id,
        displayName: id,
        fields: sharedFields(),
        permissions: { insert: "ADMIN", update: "ADMIN", remove: "ADMIN", read: "ANYONE" },
      },
    });
    console.log(res ? `Created ${id}` : `${id} (already exists or failed — see above)`);
  }
}

// ---------- STEP 3: concept-based dedupe + import ----------
const CONCEPT_MAP = {
  WarningSigns: {
    "persistent-bloating-ovarian-cancer": "persistent-bloating-that-wont-quit",
    "blood-in-stool-colorectal-cancer": "rectal-bleeding-under-50",
    "nipple-changes-breast-cancer": "nipple-discharge-that-isnt-breastmilk",
  },
  AccessGuides: {
    "mammogram-without-referral": "get-your-mammogram-fully-covered-yes-really",
    "colonoscopy-covered-under-45": "get-your-colonoscopy-fully-covered",
    "genetic-counseling-insurance-denial": "genetic-testing-brca-lynch-when-its-covered",
  },
};

async function queryAll(collectionId) {
  const json = await call("POST", "/wix-data/v2/items/query", { dataCollectionId: collectionId, query: { paging: { limit: 100 } } });
  return json?.dataItems ?? [];
}

async function importCollection(collectionId, records) {
  console.log(`\n== ${collectionId} (${records.length} records in JSON) ==`);
  const existing = await queryAll(collectionId);
  const conceptMap = CONCEPT_MAP[collectionId] ?? {};
  const newSlugToOldItem = new Map();
  for (const [oldSlug, newSlug] of Object.entries(conceptMap)) {
    const oldItem = existing.find((it) => it.data.slug === oldSlug);
    if (oldItem) newSlugToOldItem.set(newSlug, oldItem);
  }
  const existingBySlug = new Map(existing.map((it) => [it.data.slug, it]));

  let updated = 0,
    inserted = 0,
    failed = 0;
  const toInsert = [];

  for (const rec of records) {
    const { collection, ...fields } = rec;
    const target = newSlugToOldItem.get(fields.slug) ?? existingBySlug.get(fields.slug);
    if (target) {
      try {
        const merged = { ...target.data, ...fields }; // keep _id + any already-attached heroImage; overwrite text/content fields
        await call("PUT", `/wix-data/v2/items/${target.id}`, {
          dataCollectionId: collectionId,
          dataItem: { data: merged },
        });
        updated++;
        process.stdout.write("u");
      } catch (err) {
        failed++;
        console.error(`\n  update failed ${fields.slug}: ${err.message.slice(0, 200)}`);
      }
    } else {
      toInsert.push(fields);
    }
  }

  if (toInsert.length) {
    try {
      const res = await call("POST", "/wix-data/v2/bulk/items/insert", {
        dataCollectionId: collectionId,
        dataItems: toInsert.map((data) => ({ data })),
        returnEntity: false,
      });
      inserted += res?.bulkActionMetadata?.totalSuccesses ?? 0;
      failed += res?.bulkActionMetadata?.totalFailures ?? 0;
      process.stdout.write(".".repeat(inserted));
    } catch (err) {
      failed += toInsert.length;
      console.error(`\n  bulk insert failed: ${err.message.slice(0, 300)}`);
    }
  }

  console.log(`\n  ${collectionId}: ${updated} updated, ${inserted} inserted, ${failed} failed`);
  return { updated, inserted, failed };
}

async function verify(collectionId, expectedCount) {
  const items = await queryAll(collectionId);
  const ok = items.length === expectedCount;
  console.log(`  verify ${collectionId}: ${items.length}/${expectedCount} items ${ok ? "OK" : "MISMATCH"}`);
  return items.length;
}

async function main() {
  await migrateSchema();
  await createNewCollections();

  const results = {};
  for (const collectionId of ["WarningSigns", "AccessGuides", "Therapies", "Trials", "Environment", "Recovery"]) {
    if (!data[collectionId]?.length) continue;
    results[collectionId] = await importCollection(collectionId, data[collectionId]);
  }

  console.log("\n== Verification ==");
  const expected = { WarningSigns: 16, AccessGuides: 13, Therapies: 5, Trials: 1, Environment: 5, Recovery: 5 };
  let total = 0;
  for (const [id, count] of Object.entries(expected)) {
    total += await verify(id, count);
  }
  console.log(`\nTotal records across all 6 collections: ${total}/45`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
