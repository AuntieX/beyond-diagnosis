// Beyond Diagnosis — hero imagery for the 8 new consistency-sweep records
// (Thyroid WarningSigns + AccessGuides, HPV Environment, 5 new Articles).
// Same pipeline as generate-caregiver-images.mjs: Wix AI (Runware) generate ->
// Wix Media import -> wix:image:// URI stored on the CMS item's heroImage field.

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
  "warm natural light, editorial photography style, film grain texture, shallow depth of field, real skin texture with no filter, candid documentary feel, no stock photography look, realistic age-appropriate features, no text, no watermarks";

const WIDTH = 1376;
const HEIGHT = 768;

const SLOTS = [
  {
    collectionId: "WarningSigns",
    slug: "neck-lump-voice-change-thyroid",
    prompt: `A Middle Eastern woman in her 40s gently touching the front of her own neck with a thoughtful, calm expression, standing in a softly lit bathroom in front of a mirror, ${STYLE_SUFFIX}`,
  },
  {
    collectionId: "AccessGuides",
    slug: "why-no-routine-thyroid-screening",
    prompt: `A calm doctor and a South Asian woman patient in her 50s having a relaxed conversation in a bright clinic office, doctor gesturing while explaining, no anxiety, reassuring tone, ${STYLE_SUFFIX}`,
  },
  {
    collectionId: "Environment",
    slug: "hpv-vaccine-prevents-six-cancers",
    prompt: `A Black father in his 40s sitting beside his teenage daughter in a pediatrician's office, daughter rolling up her sleeve, nurse preparing a vaccine off to the side, warm reassuring mood, ${STYLE_SUFFIX}`,
  },
  {
    collectionId: "Articles",
    slug: "the-cancer-vaccine-hiding-in-plain-sight",
    prompt: `A close-up of a vaccine vial and syringe on a clean clinic tray with soft natural window light behind, shallow depth of field, ${STYLE_SUFFIX}`,
  },
  {
    collectionId: "Articles",
    slug: "the-most-expensive-word-in-medicine-is-probably",
    prompt: `A White woman in her 60s sitting across from a doctor in an exam room, leaning forward attentively mid-question, doctor listening, ${STYLE_SUFFIX}`,
  },
  {
    collectionId: "Articles",
    slug: "what-i-wish-id-known-before-my-first-mammogram",
    prompt: `A Latina woman in her 40s sitting in a bright hospital waiting area, hands folded calmly in her lap, soft daylight through large windows, ${STYLE_SUFFIX}`,
  },
  {
    collectionId: "Articles",
    slug: "five-cancer-myths-that-need-to-die",
    prompt: `An East Asian man in his 50s and a Black woman in her 40s in easy conversation at a kitchen table with coffee cups, mid-laugh, myth-busting casual chat mood, morning light, ${STYLE_SUFFIX}`,
  },
  {
    collectionId: "Articles",
    slug: "how-to-read-your-own-screening-results-without-panicking",
    prompt: `A White man in his 50s looking calmly at a smartphone at his kitchen table, relaxed posture, soft morning light, no alarm in his expression, ${STYLE_SUFFIX}`,
  },
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
