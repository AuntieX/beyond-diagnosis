/**
 * Beyond Diagnosis — CMS Seed Script
 * ----------------------------------
 * Imports all 45 records from beyond_diagnosis_seed_data.json into Wix CMS.
 *
 * This script is a TEMPLATE for the coding agent. The agent should adapt the
 * `insertItem` call to whatever Wix Data / SDK method the project already uses
 * for writing to collections (the project's existing seed-cms.mjs shows the pattern).
 *
 * Field notes:
 *  - All *_note, description, overview, steps, resources, where_you_are, etc.
 *    fields are HTML strings — map them to Rich Text fields in the collection.
 *  - `slug` is unique per collection — use it as the item key / for dedupe.
 *  - `heroImage` is intentionally omitted; images are generated separately via
 *    Wixel and attached after records exist (as wix:image:// URIs).
 *
 * Collections expected:
 *  - WarningSigns  (16)
 *  - AccessGuides  (13)
 *  - Therapies     (5)
 *  - Trials        (1)
 *  - Environment   (5)
 *  - Recovery      (5)
 */

import fs from 'node:fs';
// import { items } from '@wix/data';  // <-- agent: use the project's existing import

const data = JSON.parse(
  fs.readFileSync(new URL('./beyond_diagnosis_seed_data.json', import.meta.url), 'utf8')
);

const COLLECTIONS = ['WarningSigns', 'AccessGuides', 'Therapies', 'Trials', 'Environment', 'Recovery'];

async function seedCollection(collectionId, records) {
  console.log(`\nSeeding ${collectionId} (${records.length} records)...`);
  let ok = 0, fail = 0;
  for (const rec of records) {
    // Strip the helper 'collection' key before inserting
    const { collection, ...fields } = rec;
    try {
      // ---- AGENT: replace this with the project's real insert call ----
      // Example with @wix/data:
      //   await items.insert(collectionId, fields);
      // Existing project pattern may be:
      //   await wixData.insert(collectionId, fields);
      // De-dupe by slug: query first, update if exists, else insert.
      await insertItem(collectionId, fields);
      ok++;
      process.stdout.write('.');
    } catch (e) {
      fail++;
      console.error(`\n  ✗ ${fields.slug}: ${e.message}`);
    }
  }
  console.log(`\n  ${collectionId}: ${ok} inserted, ${fail} failed`);
}

// AGENT: implement this using the project's Wix data access.
async function insertItem(collectionId, fields) {
  throw new Error('insertItem not implemented — wire to project Wix data SDK');
}

async function main() {
  for (const coll of COLLECTIONS) {
    if (data[coll]?.length) {
      await seedCollection(coll, data[coll]);
    }
  }
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
