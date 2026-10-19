"""The daily integration environment never creates local business data."""
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from scripts import test_environment as runtime


def env_file(tmp_path, **overrides):
    values = dict(APP_ENV="test", DATABASE_URL="mysql+pymysql://test:secret@localhost:3307/dragon_reserve_test")
    values.update(overrides)
    path = tmp_path / "test.env"
    path.write_text("\n".join(f"{k}={v}" for k, v in values.items()), encoding="utf-8")
    return path


@pytest.mark.parametrize("overrides", [
    {"APP_ENV": "production"}, {"DATABASE_URL": "sqlite:///local.db"},
    {"DATABASE_URL": "mysql+pymysql://test:secret@localhost/dragon_reserve"},
    {"DATABASE_URL": ""}, {"SSH_TEST_DB_HOST": "localhost"}, {"SSH_TEST_DB_HOST": "127.0.0.1"},
    {"SSH_TEST_DB_HOST": "-bad-option"}, {"SSH_TEST_DB_USER": "-root"},
    {"TEST_REMOTE_DATA_ROOT": "/home/ubuntu/apps/dragonReserveSystem/backend/storage"},
])
def test_refuse_unsafe_targets_before_network(tmp_path, overrides):
    with pytest.raises(RuntimeError):
        runtime.read_environment(env_file(tmp_path, **overrides))


