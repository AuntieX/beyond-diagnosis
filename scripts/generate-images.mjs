// One-time hero image generation for Beyond Diagnosis.
// Mints its own token via the Wix CLI (never printed / never persisted to disk),
// generates a brand-contextual image per slot via Wix AI (Runware), imports each
// into Wix Media, then attaches it: CMS items get a read-merge-PUT of their
// heroImage field; the homepage hero URL is written to src/lib/site-images.ts.

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
  "warm natural light, editorial magazine photography, muted cream, terracotta and sage color palette, real person, candid, subtle film grain, no text, no watermarks";

const SLOTS = [
  {
    kind: "homepage",
    prompt: `A woman in her mid-40s sitting by a sunlit window at home, reading calmly with a warm mug nearby, ${STYLE_SUFFIX}`,
    width: 1200,
    height: 896,
  },
  {
    kind: "cms",
    collectionId: "WarningSigns",
    slug: "persistent-bloating-ovarian-cancer",
    prompt: `An editorial portrait of a woman in her 50s at home, thoughtful and calm expression, hand resting gently on her abdomen, soft morning light, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "WarningSigns",
    slug: "blood-in-stool-colorectal-cancer",
    prompt: `An editorial portrait of a man in his mid-40s in a quiet reflective moment at home in the morning, warm domestic setting, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "WarningSigns",
    slug: "nipple-changes-breast-cancer",
    prompt: `A tasteful, discreet editorial portrait of a woman in her 40s getting dressed in soft morning light near a window, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "AccessGuides",
    slug: "colonoscopy-covered-under-45",
    prompt: `A calm woman in her early 40s on the phone with a healthcare provider at her kitchen table, notebook open, warm morning light, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "AccessGuides",
    slug: "mammogram-without-referral",
    prompt: `A confident woman in her 50s in a clinic waiting room, calm and composed expression, natural light through large windows, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "AccessGuides",
    slug: "genetic-counseling-insurance-denial",
    prompt: `A warm supportive conversation between a woman in her 30s and a counselor across a small table, soft natural light, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "Articles",
    slug: "youre-too-young-dangerous-sentence",
    prompt: `A woman in her mid-30s looking directly at the camera with quiet determination, editorial portrait, soft window light, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "Articles",
    slug: "what-i-wish-i-knew-before-biopsy",
    prompt: `A woman in her 40s sitting calmly in a bright hospital corridor, resilient and composed expression, documentary editorial style, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
  {
    kind: "cms",
    collectionId: "Articles",
    slug: "five-minute-symptom-log",
    prompt: `A person in their 40s writing in a small notebook at a kitchen table in the morning, cup of tea nearby, lifestyle editorial photography, ${STYLE_SUFFIX}`,
    width: 1376,
    height: 768,
  },
];

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
  const name = `${slot.collectionId ?? "homepage"}-${slot.slug ?? "hero"}.png`;
  const json = await call("POST", "/site-media/v1/files/import", {
    url: imageURL,
    mimeType: "image/png",
    displayName: name,
  });
  const url = json?.file?.url;
  if (!url) throw new Error(`No file.url for ${name}: ${JSON.stringify(json)}`);
  return url;
}

async function attachCms(slot, fileUrl) {
  const query = await call("POST", "/wix-data/v2/items/query", {
    dataCollectionId: slot.collectionId,
    query: { filter: { slug: slot.slug } },
  });
  const item = query?.dataItems?.[0];
  if (!item) throw new Error(`No item found for ${slot.collectionId}/${slot.slug}`);
  const merged = { ...item.data, heroImage: fileUrl };
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
    const fileUrl = await importOne(slot, imageURL);
    if (slot.kind === "cms") {
      await attachCms(slot, fileUrl);
    }
    console.log(`OK   ${label}`);
    return { ...slot, fileUrl, ok: true };
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
    `// Generated by scripts/generate-images.mjs — Wix AI hero image, imported to Wix Media.\nexport const HOMEPAGE_HERO_URL = ${JSON.stringify(homepage.fileUrl)};\n`,
  );
  console.log("Wrote src/lib/site-images.ts");
}

const failures = results.filter((r) => !r.ok);
console.log(`\n${results.length - failures.length}/${results.length} images generated + attached.`);
if (failures.length) {
  console.log("Failed slots (left as themed-block / text-only fallback):");
  for (const f of failures) console.log(` - ${f.kind === "homepage" ? "homepage" : `${f.collectionId}/${f.slug}`}: ${f.error}`);
}
