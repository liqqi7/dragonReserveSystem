const test = require("node:test");
const assert = require("node:assert/strict");
const {loadMediaModules} = require("./helpers/memoryMedia");
function setup() {
  const jobs = [], removed = [];
  const wx = {
    request: options => {options.success({statusCode:200,header:{"Content-Length":"1024"}});return {abort(){}};},
    downloadFile(options) {
      const job = {options,aborted:false};jobs.push(job);
      return {abort(){job.aborted=true;}};
    },
    getFileSystemManager:()=>({
      getFileInfo:options=>options.success({size:1024}),
      unlink:({filePath,success})=>{removed.push(filePath);success();},
    }),
  };
  const {videos} = loadMediaModules(wx);
  const preload = videos.createVideoPreloader();
  const finish = index => jobs[index].options.success({statusCode:200,tempFilePath:"tmp-"+index});
  return {preload,jobs,removed,finish};
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
