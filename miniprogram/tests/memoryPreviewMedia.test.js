const test = require("node:test");
const assert = require("node:assert/strict");
const {loadMediaModules} = require("./helpers/memoryMedia");
function setup({size = 1024, retainCompleted = false, maxBytes} = {}) {
  const jobs = [], removed = [], heads = [], sources = [];
  const wx = {
    request: options => {heads.push(options.url);options.success({statusCode:200,header:{"Content-Length":String(size)}});return {abort(){}};},
    downloadFile(options) {
      const job = {options,aborted:false};jobs.push(job);
      return {abort(){job.aborted=true;}};
    },
    getFileSystemManager:()=>({
      getFileInfo:options=>options.success({size}),
      unlink:({filePath,success})=>{removed.push(filePath);success();},
    }),
  };
  const {session, previewMedia} = loadMediaModules(wx);
  const media = session.createMediaSession(wx, {retainCompleted, maxBytes});
  const preload = previewMedia.createPreviewMedia(media, value => sources.push(value));
  const finish = index => jobs[index].options.success({statusCode:200,tempFilePath:"tmp-"+index});
  return {preload,media,jobs,removed,finish,heads,sources};
}
const video = id => ({id,kind:"video",url:"https://test/"+id+".mp4"});
test("neighbour videos use the common queue and completed files are reused only for the matching URL",()=>{
  const h=setup();
  h.preload.update({id:2,kind:"image"},video(3),video(1));
  h.finish(0);h.finish(1);
  assert.equal(h.preload.source(video(3)),"tmp-0");
  assert.equal(h.preload.source({...video(3),url:"renewed"}),"renewed");
  h.preload.update(video(3),video(4),{id:2,kind:"image"});
  assert.ok(h.removed.includes("tmp-1"));
  h.preload.dispose();
});
test("swiping onto an unfinished video cancels its independent transfer instead of downloading it twice",()=>{
  const h=setup();
  h.preload.update({id:1,kind:"image"},video(2));
  h.preload.update(video(2),null,{id:1,kind:"image"},false);
  assert.equal(h.jobs[0].aborted,true);
  assert.equal(h.preload.source(video(2)),video(2).url);
  h.finish(0);
  assert.equal(h.preload.source(video(2)),video(2).url);
  assert.deepEqual(h.removed,["tmp-0"]);
  h.preload.dispose();
});
test("foreground compatibility fallback promotes an in-flight transfer and rejects on disposal",async()=>{
  const h=setup();
  h.preload.update(video(1),video(2));
  const ready=h.preload.ensure(video(2));
  assert.equal(h.jobs.length,1);
  assert.equal(h.jobs[0].aborted,false);
  h.finish(0);assert.equal(await ready,"tmp-0");
  h.preload.invalidate(video(2));
  const pending=h.preload.ensure(video(2));
  h.preload.dispose();
  await assert.rejects(pending,error=>error.cancelled===true);
  assert.equal(h.jobs[1].aborted,true);
  h.finish(1);assert.ok(h.removed.includes("tmp-1"));
});
test("foreground failure retains an HTTP error instead of treating its response as video",async()=>{
  const h=setup(), ready=h.preload.ensure(video(1));
  h.jobs[0].options.success({statusCode:403,tempFilePath:"denied"});
  await assert.rejects(ready,error=>error.statusCode===403);
  assert.equal(h.preload.source(video(1)),video(1).url);
  assert.ok(h.removed.includes("denied"));
  h.preload.dispose();
});

test("cached mixed neighbours publish local images even while network speculation is blocked", () => {
  const h = setup({retainCompleted:true}), photo = {id:3,kind:"image",url:"https://test/3.jpg"};
  h.preload.update(null,photo,video(1)); h.finish(0); h.finish(1);
  h.preload.update(video(2),photo,video(1),false);
  assert.equal(h.sources.at(-1)[photo.url],"tmp-0");
  assert.equal(h.preload.source(video(1)),"tmp-1");
  assert.equal(h.jobs.length,2); assert.equal(h.heads.length,2);
  h.preload.dispose(); h.media.dispose();
});

test("both neighbours precede the optional current video copy", () => {
  const h = setup(); h.preload.update(video(2),video(3),video(1),true,true);
  h.finish(0); h.finish(1); h.finish(2);
  assert.deepEqual(h.jobs.map(job=>job.options.url),[video(3).url,video(1).url,video(2).url]);
  h.preload.dispose(); h.media.dispose();
});

test("a 50MiB pool skips the third 20MiB file without evicting the cached current video or retrying in a loop", () => {
  const h = setup({retainCompleted:true,maxBytes:50*1024**2,size:20*1024**2});
  h.preload.update(null,video(2)); h.finish(0);
  h.preload.update(video(2),video(3),video(1),true,true); h.finish(1);
  assert.equal(h.jobs.length,2); assert.equal(h.media.usage(),40*1024**2);
  assert.equal(h.preload.source(video(2)),"tmp-0");
  for (let i=0;i<5;i++) h.preload.update(video(2),video(3),video(1),true,true);
  assert.equal(h.jobs.length,2); assert.equal(h.heads.length,3);
  h.preload.dispose(); h.media.dispose();
});

test("partial video handoff is cancelled once and is not restarted by the warm timer in the same visit", () => {
  const h = setup(); h.preload.update(null,video(2));
  h.preload.update(video(2),null,null,false);
  assert.equal(h.jobs[0].aborted,true);
  h.preload.update(video(2),null,null,true,true);
  h.preload.update(video(2),null,null,true,true);
  assert.equal(h.jobs.length,1); assert.equal(h.preload.source(video(2)),video(2).url);
  h.finish(0); assert.ok(h.removed.includes("tmp-0"));
  h.preload.dispose(); h.media.dispose();
});

test("image promotion retries a failed offscreen transfer and preserves a matching in-flight transfer", async () => {
  const h=setup(), photo=id=>({id,kind:"image",url:`https://test/${id}.jpg`});
  h.preload.update(photo(1),photo(2)); h.finish(0);
  h.jobs[1].options.fail({errno:5});
  h.preload.update(photo(2),photo(3),photo(1));
  assert.equal(h.jobs.length,3);assert.equal(h.jobs[2].options.url,photo(2).url);
  h.finish(2);
  const ready=h.preload.ensure(photo(3));
  assert.equal(h.jobs.length,4);assert.equal(h.jobs[3].aborted,false);
  h.finish(3);assert.equal(await ready,"tmp-3");
  h.preload.dispose();h.media.dispose();
});

test("jumping away cancels obsolete image work and rejects late files",()=>{
  const h=setup(),photo=id=>({id,kind:"image",url:`https://test/${id}.jpg`});
  h.preload.update(photo(1),photo(2));h.preload.update(photo(4),photo(5));
  assert.equal(h.jobs[0].aborted,true);assert.equal(h.jobs.length,2);
  h.finish(0);assert.equal(h.sources.at(-1)[photo(1).url],undefined);
  assert.deepEqual(h.removed,["tmp-0"]);h.preload.dispose();h.media.dispose();
});
