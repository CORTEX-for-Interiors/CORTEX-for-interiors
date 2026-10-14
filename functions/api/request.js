// Cloudflare Pages Function: POST /api/request
// Validates a project request and forwards it to Hermes, which owns every prospect
// (CORTEX routing rule 1). The site stores nothing and sends no email to anyone.
//
// Environment (set in the host dashboard, never in the repo):
//   HERMES_INTAKE_URL    where Hermes receives requests (decision D6, Hermes's to own)
//   HERMES_INTAKE_TOKEN  bearer token Hermes checks
// Until both are set, requests are refused with a plain message: nothing is lost silently.

const FIELDS = {
  name: { required: true, max: 120 },
  email: { required: true, max: 200 },
  role: { required: true, max: 40 },
  firm: { required: true, max: 160 },
  location: { required: true, max: 120 },
  presence: { required: false, max: 200 },
  photo_types: { required: true, max: 40 },
  archive_location: { required: false, max: 200 },
  project_link: { required: false, max: 400 },
  consent: { required: true, max: 3 },
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function reply(request, status, body) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  if (!wantsJson && status === 200) return Response.redirect(new URL('/thanks', request.url).toString(), 303);
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function validate(form) {
  if ((form.get('company_url') || '').trim() !== '') return { spam: true };
  const data = {};
  for (const [key, rule] of Object.entries(FIELDS)) {
    const value = String(form.get(key) || '').trim();
    if (rule.required && !value) return { error: 'Please complete every required field.' };
    if (value.length > rule.max) return { error: 'One of the answers is too long.' };
    data[key] = value;
  }
  if (!EMAIL.test(data.email)) return { error: 'Please check the email address.' };
  if (data.consent !== 'yes') return { error: 'Please tick the consent box so we can reply.' };
  if (data.project_link && !/^https?:\/\//i.test(data.project_link)) return { error: 'The project link should start with http or https.' };
  return { data };
}

export async function onRequestPost({ request, env }) {
  let form;
  try { form = await request.formData(); } catch { return reply(request, 400, { error: 'The request could not be read.' }); }

  const result = validate(form);
  if (result.spam) return reply(request, 200, { ok: true });
  if (result.error) return reply(request, 400, { error: result.error });

  if (!env.HERMES_INTAKE_URL || !env.HERMES_INTAKE_TOKEN) {
    return reply(request, 503, { error: 'Requests are not open yet. Please try again soon.' });
  }
  const payload = { source: 'cortex-studio-site', received_at: new Date().toISOString(), ...result.data };
  try {
    const res = await fetch(env.HERMES_INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.HERMES_INTAKE_TOKEN}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`intake ${res.status}`);
  } catch (err) {
    console.log(`request forward failed: ${err.message}`); // no personal data in logs
    return reply(request, 502, { error: 'That did not go through on our side. Please try again in a few minutes.' });
  }
  return reply(request, 200, { ok: true });
}
