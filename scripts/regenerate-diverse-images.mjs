// Diversity-pass regeneration of hero imagery for Beyond Diagnosis.
// Replaces the initial hero images (which were predominantly white women) with
// explicitly diverse casting per user direction — the site covers cancers across
// all genders/races, and its gaslighting-advocacy mission disproportionately
// concerns Black women, Latinas, Indigenous women, and Black men.
//
// Mints its own token via the Wix CLI (never printed / never persisted to disk),
// generates via Wix AI (Runware), imports into Wix Media, and stores each image as
// a wix:image:// URI directly (so the SDK serves correctly resized, next-gen-format
// images — see scripts/fix-image-uris.mjs for why raw https URLs were wrong).

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

function headers() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "wix-site-id": SITE_ID,
    "Content-Type": "application/json",
  };
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (res.status >= 300) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

const STYLE_SUFFIX =
  "warm natural light, editorial photography style, film grain texture, shallow depth of field, real skin texture with no filter, candid documentary feel, no stock photography look, realistic age-appropriate features (not a young face with gray hair), no text, no watermarks";

const SLOTS = [
  {
    kind: "homepage",
    prompt: `A Black woman in her 50s reading a book by a window in warm morning light, wearing a sage green sweater, ${STYLE_SUFFIX}`,
    width: 1200,
    height: 896,
  },
  {
    kind: "cms",
    collectionId: "WarningSigns",
    slug: "persistent-bloating-ovarian-cancer",
    prompt: `A South Asian woman in her 50s sitting in a chair, hand resting on her abdomen, contemplative expression, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "WarningSigns",
    slug: "blood-in-stool-colorectal-cancer",
    prompt: `A Latino man in his 50s sitting on a couch holding a mug, warm morning light, thoughtful expression, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "WarningSigns",
    slug: "nipple-changes-breast-cancer",
    prompt: `A Black woman in her 40s in a bedroom, adjusting a scarf, natural morning light, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "AccessGuides",
    slug: "colonoscopy-covered-under-45",
    prompt: `A Black woman at a kitchen table, warm home setting, notebook and phone nearby, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "AccessGuides",
    slug: "mammogram-without-referral",
    prompt: `A Latina woman on the phone at home, warm home setting, calm and determined expression, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "AccessGuides",
    slug: "genetic-counseling-insurance-denial",
    prompt: `Two women, one Black and one Latina, sitting together at a small table in warm supportive conversation, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "Articles",
    slug: "youre-too-young-dangerous-sentence",
    prompt: `An East Asian woman in her mid-30s by a window, looking directly at the camera with quiet determination, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "Articles",
    slug: "what-i-wish-i-knew-before-biopsy",
    prompt: `A Latina woman in her 40s sitting calmly in a bright clinic hallway, resilient and composed expression, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "Articles",
    slug: "five-minute-symptom-log",
    prompt: `A Black woman in her 40s writing in a journal at a kitchen table in the morning, cup of tea nearby, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
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
      width: slot.width,
      height: slot.height,
      model: "google:4@2",
      numberResults: 1,
    },
  ];
  const json = await call("POST", "/runwareschemaless/v1/request", body);
  const imageURL = json?.data?.[0]?.imageURL;
  if (!imageURL) throw new Error(`No imageURL for ${slot.slug ?? slot.kind}: ${JSON.stringify(json)}`);
  return imageURL;
}

async function importOne(slot, imageURL) {
  const name = `${slot.collectionId ?? "homepage"}-${slot.slug ?? "hero"}-v2.png`;
  const json = await call("POST", "/site-media/v1/files/import", {
    url: imageURL,
    mimeType: "image/png",
    displayName: name,
  });
  const fileId = json?.file?.id;
  if (!fileId) throw new Error(`No file.id for ${name}: ${JSON.stringify(json)}`);
  return toWixImageUri(fileId, slot.width, slot.height);
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
  return item.id;
}

async function processSlot(slot) {
  const label = slot.kind === "homepage" ? "homepage hero" : `${slot.collectionId}/${slot.slug}`;
  try {
    const imageURL = await generateOne(slot);
    const uri = await importOne(slot, imageURL);
    if (slot.kind === "cms") {
      await attachCms(slot, uri);
    }
    console.log(`OK   ${label}`);
    return { ...slot, uri, ok: true };
  } catch (err) {
    console.error(`FAIL ${label}: ${err.message}`);
    return { ...slot, ok: false, error: err.message };
  }
}

const results = await Promise.all(SLOTS.map(processSlot));

const homepage = results.find((r) => r.kind === "homepage" && r.ok);
if (homepage) {
  fs.writeFileSync(
    "src/lib/site-images.ts",
    `// Generated by scripts/regenerate-diverse-images.mjs — Wix AI hero image, imported to Wix Media.\nexport const HOMEPAGE_HERO_URL = ${JSON.stringify(homepage.uri)};\n`,
  );
  console.log("Wrote src/lib/site-images.ts");
}

const failures = results.filter((r) => !r.ok);
console.log(`\n${results.length - failures.length}/${results.length} images generated + attached.`);
if (failures.length) {
  console.log("Failed slots (left on previous image):");
  for (const f of failures) console.log(` - ${f.kind === "homepage" ? "homepage" : `${f.collectionId}/${f.slug}`}: ${f.error}`);
}
