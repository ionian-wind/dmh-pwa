import { describe, expect, it } from 'vitest';
import { Sha256, hashBlob, hashText } from '@/utils/files/hash';

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

describe('SHA-256 streaming hash', () => {
  it('matches known vectors', () => {
    expect(new Sha256().digestHex()).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(
      new Sha256().update(new TextEncoder().encode('abc')).digestHex(),
    ).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('matches Web Crypto when updated in arbitrary chunks', async () => {
    const data = new Uint8Array(1000);
    for (let i = 0; i < data.length; i += 1) data[i] = i % 251;

    const expected = hex(await crypto.subtle.digest('SHA-256', data));
    const hash = new Sha256();
    for (let offset = 0; offset < data.length; offset += 37) {
      hash.update(data.subarray(offset, offset + 37));
    }
    expect(hash.digestHex()).toBe(expected);
  });

  it('hashes a Blob in chunks with progress', async () => {
    const percentages: number[] = [];
    const result = await hashBlob(new Blob(['abc']), {
      onProgress: (progress) => percentages.push(progress.percent),
    });

    expect(result).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(percentages.at(-1)).toBe(100);
    await expect(hashText('abc')).resolves.toBe(result);
  });

  it('rejects updates after finalization', () => {
    const hash = new Sha256();
    hash.digestHex();
    expect(() => hash.update(new Uint8Array([1]))).toThrow('finalized');
    expect(() => hash.digestHex()).toThrow('finalized');
  });
});
