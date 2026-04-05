from __future__ import annotations

import os
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEPLOY_DIR = BACKEND_ROOT / "deploy"
DEFAULT_DOMAIN = "your-domain.example"


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"{name} is required")
    return value


def render_caddyfile(domain: str) -> str:
    return f"""{domain} {{
    encode zstd gzip

    reverse_proxy 127.0.0.1:8000

    header {{
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }}
}}
"""


def render_launchd_plist(project_root: Path) -> str:
    backend_root = project_root / "backend"
    venv_python = backend_root / ".venv" / "bin" / "python"
    stdout_log = backend_root / "logs" / "backend.stdout.log"
    stderr_log = backend_root / "logs" / "backend.stderr.log"

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.dragonreserve.backend</string>

  <key>ProgramArguments</key>
  <array>
    <string>{venv_python}</string>
    <string>-m</string>
    <string>uvicorn</string>
    <string>app.main:app</string>
    <string>--host</string>
    <string>127.0.0.1</string>
    <string>--port</string>
    <string>8000</string>
  </array>

  <key>WorkingDirectory</key>
  <string>{backend_root}</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PYTHONUNBUFFERED</key>
    <string>1</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>{stdout_log}</string>

  <key>StandardErrorPath</key>
  <string>{stderr_log}</string>
</dict>
</plist>
"""


def main() -> None:
    domain = require_env("SERVER_DOMAIN")
    if domain == DEFAULT_DOMAIN:
        raise SystemExit("SERVER_DOMAIN must not use the placeholder domain")

    project_root = Path(os.getenv("PROJECT_ROOT", str(BACKEND_ROOT.parent))).resolve()
    DEPLOY_DIR.mkdir(parents=True, exist_ok=True)

    caddyfile_path = DEPLOY_DIR / "Caddyfile.generated"
    plist_path = DEPLOY_DIR / "com.dragonreserve.backend.generated.plist"

    caddyfile_path.write_text(render_caddyfile(domain), encoding="utf-8")
    plist_path.write_text(render_launchd_plist(project_root), encoding="utf-8")

    print(f"generated {caddyfile_path}")
    print(f"generated {plist_path}")


if __name__ == "__main__":
    main()
