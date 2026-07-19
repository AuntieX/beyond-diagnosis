// One-time backend seed script — creates the Newsletter signup form.
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

function uuid() {
  return crypto.randomUUID();
}

async function cleanDefaultForms() {
  const r = await call("GET", "/form-schema-service/v4/forms?namespace=wix.form_app.form");
  const forms = r.json?.forms || [];
  for (const f of forms) {
    const d = await call("DELETE", `/form-schema-service/v4/forms/${f.id}`);
    console.log(`[clean] deleted ${f.id} -> ${d.status}`);
  }
}

async function createNewsletterForm() {
  const F1 = uuid(); // email
  const SUBMIT = uuid();
  const STEP = uuid();

  const body = {
    form: {
      name: "Newsletter Signup",
      namespace: "wix.form_app.form",
      formFields: [
        {
          id: SUBMIT,
          hidden: false,
          identifier: "SUBMIT_BUTTON",
          fieldType: "DISPLAY",
          displayOptions: {
            displayFieldType: "PAGE_NAVIGATION",
            pageNavigationOptions: { nextPageText: "Next", previousPageText: "Back", submitText: "Send it to me" },
          },
        },
        {
          id: F1,
          hidden: false,
          identifier: "CONTACTS_EMAIL",
          fieldType: "INPUT",
          inputOptions: {
            target: "email",
            pii: true,
            required: true,
            inputType: "STRING",
            readOnly: false,
            stringOptions: {
              validation: { format: "EMAIL", enum: [] },
              componentType: "TEXT_INPUT",
              textInputOptions: { label: "Email", showLabel: true },
            },
          },
        },
      ],
      steps: [
        {
          id: STEP,
          name: "Page 1",
          layout: {
            large: {
              items: [
                { fieldId: F1, row: 0, column: 0, width: 12, height: 1 },
                { fieldId: SUBMIT, row: 1, column: 0, width: 12, height: 1 },
              ],
              sections: [],
            },
          },
        },
      ],
      enabled: true,
    },
  };

  const r = await call("POST", "/form-schema-service/v4/forms", body);
  console.log(`[create] Newsletter Signup -> ${r.status}`);
  if (r.status !== 200) console.log(JSON.stringify(r.json));
  return r.json?.form?.id;
}

async function verify(formId) {
  const r = await call("GET", "/form-schema-service/v4/forms?namespace=wix.form_app.form");
  const found = (r.json?.forms || []).find((f) => f.id === formId);
  console.log(`[verify] list -> found=${!!found}`);

  const s = await call("GET", `/form-schema-service/v4/forms/${formId}/summary`);
  console.log(`[verify] summary fields -> ${s.json?.formSummary?.fields?.length}`);
  console.log(`FORM_ID=${formId}`);
}

async function main() {
  await cleanDefaultForms();
  const formId = await createNewsletterForm();
  await new Promise((res) => setTimeout(res, 1000));
  await verify(formId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
