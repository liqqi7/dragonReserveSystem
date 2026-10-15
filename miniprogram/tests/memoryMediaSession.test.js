const test = require('node:test');
const assert = require('node:assert/strict');
const {createMediaSession, MAX_TEMP_BYTES} = require('../services/memoryMediaSession');
function fixture({maxBytes = 20, head = 8} = {}) {
  const downloads = [], heads = [], held = new Map();
  let unlinkFails = false;
  const wx = {
    request(options) {
      const job = {options, aborted:false}; heads.push(job);
      options.success({statusCode:200,header:{'content-length':String(head)}});
      return {abort(){job.aborted=true;}};
    },
    downloadFile(options) {
      const job={options,aborted:false};downloads.push(job);
      return {abort(){job.aborted=true;},onProgressUpdate(fn){job.progress=fn;}};
    },
    getFileSystemManager:()=>({
      getFileInfo:({filePath,success})=>success({size:held.get(filePath)}),
      unlink:({filePath,success,fail})=>{if(unlinkFails)fail({});else{held.delete(filePath);success();}},
    }),
  };
  const session=createMediaSession(wx,{maxBytes});
  const finish=(index,size=head,statusCode=200)=>{
    const file='tmp-'+index;held.set(file,size);
    downloads[index].options.success({statusCode,tempFilePath:file});
  };
  return {session,wx,downloads,heads,held,finish,failUnlink:()=>{unlinkFails=true;}};
}
const item=(url,priority=10,foreground=false)=>({url:'https://test/'+url,priority,foreground,kind:'image'});
test('one queue prioritizes a foreground image ahead of a neighbouring video and deduplicates owners',()=>{
  const h=fixture(), image=item('photo',0,true), video=item('clip',11);
  h.session.replace('videos',[video]);
  h.session.replace('images',[image,video]);
  assert.equal(h.downloads[0].aborted,true);
  assert.equal(h.downloads[1].options.url,image.url);
  h.finish(1);h.finish(2);
  assert.equal(h.downloads.length,3);
  assert.equal(h.session.source(video.url),'tmp-2');
  h.session.dispose();
});
test('streaming current video cancels its independent pending download and rejects a late file',()=>{
  const h=fixture(), video=item('clip');
  h.session.replace('video',[video]);
  h.session.replace('video',[{...video,load:false,protected:true}],false);
  assert.equal(h.downloads[0].aborted,true);
  h.finish(0);
  assert.equal(h.held.size,0);assert.equal(h.session.source(video.url),'');
  h.session.dispose();
});
test('buffering blocks both image and video speculation but not the current cover',()=>{
  const h=fixture();h.session.setSpeculation(false);
  h.session.replace('mixed',[item('next-photo'),{...item('next-video',11),kind:'video'},item('cover',0,true)]);
  assert.equal(h.downloads.length,1);h.finish(0);
  assert.equal(h.downloads.length,1);
  h.session.setSpeculation(true);assert.equal(h.downloads.length,2);
  h.session.setSpeculation(false);assert.equal(h.downloads[1].aborted,true);
  h.session.dispose();
});
test('images, videos, and pending transfers share a byte budget reserved before download',()=>{
  const h=fixture();h.session.replace('mixed',[item('one'),{...item('two',11),kind:'video'},item('three',12)]);
  assert.equal(h.session.usage(),8);h.finish(0);
  assert.equal(h.session.usage(),16);h.finish(1);
  assert.equal(h.downloads.length,2);assert.equal(h.session.usage(),16);
  assert.equal(h.session.error('https://test/three').sizeLimit,true);
  h.session.dispose();assert.equal(h.held.size,0);
});
test('unknown HEAD size is rejected without starting an unbounded transfer',()=>{
  const h=fixture({head:0});h.session.replace('image',[item('photo',0,true)]);
  assert.equal(h.downloads.length,0);assert.ok(h.session.error('https://test/photo'));
  h.session.dispose();
});
test('body larger than HEAD reservation aborts and cannot become a playable source',()=>{
  const h=fixture();h.session.replace('image',[item('photo')]);
  h.downloads[0].progress({totalBytesWritten:9,totalBytesExpectedToWrite:9});
  assert.equal(h.downloads[0].aborted,true);h.finish(0,9);
  assert.equal(h.session.source('https://test/photo'),'');assert.equal(h.held.size,0);
  h.session.dispose();
});
test('finished files are measured and corrupt/oversize results never enter the session',()=>{
  const h=fixture();h.session.replace('image',[item('photo')]);h.finish(0,12);
  assert.equal(h.session.source('https://test/photo'),'');assert.equal(h.held.size,0);
  h.session.dispose();
});
test('window changes evict old thumbnails, preserve current protected files and release all on exit',()=>{
  const h=fixture();
  for(let i=0;i<10;i++){
    h.session.replace('images',[{...item('photo-'+i,0,true),protected:true}]);h.finish(i);
    assert.equal(h.held.size,1);assert.equal(h.session.usage(),8);
  }
  h.session.dispose();assert.equal(h.held.size,0);
});
test('failed speculative media retries when promoted to foreground, not on repeated same-window updates',()=>{
  const h=fixture(), photo=item('photo');h.session.replace('image',[photo]);h.finish(0,8,403);
  h.session.replace('image',[photo]);assert.equal(h.downloads.length,1);
  h.session.replace('image',[{...photo,foreground:true,priority:0}]);assert.equal(h.downloads.length,2);
  h.finish(1);h.session.dispose();
});
test('waiting foreground work rejects on disposal; default budget is 20MiB and no persistence API is used',async()=>{
  assert.equal(MAX_TEMP_BYTES,20*1024*1024);
  const h=fixture(), photo=item('photo',0,true), promise=h.session.wait(photo.url);
  h.session.replace('image',[photo]);h.session.dispose();
  await assert.rejects(promise,e=>e.cancelled===true);
  h.finish(0);assert.equal(h.held.size,0);
});

test('foreground allocation waits for asynchronous deletion rather than failing or exceeding the budget',()=>{
  const h=fixture({maxBytes:10}), old=item('old'), current=item('current',0,true);
  h.session.replace('images',[old]);h.finish(0);
  const original=h.wx.getFileSystemManager();let release;
  h.wx.getFileSystemManager=()=>({...original,unlink:options=>{release=()=>original.unlink(options);}});
  h.session.replace('images',[old,current]);
  assert.equal(h.downloads.length,1);assert.equal(h.session.usage(),8);
  release();assert.equal(h.downloads.length,2);assert.equal(h.session.usage(),8);
  h.finish(1);h.wx.getFileSystemManager=()=>original;h.session.dispose();
});

test('failed deletion remains charged and cannot silently release space for another file',async()=>{
  const h=fixture({maxBytes:10}), current=item('current',0,true);
  h.session.replace('images',[item('old')]);h.finish(0);h.failUnlink();
  const loading=h.session.wait(current.url);
  h.session.replace('images',[current]);
  await assert.rejects(loading,error=>error.sizeLimit===true);
  assert.equal(h.downloads.length,1);assert.equal(h.session.usage(),8);
  h.session.dispose();
});
