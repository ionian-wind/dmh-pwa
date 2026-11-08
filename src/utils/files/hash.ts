import { copyBlob } from './streams';
import type { FileProgress } from './types';

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const INITIAL_STATE = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

const WEB_CRYPTO_LIMIT_BYTES = 16 * 1024 * 1024;

/** Hash a string or binary buffer with the browser's Web Crypto API. */
export async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(digest));
}

export async function hashText(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text));
}

/** Incremental SHA-256 implementation for streaming file hashes. */
export class Sha256 {
  private state = new Uint32Array(INITIAL_STATE);
  private buffer = new Uint8Array(64);
  private bufferLength = 0;
  private bytesHashed = 0;
  private finished = false;

  update(data: Uint8Array): this {
    if (this.finished) throw new Error('SHA-256 is already finalized');

    this.bytesHashed += data.length;
    let offset = 0;

    if (this.bufferLength > 0) {
      const take = Math.min(64 - this.bufferLength, data.length);
      this.buffer.set(data.subarray(0, take), this.bufferLength);
      this.bufferLength += take;
      offset = take;

      if (this.bufferLength === 64) {
        this.process(this.buffer, 0);
        this.bufferLength = 0;
      }
    }

    while (offset + 64 <= data.length) {
      this.process(data, offset);
      offset += 64;
    }

    if (offset < data.length) {
      this.buffer.set(data.subarray(offset));
      this.bufferLength = data.length - offset;
    }

    return this;
  }

  digestHex(): string {
    if (this.finished) throw new Error('SHA-256 is already finalized');
    this.finished = true;

    const paddedLength = (this.bufferLength + 9 + 63) & ~63;
    const padded = new Uint8Array(paddedLength);
    padded.set(this.buffer.subarray(0, this.bufferLength));
    padded[this.bufferLength] = 0x80;

    const bits = BigInt(this.bytesHashed) * 8n;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Number((bits >> 32n) & 0xffffffffn));
    view.setUint32(paddedLength - 4, Number(bits & 0xffffffffn));

    for (let offset = 0; offset < paddedLength; offset += 64) {
      this.process(padded, offset);
    }

    return Array.from(this.state)
      .map((value) => value.toString(16).padStart(8, '0'))
      .join('');
  }

  private process(data: Uint8Array, offset: number): void {
    const words = new Uint32Array(64);

    for (let i = 0; i < 16; i += 1) {
      const index = offset + i * 4;
      words[i] =
        ((data[index] << 24) |
          (data[index + 1] << 16) |
          (data[index + 2] << 8) |
          data[index + 3]) >>>
        0;
    }

    for (let i = 16; i < 64; i += 1) {
      const s0 =
        rotr(words[i - 15], 7) ^
        rotr(words[i - 15], 18) ^
        (words[i - 15] >>> 3);
      const s1 =
        rotr(words[i - 2], 17) ^ rotr(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let a = this.state[0];
    let b = this.state[1];
    let c = this.state[2];
    let d = this.state[3];
    let e = this.state[4];
    let f = this.state[5];
    let g = this.state[6];
    let h = this.state[7];

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[i] + words[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    this.state[0] = (this.state[0] + a) >>> 0;
    this.state[1] = (this.state[1] + b) >>> 0;
    this.state[2] = (this.state[2] + c) >>> 0;
    this.state[3] = (this.state[3] + d) >>> 0;
    this.state[4] = (this.state[4] + e) >>> 0;
    this.state[5] = (this.state[5] + f) >>> 0;
    this.state[6] = (this.state[6] + g) >>> 0;
    this.state[7] = (this.state[7] + h) >>> 0;
  }
}

export async function hashBlob(
  blob: Blob,
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: FileProgress) => void;
  } = {},
): Promise<string> {
  if (
    blob.size <= WEB_CRYPTO_LIMIT_BYTES &&
    typeof crypto !== 'undefined' &&
    'subtle' in crypto
  ) {
    try {
      const buffer = await blob.arrayBuffer();
      options.onProgress?.({
        loaded: blob.size,
        total: blob.size,
        percent: 100,
      });
      return sha256Hex(buffer);
    } catch {
      // Fall through to the incremental implementation.
    }
  }

  const hash = new Sha256();
  await copyBlob(
    blob,
    (chunk) => {
      hash.update(chunk);
    },
    {
      signal: options.signal,
      onProgress: options.onProgress,
    },
  );
  return hash.digestHex();
}
