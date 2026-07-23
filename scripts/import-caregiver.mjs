// Beyond Diagnosis — Caregiver path import (8 records).
// Reads beyond_diagnosis_seed_data.json's "Caregiver" key, creates the
// Caregiver collection (same shared schema as Therapies/Trials/Environment/
// Recovery), then de-dupes by slug and imports every record.
//
// Mirrors scripts/import-full-library.mjs exactly, scoped to just this one
// new collection so re-runs are cheap and safe (idempotent update-by-slug).

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

const COLLECTION_ID = "Caregiver";

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

async function createCollection() {
  console.log("\n== Create Caregiver collection ==");
  const res = await callOk("POST", "/wix-data/v2/collections", {
    collection: {
      id: COLLECTION_ID,
      displayName: COLLECTION_ID,
      fields: sharedFields(),
      permissions: { insert: "ADMIN", update: "ADMIN", remove: "ADMIN", read: "ANYONE" },
    },
  });
  console.log(res ? `Created ${COLLECTION_ID}` : `${COLLECTION_ID} (already exists or failed — see above)`);
}

async function queryAll(collectionId) {
  const json = await call("POST", "/wix-data/v2/items/query", {
    dataCollectionId: collectionId,
    query: { paging: { limit: 100 } },
  });
  return json?.dataItems ?? [];
}

async function importCollection(collectionId, records) {
  console.log(`\n== ${collectionId} (${records.length} records in JSON) ==`);
  const existing = await queryAll(collectionId);
  const existingBySlug = new Map(existing.map((it) => [it.data.slug, it]));

  let updated = 0,
    inserted = 0,
    failed = 0;
  const toInsert = [];

  for (const rec of records) {
    const { collection, ...fields } = rec;
    const target = existingBySlug.get(fields.slug);
    if (target) {
      try {
        const merged = { ...target.data, ...fields }; // keep _id + any already-attached heroImage
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
  if (!data[COLLECTION_ID]?.length) {
    console.error(`No "${COLLECTION_ID}" key found in beyond_diagnosis_seed_data.json — nothing to import.`);
    process.exit(1);
  }

  await createCollection();
  await new Promise((res) => setTimeout(res, 1500));

  await importCollection(COLLECTION_ID, data[COLLECTION_ID]);

  console.log("\n== Verification ==");
  await verify(COLLECTION_ID, data[COLLECTION_ID].length);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
