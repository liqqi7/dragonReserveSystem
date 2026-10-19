"""Local API with an owned SSH MySQL tunnel and server-backed test media.

Never seed/migrate databases, start another worker, or fall back to local data.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager, ExitStack
import hashlib
import ipaddress
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import shutil
import signal
import socket
import subprocess
import sys
import time
import uuid
from urllib.parse import urlsplit

from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND = Path(__file__).resolve().parents[1]
TEST_DATABASE = "dragon_reserve_test"
REMOTE_ROOT = "/home/ubuntu/apps/dragonReserveSystem-test/data"


def read_environment(path):
    if not path.is_file():
        raise RuntimeError("Missing test env file; configure .env.test from .env.test.example")
    values = {k: v for k, v in dotenv_values(path).items() if v is not None}
    if values.get("APP_ENV") != "test":
        raise RuntimeError("The selected file must explicitly set APP_ENV=test")
    try:
        url = make_url(values.get("DATABASE_URL", ""))
    except Exception:
        raise RuntimeError("Invalid test DATABASE_URL") from None
    if url.drivername != "mysql+pymysql" or url.database != TEST_DATABASE:
        raise RuntimeError("Test DATABASE_URL must use mysql+pymysql and dragon_reserve_test")
    values.setdefault("SSH_TEST_DB_HOST", "124.156.228.148")
    values.setdefault("SSH_TEST_DB_USER", "ubuntu")
    host = values["SSH_TEST_DB_HOST"]
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9.-]*", host) or host.lower() == "localhost":
        raise RuntimeError("SSH_TEST_DB_HOST must identify the remote test server")
    try:
        if ipaddress.ip_address(host).is_loopback:
            raise RuntimeError("The SSH server must not be local")
    except ValueError:
        pass
    if not re.fullmatch(r"[a-zA-Z0-9_][a-zA-Z0-9_.-]*", values["SSH_TEST_DB_USER"]):
        raise RuntimeError("Invalid SSH test user")
    if values.get("TEST_REMOTE_DATA_ROOT", REMOTE_ROOT) != REMOTE_ROOT:
        raise RuntimeError("Only the dedicated server test data directory is allowed")
    values["TEST_REMOTE_DATA_ROOT"] = REMOTE_ROOT
    return values


def ssh_args(values):
    args = ["ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=10",
            "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=2"]
    if values.get("SSH_TEST_DB_IDENTITY_FILE"):
        args += ["-i", str(Path(values["SSH_TEST_DB_IDENTITY_FILE"]).expanduser())]
    return args


def remote(values, command):
    result = subprocess.run(ssh_args(values) + [f"{values['SSH_TEST_DB_USER']}@{values['SSH_TEST_DB_HOST']}", command],
                            capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise RuntimeError("Remote test server check failed (SSH/host key/path); no local fallback")
    return result.stdout.strip()


def server_test_settings(values):
    directory = remote(values, "systemctl show dragonreserve-backend-test.service -p WorkingDirectory --value")
    prefix = "/home/ubuntu/apps/dragonReserveSystem-test/releases/"
    if not directory.startswith(prefix) or not directory.endswith("/backend") or ".." in directory:
        raise RuntimeError("Cannot locate the dedicated server test configuration")
    code = "import json; from dotenv import dotenv_values; print(json.dumps({k:v for k,v in dotenv_values('.env').items() if v is not None}))"
    python = "/home/ubuntu/apps/dragonReserveSystem/backend/.venv/bin/python"
    result = json.loads(remote(values, f"cd {shlex.quote(directory)} && {python} -c {shlex.quote(code)}"))
    if result.get("APP_ENV") != "test" or make_url(result.get("DATABASE_URL", "")).database != TEST_DATABASE:
        raise RuntimeError("Remote API configuration is not the expected test environment")
    if (result.get("MEDIA_ROOT") != REMOTE_ROOT + "/storage" or
            result.get("MEMORY_STORAGE_ROOT") != REMOTE_ROOT + "/memories"):
        raise RuntimeError("Remote API and local mount do not share the same test media directories")
    if len(result.get("MEMORY_MEDIA_SIGNING_KEY", "")) < 32 or not result.get("JWT_SECRET_KEY"):
        raise RuntimeError("Server test signing configuration is incomplete")
    public = urlsplit(result.get("PUBLIC_BASE_URL", ""))
    if public.scheme != "https" or not public.hostname or public.path.rstrip("/") != "/test-api":
        raise RuntimeError("Server test media require the dedicated HTTPS test origin")
    # Credentials live only in process memory, never in copied local env files.
    return result


def stop_process(process):
    if os.name == "nt":
        if process.poll() is not None:
            return
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
    else:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            return
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


@contextmanager
def running(command, **kwargs):
    if os.name == "nt":
        kwargs.setdefault("creationflags", subprocess.CREATE_NEW_PROCESS_GROUP)
    else:
        kwargs.setdefault("start_new_session", True)
    process = subprocess.Popen(command, **kwargs)
    try:
        yield process
    finally:
        stop_process(process)


def free_port():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


@contextmanager
def database_tunnel(values):
    port = free_port()
    remote_port = int(values.get("SSH_TEST_DB_REMOTE_PORT", "3306"))
    if not 1 <= remote_port <= 65535:
        raise RuntimeError("Invalid remote database port")
    # MySQL is on the authenticated media server, never a reused local port.
    args = ssh_args(values) + ["-o", "ExitOnForwardFailure=yes", "-N", "-L",
        f"127.0.0.1:{port}:127.0.0.1:{remote_port}", f"{values['SSH_TEST_DB_USER']}@{values['SSH_TEST_DB_HOST']}"]
    with running(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) as process:
        for _ in range(50):
            if process.poll() is not None:
                raise RuntimeError("Owned SSH database tunnel failed to start")
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("SSH database tunnel timed out")
        url = make_url(values["DATABASE_URL"]).set(host="127.0.0.1", port=port)
        engine = create_engine(url, connect_args={"connect_timeout": 10})
        try:
            with engine.connect() as connection:
                if connection.scalar(text("SELECT DATABASE()")) != TEST_DATABASE:
                    raise RuntimeError("Wrong test database")
        except Exception:
            raise RuntimeError("Remote test MySQL validation failed; no local fallback") from None
        finally:
            engine.dispose()
        yield url.render_as_string(hide_password=False), process


def cygwin_path(path):
    return f"/cygdrive/{path.drive[0].lower()}{path.as_posix()[2:]}"


def mount_command(values, mount):
    target = f"{values['SSH_TEST_DB_USER']}@{values['SSH_TEST_DB_HOST']}:{values['TEST_REMOTE_DATA_ROOT']}"
    options = ["-f", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ServerAliveInterval=15",
               "-o", "ServerAliveCountMax=2", "-o", "dir_cache=yes", "-o", "dcache_timeout=1", "-o", "sshfs_sync"]
    identity = Path(values.get("SSH_TEST_DB_IDENTITY_FILE", "~/.ssh/id_rsa")).expanduser().resolve()
    known_hosts = Path("~/.ssh/known_hosts").expanduser().resolve()
    if os.name == "nt":
        executable = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "SSHFS-Win/bin/sshfs-win.exe"
        if not executable.is_file():
            raise RuntimeError("Install WinFsp and SSHFS-Win first")
        options += ["-o", "uid=-1,gid=-1", "-o", f"IdentityFile={cygwin_path(identity)}",
                    "-o", f"UserKnownHostsFile={cygwin_path(known_hosts)}"]
        return [str(executable), "cmd", target, str(mount).rstrip("\\/"), *options]
    if not shutil.which("sshfs"):
        raise RuntimeError("Install sshfs first")
    options += ["-o", f"IdentityFile={identity}", "-o", f"UserKnownHostsFile={known_hosts}"]
    return ["sshfs", target, str(mount), *options]


def verify_remote_storage(values, mount):
    root = values["TEST_REMOTE_DATA_ROOT"]
    if remote(values, f"realpath {shlex.quote(root)}") != root:
        raise RuntimeError("Remote root resolves outside the dedicated test directory")
    for name in ("storage", "memories"):
        if remote(values, f"realpath {shlex.quote(root + '/' + name)}") != root + '/' + name:
            raise RuntimeError("Remote media subdirectory resolves outside the dedicated test directory")
        if not (mount / name).is_dir():
            raise RuntimeError("Remote media directories are missing; no local creation")
    probe = mount / (".local-api-probe-" + uuid.uuid4().hex)
    payload = uuid.uuid4().bytes
    remote_path = shlex.quote(str(PurePosixPath(root) / probe.name))
    try:
        with probe.open("xb") as stream:
            stream.write(payload)
        if remote(values, f"sha256sum {remote_path}").split()[0] != hashlib.sha256(payload).hexdigest():
            raise RuntimeError("Mounted media do not match the authenticated test server")
    finally:
        probe.unlink(missing_ok=True)
    remote(values, f"test ! -e {remote_path}")


@contextmanager
def media_mount(values):
    mount = Path(values.get("TEST_MEDIA_MOUNT", "R:/" if os.name == "nt" else str(BACKEND / "storage/test-remote-mount")))
    if os.name == "nt":
        if not re.fullmatch(r"[D-Zd-z]:[\\/]?", str(mount)) or mount.exists():
            raise RuntimeError("TEST_MEDIA_MOUNT must be an unused drive letter (default R:)")
        mount = Path(mount.drive + "/")
    else:
        mount.mkdir(parents=True, exist_ok=True)
        if any(mount.iterdir()) or os.path.ismount(mount):
            raise RuntimeError("TEST_MEDIA_MOUNT must be empty and unmounted")
    try:
        with running(mount_command(values, mount), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) as process:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError("Remote media mount failed; check SSHFS and SSH credentials")
                if (mount / "storage").is_dir():
                    break
                time.sleep(0.1)
            else:
                raise RuntimeError("Remote media mount timed out")
            verify_remote_storage(values, mount)
            yield mount, process
    finally:
        if os.name != "nt" and os.path.ismount(mount):
            command = ["umount", str(mount)] if sys.platform == "darwin" else ["fusermount", "-u", str(mount)]
            subprocess.run(command, check=True, timeout=15)


def config_for_origin(template, origin):
    source, count = re.subn(r'const API_BASE_URL = "[^"]+";', f'const API_BASE_URL = "{origin}/api/v1";', template)
    if count != 1:
        raise RuntimeError("Invalid mini-program config template")
    return source.replace('const API_ENVIRONMENT = "production";', 'const API_ENVIRONMENT = "test";')


def release_session(session):
    lock = BACKEND / "storage/test-environment.lock"
    stop = BACKEND / "storage/test-environment.stop"
    if lock.is_file() and json.loads(lock.read_text(encoding="utf-8")).get("token") == session["token"]:
        lock.unlink()
    if stop.is_file() and stop.read_text(encoding="utf-8") == session["token"]:
        stop.unlink()


@contextmanager
def mini_program_config(origin, defer_release=False):
    config = BACKEND.parent / "miniprogram/services/config.js"
    template = config.with_suffix(".js.template").read_text(encoding="utf-8")
    generated = config_for_origin(template, origin)
    lock = BACKEND / "storage/test-environment.lock"
    lock.parent.mkdir(parents=True, exist_ok=True)
    session = {"pid": os.getpid(), "token": uuid.uuid4().hex, "api_origin": origin}
    with lock.open("x", encoding="utf-8") as handle:
        json.dump(session, handle)
    active = False
    try:
        config.write_text(generated, encoding="utf-8")
        active = True
        yield session
    finally:
        try:
            if config.is_file() and config.read_text(encoding="utf-8-sig") == generated:
                config.write_text(template, encoding="utf-8")
        finally:
            if not defer_release or not active:
                release_session(session)


def stop_requested(session):
    marker = BACKEND / "storage/test-environment.stop"
    return marker.is_file() and marker.read_text(encoding="utf-8") == session["token"]


def request_stop():
    lock = BACKEND / "storage/test-environment.lock"
    if not lock.is_file():
        raise RuntimeError("No managed local test session is running")
    session = json.loads(lock.read_text(encoding="utf-8"))
    if not re.fullmatch(r"[a-f0-9]{32}", session.get("token", "")):
        raise RuntimeError("Invalid test session record; inspect it before cleanup")
    (BACKEND / "storage/test-environment.stop").write_text(session["token"], encoding="utf-8")
    for _ in range(120):
        if not lock.exists():
            print("Local test session stopped and mini-program configuration restored", flush=True)
            return
        time.sleep(0.25)
    raise RuntimeError("Stop requested but not completed; inspect the session process before removing its lock")


def runtime_environment(values, database_url, mount, origin, server_values=None):
    env = {**os.environ, **values, **(server_values or {})}
    env.update(APP_ENV="test", ALLOW_LOCAL_TEST_DATABASE="false", DATABASE_URL=database_url,
               MEDIA_ROOT=str(mount / "storage"), MEMORY_STORAGE_ROOT=str(mount / "memories"),
               PUBLIC_BASE_URL=(server_values or {}).get("PUBLIC_BASE_URL", origin),
               TEST_REQUEST_LOG_FILE=str(BACKEND / "test-request.log"))
    for binary in ("ffmpeg", "ffprobe"):
        key = "MEMORY_" + binary.upper()
        candidate = (Path(os.environ.get("LOCALAPPDATA", "")) / "Programs/FFmpeg/bin" / (binary + ".exe"))
        env[key] = values.get(key) or shutil.which(binary) or (str(candidate) if os.name == "nt" and candidate.is_file() else binary)
    return env


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=BACKEND / ".env.test")
    parser.add_argument("--app-host", default="127.0.0.1")
    parser.add_argument("--app-port", type=int, default=8001)
    parser.add_argument("--mini-program-host", default="")
    parser.add_argument("--reload", action="store_true")
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--stop", action="store_true")
    args = parser.parse_args()
    if args.stop:
        request_stop()
        return
    if not 1 <= args.app_port <= 65535:
        parser.error("Invalid API port")
    host = args.mini_program_host or ("127.0.0.1" if args.app_host == "0.0.0.0" else args.app_host)
    address = ipaddress.ip_address(host)
    if not address.is_loopback and not (address.version == 4 and any(address in ipaddress.ip_network(n)
            for n in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"))):
        parser.error("API origin must use localhost or a trusted LAN IPv4")
    origin = f"http://{host}:{args.app_port}"
    values = read_environment(args.env_file.resolve())
    session = None
    with ExitStack() as stack:
        stack.callback(lambda: release_session(session) if session else None)
        server_values = server_test_settings(values)
        database_url, tunnel = stack.enter_context(database_tunnel(values))
        mount, filesystem = stack.enter_context(media_mount(values))
        env = runtime_environment(values, database_url, mount, origin, server_values)
        print(json.dumps({"database": TEST_DATABASE, "ssh_server": values["SSH_TEST_DB_HOST"],
                          "media_directory": values["TEST_REMOTE_DATA_ROOT"], "api_origin": origin,
                          "remote_storage_verified": True}), flush=True)
        if args.check_only:
            return
        with socket.socket() as probe:
            probe.bind((args.app_host, args.app_port))
        session = stack.enter_context(mini_program_config(origin, defer_release=True))
        command = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", args.app_host, "--port", str(args.app_port)]
        if args.reload:
            command.append("--reload")
        api = stack.enter_context(running(command, cwd=BACKEND, env=env))
        while api.poll() is None:
            if stop_requested(session):
                return
            if tunnel.poll() is not None or filesystem.poll() is not None:
                raise RuntimeError("Remote dependency disconnected; stopping the local API")
            time.sleep(0.3)
        if api.returncode:
            raise RuntimeError("Local test API exited with an error")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as exc:
        # Native database errors may contain passwords; never expose them here.
        message = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__
        print(f"Test environment stopped: {message}", file=sys.stderr)
        sys.exit(1)
