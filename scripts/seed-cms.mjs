// One-time backend seed script for Beyond Diagnosis.
// Reads TOKEN + SITE_ID from env (minted by the Wix CLI in the calling shell).
// Creates the three CMS collections and bulk-inserts 3 sample records each.

const TOKEN = process.env.TOKEN;
const SITE_ID = process.env.SITE_ID;

if (!TOKEN || !SITE_ID) {
  console.error("Missing TOKEN or SITE_ID env vars");
  process.exit(1);
}

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
  return { status: res.status, json };
}

const RT = { type: "RICH_TEXT" };

const collections = [
  {
    id: "WarningSigns",
    displayName: "Warning Signs",
    fields: [
      { key: "title", displayName: "Title", type: "TEXT" },
      { key: "slug", displayName: "Slug", type: "TEXT" },
      { key: "cancer_type", displayName: "Cancer Type", type: "TEXT" },
      { key: "sign_name", displayName: "Sign Name", type: "TEXT" },
      { key: "description", displayName: "Description", ...RT },
      { key: "what_it_could_mean", displayName: "What It Could Mean", ...RT },
      { key: "what_it_probably_is", displayName: "What It Probably Is", ...RT },
      { key: "commonly_dismissed_note", displayName: "Commonly Dismissed Note", ...RT },
      { key: "when_to_call_doctor", displayName: "When To Call Doctor", ...RT },
      { key: "when_to_go_to_er", displayName: "When To Go To ER", ...RT },
      { key: "if_dismissed", displayName: "If Dismissed", ...RT },
      { key: "family_history_note", displayName: "Family History Note", ...RT },
      { key: "heroImage", displayName: "Hero Image", type: "IMAGE" },
    ],
  },
  {
    id: "AccessGuides",
    displayName: "Access Guides",
    fields: [
      { key: "title", displayName: "Title", type: "TEXT" },
      { key: "slug", displayName: "Slug", type: "TEXT" },
      { key: "topic", displayName: "Topic", type: "TEXT" },
      { key: "cancer_type", displayName: "Cancer Type", type: "TEXT" },
      { key: "overview", displayName: "Overview", ...RT },
      { key: "steps", displayName: "Steps", ...RT },
      { key: "when_applies", displayName: "When Applies", ...RT },
      { key: "when_not", displayName: "When Not", ...RT },
      { key: "resources", displayName: "Resources", ...RT },
      { key: "denial_path", displayName: "Denial Path", ...RT },
      { key: "last_reviewed", displayName: "Last Reviewed", type: "DATE" },
      { key: "heroImage", displayName: "Hero Image", type: "IMAGE" },
    ],
  },
  {
    id: "Articles",
    displayName: "Articles",
    fields: [
      { key: "title", displayName: "Title", type: "TEXT" },
      { key: "slug", displayName: "Slug", type: "TEXT" },
      { key: "publishDate", displayName: "Publish Date", type: "DATE" },
      { key: "category", displayName: "Category", type: "TEXT" },
      { key: "excerpt", displayName: "Excerpt", type: "TEXT" },
      { key: "body", displayName: "Body", ...RT },
      { key: "author", displayName: "Author", type: "TEXT" },
      { key: "readMinutes", displayName: "Read Minutes", type: "NUMBER" },
      { key: "heroImage", displayName: "Hero Image", type: "IMAGE" },
    ],
  },
];

async function createCollections() {
  for (const c of collections) {
    const body = {
      collection: {
        id: c.id,
        displayName: c.displayName,
        fields: c.fields,
        permissions: { insert: "ADMIN", update: "ADMIN", remove: "ADMIN", read: "ANYONE" },
      },
    };
    let r = await call("POST", "/wix-data/v2/collections", body);
    if (r.status === 403 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 3000));
      r = await call("POST", "/wix-data/v2/collections", body);
    }
    console.log(`[collection] ${c.id} -> ${r.status}`);
    if (r.status !== 200 && r.status !== 201) {
      console.log(JSON.stringify(r.json));
    }
  }
}

