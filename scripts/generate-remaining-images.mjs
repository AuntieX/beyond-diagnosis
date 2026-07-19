// Beyond Diagnosis — imagery pass for the 39 records that don't have a hero image
// yet (the 6 records + homepage from the first diversity pass already carried
// their images through the content import). Casting is planned deliberately so
// the FULL ~46-image set (45 records + homepage) ends up balanced across Black,
// Latina, White, East Asian, South Asian, and Indigenous women, plus mixed-race
// men — while still leaning into the site's stated mission that gaslighting in
// medicine disproportionately affects Black women, Latinas, Indigenous women,
// and Black men (per user direction in the original diversity-pass request).
//
// Same pipeline as regenerate-diverse-images.mjs: Wix AI (Runware) generate ->
// Wix Media import -> wix:image:// URI stored directly on the CMS item.

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

const STYLE_SUFFIX =
  "warm natural light, editorial photography style, film grain texture, shallow depth of field, real skin texture with no filter, candid documentary feel, no stock photography look, realistic age-appropriate features (not a young face with gray hair), no text, no watermarks";

const WIDTH = 1376;
const HEIGHT = 768;

const SLOTS = [
  // ---- WarningSigns (13) ----
  { collectionId: "WarningSigns", slug: "a-new-lump-thickening-or-dimpling", prompt: `A Latina woman in her 60s standing at a mirror in soft morning light, thoughtful expression, wearing a robe, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "sudden-change-in-bowel-habits", prompt: `A White man in his 60s at a kitchen table with morning coffee, contemplative expression, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "the-abcde-of-a-suspicious-mole", prompt: `A Black woman in her 40s outdoors in natural light, examining her forearm, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "a-sore-that-wont-heal", prompt: `An East Asian woman in her 50s at a window in soft light, thoughtful expression, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "a-cough-that-wont-quit", prompt: `An Indigenous woman in her 60s sitting on a porch wrapped in a shawl, warm afternoon light, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "chest-pain-that-changes-with-breathing", prompt: `A Black man in his 60s sitting in an armchair, hand resting near his chest, warm indoor light, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "urinary-changes-over-50", prompt: `A Latino man in his mid-50s in a kitchen holding a coffee mug, morning light, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "blood-in-urine-or-semen", prompt: `A Black man in his mid-60s sitting thoughtfully indoors, warm natural light, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "bleeding-between-periods-or-after-sex", prompt: `A Latina woman in her 40s standing at a window in soft afternoon light, thoughtful expression, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "unusual-vaginal-discharge", prompt: `A Black woman in her mid-30s indoors in natural morning light, calm expression, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "feeling-full-quickly-early-satiety", prompt: `A White woman in her 50s at a dining table, gently pushing a plate aside, thoughtful expression, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "new-onset-diabetes-after-50", prompt: `A South Asian man in his mid-50s in a kitchen in morning light, thoughtful expression, ${STYLE_SUFFIX}` },
  { collectionId: "WarningSigns", slug: "painless-jaundice", prompt: `A White woman in her 60s in warm indoor light, gentle expression, ${STYLE_SUFFIX}` },

  // ---- AccessGuides (10) ----
  { collectionId: "AccessGuides", slug: "get-a-skin-check-without-insurance", prompt: `A Black man in his 50s sitting on a porch, phone in hand, warm afternoon light, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "get-a-pap-smear-and-hpv-test-at-zero-cost", prompt: `A Latina woman in her 30s at a kitchen counter, phone in hand, calm determined expression, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "low-dose-ct-lung-screening-who-qualifies-free", prompt: `A White man in his 60s reviewing paperwork at a table, morning light, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "psa-testing-when-your-doctor-wont-order-it", prompt: `A Black man in his late 50s sitting at a desk with a notepad, warm indoor light, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "appealing-a-denied-diagnostic-mammogram", prompt: `An East Asian woman in her 40s at a home desk, writing a letter, focused expression, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "hsa-and-fsa-money-you-didnt-know-you-could-use", prompt: `A Latina woman in her 40s at a kitchen table with a calculator and papers, morning light, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "no-insurance-cancer-screening-the-real-list", prompt: `A Black woman in her 50s at a community center table, reviewing a folder, warm light, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "getting-a-second-opinion-without-your-first-doctor-knowing", prompt: `A White woman in her 50s on the phone at home, composed expression, soft window light, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "dense-breasts-do-you-qualify-for-free-supplemental-imaging", prompt: `A South Asian woman in her 40s reading a letter at home, thoughtful expression, ${STYLE_SUFFIX}` },
  { collectionId: "AccessGuides", slug: "when-the-aca-rule-is-your-best-friend-section-2713", prompt: `An Indigenous woman in her 50s at a kitchen table with a laptop, warm morning light, ${STYLE_SUFFIX}` },

  // ---- Therapies (5) — During, fierce ----
  { collectionId: "Therapies", slug: "cold-caps-and-scalp-cooling-keeping-your-hair-through-chemo", prompt: `A Black woman in her 40s at home wrapping a soft scarf around her head, gentle determined expression, warm light, ${STYLE_SUFFIX}` },
  { collectionId: "Therapies", slug: "the-chemo-day-bag-what-to-actually-bring", prompt: `A Latina woman in her 50s packing a tote bag at home, morning light, calm focused expression, ${STYLE_SUFFIX}` },
  { collectionId: "Therapies", slug: "managing-the-side-effects-nobody-prepares-you-for", prompt: `A Black man in his 50s resting on a couch at home, blanket nearby, contemplative expression, soft light, ${STYLE_SUFFIX}` },
  { collectionId: "Therapies", slug: "getting-a-second-opinion-at-a-major-cancer-center", prompt: `An East Asian man in his 60s in a bright clinic waiting area, composed and resolute expression, ${STYLE_SUFFIX}` },
  { collectionId: "Therapies", slug: "fertility-preservation-before-treatment-starts", prompt: `An East Asian woman in her mid-30s sitting by a window, hand resting thoughtfully on her abdomen, calm resolute expression, ${STYLE_SUFFIX}` },

  // ---- Trials (1) — During, fierce ----
  { collectionId: "Trials", slug: "finding-a-clinical-trial-the-search-most-people-never-do", prompt: `A Latino man in his 50s at a laptop at home, focused and determined expression, warm indoor light, ${STYLE_SUFFIX}` },

  // ---- Environment (5) — Before, practical ----
  { collectionId: "Environment", slug: "radon-the-2-cause-of-lung-cancer-youve-never-tested-for", prompt: `A White man in his 50s in a basement holding a small testing device, curious focused expression, natural light from a window, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "water-filters-what-actually-removes-carcinogens", prompt: `A Black woman in her 40s filling a glass of water at a kitchen sink, morning light, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "air-filters-hepa-vocs-and-wildfire-smoke", prompt: `A South Asian woman in her 40s near a window at home, soft hazy light suggesting air quality awareness, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "everyday-carcinogens-you-can-actually-avoid", prompt: `A Latina woman in her 30s in a kitchen reading a product label, morning light, ${STYLE_SUFFIX}` },
  { collectionId: "Environment", slug: "family-history-and-genetic-risk-mapping-your-inheritance", prompt: `Two Black women, one in her 50s and one in her 70s, sitting together at a table looking at a family photo album, warm light, ${STYLE_SUFFIX}` },

  // ---- Recovery (5) — After, gentle ----
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
    {
      taskType: "imageInference",
      taskUUID,
      outputType: "URL",
      outputFormat: "PNG",
      positivePrompt: slot.prompt,
      width: WIDTH,
      height: HEIGHT,
      model: "google:4@2",
      numberResults: 1,
    },
  ];
  const json = await call("POST", "/runwareschemaless/v1/request", body);
  const imageURL = json?.data?.[0]?.imageURL;
  if (!imageURL) throw new Error(`No imageURL for ${slot.collectionId}/${slot.slug}: ${JSON.stringify(json)}`);
  return imageURL;
}

