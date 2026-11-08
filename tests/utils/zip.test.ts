import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  listZipFiles,
  openZip,
  readZipBlob,
  readZipText,
} from '@/utils/files/zip';

describe('streaming ZIP reader', () => {
  it('reads text, binary and directory entries from a Blob', async () => {
    const zip = new JSZip();
    zip.file('module.json', JSON.stringify({ name: 'Module' }));
    zip.file('notes/one.json', JSON.stringify({ id: 'one' }));
    zip.file('audio/sample.mp3', new Blob(['audio'], { type: 'audio/mpeg' }));
    zip.file('notes/', '');

    const entries = await openZip(await zip.generateAsync({ type: 'blob' }));

    await expect(readZipText(entries, ['module.json'])).resolves.toBe(
      JSON.stringify({ name: 'Module' }),
    );
    await expect(
      readZipText(entries, ['missing.json', 'notes/one.json']),
    ).resolves.toBe(JSON.stringify({ id: 'one' }));
    await expect(readZipText(entries, ['missing.json'])).resolves.toBeNull();

    const blob = await readZipBlob(entries, ['audio/sample.mp3']);
    expect(await blob?.text()).toBe('audio');
    await expect(readZipBlob(entries, ['missing'])).resolves.toBeNull();

    expect(listZipFiles(entries, 'notes/').map((entry) => entry.name)).toEqual([
      'notes/one.json',
    ]);
  });
});
