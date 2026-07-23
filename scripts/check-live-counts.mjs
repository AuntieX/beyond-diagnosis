// Ad hoc: query live Wix CMS collection counts + distinct filter values,
// used to establish "before" counts ahead of a new-records-only import.
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

async function queryAll(collectionId) {
  try {
    const json = await call("POST", "/wix-data/v2/items/query", {
      dataCollectionId: collectionId,
      query: { paging: { limit: 100 } },
    });
    return json?.dataItems ?? [];
  } catch {
    return null;
  }
}

const collections = ["WarningSigns", "AccessGuides", "Therapies", "Trials", "Environment", "Recovery", "Caregiver", "Articles"];
for (const c of collections) {
  const items = await queryAll(c);
  if (items === null) {
    console.log(`${c}: MISSING/ERROR`);
  } else {
    console.log(`${c}: ${items.length}`);
    if (c === "WarningSigns" || c === "AccessGuides") {
      const types = [...new Set(items.map((i) => i.data.cancer_type))];
      console.log(`  cancer_type values: ${types.join(" | ")}`);
    }
  }
}
