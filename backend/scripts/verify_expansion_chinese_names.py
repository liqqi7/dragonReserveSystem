#!/usr/bin/env python3
"""非在库扩中文名端到端验证：worker 扩批次（影子 item）+ candidate 补中文名。
零干扰：用 SQLite backup 建临时库副本，run_once 指向副本，launchd worker 看不到测试 job。"""
import os, sqlite3, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

def load_env_file(p):
    for raw in Path(p).read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env_file(str(Path(__file__).resolve().parents[1] / '.env.test'))

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.models import User
from app.models.boardgame import PreviewJob, PreviewItem
from app.services import boardgame_intake as intake, boardgame_worker as worker

BASE_XML = '''<?xml version="1.0" encoding="UTF-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
<item type="boardgame" id="99999991">
<name type="primary" value="Test Base Game"/>
<name type="alternate" value="测试基础"/>
<description>test</description>
<yearpublished value="2024"/>
<minplayers value="2"/><maxplayers value="4"/>
<minplaytime value="30"/><maxplaytime value="60"/>
<link type="boardgameexpansion" id="99999992" value="Test Base: Expansion Alpha"/>
<link type="boardgameexpansion" id="99999993" value="Test Base: Dice Tower Promo"/>
<link type="boardgameexpansion" id="99999994" value="Test Base: Expansion Beta"/>
</item>
</items>'''

EXP_XML = '''<?xml version="1.0" encoding="UTF-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
<item type="boardgameexpansion" id="99999992">
<name type="primary" value="Test Base: Expansion Alpha"/>
<name type="alternate" value="测试基础: 阿尔法扩"/>
<description>exp a</description>
</item>
<item type="boardgameexpansion" id="99999994">
<name type="primary" value="Test Base: Expansion Beta"/>
<description>exp b</description>
</item>
</items>'''

calls = []
def handler(request):
    ids = request.url.params['id']
    calls.append(ids)
    return httpx.Response(200, text=BASE_XML if ids == '99999991' else EXP_XML)

tmp = tempfile.mktemp(suffix='.db', prefix='verify_exp_cn_')
src = sqlite3.connect('storage-private/test/dragon_reserve_test.db')
dst = sqlite3.connect(tmp)
src.backup(dst)
src.close(); dst.close()
engine = create_engine(f'sqlite:///{tmp}')
TmpSession = sessionmaker(bind=engine)
print('0) 临时库副本:', tmp)

try:
    with TmpSession() as db:
        actor = db.get(User, 1)
        job = intake.new_preview(db, actor, [99999991])
        db.commit()
        job_id = job.id
    print('1) 预览 job 已建:', job_id)

    assert worker.run_once(TmpSession, httpx.MockTransport(handler)) is True

    with TmpSession() as db:
        job = db.get(PreviewJob, job_id)
        items = list(db.scalars(select(PreviewItem).where(PreviewItem.job_id == job_id)))
        bgg_ids = sorted(i.bgg_id for i in items)
        assert job.state == 'ready', (job.state, job.error_code)
        assert 99999992 in bgg_ids and 99999994 in bgg_ids, bgg_ids
        assert 99999993 not in bgg_ids, 'promo 不应进影子批次'
        print(f'2) worker OK: job ready, items={bgg_ids}, 请求批次={calls}')

        actor = db.get(User, 1)
        main_item = db.scalar(select(PreviewItem).where(PreviewItem.job_id == job_id, PreviewItem.bgg_id == 99999991))
        cand = intake.candidate(db, main_item, actor)
        links = {l['bgg_id']: l for l in cand['expansion_links']}
        assert set(links) == {99999992, 99999994}, links.keys()
        assert links[99999992]['chinese_name'] == '测试基础: 阿尔法扩', links[99999992]
        assert links[99999994]['chinese_name'] is None, links[99999994]
        assert links[99999992]['in_library'] is False and links[99999994]['in_library'] is False
        print('3) candidate OK: 99999992 chinese_name =', links[99999992]['chinese_name'],
              '; 99999994 无中文数据回退英文；两者 in_library=False')
    print('全部通过')
finally:
    engine.dispose()
    os.unlink(tmp)
    print('4) 临时库已删除，真实 DB 零接触')
