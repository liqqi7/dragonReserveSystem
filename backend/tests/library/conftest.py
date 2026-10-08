"""Isolated library API tests. Full application regressions still require main dependencies."""
import importlib.util
from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.core.database import Base, get_db
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.api.deps import get_current_user
from app.models import User


@pytest.fixture()
def library(tmp_path, monkeypatch):
    settings = get_settings()
    for name, value in dict(boardgame_enabled=True, boardgame_preview_worker_enabled=True,
            bgg_enabled=True, bgg_api_token='test-token', bgg_min_interval_seconds=0).items():
        monkeypatch.setattr(settings, name, value)
    engine = create_engine(f'sqlite:///{tmp_path / "library.db"}', connect_args={'check_same_thread':False})
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, class_=Session, expire_on_commit=False, autoflush=False)
    db = factory()
    actor = User(nickname='甲', avatar_url='', role='user')
    other = User(nickname='乙', avatar_url='', role='user')
    db.add_all([actor, other]); db.commit()
    app = FastAPI()
    # Load only the three new routers. Importing app.api.v1 normally also loads
    # unrelated share rendering dependencies, covered by the separate full suite.
    root = Path(__file__).resolve().parents[2] / 'app' / 'api' / 'v1'
    for name in ('boardgames','boardgame_intake','boardgame_search'):
        spec = importlib.util.spec_from_file_location(f'library_test_{name}', root / f'{name}.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        app.include_router(module.router, prefix='/api/v1')
    app.dependency_overrides[get_current_user] = lambda: actor
    app.dependency_overrides[get_db] = lambda: db
    @app.exception_handler(AppError)
    async def error_handler(request, error):
        return JSONResponse(status_code=error.status_code, content={'code':error.code,'details':error.details})
    with TestClient(app) as client:
        yield client, db, actor, other, factory, app
    db.close(); engine.dispose()
