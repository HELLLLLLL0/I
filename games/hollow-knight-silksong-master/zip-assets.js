/* Read one ZIP entry at a time. Compressed parts live on GitHub, never a paid proxy.
   This avoids joining a 2 GB archive or retaining all uncompressed bundles in JS. */
(function (root) {
  class SplitZip {
    constructor(index, options = {}) {
      this.index = index;
      this.fetch = options.fetch || globalThis.fetch.bind(globalThis);
      this.cache = options.cache || null;
      this.onProgress = options.onProgress || (() => {});
      this.base = options.base || `https://raw.githubusercontent.com/web-ports/hollow-knight-silksong/${index.revision}/StreamingAssets/aa/WebGL.zip.part`;
      this.inflight = new Map();
      this.recent = new Map();
      this.active = 0;
      this.waiters = [];
      this.entries = new Map(index.entries.map(entry => [entry.name, entry]));
    }
    async part(number) {
      if (this.recent.has(number)) return this.recent.get(number);
      if (this.inflight.has(number)) return this.inflight.get(number);
      const task = this.download(number);
      this.inflight.set(number, task);
      try {
        const data = await task;
        this.recent.set(number, data);
        while (this.recent.size > 2) this.recent.delete(this.recent.keys().next().value);
        return data;
      } finally { this.inflight.delete(number); }
    }
    async download(number) {
      if (this.active >= 2) await new Promise(resolve => this.waiters.push(resolve));
      this.active++;
      try {
        const url = this.base + number;
        const expected = Math.min(this.index.partSize, this.index.totalSize - (number - 1) * this.index.partSize);
        if (expected <= 0) throw new Error('Invalid archive part');
        if (this.cache) {
          try {
            const hit = await this.cache.match(url);
            if (hit) {
              const bytes = new Uint8Array(await hit.arrayBuffer());
              if (bytes.length === expected) return bytes;
              await this.cache.delete(url);
            }
          } catch (error) { console.warn('Cache read unavailable', error); }
        }
        let lastError;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            this.onProgress(`Downloading game assets… part ${number} of ${Math.ceil(this.index.totalSize / this.index.partSize)}`);
            const response = await this.fetch(url, {signal: AbortSignal.timeout(120000)});
            if (!response.ok) throw new Error(`Asset download failed (${response.status}), part ${number}`);
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.length !== expected) throw new Error(`Incomplete download, part ${number}`);
            if (this.cache) {
              try { await this.cache.put(url, new Response(bytes)); }
              catch (error) { console.warn('Storage is full or unavailable; continuing without saving this part.', error); }
            }
            return bytes;
          } catch (error) {
            lastError = error;
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
        throw lastError;
      } finally {
        this.active--;
        this.waiters.shift()?.();
      }
    }
    stream(offset, length) {
      const end = offset + length;
      let cancelled = false;
      return new ReadableStream({
        pull: async controller => {
          if (offset >= end) { controller.close(); return; }
          try {
            const number = Math.floor(offset / this.index.partSize) + 1;
            const bytes = await this.part(number);
            if (cancelled) return;
            const local = offset % this.index.partSize;
            const count = Math.min(256 * 1024, bytes.length - local, end - offset);
            if (count <= 0) throw new Error('Invalid ZIP offset');
            // Copy just this slice; don't retain a whole 20 MB part downstream.
            controller.enqueue(bytes.slice(local, local + count));
            offset += count;
          } catch (error) { if (!cancelled) controller.error(error); }
        },
        cancel() { cancelled = true; }
      });
    }
    async response(name) {
      const entry = this.entries.get(name);
      if (!entry) throw new Error(`Game asset is missing from the archive: ${name}`);
      const header = await new Response(this.stream(entry.offset, 30)).arrayBuffer();
      const view = new DataView(header);
      if (view.getUint32(0, true) !== 0x04034b50 || view.getUint16(8, true) !== entry.method) throw new Error('Invalid ZIP entry header');
      const start = entry.offset + 30 + view.getUint16(26, true) + view.getUint16(28, true);
      let body = this.stream(start, entry.compressed);
      if (entry.method === 8) body = body.pipeThrough(new DecompressionStream('deflate-raw'));
      else if (entry.method !== 0) throw new Error('Unsupported ZIP compression');
      let length = 0, crc = 0xffffffff;
      body = body.pipeThrough(new TransformStream({
        transform(chunk, controller) {
          length += chunk.length;
          for (let i = 0; i < chunk.length; i++) crc = TABLE[(crc ^ chunk[i]) & 255] ^ (crc >>> 8);
          controller.enqueue(chunk);
        },
        flush() {
          if (length !== entry.size || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw new Error(`Asset integrity check failed: ${name}. Reload to retry.`);
        }
      }));
      return new Response(body, {headers: {'Content-Type': 'application/octet-stream', 'Content-Length': String(entry.size)}});
    }
  }
  const TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    TABLE[i] = c >>> 0;
  }
  root.SplitZip = SplitZip;
  if (typeof module !== 'undefined') module.exports = {SplitZip};
})(globalThis);
