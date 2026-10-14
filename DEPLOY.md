# Deploying the Cortex Studio site

**Every step below is Rishi's hand.** Nothing here is run by an agent without his explicit ✅
(root guardrails: deploy, spend, DNS). `build.py --deploy` refuses until steps 1 to 5 are done.

## Before the first deploy

1. **Buy the domain** (spend). Shortlist from the 10-13 registry check: `getcortexstudio.com`, `cortexstudio.ae` (check .ae eligibility).
   Then set `origin` in `site.config.json`.
2. **Contact email** for the privacy page: replace `[[CONTACT_EMAIL]]` in `src/pages/privacy.html`.
3. **Retention period**: replace `[[RETENTION_PERIOD]]`.
4. **Privacy review** for UAE and India, then remove `legal_draft="yes"` and the draft banner from `privacy.html`.
5. **Social share image** (1200 x 630, real or labeled, never generated without his explicit call): save to `public/og.png`, set `"og_image": "/og.png"` in `site.config.json`.
6. **Charter line**: approve the law-10 addition drafted in `README.md` into `cortex-studio\CLAUDE.md`.
7. **Hermes intake** (decision D6): Hermes implements `HERMES-INTAKE.md` and gives the URL and token.

## Gate

```
.venv\Scripts\python site\tools\build.py --deploy      must print PASS (deploy)
.venv\Scripts\python -m pytest -q                       all green
node --test site\tests\request.test.mjs                 all green
```

## Deploy (Cloudflare Pages, free plan)

```
cd site
npx wrangler@4 login
npx wrangler@4 pages project create cortex-studio-site --production-branch main
npx wrangler@4 pages secret put HERMES_INTAKE_URL   --project-name cortex-studio-site
npx wrangler@4 pages secret put HERMES_INTAKE_TOKEN --project-name cortex-studio-site
npx wrangler@4 pages deploy dist --project-name cortex-studio-site
```

Then in the Cloudflare dashboard: add the custom domain, turn on Web Analytics (cookie-free),
and add a WAF rate-limit rule on `/api/request` (for example 5 requests a minute per IP).

## After

- `python -I Experiments\seo-geo-mvp\audit.py https://<domain>/`: expect no FAIL.
- Add the URL to the Google Business Profile website field and the Instagram bio (his accounts).
- Append a deploy line to `RUNLOG.md` and mirror it to `SecondBrain\Agent Output\cortex-studio\run-log.md`.
- Rollback: Cloudflare Pages → Deployments → previous deployment → Rollback.