// ---- Sample content (advocate-doctor-best-friend voice) ----

const warningSignsItems = [
  {
    title: "Persistent Bloating That Won't Quit — Ovarian Cancer",
    slug: "persistent-bloating-ovarian-cancer",
    cancer_type: "Ovarian",
    sign_name: "Persistent bloating",
    description:
      "<p>Listen. If your stomach has looked \"pregnant\" for weeks and nothing you do — not water, not fiber, not cutting out gluten — makes it go down, that is not normal bloating. That is a sentence your body is trying to finish.</p>",
    what_it_could_mean:
      "<p>Persistent, unexplained bloating lasting more than two to three weeks is one of the most common early symptoms of ovarian cancer — and one of the most dismissed. It happens because fluid or a mass builds up in the abdomen and pelvis, and it rarely comes alone: watch for it alongside feeling full quickly, pelvic pain, or needing to urinate more urgently.</p>",
    what_it_probably_is:
      "<p>To be fair, most bloating is not cancer. It's IBS, hormonal shifts, food sensitivities, or plain old digestive stress. The difference is duration and pattern: ordinary bloating comes and goes with meals and cycles. This bloating sets up camp and stays.</p>",
    commonly_dismissed_note:
      "<p>You're not being dramatic — you're being right. Ovarian cancer is nicknamed \"the silent killer\" not because it's actually silent, but because doctors and patients alike keep mistaking its whispers for IBS, stress, or \"just getting older.\" You deserve better than a shrug and a probiotic recommendation.</p>",
    when_to_call_doctor:
      "<p>Call if the bloating has lasted more than two weeks, happens most days, and is new for you — especially with early fullness, pelvic or abdominal pain, or urinary changes. The exact ask: <strong>\"I've had persistent bloating for over two weeks that isn't related to my period. I'd like a pelvic exam and a transvaginal ultrasound, and I'd like a CA-125 blood test ordered.\"</strong> Say it exactly like that. Naming the tests gets you past the first line of \"let's watch and wait.\"</p>",
    when_to_go_to_er:
      "<p>Go to urgent care or the ER now if the bloating comes with severe abdominal pain, a fever, inability to keep food or water down, or if your abdomen becomes rigid and painful to the touch. Those can signal a mass complication that needs same-day attention.</p>",
    if_dismissed:
      "<p>If a doctor tells you it's \"probably just stress\" without examining you or ordering anything, you are allowed to ask: <strong>\"What would you do if this symptom pattern showed up in your sister?\"</strong> Then ask for the ultrasound and CA-125 test by name, or ask for a referral to a gynecologic specialist. You can also request a second opinion — that is not rude, it is responsible.</p>",
    family_history_note:
      "<p>If a parent, sibling, or child has had ovarian, breast, or colorectal cancer, say so at the start of the appointment, not the end. Family history changes the math on how fast you should be worked up, and you have every right to bring it into the room first.</p>",
  },
  {
    title: "Blood in Your Stool — Colorectal Cancer",
    slug: "blood-in-stool-colorectal-cancer",
    cancer_type: "Colorectal",
    sign_name: "Rectal bleeding or blood in stool",
    description:
      "<p>Listen. Blood in the toilet bowl is not something to quietly Google at 1 a.m. and then never mention to anyone. It's a flag. Pick it up.</p>",
    what_it_could_mean:
      "<p>Rectal bleeding — bright red blood on toilet paper, in the bowl, or mixed into darker, tarrier stool — can be an early sign of colorectal cancer, especially when it's new, recurring, or paired with a change in bowel habits, unexplained weight loss, or persistent fatigue. Colorectal cancer rates are rising fastest in adults under 50, which means \"you're too young for that\" is no longer a safe assumption anyone gets to make about you.</p>",
    what_it_probably_is:
      "<p>Most of the time, this is hemorrhoids or a small anal fissure — common, treatable, not dangerous. The tell is pattern: hemorrhoid bleeding is usually bright red, tied to straining, and resolves with basic care. Bleeding that persists, changes character, or shows up with other symptoms deserves a real look, not an assumption.</p>",
    commonly_dismissed_note:
      "<p>You're not being dramatic — you're being right. \"It's probably just hemorrhoids\" is the single most common line keeping people from a diagnosis until a later stage. It's fine as a first guess. It is not fine as a final answer without an exam.</p>",
    when_to_call_doctor:
      "<p>Call if you've had rectal bleeding more than once, if it's new for you, or if it comes with a change in bowel habits, cramping, or fatigue. The exact ask: <strong>\"I've had rectal bleeding that isn't resolving. I'd like a rectal exam, and I want to talk about whether I need a colonoscopy.\"</strong> If you're under 45 and don't fit the routine screening age, say that explicitly — you can still ask for one based on symptoms.</p>",
    when_to_go_to_er:
      "<p>Go to the ER for heavy, ongoing bleeding, blood clots, dizziness or fainting, or stool that looks black and tarry — that can mean bleeding higher up in the digestive tract and needs immediate evaluation.</p>",
    if_dismissed:
      "<p>If you're told to just \"try more fiber\" without an exam, ask directly: <strong>\"Can we rule out something more serious first, and then talk about fiber?\"</strong> You are entitled to a physical exam before a lifestyle fix. If that's refused, ask for a referral to a gastroenterologist.</p>",
    family_history_note:
      "<p>A first-degree relative with colorectal cancer or polyps roughly doubles your own risk and can lower the age at which you should be screened. Say it out loud at your next appointment — don't wait to be asked.</p>",
  },
  {
    title: "Nipple Changes That Weren't There Before — Breast Cancer",
    slug: "nipple-changes-breast-cancer",
    cancer_type: "Breast",
    sign_name: "Nipple retraction, discharge, or skin change",
    description:
      "<p>Listen. A lump gets all the attention, but breast cancer has other tells — and one of the sneakiest is a nipple that's suddenly turning inward, leaking something that isn't milk, or sitting on skin that looks dimpled, like orange peel.</p>",
    what_it_could_mean:
      "<p>New nipple retraction (inversion), spontaneous discharge that isn't related to breastfeeding, or skin dimpling/puckering can all be signs of an underlying breast cancer, including inflammatory breast cancer — a fast-moving type that often shows up without a classic lump at all. These changes matter because they can appear before anything is felt on a self-exam.</p>",
    what_it_probably_is:
      "<p>Nipple and skin changes can also come from benign causes — duct ectasia, fibrocystic changes, a benign papilloma, eczema, or a past piercing or injury. The point isn't to assume the worst; it's to get anything new and unexplained looked at rather than watched.</p>",
    commonly_dismissed_note:
      "<p>You're not being dramatic — you're being right. \"You're too young for breast cancer\" is said constantly to women in their 30s and 40s, and it delays diagnosis every single time it's said instead of an exam being done.</p>",
    when_to_call_doctor:
      "<p>Call for any new nipple inversion, unexplained discharge, or skin dimpling that's lasted more than a couple of weeks. The exact ask: <strong>\"I have a new nipple/skin change that wasn't there before. I'd like a clinical breast exam and imaging — a mammogram and/or ultrasound — not just a wait-and-watch.\"</strong> If you're under 40 and told you're \"too young to image,\" ask specifically why an ultrasound isn't being offered as a starting point.</p>",
    when_to_go_to_er:
      "<p>This symptom on its own usually isn't an ER situation — but go in if it comes with a rapidly swelling, red, hot breast (a possible sign of inflammatory breast cancer or a severe infection) or significant pain with fever.</p>",
    if_dismissed:
      "<p>If you're told to \"just keep an eye on it,\" ask: <strong>\"What specifically are we watching for, and when should I come back if this doesn't change?\"</strong> Get a real answer and a real timeline in writing — a vague \"keep an eye on it\" with no plan is not a plan.</p>",
    family_history_note:
      "<p>A first-degree relative with breast or ovarian cancer, or a known BRCA1/BRCA2 mutation in the family, should shift you toward earlier imaging and a conversation about genetic counseling. Bring it up before the exam starts, not after.</p>",
  },
];