def test_runtime_ignores_inherited_local_database_and_media(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///stale.db")
    monkeypatch.setenv("MEDIA_ROOT", "old-local-files")
    monkeypatch.setenv("ALLOW_LOCAL_TEST_DATABASE", "true")
    values = runtime.read_environment(env_file(tmp_path))
    result = runtime.runtime_environment(values, "mysql+pymysql://test:secret@127.0.0.1:45000/dragon_reserve_test",
                                         tmp_path / "mounted", "http://127.0.0.1:8001")
    assert result["DATABASE_URL"].endswith("45000/dragon_reserve_test")
    assert result["MEDIA_ROOT"] == str(tmp_path / "mounted/storage")
    assert result["MEMORY_STORAGE_ROOT"] == str(tmp_path / "mounted/memories")
    assert result["ALLOW_LOCAL_TEST_DATABASE"] == "false"


@pytest.mark.parametrize("host", ["127.0.0.1", "192.168.10.2"])
def test_config_preserves_all_helpers(host):
    template = (runtime.BACKEND.parent / "miniprogram/services/config.js.template").read_text(encoding="utf-8")
    origin = f"http://{host}:8001"
    result = runtime.config_for_origin(template, origin)
    assert result == template.replace('const API_BASE_URL = "https://dragon.liqqihome.top/api/v1";',
                                     f'const API_BASE_URL = "{origin}/api/v1";').replace(
                                     'const API_ENVIRONMENT = "production";', 'const API_ENVIRONMENT = "test";')


def test_config_restores_template_and_rejects_parallel_owner(tmp_path, monkeypatch):
    backend = tmp_path / "backend"
    backend.mkdir()
    services = tmp_path / "miniprogram/services"
    services.mkdir(parents=True)
    template = 'const API_BASE_URL = "https://example.test/api/v1";\nconst API_ENVIRONMENT = "production";'
    (services / "config.js.template").write_text(template)
    config = services / "config.js"
    config.write_text(template)
    monkeypatch.setattr(runtime, "BACKEND", backend)
    with runtime.mini_program_config("http://127.0.0.1:8001"):
        assert '"test"' in config.read_text()
        with pytest.raises(FileExistsError):
            with runtime.mini_program_config("http://127.0.0.1:8002"):
                pytest.fail("Only one config owner is allowed")
    assert config.read_text() == template
    assert not (backend / "storage/test-environment.lock").exists()


def test_probe_is_checked_from_server_and_removed(tmp_path, monkeypatch):
    for name in ("storage", "memories"):
        (tmp_path / name).mkdir()
    calls = []
    def remote(values, command):
        calls.append(command)
        if command.startswith("realpath"):
            return command.split(" ", 1)[1]
        if command.startswith("sha256sum"):
            file = next(tmp_path.glob(".local-api-probe-*"))
            return runtime.hashlib.sha256(file.read_bytes()).hexdigest() + "  probe"
        assert not list(tmp_path.glob(".local-api-probe-*"))
        return ""
    monkeypatch.setattr(runtime, "remote", remote)
    runtime.verify_remote_storage({"TEST_REMOTE_DATA_ROOT": runtime.REMOTE_ROOT}, tmp_path)
    assert len(calls) == 5


def test_wrong_remote_root_or_hash_never_accepted(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime, "remote", lambda *args: "/production")
    with pytest.raises(RuntimeError, match="outside"):
        runtime.verify_remote_storage({"TEST_REMOTE_DATA_ROOT": runtime.REMOTE_ROOT}, tmp_path)
    for name in ("storage", "memories"):
        (tmp_path / name).mkdir()
    monkeypatch.setattr(runtime, "remote", lambda _, command: command.split(" ", 1)[1] if command.startswith("realpath") else "wrong")
    with pytest.raises(RuntimeError, match="do not match"):
        runtime.verify_remote_storage({"TEST_REMOTE_DATA_ROOT": runtime.REMOTE_ROOT}, tmp_path)
    assert not list(tmp_path.glob(".local-api-probe-*"))


@pytest.mark.parametrize("environment", ["test", "development"])
def test_sqlite_requires_isolated_test_opt_in(environment):
    with pytest.raises(ValidationError, match="SQLite is only allowed"):
        Settings(_env_file=None, APP_ENV=environment, database_url="sqlite://", allow_local_test_database=False)
    if environment == "test":
        assert Settings(_env_file=None, APP_ENV=environment, database_url="sqlite://",
                        allow_local_test_database=True).database_url == "sqlite://"


def test_no_database_default_and_retired_local_launchers():
    with pytest.raises(ValidationError, match="DATABASE_URL is required"):
        Settings(_env_file=None, APP_ENV="test", database_url="")
    scripts = runtime.BACKEND / "scripts"
    for name in ("start_backend_local_phone.ps1", "init_local_phone_db.py"):
        assert not (scripts / name).exists()
    for name in ("start_backend_test.ps1", "start_backend_test.sh"):
        source = (scripts / name).read_text()
        assert "test_environment.py" in source
        assert "sqlite" not in source.lower()


def test_remote_test_config_is_authoritative_and_not_written_locally(monkeypatch):
    remote_values = {"APP_ENV": "test", "DATABASE_URL": "mysql+pymysql://test:secret@localhost/dragon_reserve_test",
                     "PUBLIC_BASE_URL": "https://dragon.liqqihome.top/test-api",
                     "MEDIA_ROOT": runtime.REMOTE_ROOT + "/storage", "MEMORY_STORAGE_ROOT": runtime.REMOTE_ROOT + "/memories",
                     "JWT_SECRET_KEY": "existing-test-jwt", "MEMORY_MEDIA_SIGNING_KEY": "m" * 64}
    responses = iter(["/home/ubuntu/apps/dragonReserveSystem-test/releases/current/backend", runtime.json.dumps(remote_values)])
    monkeypatch.setattr(runtime, "remote", lambda *args: next(responses))
    result = runtime.server_test_settings({})
    environment = runtime.runtime_environment({"JWT_SECRET_KEY": "stale-local-key"}, remote_values["DATABASE_URL"],
                                              Path("remote-mount"), "http://127.0.0.1:8001", result)
    assert environment["JWT_SECRET_KEY"] == "existing-test-jwt"
    assert environment["MEMORY_MEDIA_SIGNING_KEY"] == "m" * 64
    assert environment["PUBLIC_BASE_URL"] == "https://dragon.liqqihome.top/test-api"


def test_production_server_config_path_is_rejected(monkeypatch):
    monkeypatch.setattr(runtime, "remote", lambda *args: "/home/ubuntu/apps/dragonReserveSystem/backend")
    with pytest.raises(RuntimeError, match="dedicated server test"):
        runtime.server_test_settings({})


def test_local_media_validation_binary_paths_override_server_paths(monkeypatch):
    monkeypatch.setattr(runtime.shutil, "which", lambda binary: "/local/bin/" + binary)
    environment = runtime.runtime_environment({}, "mysql+pymysql://test@host/dragon_reserve_test", Path("mount"),
                                              "http://127.0.0.1:8001", {"MEMORY_FFMPEG": "/usr/bin/ffmpeg"})
    assert environment["MEMORY_FFMPEG"] == "/local/bin/ffmpeg"
    assert environment["MEMORY_FFPROBE"] == "/local/bin/ffprobe"


def test_stop_marker_is_scoped_to_the_current_session(tmp_path, monkeypatch):
    backend = tmp_path / "backend"
    (backend / "storage").mkdir(parents=True)
    monkeypatch.setattr(runtime, "BACKEND", backend)
    marker = backend / "storage/test-environment.stop"
    session = {"token": "a" * 32}
    assert not runtime.stop_requested(session)
    marker.write_text("b" * 32)
    assert not runtime.stop_requested(session)
    marker.write_text("a" * 32)
    assert runtime.stop_requested(session)


def test_stop_does_not_require_a_database_or_create_another_session(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime, "BACKEND", tmp_path)
    with pytest.raises(RuntimeError, match="No managed"):
        runtime.request_stop()
    assert not list(tmp_path.iterdir())


def test_deferred_session_lock_is_released_after_owned_resources(tmp_path, monkeypatch):
    backend = tmp_path / "backend"
    backend.mkdir()
    services = tmp_path / "miniprogram/services"
    services.mkdir(parents=True)
    template = 'const API_BASE_URL = "https://example.test/api/v1";\nconst API_ENVIRONMENT = "production";'
    (services / "config.js.template").write_text(template)
    (services / "config.js").write_text(template)
    monkeypatch.setattr(runtime, "BACKEND", backend)
    with runtime.mini_program_config("http://127.0.0.1:8001", defer_release=True) as session:
        assert (backend / "storage/test-environment.lock").exists()
    assert (services / "config.js").read_text() == template
    assert (backend / "storage/test-environment.lock").exists()
    runtime.release_session({"token": "not-the-owner"})
    assert (backend / "storage/test-environment.lock").exists()
    runtime.release_session(session)
    assert not (backend / "storage/test-environment.lock").exists()


@pytest.mark.parametrize("failure", ["invalid_template", "removed_config", "write_error"])
def test_failed_config_setup_or_cleanup_never_strands_its_lock(tmp_path, monkeypatch, failure):
    backend = tmp_path / "backend"
    backend.mkdir()
    services = tmp_path / "miniprogram/services"
    services.mkdir(parents=True)
    config = services / "config.js"
    template = 'const API_BASE_URL = "https://example.test/api/v1";'
    config.with_suffix(".js.template").write_text("invalid" if failure == "invalid_template" else template)
    config.write_text(template)
    monkeypatch.setattr(runtime, "BACKEND", backend)
    if failure == "write_error":
        original = Path.write_text
        def write(path, *args, **kwargs):
            if path == config:
                raise OSError("disk unavailable")
            return original(path, *args, **kwargs)
        monkeypatch.setattr(Path, "write_text", write)
    if failure == "removed_config":
        with runtime.mini_program_config("http://127.0.0.1:8001"):
            config.unlink()
    else:
        with pytest.raises((RuntimeError, OSError)):
            with runtime.mini_program_config("http://127.0.0.1:8001"):
                pytest.fail("setup must fail")
    assert not (backend / "storage/test-environment.lock").exists()


@pytest.mark.parametrize("environment", ["development", "production"])
def test_sqlite_driver_suffix_cannot_bypass_database_guard(environment):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, APP_ENV=environment, database_url="sqlite+pysqlite://",
                 allow_local_test_database=False, jwt_secret_key="configured-secret",
                 user_invite_code="member", admin_invite_code="admin")


def test_isolated_tests_can_explicitly_use_a_sqlite_driver():
    settings = Settings(_env_file=None, APP_ENV="test", database_url="sqlite+pysqlite://",
                        allow_local_test_database=True)
    assert settings.is_sqlite
    assert not settings.is_production_runtime


def test_seed_dry_run_does_not_connect_or_change_process_environment(tmp_path, monkeypatch):
    from scripts import seed_test_database as seed
    path = env_file(tmp_path)
    monkeypatch.setattr(runtime.sys, "argv", ["seed_test_database.py", "--env-file", str(path)])
    monkeypatch.setattr(runtime, "database_tunnel", lambda *args: pytest.fail("Dry-run must not connect"))
    before = dict(runtime.os.environ)
    seed.main()
    assert dict(runtime.os.environ) == before
