import { execSync } from "node:child_process";
import fs from "node:fs";

const CONFIG = JSON.parse(fs.readFileSync("wix.config.json", "utf8"));
const SITE_ID = CONFIG.siteId;
const TOKEN = execSync(`npx @wix/cli@latest token --site "${SITE_ID}"`, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
}).trim();

const schemaRes = await fetch(`https://www.wixapis.com/wix-data/v2/collections/AccessGuides`, {
  headers: { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID },
});
const schema = await schemaRes.json();
const field = schema.collection.fields.find((f) => f.key === "last_reviewed");
console.log("last_reviewed field type:", field?.type);

const itemsRes = await fetch("https://www.wixapis.com/wix-data/v2/items/query", {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "wix-site-id": SITE_ID, "Content-Type": "application/json" },
  body: JSON.stringify({ dataCollectionId: "AccessGuides", query: { paging: { limit: 100 } } }),
});
const itemsJson = await itemsRes.json();
for (const it of itemsJson.dataItems) {
  console.log(it.data.slug, "->", JSON.stringify(it.data.last_reviewed));
}
