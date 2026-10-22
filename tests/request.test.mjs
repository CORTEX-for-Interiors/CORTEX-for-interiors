// node --test site/tests   (no dependencies; Node 18+ has fetch, FormData, Request, Response)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, validate } from '../parked/functions/api/request.js';

const good = {
  name: 'Test Person', email: 'owner@example.com', role: 'Owner or founder', firm: 'Sample Firm',
  location: 'Dubai, UAE', photo_types: 'Phone photos from site visits', consent: 'yes',
};
const form = (fields) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.append(k, v); return f; };
const post = (fields, json = true) => new Request('https://site.test/api/request', {
  method: 'POST', body: form(fields), headers: json ? { Accept: 'application/json' } : {},
});
const env = { HERMES_INTAKE_URL: 'https://hermes.test/intake', HERMES_INTAKE_TOKEN: 't0k' };

test('valid request passes validation', () => assert.ok(validate(form(good)).data));
test('missing required field is refused', () => assert.match(validate(form({ ...good, firm: '' })).error, /required/));
test('bad email is refused', () => assert.match(validate(form({ ...good, email: 'nope' })).error, /email/));
test('consent is required', () => assert.ok(validate(form({ ...good, consent: '' })).error));
test('non-http project link is refused', () => assert.ok(validate(form({ ...good, project_link: 'javascript:alert(1)' })).error));
test('honeypot is treated as spam', () => assert.ok(validate(form({ ...good, company_url: 'x' })).spam));

test('without Hermes settings the request is refused, not dropped silently', async () => {
  const res = await onRequestPost({ request: post(good), env: {} });
  assert.equal(res.status, 503);
});

test('forwards to Hermes with bearer token and no extra fields', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return new Response('{}', { status: 200 }); };
  const res = await onRequestPost({ request: post({ ...good, extra: 'dropped' }), env });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer t0k');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.source, 'cortex-studio-site');
  assert.equal(body.extra, undefined);
});

test('spam is acknowledged but never forwarded', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response('{}'); };
  const res = await onRequestPost({ request: post({ ...good, company_url: 'bot' }), env });
  assert.equal(res.status, 200);
  assert.equal(called, false);
});

test('Hermes failure returns 502 with a plain message', async () => {
  globalThis.fetch = async () => new Response('down', { status: 500 });
  const res = await onRequestPost({ request: post(good), env });
  assert.equal(res.status, 502);
});

test('no-JS form post redirects to /thanks', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  const res = await onRequestPost({ request: post(good, false), env });
  assert.equal(res.status, 303);
  assert.match(res.headers.get('Location'), /\/thanks$/);
});
