# Deploying the Cortex Studio site

**A push to `main` is a production deploy.** Cloudflare Pages builds every push to `main` of
`CORTEX-for-Interiors/CORTEX-for-interiors` and serves it on www.cortexforinteriors.com within about
two minutes. Nothing is pushed to `main` without Rishi's explicit ✅ (root guardrail: deploy).
Rewritten 2026-10-22 after the move from Vercel (Vercel's Hobby plan is non-commercial only); the move
itself, with the records and the rollback, is in `CLOUDFLARE-MOVE.md`.

> **Vercel standby until about 2026-10-29.** The old Vercel project `cortexforinteriors` still builds `main`
> but serves nothing live. After 7 calm days Rishi removes its domains and pauses it; then `vercel.json` is
> deleted and this note goes. Until then keep `vercel.json`, so the standby still builds.

## How it is wired

| Piece | Where |
|---|---|
| Hosting | Cloudflare Pages project `cortex-studio-site` (Cloudflare account cortexforinteriors@gmail.com, Free plan), Git integration through the "Cloudflare Workers and Pages" GitHub app (installed on the org by rishivendhan84, one repo). Production branch `main`; every other branch gets a preview at `<branch>.cortex-studio-site.pages.dev`. |
| Build | Set in the Pages dashboard: build command `python3 tools/build.py`, output `dist`, root directory empty. `wrangler.toml` names the output folder. |
| Production gate | Cloudflare sets `CF_PAGES_BRANCH=main` on production builds, which makes `build.py` run the full launch gate. Any error fails the build, and the last good deploy keeps serving. |
| Serving | Pages strips `.html` (`/about.html` 308s to `/about`), serves `/read/` for the Reading view index, and uses `404.html` for unknown paths. Headers come from `public/_headers`. |
| Domains | `www.cortexforinteriors.com` and `cortexforinteriors.com` are both custom domains on the Pages project. A Cloudflare Single Redirect (`Root to www`: hostname equals `cortexforinteriors.com`, dynamic `concat("https://www.cortexforinteriors.com", http.request.uri.path)`, 301, query string kept) sends the bare domain to www. |
| DNS | Cloudflare (nameservers `leonidas` and `paislee.ns.cloudflare.com`). Namecheap is the registrar only: renewals there, records here. |
| Mail | Zoho Mail: 3 MX (`mx`, `mx2`, `mx3.zoho.in`), SPF, Zoho verification, DMARC and DKIM (`zmail._domainkey`), all DNS only in Cloudflare. Any DNS change must keep them. |
| Free Project Map | Email compose links only (Gmail, Outlook, mailto, Copy). There is no server form: the old handler is parked in `parked/functions/api/request.js` and is not deployed. Moving it back to `functions/` would make it a live endpoint. |
| Reading view | The classic site is vendored in `classic/` and built into `dist/read/` by `build.py` (noindex, canonical to the brain pages). |

## Before every push to main

Run all four from `cortex-studio\site` (the venv lives one level up). Step 1 is the one that matters most.

1. **Fresh-clone build: build exactly what Cloudflare will build.** Your working folder can hold files git does
   not track (an empty folder, a generated file, another session's work), so a build that passes there can
   fail on the host. That is what happened on 2026-10-22: release `9cb5e61` passed locally and failed on
   Vercel, because git does not keep the empty `classic/public` folder (fixed in `9fc64d7`). This check
   would have caught it.

   Git Bash, from `cortex-studio/site`, with `<branch>` the branch you are about to push:

   ```bash
   PY="$(cd .. && pwd)/.venv/Scripts/python"; rm -rf "$TEMP/site-fresh" && git clone -q -b <branch> . "$TEMP/site-fresh" && (cd "$TEMP/site-fresh" && CF_PAGES_BRANCH=main "$PY" tools/build.py | tail -1)
   ```

   It must print `PASS (deploy)`. It clones the local repo, so it tests your committed work before anything
   is pushed. Uncommitted changes are not in the clone: commit first.

2. **Site gate in your folder:** `..\.venv\Scripts\python tools\build.py --deploy` must print `PASS (deploy)`.

3. **Tests:** `node --test tests/journey.test.mjs tests/request.test.mjs` (all green) and, from `cortex-studio`,
   `.venv\Scripts\python -m pytest -q tests\test_site.py` (all green).

4. **Look at it:** `..\.venv\Scripts\python tools\serve.py 8787`, then check the changed pages at desktop
   and phone width, in both themes, with the browser console open. For anything that depends on how
   Cloudflare serves files (redirects, headers, 404), push the branch first and check its `pages.dev` preview.

## Push

- Commit only your own files (`git status` first; never `git add -A` in a shared folder).
- `main` must fast-forward: `git fetch origin` and `git merge-base --is-ancestor origin/main HEAD`.
- Push: `git push origin <branch>:main`, with Rishi's ✅ in the same conversation. Pushing a branch other
  than `main` only makes a preview, and is the safe way to check a change on Cloudflare first.
- Cache busting: bump `?v=lamplight-N` in `src/partials/head.html` and `src/partials/footer.html` whenever
  `site.css`, `theme.js` or the brain scripts change, or returning visitors keep the old files.

## After the push

1. **Watch the build:** `gh api repos/CORTEX-for-Interiors/CORTEX-for-interiors/commits/<sha>/check-runs --jq '.check_runs[] | .name + " " + .status + " " + (.conclusion // "")'`
   until `Cloudflare Pages` is `completed success` (or `failure`: the build log is in the Pages project
   under Deployments, and the live site has not changed).
2. **Check the live site:** every page returns 200, the new `?v=` version is served, `Server: cloudflare`,
   no console errors, Reading view opens `/read/...` and "Explore view" comes back, and
   `https://cortexforinteriors.com/services` 301s to the same page on www.
3. **Log it:** a line in `RUNLOG.md`, mirrored to `SecondBrain\Agent Output\cortex-studio\run-log.md`, plus
   a Keeper Ledger row.

## Rollback

Cloudflare dashboard → Workers & Pages → `cortex-studio-site` → **Deployments** → on the last good production
deployment, the **...** menu → **Rollback to this deployment**. The site is back in seconds. Then fix forward
on a branch and push again through the steps above.
