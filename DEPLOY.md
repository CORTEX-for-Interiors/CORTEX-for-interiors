# Deploying the Cortex Studio site

**A push to `main` is a production deploy.** Vercel builds every push to `main` of
`CORTEX-for-Interiors/CORTEX-for-interiors` and serves it on www.cortexforinteriors.com within about
three minutes. Nothing is pushed to `main` without Rishi's explicit ✅ (root guardrail: deploy).
Rewritten 2026-10-22; the Cloudflare Pages plan this file used to describe was never used.

> **Moving to Cloudflare Pages (decided 2026-10-22, in progress):** Vercel Hobby is non-commercial only.
> The steps, records and rollback are in `CLOUDFLARE-MOVE.md`. This file describes Vercel until that move
> reaches its last step; then it is rewritten for Cloudflare.

## How it is wired

| Piece | Where |
|---|---|
| Hosting | Vercel project `cortexforinteriors` (account rishivendhan84, **Hobby plan**), Git integration, production branch `main`. Every other branch gets a preview URL. |
| Build | `vercel.json`: `python3 tools/build.py`, output `dist/`, clean URLs, no trailing slash, security headers |
| Production gate | Vercel sets `VERCEL_ENV=production`, which makes `build.py` run the full launch gate. Any error fails the build, and the last good deploy keeps serving. |
| Domain | Namecheap DNS: `A @ 216.198.79.1`, `CNAME www` to Vercel. Primary is `www`; the bare domain 308s to it. |
| Mail | Zoho Mail on the same domain (MX, SPF, DKIM, DMARC at Namecheap). DNS changes must keep those records. |
| Free Project Map | Email compose links only (Gmail, Outlook, mailto, Copy). There is no server form: the old Cloudflare handler is parked in `parked/functions/api/request.js` and is not deployed, so `/api/request` returns 404. |
| Reading view | The classic site is vendored in `classic/` and built into `dist/read/` by `build.py` (noindex, canonical to the brain pages). |

## Before every push to main

Run all four from `cortex-studio\site` (the venv lives one level up). Step 1 is the one that matters most.

1. **Fresh-clone build: build exactly what Vercel will build.** Your working folder can hold files git does
   not track (an empty folder, a generated file, another session's work), so a build that passes there can
   fail on Vercel. That is what happened on 2026-10-22: release `9cb5e61` passed locally and failed on
   Vercel, because git does not keep the empty `classic/public` folder (fixed in `9fc64d7`). This check
   would have caught it.

   Git Bash, from `cortex-studio/site`, with `<branch>` the branch you are about to push:

   ```bash
   PY="$(cd .. && pwd)/.venv/Scripts/python"; rm -rf "$TEMP/site-fresh" && git clone -q -b <branch> . "$TEMP/site-fresh" && (cd "$TEMP/site-fresh" && VERCEL_ENV=production "$PY" tools/build.py | tail -1)
   ```

   It must print `PASS (deploy)`. It clones the local repo, so it tests your committed work before anything
   is pushed. Uncommitted changes are not in the clone: commit first.

2. **Site gate in your folder:** `..\.venv\Scripts\python tools\build.py --deploy` must print `PASS (deploy)`.

3. **Tests:** `node --test tests/*.mjs` (all green) and, from `cortex-studio`,
   `.venv\Scripts\python -m pytest -q tests\test_site.py` (all green).

4. **Look at it:** `..\.venv\Scripts\python tools\serve.py 8787`, then check the changed pages at desktop
   and phone width, in both themes, with the browser console open.

## Push

- Commit only your own files (`git status` first; never `git add -A` in a shared folder).
- `main` must fast-forward: `git fetch origin` and `git merge-base --is-ancestor origin/main HEAD`.
- Push: `git push origin <branch>:main`, with Rishi's ✅ in the same conversation.
- Cache busting: bump `?v=lamplight-N` in `src/partials/head.html` and `src/partials/footer.html` whenever
  `site.css`, `theme.js` or the brain scripts change, or returning visitors keep the old files.

## After the push

1. **Watch the build:** `gh api repos/CORTEX-for-Interiors/CORTEX-for-interiors/commits/<sha>/status --jq .state`
   until it says `success` (or `failure`: the build log is in the Vercel dashboard, and the live site has
   not changed).
2. **Check the live site:** every page returns 200, the new `?v=` version is served, no console errors,
   Reading view opens `/read/...` and "Explore view" comes back.
3. **Log it:** a line in `RUNLOG.md`, mirrored to `SecondBrain\Agent Output\cortex-studio\run-log.md`, plus
   a Keeper Ledger row.

## Rollback

Vercel dashboard → project `cortexforinteriors` → **Overview** → the **Instant Rollback** button at the top
of the Production Deployment card (next to Visit), then pick the last good deployment. The site is back in
seconds. Then fix forward on a branch and push again through the
steps above. Proven 2026-10-22: the check in step 1 passes on `9fc64d7` and fails on `9cb5e61`.
