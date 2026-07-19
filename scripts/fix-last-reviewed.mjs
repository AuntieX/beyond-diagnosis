// Fixes a race condition from import-full-library.mjs: delete-field then create-field
// for AccessGuides.last_reviewed ran back-to-back and the recreate lost the race
// ("already exists" on a stale read), so the field ended up deleted entirely and
// every item's last_reviewed came back undefined. Recreate the field as TEXT and
// re-populate every item from the JSON source of truth.

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
    headers: { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" },
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

async function ensureField() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await call("POST", "/wix-data/v2/collections/create-field", {
        dataCollectionId: "AccessGuides",
        field: { key: "last_reviewed", displayName: "Last Reviewed", type: "TEXT" },
      });
      console.log("Field created.");
      return;
    } catch (err) {
      console.log(`attempt ${attempt}: ${err.message.slice(0, 150)}`);
      if (err.message.includes("already exists")) {
        console.log("Field already exists — proceeding.");
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

await ensureField();

const data = JSON.parse(fs.readFileSync("beyond_diagnosis_seed_data.json", "utf8"));
const byslug = new Map(data.AccessGuides.map((r) => [r.slug, r.last_reviewed]));

const itemsRes = await call("POST", "/wix-data/v2/items/query", {
  dataCollectionId: "AccessGuides",
  query: { paging: { limit: 100 } },
});

let fixed = 0;
for (const it of itemsRes.dataItems) {
  const lastReviewed = byslug.get(it.data.slug) ?? "July 2026";
  const merged = { ...it.data, last_reviewed: lastReviewed };
  await call("PUT", `/wix-data/v2/items/${it.id}`, {
    dataCollectionId: "AccessGuides",
    dataItem: { data: merged },
  });
  fixed++;
  process.stdout.write(".");
}
console.log(`\nFixed ${fixed} AccessGuides items.`);

const verifyRes = await call("POST", "/wix-data/v2/items/query", {
  dataCollectionId: "AccessGuides",
  query: { paging: { limit: 100 } },
});
const missing = verifyRes.dataItems.filter((it) => !it.data.last_reviewed);
console.log(`Verify: ${verifyRes.dataItems.length - missing.length}/${verifyRes.dataItems.length} have last_reviewed set.`);