async function importOne(slot, imageURL) {
  const name = `${slot.collectionId}-${slot.slug}.png`;
  const json = await call("POST", "/site-media/v1/files/import", {
    url: imageURL,
    mimeType: "image/png",
    displayName: name,
  });
  const fileId = json?.file?.id;
  if (!fileId) throw new Error(`No file.id for ${name}: ${JSON.stringify(json)}`);
  return toWixImageUri(fileId, WIDTH, HEIGHT);
}

async function attachCms(slot, uri) {
  const query = await call("POST", "/wix-data/v2/items/query", {
    dataCollectionId: slot.collectionId,
    query: { filter: { slug: slot.slug } },
  });
  const item = query?.dataItems?.[0];
  if (!item) throw new Error(`No item found for ${slot.collectionId}/${slot.slug}`);
  const merged = { ...item.data, heroImage: uri };
  await call("PUT", `/wix-data/v2/items/${item.id}`, {
    dataCollectionId: slot.collectionId,
    dataItem: { data: merged },
  });
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

// Batch to avoid hammering the Runware/media-import APIs with 39 concurrent requests.
async function processInBatches(items, batchSize) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`\n--- batch ${i / batchSize + 1} (${batch.length} slots) ---`);
    const batchResults = await Promise.all(batch.map(processSlot));
    results.push(...batchResults);
  }
  return results;
}

const results = await processInBatches(SLOTS, 6);

const failures = results.filter((r) => !r.ok);
console.log(`\n${results.length - failures.length}/${results.length} images generated + attached.`);
if (failures.length) {
  console.log("Failed slots:");
  for (const f of failures) console.log(` - ${f.collectionId}/${f.slug}: ${f.error}`);
}
