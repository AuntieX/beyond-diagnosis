// Retries only the slots that failed on the previous run (428 "not eligible for
// credits") with lower concurrency, in case it was a burst-rate limit rather
// than a hard quota cap.
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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

const STYLE_SUFFIX =
  "warm natural light, editorial photography style, film grain texture, shallow depth of field, real skin texture with no filter, candid documentary feel, no stock photography look, realistic age-appropriate features (not a young face with gray hair), no text, no watermarks";
const WIDTH = 1376;
const HEIGHT = 768;

const FAILED_SLOTS = [
  { collectionId: "Therapies", slug: "the-chemo-day-bag-what-to-actually-bring", prompt: `A Latina woman in her 50s packing a tote bag at home, morning light, calm focused expression, ${STYLE_SUFFIX}` },
  { collectionId: "Therapies", slug: "managing-the-side-effects-nobody-prepares-you-for", prompt: `A Black man in his 50s resting on a couch at home, blanket nearby, contemplative expression, soft light, ${STYLE_SUFFIX}` },
  { collectionId: "Therapies", slug: "getting-a-second-opinion-at-a-major-cancer-center", prompt: `An East Asian man in his 60s in a bright clinic waiting area, composed and resolute expression, ${STYLE_SUFFIX}` },
  { collectionId: "Therapies", slug: "fertility-preservation-before-treatment-starts", prompt: `An East Asian woman in her mid-30s sitting by a window, hand resting thoughtfully on her abdomen, calm resolute expression, ${STYLE_SUFFIX}` },
  { collectionId: "Trials", slug: "finding-a-clinical-trial-the-search-most-people-never-do", prompt: `A Latino man in his 50s at a laptop at home, focused and determined expression, warm indoor light, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "radon-the-2-cause-of-lung-cancer-youve-never-tested-for", prompt: `A White man in his 50s in a basement holding a small testing device, curious focused expression, natural light from a window, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "water-filters-what-actually-removes-carcinogens", prompt: `A Black woman in her 40s filling a glass of water at a kitchen sink, morning light, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "air-filters-hepa-vocs-and-wildfire-smoke", prompt: `A South Asian woman in her 40s near a window at home, soft hazy light suggesting air quality awareness, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "everyday-carcinogens-you-can-actually-avoid", prompt: `A Latina woman in her 30s in a kitchen reading a product label, morning light, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "family-history-and-genetic-risk-mapping-your-inheritance", prompt: `Two Black women, one in her 50s and one in her 70s, sitting together at a table looking at a family photo album, warm light, ${STYLE_SUFFIX}` },
  { collectionId: "Recovery", slug: "rebuilding-muscle-and-balance-after-treatment", prompt: `A Black woman in her 50s doing gentle stretching in a sunlit living room, calm peaceful expression, ${STYLE_SUFFIX}` },
  { collectionId: "Recovery", slug: "rebuilding-cardio-and-lung-capacity", prompt: `A White man in his 60s walking outdoors on a quiet path, morning light, calm expression, ${STYLE_SUFFIX}` },
  { collectionId: "Recovery", slug: "eating-for-recovery-antioxidants-tart-cherry-and-what-the-evidence-says", prompt: `A Latina woman in her 40s at a kitchen counter preparing a bowl of fruit, warm morning light, ${STYLE_SUFFIX}` },
  { collectionId: "Recovery", slug: "sleep-and-your-recovery-environment", prompt: `An Indigenous woman in her 50s in a calm bedroom adjusting curtains for soft morning light, peaceful expression, ${STYLE_SUFFIX}` },
  { collectionId: "Recovery", slug: "the-mental-and-emotional-recovery-no-one-schedules", prompt: `An East Asian woman in her 40s sitting quietly by a window with a cup of tea, gentle contemplative expression, ${STYLE_SUFFIX}` },
];

function toWixImageUri(fileId, width, height) {
  const name = encodeURIComponent(fileId.replace(/~mv2\.(png|jpg|jpeg)$/i, ".$1"));
  return `wix:image://v1/${fileId}/${name}#originWidth=${width}&originHeight=${height}`;
}

async function generateOne(slot) {
  const taskUUID = randomUUID();
  const body = [
    { taskType: "imageInference", taskUUID, outputType: "URL", outputFormat: "PNG", positivePrompt: slot.prompt, width: WIDTH, height: HEIGHT, model: "google:4@2", numberResults: 1 },
  ];
  const json = await call("POST", "/runwareschemaless/v1/request", body);
  const imageURL = json?.data?.[0]?.imageURL;
  if (!imageURL) throw new Error(`No imageURL for ${slot.collectionId}/${slot.slug}: ${JSON.stringify(json)}`);
  return imageURL;
}

async function importOne(slot, imageURL) {
  const name = `${slot.collectionId}-${slot.slug}.png`;
  const json = await call("POST", "/site-media/v1/files/import", { url: imageURL, mimeType: "image/png", displayName: name });
  const fileId = json?.file?.id;
  if (!fileId) throw new Error(`No file.id for ${name}: ${JSON.stringify(json)}`);
  return toWixImageUri(fileId, WIDTH, HEIGHT);
}

async function attachCms(slot, uri) {
  const query = await call("POST", "/wix-data/v2/items/query", { dataCollectionId: slot.collectionId, query: { filter: { slug: slot.slug } } });
  const item = query?.dataItems?.[0];
  if (!item) throw new Error(`No item found for ${slot.collectionId}/${slot.slug}`);
  const merged = { ...item.data, heroImage: uri };
  await call("PUT", `/wix-data/v2/items/${item.id}`, { dataCollectionId: slot.collectionId, dataItem: { data: merged } });
}

async function processSlot(slot) {
  const label = `${slot.collectionId}/${slot.slug}`;
  try {
    const imageURL = await generateOne(slot);
    const uri = await importOne(slot, imageURL);
    await attachCms(slot, uri);
    console.log(`OK   ${label}`);
    return { ...slot, ok: true };
  } catch (err) {
    console.error(`FAIL ${label}: ${err.message.slice(0, 200)}`);
    return { ...slot, ok: false, error: err.message };
  }
}

const results = [];
for (const slot of FAILED_SLOTS) {
  results.push(await processSlot(slot));
  await new Promise((r) => setTimeout(r, 2000));
}

const failures = results.filter((r) => !r.ok);
console.log(`\n${results.length - failures.length}/${results.length} images generated + attached.`);
if (failures.length) {
  console.log("Still failing:");
  for (const f of failures) console.log(` - ${f.collectionId}/${f.slug}: ${f.error.slice(0, 150)}`);
}
