// Beyond Diagnosis — hero imagery for the 8 new Caregiver ("In Their Corner") records.
// Same pipeline as generate-remaining-images.mjs / regenerate-diverse-images.mjs:
// Wix AI (Runware) generate -> Wix Media import -> wix:image:// URI stored on the
// CMS item's heroImage field.
//
// Casting is diverse (mirrors the diversity pass already done for the other 45
// records) and every prompt depicts support/connection between two people —
// caregiver + patient — rather than a solo portrait, since this collection is
// specifically about the person standing beside someone with cancer.

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

const COLLECTION_ID = "Caregiver";

const SLOTS = [
  {
    slug: "you-just-found-out-someone-you-love-has-cancer",
    prompt: `A Black woman in her 30s embracing her mother in a quiet kitchen, both eyes closed, a tender supportive hug, soft morning light, ${STYLE_SUFFIX}`,
  },
  {
    slug: "how-to-actually-help-beyond-let-me-know-if-you-need-anything",
    prompt: `A Latino man in his 40s carrying a casserole dish and a grocery bag to a neighbor's front door, warm afternoon light, a small act of practical care, ${STYLE_SUFFIX}`,
  },
  {
    slug: "being-the-second-set-of-ears-at-appointments",
    prompt: `A White woman in her 50s sitting beside an older man in a bright clinic exam room, notebook on her lap, listening intently while he speaks with a doctor off-frame, ${STYLE_SUFFIX}`,
  },
  {
    slug: "caregiver-burnout-is-real-and-youre-not-immune",
    prompt: `An East Asian woman in her 40s sitting alone on the edge of a bed at night, hand over her tired eyes, soft lamp light, quiet exhaustion, ${STYLE_SUFFIX}`,
  },
  {
    slug: "the-logistics-no-one-hands-you-bills-records-and-coordination",
    prompt: `A South Asian man in his 50s at a kitchen table surrounded by folders and a laptop, phone to his ear, organizing paperwork, morning light, ${STYLE_SUFFIX}`,
  },
  {
    slug: "taking-care-of-yourself-without-guilt",
    prompt: `A Black woman in her 60s taking a quiet walk alone in a park, gentle peaceful expression, soft golden-hour light, a small moment of rest, ${STYLE_SUFFIX}`,
  },
  {
    slug: "when-treatment-gets-hard-being-present-through-the-worst-of-it",
    prompt: `An Indigenous woman in her 30s sitting close beside her partner on a couch, her hand resting on his, both quiet and present, warm indoor light, ${STYLE_SUFFIX}`,
  },
  {
    slug: "the-conversations-we-avoid-and-why-theyre-worth-having",
    prompt: `A Latina woman in her 40s and her elderly father sitting together at a porch table in soft evening light, a calm open conversation, hands clasped gently, ${STYLE_SUFFIX}`,
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
  if (!imageURL) throw new Error(`No imageURL for ${COLLECTION_ID}/${slot.slug}: ${JSON.stringify(json)}`);
  return imageURL;
}

async function importOne(slot, imageURL) {
  const name = `${COLLECTION_ID}-${slot.slug}.png`;
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
    dataCollectionId: COLLECTION_ID,
    query: { filter: { slug: slot.slug } },
  });
  const item = query?.dataItems?.[0];
  if (!item) throw new Error(`No item found for ${COLLECTION_ID}/${slot.slug}`);
  const merged = { ...item.data, heroImage: uri };
  await call("PUT", `/wix-data/v2/items/${item.id}`, {
    dataCollectionId: COLLECTION_ID,
    dataItem: { data: merged },
  });
}

async function processSlot(slot) {
  const label = `${COLLECTION_ID}/${slot.slug}`;
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
  for (const f of failures) console.log(` - ${COLLECTION_ID}/${f.slug}: ${f.error}`);
}
