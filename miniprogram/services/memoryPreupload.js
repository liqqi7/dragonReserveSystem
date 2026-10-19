const memory = require("./memory");

class MemoryPreupload {
  constructor(submissionId, { onState, onError } = {}) {
    this.submissionId = submissionId;
    this.onState = onState || (() => {});
    this.onError = onError || (() => {});
    this.entries = new Map();
    this.cleanups = new Set();
    this.nextSlot = 0;
    this.token = wx.getStorageSync("accessToken");
  }

  checkSession() {
    if (this.closed || wx.getStorageSync("accessToken") !== this.token)
      throw new Error("账号状态已变化，上传已停止");
  }

  state(entry, state, progress = 0) {
    if (entry.state === state && entry.progress === progress) return;
    entry.state = state;
    entry.progress = progress;
    if (!this.closed && this.entries.get(entry.file.id) === entry)
      this.onState(entry.file.id, state, progress);
  }

  async ensureDraft() {
    this.checkSession();
    if (this.draft) return this.draft;
    if (!this.creating) {
      this.creating = memory.send("/memory-drafts", "POST", {
        client_submission_id: this.submissionId, media: [],
      }).then((draft) => {
        this.draft = draft;
        if (this.closed && draft.status === "draft") this.cancelDraft();
        return draft;
      }).finally(() => { this.creating = null; });
    }
    return this.creating;
  }

  setFiles(files) {
    if (this.closed || this.submitted) return;
    const selected = new Set(files.map((file) => file.id));
    this.entries.forEach((entry, id) => {
      if (selected.has(id)) return;
      this.entries.delete(id);
      if (entry.task) entry.task.abort();
      this.removeRemote(entry);
    });
    files.forEach((file) => {
      if (this.entries.has(file.id)) return;
      const entry = { file, slot: this.nextSlot++, state: "waiting" };
      this.entries.set(file.id, entry);
      this.state(entry, "waiting");
    });
    return this.start();
  }

  removeRemote(entry) {
    if (!this.draft || this.closed) return;
    const cleanup = memory.send(`/memory-drafts/${this.draft.id}/media/${entry.slot}`, "DELETE")
      .then(() => { entry.cleanupError = null; }).catch((error) => {
        // Keep failed deletions pending: final submission must never include a removed tile.
        entry.cleanupError = error;
        this.onError(error);
      });
    this.cleanups.add(cleanup);
    cleanup.finally(() => this.cleanups.delete(cleanup));
    (this.removed || (this.removed = new Set())).add(entry);
  }

  async transfer(entry) {
    try {
      await this.ensureDraft();
      this.checkSession();
      if (this.entries.get(entry.file.id) !== entry) {
        this.removeRemote(entry);
        return;
      }
      const receipt = await memory.send(`/memory-drafts/${this.draft.id}/media/${entry.slot}`, "PUT", {
        kind: entry.file.kind, size: entry.file.size,
      });
      this.checkSession();
      if (this.entries.get(entry.file.id) !== entry) return;
      if (receipt.state !== "uploaded") {
        this.state(entry, "uploading");
        let settled = false;
        const task = memory.upload(this.draft.id, entry.slot, entry.file, (event) => {
          if (settled) return;
          // Native totals include multipart overhead; the original file size does not.
          const expected = Number(event.totalBytesExpectedToSend);
          const value = Number.isFinite(event.progress) ? event.progress :
            (expected > 0 ? Number(event.totalBytesSent) / expected * 100 : entry.progress);
          const progress = Math.max(entry.progress, Math.min(99, Math.floor(value) || 0));
          this.state(entry, "uploading", progress);
        });
        entry.task = task;
        try { await task.promise; }
        finally { settled = true; entry.task = null; }
      }
      this.checkSession();
      this.state(entry, "uploaded", 100);
    } catch (error) {
      if (!this.closed && this.entries.get(entry.file.id) === entry) {
        this.state(entry, "failed");
        this.onError(error);
      }
    } finally {
      if (!this.closed && this.entries.get(entry.file.id) !== entry) this.removeRemote(entry);
    }
  }

  start() {
    if (this.closed) return Promise.resolve();
    if (this.running) return this.running;
    const run = async () => {
      while (!this.closed) {
        const entry = Array.from(this.entries.values()).find((item) => item.state === "waiting");
        if (!entry) return;
        this.state(entry, "preparing");
        await this.transfer(entry);
      }
    };
    // The server serializes writes per draft; do not queue declarations behind its upload lock.
    this.running = run().then(() => {
      this.running = null;
      if (!this.closed && Array.from(this.entries.values()).some((entry) => entry.state === "waiting"))
        return this.start();
    });
    return this.running;
  }

  retry(id) {
    this.entries.forEach((entry) => {
      if (entry.state === "failed" && (id === undefined || id === entry.file.id))
        this.state(entry, "waiting");
    });
    return this.start();
  }

  async submit(metadata) {
    this.checkSession();
    // A lost final acknowledgement is recovered by the idempotent submit, not by re-uploading.
    if (!this.submitAttempted) {
      await this.retry();
      this.checkSession();
      await Promise.all(Array.from(this.cleanups));
      for (const entry of this.removed || []) {
        if (entry.cleanupError) {
          await memory.send(`/memory-drafts/${this.draft.id}/media/${entry.slot}`, "DELETE");
          entry.cleanupError = null;
        }
      }
      if (!this.entries.size || Array.from(this.entries.values()).some((entry) => entry.state !== "uploaded"))
        throw new Error("部分文件未上传完成，请重试或删除失败的文件");
      this.metadata = metadata;
      this.submitAttempted = true;
    }
    this.checkSession();
    try {
      await memory.send(`/memory-drafts/${this.draft.id}/submit`, "POST", this.metadata);
    } catch (error) {
      // A definite rejection permits editing; a lost acknowledgement must remain frozen.
      if (error.statusCode >= 400 && error.statusCode < 500) this.submitAttempted = false;
      throw error;
    }
    this.submitted = true;
  }

  cancelDraft() {
    return memory.send(`/memory-drafts/${this.draft.id}`, "DELETE").catch(() => {});
  }

  close() {
    this.closed = true;
    this.entries.forEach((entry) => { if (entry.task) entry.task.abort(); });
    if (this.draft && !this.submitted && !this.submitAttempted) this.cancelDraft();
  }
}

module.exports = { MemoryPreupload };
