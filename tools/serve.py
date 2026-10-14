"""Local preview of dist/ with clean URLs and a DRY-RUN form endpoint.

    python site/tools/serve.py [port]      default port 8787

POST /api/request is validated like the real function, then dropped: nothing is stored,
forwarded or printed except a field count. The real handler is functions/api/request.js.
"""

from __future__ import annotations

import json
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs

DIST = Path(__file__).resolve().parent.parent / "dist"


def site_headers() -> list[tuple[str, str]]:
    """The '/*' block of _headers, so the local preview enforces the production CSP."""
    out, active = [], False
    for line in (DIST / "_headers").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        if not line.startswith((" ", "	")):
            active = line.strip() == "/*"
            continue
        if active and ":" in line:
            key, value = line.strip().split(":", 1)
            if key != "Strict-Transport-Security":  # meaningless on http://localhost
                out.append((key.strip(), value.strip().replace(" upgrade-insecure-requests", "")))
    return out


HEADERS = site_headers() if (DIST / "_headers").exists() else []
REQUIRED = ["name", "email", "role", "firm", "location", "photo_types", "consent"]
EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def end_headers(self):
        for key, value in HEADERS:
            self.send_header(key, value)
        super().end_headers()

    def translate_path(self, path):
        clean = path.split("?", 1)[0]
        if clean not in ("/", "") and "." not in clean.rsplit("/", 1)[-1]:
            candidate = DIST / (clean.strip("/") + ".html")
            if candidate.exists():
                return str(candidate)
        return super().translate_path(path)

    def send_error(self, code, message=None, explain=None):
        if code == 404 and (DIST / "404.html").exists():
            body = (DIST / "404.html").read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def do_POST(self):
        if self.path != "/api/request":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8", errors="replace")
        ctype = self.headers.get("Content-Type", "")
        if "multipart/form-data" in ctype:
            fields = dict(re.findall(r'name="([^"]+)"\r\n\r\n(.*?)\r\n', raw, flags=re.S))
        else:
            fields = {k: v[0] for k, v in parse_qs(raw).items()}
        wants_json = "application/json" in self.headers.get("Accept", "")
        error = None
        if fields.get("company_url", "").strip():
            error = None  # honeypot: pretend success
        elif any(not fields.get(k, "").strip() for k in REQUIRED):
            error = "Please complete every required field."
        elif not EMAIL.match(fields.get("email", "")):
            error = "Please check the email address."
        print(f"DRY RUN /api/request: {len(fields)} fields, {'rejected' if error else 'accepted'} (not stored, not forwarded)")
        if error:
            self._json(400, {"error": error})
        elif wants_json:
            self._json(200, {"ok": True})
        else:
            self.send_response(303)
            self.send_header("Location", "/thanks")
            self.end_headers()

    def _json(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        if "/api/" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    print(f"Cortex Studio site (local preview): http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
