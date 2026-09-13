/* Opt-in real BGG flow, launched only by verify_boardgame_live.py against its temporary server. */
const fs = require('node:fs'), assert = require('node:assert/strict');
const {runtime, event} = require('../helpers/boardgameEntryRuntime.cjs');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const emit = value => console.log(JSON.stringify(value));
async function run() {
  assert.equal(new URL(input.base).hostname, '127.0.0.1');
  const transport = async (r, options = {}) => {
    const query = new URLSearchParams(r.query || {}).toString();
    const response = await fetch(input.base + '/api/v1' + r.path + (query ? '?' + query : ''), {
      method:r.method || 'GET', headers:options.headers,
      body:r.data === undefined ? undefined : JSON.stringify(r.data),
      signal:AbortSignal.timeout(r.timeout || 15000)
    });
    const data = await response.json();
    if (!response.ok) throw {statusCode:response.status, body:data};
    return data;
  };
  const {page:p, requests} = runtime(transport, {userId:input.userId, accessToken:input.token});
  const clean = () => assert.equal(p.data.error || p.data.formError || p.data.versionError || p.data.previewError, '');
  try {
    p.inputQuery(event({}, input.query));
    await p.search(); clean();
    assert.ok(p.data.results.length, 'BGG returned no candidates');
    emit({stage:'live_controller_search', total:p.data.total, previewed:p.data.results.length});
    const deadline = Date.now() + 180000;
    while (p.data.preview.state !== 'ready' && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await p.pollPreview(); clean();
    }
    assert.equal(p.data.preview.state, 'ready', 'Worker did not finish within 180 seconds');
    const auth = {headers:{Authorization:'Bearer ' + input.token}};
    const before = await transport({path:'/boardgames', query:{limit:10}}, auth);
    assert.equal(before.items.length, 0, 'Preview must not create catalog entries');
    const choice = p.data.results.find(i => i.name.toLowerCase() === input.query.toLowerCase() && i.detail_state === 'ready')
      || p.data.results.find(i => i.game_type === 'boardgame' && i.detail_state === 'ready')
      || p.data.results.find(i => i.detail_state === 'ready');
    assert.ok(choice, 'No candidate has a usable real detail response');
    await p.chooseCandidate(event({id:choice.bgg_id})); clean();
    assert.ok(p.data.candidate.description, 'Real description missing');
    const totalVersions = p.data.versionTotal;
    p.versionInput(event({}, 'Chinese')); await p.searchVersions(); clean();
    if (!p.data.versions.length) { p.versionInput(event({}, '')); await p.searchVersions(); clean(); }
    const version = p.data.versions[0];
    assert.ok(version, 'No physical edition returned for the selected game');
    p.chooseVersion(event({id:version.bgg_version_id}));
    p.continueEntry(); p.ownerChange(event({}, 1));
    p.field(event({key:'purchase_price'}, '0'));
    p.dateConfirm({detail:{dateValue:'2026-01-02'}});
    await p.save(); clean();
    assert.equal(p.data.stage, 'success');
    assert.equal(p.data.result.inventory_ids.length, 1);
    const box = p.data.result.inventory[0];
    assert.equal(box.bgg_version_id, version.bgg_version_id);
    assert.equal(box.internal.purchase_price, '0.00');
    const savedRequest = requests.find(r => r.path === '/boardgame-intakes');
    const replay = await transport(savedRequest, {headers:{...auth.headers,
      'Content-Type':'application/json', 'Idempotency-Key':savedRequest.key}});
    assert.deepEqual(replay.inventory_ids, p.data.result.inventory_ids);
    const after = await transport({path:'/boardgames', query:{limit:10}}, auth);
    assert.equal(after.items.length, 1);
    emit({stage:'live_controller_complete', state:'passed', requests:requests.length,
      bgg_id:choice.bgg_id, name:p.data.candidate.name, total_versions:totalVersions,
      selected_version_id:version.bgg_version_id, selected_version:version.name,
      game_id:p.data.result.game_id, inventory_ids:p.data.result.inventory_ids,
      cover_urls:[p.data.candidate.cover_url, version.cover_url].filter(Boolean),
      preview_did_not_create_game:true, idempotency:true});
  } finally { p.onUnload(); }
}
run().catch(error => {
  emit({stage:'live_controller_failed', status:error.statusCode || null,
    reason:error.body?.details?.reason || error.message || 'request_failed'});
  process.exitCode = 1;
});
