import type { APIRoute } from "astro";
import { submissions } from "@wix/forms";
import { NEWSLETTER_FORM_ID } from "../../lib/content";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let email = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      email = String(body.email ?? "").trim();
    } else {
      const form = await request.formData();
      email = String(form.get("email") ?? "").trim();
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Please enter a valid email address." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await submissions.createSubmission({
      formId: NEWSLETTER_FORM_ID,
      submissions: { email },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[newsletter] submission failed", err);
    const fieldErrors: Record<string, string> = {};
    const violations = (err as { details?: { validationError?: { fieldViolations?: Array<{ data?: { errors?: Array<{ errorPath?: string; errorMessage?: string }> } }> } } })
      ?.details?.validationError?.fieldViolations ?? [];
    for (const v of violations) {
      for (const fe of v?.data?.errors ?? []) {
        if (fe.errorPath && !fieldErrors[fe.errorPath]) fieldErrors[fe.errorPath] = fe.errorMessage ?? "Invalid value";
      }
    }
    return new Response(
      JSON.stringify({ ok: false, error: fieldErrors.email ?? "Something went wrong. Please try again." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
};
