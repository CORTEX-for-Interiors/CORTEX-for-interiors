# Moving the site from Vercel to Cloudflare Pages

Decided 2026-10-22 on Rishi's "go cloudflare". Reason: the site runs on Vercel's Hobby plan, which Vercel
restricts to non-commercial personal use, and a studio site selling a service is commercial. Cloudflare Pages
serves static files free with no request limit.

**The live site does not change until step 6.** Every step before it can be dropped with no effect on
www.cortexforinteriors.com. Steps marked **(Rishi)** are his hand: accounts, pushes, DNS.

## Records before the move (read 2026-10-22, for rollback)

| Record | Value |
|---|---|
| Nameservers | Namecheap (`dns1/dns2.registrar-servers.com`). They stay there. |
| `CNAME www` | `b0ddd3f5c6ff9078.vercel-dns-017.com` (Vercel) |
| `A @` | `216.198.79.1` (Vercel, redirects the bare domain to www) |
| `MX` | `mx.zoho.in` 10, `mx2.zoho.in` 20, `mx3.zoho.in` 50. **Never touched by this move**, nor the SPF, DKIM and DMARC TXT records. |

## What branch `cloudflare` already changes

- **Production gate:** `tools/build.py` and `classic/tools/build.py` run the full launch gate when
  `CF_PAGES_BRANCH=main` (Cloudflare's production build), as they already do for `VERCEL_ENV=production`.
  Both work, so the branch is safe to merge while Vercel still serves.
- **Old form function parked:** `functions/` moved to `parked/functions/`. Cloudflare would have run
  `functions/api/request.js` as a live `/api/request` endpoint; nothing on the site uses it (the Free Project
  Map uses email links). Its tests still run from the new path. Moving it back re-enables it.
- **Headers:** `public/_headers` (Cloudflare's version of the `vercel.json` headers) gains the two cache
  rules it was missing (`/llms.txt`, `/img/*`).
- `vercel.json` stays until the move is finished, so Vercel keeps building `main` as before.

## Steps

1. **(Rishi) Create the Pages project.** Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to
   Git → the `CORTEX-for-Interiors/CORTEX-for-interiors` repo. Settings:
   - Project name: `cortex-studio-site` (it becomes `cortex-studio-site.pages.dev`; match `wrangler.toml`)
   - Production branch: `main`
   - Framework preset: None
   - Build command: `python3 tools/build.py`
   - Build output directory: `dist`
   - Root directory: empty

   Its first build is today's `main`, served only on the `pages.dev` address.
2. **(Rishi ✅) Push branch `cloudflare`** (not `main`): `git push origin cloudflare`. Cloudflare builds a
   preview at `cloudflare.cortex-studio-site.pages.dev`; Vercel builds its own preview. Nothing live changes.
3. **Check the preview** (Claude can run this): every page returns 200, clean URLs (`/how-it-works`, not
   `.html`), Reading view opens `/read/...` and "Explore view" comes back, an unknown URL shows the 404 page,
   `curl -I` shows the security headers, no console errors, both themes, phone width.
4. **(Rishi ✅) Merge `cloudflare` into `main`** through the DEPLOY.md pre-push steps. Vercel and Cloudflare
   both build it. Cloudflare's production build runs the gate and serves `cortex-studio-site.pages.dev`.
5. **(Rishi) Add the domain in Cloudflare first:** Pages project → Custom domains → Set up a domain →
   `www.cortexforinteriors.com`. Cloudflare's docs warn that a CNAME pointed before this step fails to resolve.
   A day before step 6, lower the `www` TTL at Namecheap to 5 minutes.
6. **(Rishi) Switch `www` at Namecheap:** Advanced DNS → `CNAME www` → `cortex-studio-site.pages.dev`.
   This is the moment the live site moves. Change nothing else in the same sitting.
7. **(Rishi) The bare domain: move the nameservers to Cloudflare.** Cloudflare can only serve a bare domain
   whose nameservers are on Cloudflare. Until then `A @ 216.198.79.1` stays, and Vercel answers for the bare
   domain with a redirect to www.

   **Tried and reverted 2026-10-22: a Namecheap URL Redirect Record does not work.** It redirected
   `http://cortexforinteriors.com` (301), but `https://cortexforinteriors.com` timed out: Namecheap's redirect
   server (`162.255.119.215`) does not answer on port 443. That breaks returning visitors, because Vercel's
   bare-domain redirect sends `Strict-Transport-Security: max-age=63072000`, so their browsers only try
   `https`. Do not use a Namecheap redirect for `@`.

   Nameserver move, in order: add `cortexforinteriors.com` as a zone in Cloudflare (free plan), let it import
   the records, check every one against Namecheap (3 Zoho MX, SPF, Zoho verification, DMARC, DKIM, `www`),
   add the Pages custom domain for the bare domain, then change the nameservers at Namecheap.
8. **Verify live:** the step 3 checks on www.cortexforinteriors.com, and a test email in and out of
   rishi@cortexforinteriors.com. Search Console: resubmit the sitemap.
9. **After 7 calm days (Rishi):** remove the domain from the Vercel project, then pause or delete it. Then
   rewrite DEPLOY.md for Cloudflare (rollback = Cloudflare's deployment list → Rollback) and delete `vercel.json`.

## Rollback

- Before step 6: nothing to undo on the live site. Delete the Pages project if you want.
- After step 6: set `CNAME www` back to `b0ddd3f5c6ff9078.vercel-dns-017.com`. Vercel keeps building `main`
  until step 9, so it is still current.
- After step 7: set the nameservers at Namecheap back to Namecheap BasicDNS. Its records stay in place
  until then, so keep them unchanged.

## Progress

- 2026-10-22: steps 1 to 6 done (main `1e8152c`; www on Cloudflare, certificate valid to 2027-01-20).
  Step 7 redirect tried and reverted (above). Inbound mail verified after the switch.
