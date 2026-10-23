"""Purchase date removal preserves editions, provenance and useful filters."""
import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
import sqlalchemy as sa

from app.models.boardgame import Inventory
from app.services.boardgame_source_semantics import copy_projection
from tests.test_boardgame_api import boardgame_feature, create, game


def test_inventory_contract_has_no_purchase_date(client, user_headers, normal_user):
    g = game(client, user_headers)
    body = {'game_id': g['id'], 'owner_user_id': normal_user.id}
    box = create(client, user_headers, '/boardgame-inventory', body)['items'][0]
    assert 'purchased_on' not in Inventory.__table__.c
    assert 'purchased_on' not in box['internal']
    create(client, user_headers, '/boardgame-inventory', {**body, 'purchased_on': '2026-01-01'}, expected=422)
    response = client.patch(f'/api/v1/boardgame-inventory/{box["id"]}', headers=user_headers,
                            json={'expected_revision': box['revision'], 'purchased_on': '2026-01-01'})
    assert response.status_code == 422
    assert client.get('/api/v1/boardgames?purchased_from=2026-01-01', headers=user_headers).status_code == 422
    assert client.get('/api/v1/boardgames?purchased_to=2026-01-01', headers=user_headers).status_code == 422
    schemas = client.get('/openapi.json').json()['components']['schemas']
    for name in ('InventoryCreate', 'InventoryPatch', 'IntakeInventory'):
        assert 'purchased_on' not in schemas[name]['properties']


def test_source_dates_are_not_projected_into_inventory():
    issues = []
    projected = copy_projection({'versionName': 'Chinese edition', 'statusOwned': True,
                                 'acquisitionDate': 'not-a-date'},
                                {'AcquisitionDate': 'also-invalid', 'PricePaid': '0', 'PricePaidCurrency': 'CNY'}, issues)
    assert 'purchased_on' not in projected
    assert projected['edition_name'] == 'Chinese edition'
    assert projected['purchase_price'] == '0' and issues == []


def test_migration_removes_column_and_projections_without_losing_editions_or_raw_archive():
    path = Path(__file__).parents[1] / 'alembic/versions/20261007_0019_remove_inventory_purchase_date.py'
    spec = importlib.util.spec_from_file_location('remove_inventory_purchase_date', path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    metadata = sa.MetaData()
    inventory = sa.Table('boardgame_inventory', metadata, sa.Column('id', sa.Integer, primary_key=True),
                         sa.Column('purchased_on', sa.Date), sa.Column('bgg_version_snapshot', sa.JSON))
    reference = sa.Table('copy_links', metadata, sa.Column('id', sa.Integer, primary_key=True),
                        sa.Column('inventory_id', sa.ForeignKey(inventory.c.id)))
    filters = sa.Table('boardgame_saved_filters', metadata, sa.Column('id', sa.Integer, primary_key=True),
                       sa.Column('query', sa.JSON))
    imports = sa.Table('boardgame_import_items', metadata, sa.Column('id', sa.Integer, primary_key=True),
                       sa.Column('payload', sa.JSON), sa.Column('decision', sa.JSON))
    engine = sa.create_engine('sqlite://')
    with engine.begin() as connection:
        connection.exec_driver_sql('PRAGMA foreign_keys=ON')
        metadata.create_all(connection)
        connection.execute(inventory.insert().values(id=1, bgg_version_snapshot={'name': '中文版'}))
        connection.execute(reference.insert().values(id=1, inventory_id=1))
        connection.execute(filters.insert().values(id=1, query={'owned': True, 'purchased_from': '2026-01-01',
                                                               'purchased_to': '2026-02-01'}))
        raw = {'acquisitionDate': '2026-01-01', 'versionName': '中文版'}
        connection.execute(imports.insert().values(id=1,
            payload={'raw': raw, 'normalized': {'purchased_on': '2026-01-01',
                     'inventory': {'purchased_on': '2026-01-01', 'edition_name': '中文版'}},
                     'issues': ['source_purchase_date_requires_review', 'other_issue']},
            decision={'inventory': {'purchased_on': '2026-01-01', 'quantity': 1},
                      'acknowledged_issues': ['source_purchase_date_requires_review', 'other_issue']}))
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
        assert 'purchased_on' not in {c['name'] for c in sa.inspect(connection).get_columns('boardgame_inventory')}
        assert connection.execute(sa.select(inventory.c.bgg_version_snapshot)).scalar() == {'name': '中文版'}
        assert connection.execute(sa.select(reference.c.inventory_id)).scalar() == 1
        assert connection.exec_driver_sql('PRAGMA foreign_key_check').all() == []
        assert connection.execute(sa.select(filters.c.query)).scalar() == {'owned': True}
        payload, decision = connection.execute(sa.select(imports.c.payload, imports.c.decision)).one()
        assert payload == {'raw': raw, 'normalized': {'inventory': {'edition_name': '中文版'}}, 'issues': ['other_issue']}
        assert decision == {'inventory': {'quantity': 1}, 'acknowledged_issues': ['other_issue']}
        with Operations.context(MigrationContext.configure(connection)):
            migration.downgrade()
        assert connection.execute(sa.select(inventory.c.purchased_on)).scalar() is None
    engine.dispose()
