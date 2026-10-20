"""Build the Cortex Studio site into dist/ and run the gates.

    python site/tools/build.py            local build: gates that protect quality are errors,
                                          launch blockers are warnings
    python site/tools/build.py --deploy   launch build: launch blockers become errors too

Gates (PRD doc 03, section 7):
  errors always   em dash, banned word, literal color outside a token, not exactly one <h1>,
                  an <img> that is neither a permitted client photo nor labeled sample
                  (exempt: our own brand SVGs under /logo/, Rishi 2026-10-20),
                  a template slot left unfilled
  errors on --deploy   placeholder domain, [[CONTENT]] placeholders, a page still marked legal draft
"""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
REPO = SITE.parent
sys.path.insert(0, str(REPO))
try:
    from cortex_studio.law import EM_DASH, UNIVERSAL_BANNED  # one banned list for crew and site
except ImportError:  # the site alone (its own repo, built on Vercel): use the copied list
    EM_DASH = chr(0x2014)
    UNIVERSAL_BANNED = json.loads((SITE / "tools" / "lexicon.json").read_text(encoding="utf-8"))["universal_banned"]

SRC, PUBLIC, DIST = SITE / "src", SITE / "public", SITE / "dist"
CONFIG = json.loads((SITE / "site.config.json").read_text(encoding="utf-8"))
META = re.compile(r"<!--page (.*?)-->", re.S)
ATTR = re.compile(r'(\w+)="(.*?)"')
MAX_SENTENCE_WORDS = 14  # studio voice rule, profile.json
CTA_LABEL = "Get my free Project Map"  # one label per intent (design-taste 4.5); value-led label, Rishi 2026-10-20


def partial(name: str) -> str:
    return (SRC / "partials" / f"{name}.html").read_text(encoding="utf-8")


def jsonld(origin: str) -> str:
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "Cortex Studio",
        "url": origin + "/",
        "logo": origin + "/android-chrome-512x512.png",
        "description": CONFIG["description"],
        "areaServed": CONFIG["area_served"],
        "email": CONFIG["email"],
        "knowsAbout": ["Interior design marketing", "Instagram content", "Content operations"],
    }, ensure_ascii=False)


def minify_css(css: str) -> str:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{};,>])\s*", r"\1", css)
    return css.replace(";}", "}").strip()


def og_tags(origin: str) -> str:
    if not CONFIG.get("og_image"):
        return ""
    return (f'<meta property="og:image" content="{origin}{CONFIG["og_image"]}">\n'
            '<meta name="twitter:card" content="summary_large_image">')


def render(page: Path, origin: str) -> tuple[str, dict]:
    raw = page.read_text(encoding="utf-8")
    meta_match = META.search(raw)
    if not meta_match:
        raise SystemExit(f"{page.name}: missing <!--page ...--> header")
    meta = dict(ATTR.findall(meta_match.group(1)))
    body = (raw[meta_match.end():].replace("<!--include cta-->", partial("cta"))
            .replace("<!--include request-form-->", partial("request-form")))
    path = meta["path"]
    head = (partial("head")
            .replace("{{title}}", html.escape(meta["title"]))
            .replace("{{description}}", html.escape(meta["description"]))
            .replace("{{origin}}", origin)
            .replace("{{path}}", "" if path == "/" else path)
            .replace("{{robots}}", meta.get("robots", "index,follow"))
            .replace("{{jsonld}}", jsonld(origin))
            .replace("{{og_image}}", og_tags(origin)))
    header = re.sub(r"\{\{current:(/[\w-]*)\}\}",
                    lambda m: ' aria-current="page"' if m.group(1) == path else "", partial("header"))
    return head + header + body + partial("footer"), meta


