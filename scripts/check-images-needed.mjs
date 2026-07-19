import { execSync } from "node:child_process";
import fs from "node:fs";

const CONFIG = JSON.parse(fs.readFileSync("wix.config.json", "utf8"));
const SITE_ID = CONFIG.siteId;
const TOKEN = execSync(`npx @wix/cli@latest token --site "${SITE_ID}"`, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
}).trim();

async function call(method, path, body) {
  const res = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

let totalMissing = 0;
for (const id of ["WarningSigns", "AccessGuides", "Therapies", "Trials", "Environment", "Recovery"]) {
  const res = await call("POST", "/wix-data/v2/items/query", { dataCollectionId: id, query: { paging: { limit: 100 } } });
  const items = res.dataItems ?? [];
  const missing = items.filter((it) => !it.data.heroImage);
  totalMissing += missing.length;
  console.log(`${id}: ${items.length} total, ${missing.length} missing heroImage`);
  for (const m of missing) console.log(`   - ${m.data.slug}`);
}
console.log(`\nTotal missing: ${totalMissing}`);
