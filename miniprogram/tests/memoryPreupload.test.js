const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const calls = [], tasks = [], states = new Map(), errors = [], remote = new Map();
  let token = "member-token", failDelete = false, failSubmit = false;
  const memory = {
    async send(url, method, data) {
      calls.push({ url, method, data });
      if (url === "/memory-drafts") return { id: 7, status: "draft" };
      if (url.endsWith("/submit")) {
        if (failSubmit) { failSubmit = false; throw new Error("lost acknowledgement"); }
        return { status: "received" };
      }
      if (method === "DELETE") {
        if (failDelete) throw new Error("delete offline");
        remote.delete(Number(url.split("/").at(-1)));
        return {};
      }
      return { state: remote.has(Number(url.split("/").at(-1))) ? "uploaded" : "waiting" };
    },
    upload(id, slot, file, progress) {
      const job = deferred();
      const task = { ...job, slot, file, progress, abort() { this.aborted = true; job.reject(new Error("aborted")); } };
      tasks.push(task);
      return { promise: job.promise.then(() => remote.set(slot, file.id)), abort: () => task.abort() };
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../services/memoryPreupload.js"), "utf8"), {
    module, wx: { getStorageSync: () => token }, require: () => memory,
  });
  const uploader = new module.exports.MemoryPreupload("submission-123", {
    onState: (id, state, progress) => states.set(id, { state, progress }),
    onError: (error) => errors.push(error.message),
  });
  return { uploader, memory, calls, tasks, states, errors, remote,
    setToken: (value) => { token = value; }, setFailDelete: (value) => { failDelete = value; },
    setFailSubmit: () => { failSubmit = true; } };
}
const file = (id) => ({ id, kind: "image", size: 100, path: `local-${id}` });

test("selection uploads in receipt order without declaring the next file behind an active upload", async () => {
  const h = setup();
  const pending = h.uploader.setFiles([file("a"), file("b"), file("c")]);
  await tick();
  assert.equal(h.tasks.length, 1);
  assert.equal(h.calls.filter(call => call.method === "PUT").length, 1);
  assert.equal(h.calls.filter((call) => call.url === "/memory-drafts").length, 1);
  h.tasks[0].progress({ progress: 100, totalBytesSent: 500, totalBytesExpectedToSend: 500 });
  assert.equal(h.states.get("a").progress, 99);
  assert.equal(h.states.get("a").state, "uploading");
  h.uploader.setFiles([file("a"), file("b"), file("c"), file("d")]);
  await tick();
  assert.equal(h.calls.filter(call => call.method === "PUT").length, 1);
  assert.equal(h.tasks.length, 1, "100% transport is not a server acknowledgement");
  h.tasks[0].resolve();
  await tick();
  assert.equal(h.tasks.length, 2);
  h.tasks[0].progress({ totalBytesSent: 2 });
  assert.equal(h.states.get("a").state, "uploaded");
  for (let index = 1; index < 4; index++) {
    h.tasks[index].resolve();
    await tick();
  }
  await pending;
  assert.equal(h.calls.some((call) => call.url.endsWith("/submit")), false);
  await h.uploader.submit({ caption: "final edited caption" });
  assert.equal(h.tasks.length, 4);
  assert.equal(h.calls.at(-1).data.caption, "final edited caption");
});

test("deleting an in-flight file aborts it, removes remote bytes, and keeps stable slots", async () => {
  const h = setup();
  h.uploader.setFiles([file("a"), file("b")]); await tick();
  h.tasks[0].progress({progress: 100});
  assert.equal(h.states.get("a").state, "uploading");
  h.uploader.setFiles([file("b"), file("c")]); await tick();
  assert.equal(h.tasks[0].aborted, true);
  assert.equal(h.tasks[1].slot, 1);
  h.tasks[1].resolve(); await tick();
  assert.equal(h.tasks[2].slot, 2);
  h.tasks[2].resolve(); await h.uploader.running; await tick();
  await h.uploader.submit({});
  assert.deepEqual(Array.from(h.remote.keys()).sort(), [1, 2]);
});

test("a failed remote deletion blocks submission until deletion succeeds", async () => {
  const h = setup();
  h.uploader.setFiles([file("a"), file("b")]); await tick();
  h.tasks[0].resolve(); await tick(); h.tasks[1].resolve(); await h.uploader.running;
  h.setFailDelete(true); h.uploader.setFiles([file("b")]); await tick();
  await assert.rejects(h.uploader.submit({}), /delete offline/);
  assert.equal(h.calls.some((call) => call.url.endsWith("/submit")), false);
  h.setFailDelete(false); await h.uploader.submit({});
  assert.deepEqual(Array.from(h.remote.keys()), [1]);
});

test("lost upload acknowledgement is reconciled through the slot receipt", async () => {
  const h = setup();
  h.uploader.setFiles([file("a")]); await tick();
  h.remote.set(0, "a"); h.tasks[0].reject(new Error("lost upload acknowledgement"));
  await h.uploader.running;
  await h.uploader.submit({});
  assert.equal(h.tasks.length, 1);
  assert.equal(h.uploader.submitted, true);
});

test("lost final acknowledgement freezes metadata and retries submit without re-upload", async () => {
  const h = setup();
  h.uploader.setFiles([file("a")]); await tick();
  h.tasks[0].resolve(); await h.uploader.running; h.setFailSubmit();
  await assert.rejects(h.uploader.submit({ caption: "original" }), /lost acknowledgement/);
  await h.uploader.submit({ caption: "changed" });
  assert.equal(h.tasks.length, 1);
  assert.equal(h.calls.at(-1).data.caption, "original");
});

test("leaving aborts transfer and cancels only unsubmitted drafts", async () => {
  const h = setup();
  h.uploader.setFiles([file("a")]); await tick();
  h.tasks[0].progress({progress: 100});
  assert.equal(h.states.get("a").state, "uploading");
  h.uploader.close(); await tick();
  assert.equal(h.tasks[0].aborted, true);
  assert.ok(h.calls.some((call) => call.method === "DELETE" && call.url === "/memory-drafts/7"));
});

test("changed login prevents uploading or submitting with a different account", async () => {
  const h = setup();
  h.uploader.setFiles([file("a")]); await tick();
  h.setToken("other-token"); h.tasks[0].resolve(); await h.uploader.running;
  await assert.rejects(h.uploader.submit({}), /账号状态已变化/);
  assert.equal(h.calls.some((call) => call.url.endsWith("/submit")), false);
});
