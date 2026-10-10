from pathlib import Path
import subprocess
import sys
from textwrap import dedent

import pytest
from jose import JWTError

from app.core.security import create_access_token, decode_access_token


@pytest.mark.parametrize("role", ["admin", "user", "guest"])
def test_access_token_round_trip(role: str) -> None:
    token = create_access_token(subject="42", role=role)
    payload = decode_access_token(token)

    assert payload.sub == "42"
    assert payload.role == role
    assert payload.exp > 0


def test_expired_access_token_is_rejected() -> None:
    token = create_access_token(subject="42", role="user", expires_minutes=-1)

    with pytest.raises(JWTError):
        decode_access_token(token)


def test_application_import_and_tokens_do_not_require_password_packages() -> None:
    code = dedent("""
        import builtins

        original_import = builtins.__import__

        def without_password_packages(name, *args, **kwargs):
            if name.split('.')[0] in {'passlib', 'bcrypt'}:
                raise ModuleNotFoundError(name)
            return original_import(name, *args, **kwargs)

        builtins.__import__ = without_password_packages
        from app.main import app
        from app.core.security import create_access_token, decode_access_token

        assert app is not None
        payload = decode_access_token(create_access_token('42', 'user'))
        assert payload.sub == '42'
        assert payload.role == 'user'
    """)
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
