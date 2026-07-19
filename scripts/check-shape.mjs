const TOKEN = process.env.TOKEN;
const SITE_ID = process.env.SITE_ID;
const res = await fetch("https://www.wixapis.com/wix-data/v2/items/query", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "wix-site-id": SITE_ID,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ dataCollectionId: "WarningSigns" }),
});
const json = await res.json();
const item = json.dataItems?.[0]?.data;
console.log("description field type:", typeof item.description);
console.log("description value:", JSON.stringify(item.description).slice(0, 300));