const accessGuidesItems = [
  {
    title: "Getting a Colonoscopy Covered — Even If You're Under 45",
    slug: "colonoscopy-covered-under-45",
    topic: "Colonoscopy access and coverage",
    cancer_type: "Colorectal",
    overview:
      "<p>Listen. Routine colorectal screening starts at 45 for average-risk adults — but \"routine\" isn't the same as \"only.\" If you have symptoms or family history, you can get a diagnostic colonoscopy covered at any age. Insurers just don't advertise that part.</p>",
    steps:
      "<ul><li>Write down your symptoms and how long you've had them — insurers respond to specifics, not vague complaints.</li><li>Ask your primary care doctor for a referral coded as <strong>diagnostic</strong>, not screening — this is the single biggest lever for coverage under 45.</li><li>If your doctor hesitates, say the exact ask: <strong>\"I'd like this referred as a diagnostic colonoscopy based on my symptoms, so it's billed under my medical concern rather than routine screening.\"</strong></li><li>Call your insurer directly and ask what diagnosis code triggers full coverage for your plan before the procedure, not after.</li><li>If denied, request the denial in writing — you cannot appeal what was only said aloud.</li></ul>",
    when_applies:
      "<p>This path applies when you have symptoms (rectal bleeding, persistent changes in bowel habits, unexplained anemia or weight loss) or a first-degree relative with colorectal cancer or polyps, regardless of your age.</p>",
    when_not:
      "<p>If you're over 45 with no symptoms, you likely qualify for standard preventive screening already covered at no cost under most plans — you don't need this workaround, just schedule it.</p>",
    resources:
      "<p>Keep the Colorectal Cancer Alliance's helpline and your insurer's member services number on hand. A patient navigator (many hospitals have one, free) can also push a diagnostic referral through faster than doing it alone.</p>",
    denial_path:
      "<p>If your insurer denies the claim: request the denial letter, ask your doctor's office for a \"letter of medical necessity,\" and file a formal appeal citing your specific symptoms and family history. Most plans have two internal appeal levels before an external review — use all of them. You are allowed to be persistent about your own body.</p>",
    last_reviewed: "2026-06-01",
  },
  {
    title: "Getting a Mammogram Without Waiting on a Referral",
    slug: "mammogram-without-referral",
    topic: "Mammogram access",
    cancer_type: "Breast",
    overview:
      "<p>Listen. In most states, you do not need a doctor's referral to schedule a mammogram — imaging centers can take self-referrals directly. If you've been told to \"wait for your annual visit,\" that's a scheduling habit, not a rule.</p>",
    steps:
      "<ul><li>Call a certified imaging center directly (search \"FDA-certified mammography facility\" near you) and ask: <strong>\"Do you accept self-referrals for a screening or diagnostic mammogram?\"</strong></li><li>If you have a symptom (a lump, pain, nipple change), say so when booking — this often gets you a same-week diagnostic slot instead of a months-out screening slot.</li><li>Confirm your insurance covers the visit type before you go — screening mammograms are typically fully covered annually starting at 40; diagnostic ones may carry a copay.</li><li>Bring any prior imaging or a written symptom timeline — it speeds up the read.</li></ul>",
    when_applies:
      "<p>Applies when you want a screening mammogram and are of eligible age (most guidelines: 40+), or when you have a new symptom and want a diagnostic mammogram faster than your next scheduled checkup.</p>",
    when_not:
      "<p>If your plan specifically requires a referral (some HMOs do), self-referral won't bypass that — call your insurer first to confirm your plan type before booking.</p>",
    resources:
      "<p>The National Breast and Cervical Cancer Early Detection Program provides free or low-cost mammograms for uninsured and underinsured people — search it by state. Every FDA-certified facility is listed publicly by the FDA.</p>",
    denial_path:
      "<p>If your insurer refuses to cover a diagnostic mammogram tied to a symptom, ask your doctor's office to resubmit with the specific symptom documented in the visit note, not just \"routine screening.\" Coding is often the whole problem — the procedure was covered, the paperwork wasn't clear.</p>",
    last_reviewed: "2026-06-01",
  },
  {
    title: "Requesting Genetic Counseling When Insurance Says No",
    slug: "genetic-counseling-insurance-denial",
    topic: "Genetic counseling and testing access",
    cancer_type: "Ovarian / Breast (BRCA)",
    overview:
      "<p>Listen. If ovarian or breast cancer runs in your family, genetic counseling is not a luxury — it's information that changes your screening schedule for the rest of your life. An initial denial from insurance is common and often reversible.</p>",
    steps:
      "<ul><li>Ask your doctor for a referral to a certified genetic counselor, not just a genetic test order — counseling visits are billed differently and are more often covered outright.</li><li>Before the visit, write out your family history: who had what cancer, at what age, on which side of the family. Specificity is what moves insurers.</li><li>The exact ask to your doctor: <strong>\"Based on my family history, I meet criteria for genetic counseling under current guidelines — can you document that in the referral?\"</strong></li><li>If your plan denies coverage, ask the counselor's office for their billing team's help — many have staff who handle exactly this appeal.</li></ul>",
    when_applies:
      "<p>Applies if you have a first- or second-degree relative with ovarian, breast, or related cancers, especially at a young age, or a known BRCA1/BRCA2 mutation anywhere in the family.</p>",
    when_not:
      "<p>If you have no relevant family history and no personal risk factors, routine testing usually isn't indicated — a counselor can confirm this quickly and at low or no cost as a first conversation.</p>",
    resources:
      "<p>FORCE (Facing Our Risk of Cancer Empowered) maintains a directory of genetic counselors and financial assistance programs. Many major cancer centers also offer sliding-scale counseling regardless of insurance status.</p>",
    denial_path:
      "<p>If insurance denies coverage, request the denial in writing, then file an appeal that includes your documented family history and the National Comprehensive Cancer Network (NCCN) criteria you meet. Cite NCCN by name in the appeal letter — insurers recognize it and it strengthens your case considerably.</p>",
    last_reviewed: "2026-06-01",
  },
];