def visible_text(doc: str) -> str:
    doc = re.sub(r"<(script|style)\b.*?</\1>", " ", doc, flags=re.S | re.I)
    doc = re.sub(r"<!--.*?-->", " ", doc, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", " ", doc))


def gate_page(name: str, doc: str, meta: dict, errors: list, warnings: list, blockers: list) -> None:
    text = visible_text(doc)
    lowered = text.lower()
    if EM_DASH in doc:
        errors.append(f"{name}: em dash")
    for term in UNIVERSAL_BANNED:
        if re.search(rf"(?<![a-z]){re.escape(term)}(?![a-z])", lowered):
            errors.append(f"{name}: banned term '{term}'")
    h1s = len(re.findall(r"<h1\b", doc))
    if h1s != 1:
        errors.append(f"{name}: {h1s} <h1> elements, need exactly 1")
    for img in re.findall(r"<img\b[^>]*>", doc):
        brand_logo = re.search(r'src="/logo/[^"/]+\.svg"', img)
        if 'data-photo="permitted"' not in img and 'data-sample' not in img and not brand_logo:
            errors.append(f"{name}: image without permission or sample label: {img[:60]}")
        if "alt=" not in img:
            errors.append(f"{name}: image without alt text")
    if chr(0x2013) in text:
        errors.append(f"{name}: en dash (design-taste 9.G)")
    if re.search(r'\sstyle="', doc):
        errors.append(f"{name}: inline style attribute (blocked by the CSP)")
    if re.search(r"fonts\.googleapis|fonts\.gstatic", doc):
        errors.append(f"{name}: third-party font host (fonts are self-hosted)")
    sections = len(re.findall(r"<section\b", doc)) or 1
    eyebrows = len(re.findall(r'class="eyebrow"', doc))
    if eyebrows > -(-sections // 3):
        errors.append(f"{name}: {eyebrows} eyebrows for {sections} sections (max {-(-sections // 3)})")
    for label in set(re.findall(r'<a[^>]+href="/project-map"[^>]*>([^<]+)</a>', doc)):
        if label.strip() != CTA_LABEL:
            errors.append(f"{name}: CTA to /project-map labeled '{label.strip()}', use '{CTA_LABEL}'")
    leftover = re.findall(r"\{\{[^}]+\}\}", doc)
    if leftover:
        errors.append(f"{name}: unfilled template slot {leftover[0]}")
    for slot in sorted(set(re.findall(r"\[\[([A-Z_]+)\]\]", doc))):
        blockers.append(f"{name}: content placeholder [[{slot}]]")
    if meta.get("legal_draft") == "yes":
        blockers.append(f"{name}: legal text still marked DRAFT")
    if name.startswith("privacy"):
        return  # legal text is exempt from the voice rule
    prose = re.findall(r"<(p|li|blockquote|h[1-3])\b[^>]*>(.*?)</\1>", doc, flags=re.S)
    for _, inner in prose:
        if re.search(r"<(p|h[1-3])\b", inner):
            continue  # a container; its own paragraphs are checked on their own
        block = " ".join(visible_text(inner).split())
        for sentence in re.split(r"(?<=[.!?])\s+", block):
            words = [w for w in sentence.split() if any(c.isalnum() for c in w)]
            if len(words) > MAX_SENTENCE_WORDS:
                warnings.append(f"{name}: {len(words)}-word sentence: {' '.join(words[:9])}...")


def gate_css(css: str, errors: list) -> None:
    for n, line in enumerate(css.splitlines(), 1):
        if re.search(r"#[0-9a-fA-F]{3,8}\b", line) and not re.match(r"\s*--[\w-]+\s*:", line):
            errors.append(f"site.css line {n}: literal color outside a token")


def main(argv: list[str]) -> int:
    # A Vercel production build runs the launch gate too, so a site with blockers cannot go live.
    deploy = "--deploy" in argv or os.environ.get("VERCEL_ENV") == "production"
    origin = CONFIG["origin"].rstrip("/")
    errors, warnings, blockers = [], [], []
    if not CONFIG.get("og_image"):
        blockers.append("no og_image in site.config.json (a 1200x630 social share card: needs a real image, his call)")
    if origin.endswith(".example"):
        blockers.append(f"origin is the placeholder {origin} (set site.config.json once the domain is bought)")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copytree(PUBLIC, DIST, dirs_exist_ok=True)
    css = (SRC / "styles" / "site.css").read_text(encoding="utf-8")
    gate_css(css, errors)
    fonts = (SRC / "styles" / "fonts.css").read_text(encoding="utf-8")
    (DIST / "site.css").write_text(minify_css(fonts + "\n" + css), encoding="utf-8")
    shutil.copy(SRC / "js" / "site.js", DIST / "site.js")

    sitemap, pages_for_llms = [], []
    for page in sorted((SRC / "pages").glob("*.html")):
        doc, meta = render(page, origin)
        gate_page(page.name, doc, meta, errors, warnings, blockers)
        (DIST / page.name).write_text(doc, encoding="utf-8")
        if meta.get("sitemap") == "yes":
            url = origin + ("/" if meta["path"] == "/" else meta["path"])
            sitemap.append(url)
            if "legal_draft" not in meta:
                pages_for_llms.append((url, meta["title"].split(" · ")[0], meta["description"]))

    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc></url>\n" for u in sitemap) + "</urlset>\n", encoding="utf-8")
    # Answer engines are named explicitly (PRD doc 03 §6). Same effect as the general rule.
    ai_bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended"]
    robots = "".join(f"User-agent: {b}\nAllow: /\n\n" for b in ai_bots)
    (DIST / "robots.txt").write_text(robots + f"User-agent: *\nAllow: /\n\nSitemap: {origin}/sitemap.xml\n", encoding="utf-8")
    llms = ["# Cortex Studio", "", f"> {CONFIG['description']}", ""]
    llms += [f"- [{t}]({u}): {d}" for u, t, d in pages_for_llms]
    (DIST / "llms.txt").write_text("\n".join(llms) + "\n", encoding="utf-8")

    for w in warnings:
        print("WARN   ", w)
    for b in blockers:
        print("ERROR  " if deploy else "LAUNCH ", b)
    for e in errors:
        print("ERROR  ", e)
    failed = bool(errors) or (deploy and bool(blockers))
    verdict = "FAIL" if failed else ("PASS (deploy)" if deploy else "PASS (local; launch blockers listed)")
    print(f"{verdict} · {len(sitemap)} pages in sitemap · dist/ written")

    with (SITE / "RUNLOG.md").open("a", encoding="utf-8") as log:
        log.write(f"- {datetime.now():%Y-%m-%d %H:%M} · site-build · {'deploy' if deploy else 'local'} build · dist/ · "
                  f"{verdict}, {len(errors)} errors, {len(blockers)} launch blockers, {len(warnings)} warnings\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
