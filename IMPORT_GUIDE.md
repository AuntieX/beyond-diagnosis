# Beyond Diagnosis — Content Import Package

This package contains **45 real content records** ready to import into the Wix CMS,
plus the schemas and a seed-script template.

## Files

- **`beyond_diagnosis_seed_data.json`** — all 45 records, structured by collection. Rich-text fields are HTML strings.
- **`seed_all_records.mjs`** — template seed script. Wire `insertItem()` to the project's existing Wix data access (see the project's `seed-cms.mjs` for the working pattern), then run.

## Record counts

| Collection | Records | Life stage | Voice |
|---|---|---|---|
| WarningSigns | 16 | Symptoms | Fierce advocate |
| AccessGuides | 13 | Screening | Fierce advocate |
| Therapies | 5 | During | Fierce advocate |
| Trials | 1 | During | Fierce advocate |
| Environment | 5 | Before | Practical, non-paranoid |
| Recovery | 5 | After | Gentle, nurturing |
| **Total** | **45** | | |

## Collection schemas

### WarningSigns (extend existing — currently 3 seeded, add the other 13)
Fields (all rich-text fields are HTML):
- `title` (text)
- `slug` (text, unique)
- `cancer_type` (text)
- `sign_name` (text)
- `life_stage` (text) — always "Symptoms"
- `pillar` (text) — always "Warning Signs"
- `description` (rich text / HTML)
- `what_it_could_mean` (rich text)
- `what_it_probably_is` (rich text)
- `commonly_dismissed_note` (rich text)
- `when_to_call_doctor` (rich text — contains a `<ul>`)
- `when_to_go_to_er` (rich text — contains a `<ul>`)
- `if_dismissed` (rich text)
- `family_history_note` (rich text, may be empty)
- `heroImage` (image — attach after import via Wixel)

### AccessGuides (extend existing — currently 3 seeded, add the other 10)
- `title`, `slug`, `topic` (text), `cancer_type` (text)
- `life_stage` ("Screening"), `pillar` ("Access")
- `overview`, `steps`, `when_applies`, `when_not`, `resources`, `denial_path` (all rich text)
- `last_reviewed` (text — "July 2026")
- `heroImage`

### Therapies, Trials, Environment, Recovery (NEW — same clean schema for all four)
- `title` (text)
- `slug` (text, unique)
- `life_stage` (text) — "During" / "Before" / "After"
- `pillar` (text)
- `cancer_tags` (text — comma-separated, e.g. "Breast, Ovarian")
- `intro` (text — short summary for cards, ~300 chars)
- `body` (rich text / HTML — the full article, with `<h3>` section headers)
- `heroImage`

The four new collections share one schema so page templates are simple:
a card shows `title` + `intro`, and the detail page renders `intro` + `body`.

## Import steps for the agent

1. **Create the four new collections** (Therapies, Trials, Environment, Recovery) with the schema above.
2. **Wire `insertItem()`** in `seed_all_records.mjs` to the project's Wix data SDK.
   De-dupe by `slug`: if a record with that slug exists, update it; else insert.
   (WarningSigns and AccessGuides already have 3 records each — the script will
   add the rest; make sure not to duplicate the existing 3 by matching on slug.)
3. **Run the seed script.** It inserts all 45 records.
4. **Generate hero images via Wixel** for every record (see distribution note below),
   then attach as `heroImage` (wix:image:// URIs, not raw URLs, so the SDK can resize).
5. **Rebuild and redeploy.**

## Rich text note

All rich-text fields are **HTML strings** using only `<p>`, `<strong>`, `<ul>`, `<li>`, and `<h3>` tags. If the project's rich-text fields need a different format (e.g. Wix Ricos JSON), convert the HTML — but most Wix rich-text fields accept HTML on insert.

## The voice — do not flatten

The content carries a deliberate life-stage voice shift. Preserve it:
- **Symptoms / Screening / During** (WarningSigns, AccessGuides, Therapies, Trials): fierce advocate — direct address, exact scripts, "don't take no."
- **Before** (Environment): informed, practical, calm — reduces risk without inducing dread.
- **After** (Recovery): gentle, nurturing — "you are not behind," "be kind to your timeline."

## Hero image distribution (after records exist)

Generate ~45 hero images via Wixel with a **balanced** cast across the full set —
Black, Latina, White, East Asian, South Asian, and Indigenous representation among
women, plus men (mixed race) for the colorectal, lung, prostate, and pancreatic
records. Ages should look genuinely 35–70 (real faces, not young faces with gray
hair added). Style: warm natural light, editorial, film grain, shallow depth of
field, no stock feel. The existing 10 images over-index on Black/Latina women
because only those symptom records existed; with all 45 records present, balance
the whole set.