const articlesItems = [
  {
    title: "\"You're Too Young for That\" Is the Most Dangerous Sentence in Medicine",
    slug: "youre-too-young-dangerous-sentence",
    publishDate: "2026-05-12",
    category: "Advocacy",
    excerpt:
      "Age-based dismissal delays diagnosis more than almost any other single phrase in an exam room. Here's what to say back.",
    body:
      "<p>Listen. If you've heard \"you're too young for that\" about a cancer symptom, you are not alone, and you are not wrong to be frustrated.</p><p>Cancer rates in adults under 50 have been climbing for colorectal, breast, and several other cancers for over a decade. The guidelines are starting to catch up — screening ages have moved down for some cancers — but exam-room habits move slower than the data. A doctor who says \"you're too young\" is often working from an outdated mental model, not a considered judgment about your specific case.</p><p>You're not being dramatic — you're being right to push back. The exact ask that works: <strong>\"I understand I'm outside the typical age range, but I'd like my symptoms worked up on their own merits, not filtered by my age.\"</strong> Say it plainly. You don't need to apologize for asking.</p><p>If you're dismissed once, you're allowed to ask for a second opinion, a different provider, or a specific test by name. This is your one body. You get to advocate for it loudly.</p>",
    author: "Beyond Diagnosis Editorial",
    readMinutes: 4,
  },
  {
    title: "What I Wish Someone Told Me Before My Biopsy",
    slug: "what-i-wish-i-knew-before-biopsy",
    publishDate: "2026-05-26",
    category: "Practical",
    excerpt:
      "The logistics no one mentions — what to bring, what to ask, and what actually happens in the room.",
    body:
      "<p>Listen. Nobody hands you a manual before a biopsy, so here's the one we wish someone had handed us.</p><p><strong>Before:</strong> Ask exactly what type of biopsy you're having (needle, core, excisional) and how long results will take — write the number down, because you will forget it the moment you're nervous. Ask if you can eat and drive yourself home; for some procedures you'll want a ride.</p><p><strong>During:</strong> It's fair to ask for a numbing agent before any needle touches skin, and it's fair to ask the provider to narrate what they're doing as they do it, if that helps you stay calm — or to say nothing at all, if that helps more. Both are reasonable requests.</p><p><strong>After:</strong> Ask the exact ask: <strong>\"How and when will I get these results, and who do I call if I haven't heard by the date you gave me?\"</strong> Get a name and a number. Waiting is hard enough without also not knowing who to call.</p><p>You're allowed to bring someone with you. You're allowed to ask every question twice. This is permission-giving, not oversharing: your questions are not too much.</p>",
    author: "Beyond Diagnosis Editorial",
    readMinutes: 5,
  },
  {
    title: "The Five-Minute Symptom Log That Changed How Doctors Listened to Me",
    slug: "five-minute-symptom-log",
    publishDate: "2026-06-09",
    category: "Practical Tools",
    excerpt:
      "A simple, dated log turns \"it's been bothering me for a while\" into evidence a doctor can act on fast.",
    body:
      "<p>Listen. The single biggest thing that changed how fast doctors took me seriously wasn't a new symptom — it was a log.</p><p>Vague timelines get vague responses. \"It's been going on for a while\" invites a shrug. A dated list invites action. Here's the format that works: date, symptom, severity (1–10), what made it better or worse. Three lines a day, tracked for two weeks before your appointment.</p><p>The exact ask when you hand it over: <strong>\"I've been tracking this for two weeks — here's the pattern I'm seeing. I'd like to talk through what this could mean and what testing makes sense.\"</strong> Handing over data instead of describing a feeling shifts the whole conversation from reassurance to investigation.</p><p>You're not being dramatic by tracking this closely. You're being right — and giving your doctor the exact information they need to take the next step with you, not around you.</p>",
    author: "Beyond Diagnosis Editorial",
    readMinutes: 3,
  },
];

async function seedCollection(id, items) {
  const r = await call("POST", "/wix-data/v2/bulk/items/insert", {
    dataCollectionId: id,
    dataItems: items.map((data) => ({ data })),
    returnEntity: true,
  });
  console.log(`[items] ${id} -> ${r.status} successes=${r.json?.bulkActionMetadata?.totalSuccesses}`);
  if (r.status !== 200) console.log(JSON.stringify(r.json));
  return r.json;
}

async function verifyCollection(id, expectedCount) {
  const r = await call("POST", "/wix-data/v2/items/query", { dataCollectionId: id });
  const count = r.json?.dataItems?.length ?? 0;
  console.log(`[verify] ${id} -> ${count}/${expectedCount} items`);
  return count === expectedCount;
}

async function main() {
  await createCollections();
  await new Promise((res) => setTimeout(res, 2000));
  await seedCollection("WarningSigns", warningSignsItems);
  await seedCollection("AccessGuides", accessGuidesItems);
  await seedCollection("Articles", articlesItems);
  await new Promise((res) => setTimeout(res, 1500));
  await verifyCollection("WarningSigns", 3);
  await verifyCollection("AccessGuides", 3);
  await verifyCollection("Articles", 3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
