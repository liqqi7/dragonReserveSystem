VENV ?= .venv
PYTHON ?= $(VENV)/bin/python
PIP ?= $(PYTHON) -m pip
UVICORN ?= $(VENV)/bin/uvicorn
ALEMBIC ?= $(VENV)/bin/alembic

.PHONY: install copy-env copy-prod-env render-deploy db-up db-down db-up-brew db-down-brew migrate create-admin run run-prod run-test-env dev-check test

install:
	$(PIP) install -r requirements.txt

copy-env:
	cp -n .env.example .env || true

copy-prod-env:
	cp -n .env.production.example .env || true

render-deploy:
	$(PYTHON) scripts/render_deploy_templates.py

db-up:
	docker compose up -d mysql

db-down:
	docker compose down

db-up-brew:
	brew services start mysql

db-down-brew:
	brew services stop mysql

migrate:
	$(ALEMBIC) upgrade head

create-admin:
	$(PYTHON) scripts/create_admin.py

run:
	$(UVICORN) app.main:app --reload --host 0.0.0.0 --port 8000

run-prod:
	$(UVICORN) app.main:app --host 127.0.0.1 --port 8000

run-test-env:
	./scripts/start_test_env.sh

dev-check:
	PYTHONPYCACHEPREFIX=/tmp/python-cache $(PYTHON) -m compileall app scripts alembic

test:
	$(PYTHON) -m pytest tests -q
