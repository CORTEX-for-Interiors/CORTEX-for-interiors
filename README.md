# Cortex Studio site

P0 marketing site for Cortex Studio. Requirements: `SecondBrain\Agent Output\2026-10-13 Cortex Studio Website\`.
Static HTML built from `src/`, every word in the HTML before any script runs.

```
.venv\Scripts\python site\tools\build.py            local build + gates
.venv\Scripts\python site\tools\build.py --deploy   launch gate: fails until domain, contact email,
                                                    retention period and privacy review are real
.venv\Scripts\python site\tools\serve.py            http://localhost:8787 (form is a DRY RUN, production headers applied)
node --test site\tests\request.test.mjs           form function tests
```

Deploying: `DEPLOY.md` (every step is Rishi's hand). Lead hand-off: `HERMES-INTAKE.md`.

Design: built with the `design-taste-frontend` skill (installed project-scope 2026-10-13). The design read and dials are at the top of `src/styles/site.css`; the skill's pre-flight items that can be checked mechanically are build gates.

**Measured 2026-10-13 (local, Lighthouse 12.6.1, mobile):** Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 2.1 s, CLS 0, TBT 0 ms.

| Folder | What |
|---|---|
| `src/pages/` | one file per page, with a `<!--page ...-->` header (title, description, path, sitemap) |
| `src/partials/` | head, header, footer, CTA band |
| `src/styles/site.css` | tokens (light + dark) and components |
| `functions/api/request.js` | Cloudflare Pages Function: validates the form, forwards to Hermes. Needs `HERMES_INTAKE_URL` + `HERMES_INTAKE_TOKEN` in the host settings |
| `public/` | favicon, `_headers` (security headers, Cloudflare format) |
| `site.config.json` | origin (placeholder until the domain is bought), JSON-LD description, areas served |

## Rules (from the PRD and the studio charter)

- **Nothing deploys without Rishi's ✅.** No domain, hosting or DNS change is made from here.
- Leads are prospects: the function forwards them to Hermes and the site stores nothing. No automatic emails.
- Images: a client photo needs written permission (`data-photo="permitted"`); anything else carries `data-sample` and a visible label. The build fails otherwise.
- Copy: the crew's banned-word list (`cortex_studio/law.py`), no em dashes, one `<h1>` per page.
- Rate limiting for `/api/request` is a Cloudflare WAF rule, set in the dashboard at launch.

## Charter line to approve at deploy time (not applied)

`cortex-studio\CLAUDE.md` law 5 says nothing leaves the folder except the run summary. Before the first deploy, Rishi's proposed addition:

> 10. **The studio site** (`site\`) is the one deployable surface in this repo. It deploys only on Rishi's ✅, only after `build.py --deploy` passes, and it never holds client data or client photos without written permission.
