import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWaveformSvg } from '@/jukebox/utils/waveform';

function audioBlob() {
  return new Blob(['audio'], { type: 'audio/mp3' });
}

describe('createWaveformSvg', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders an SVG path from decoded audio peaks', async () => {
    const decodeAudioData = vi.fn().mockResolvedValue({
      getChannelData: () => new Float32Array([0, 0.5, -1, 0.25, 0, 0.75]),
    });
    const close = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = decodeAudioData;
        close = close;
      },
    );

    const svg = await createWaveformSvg(audioBlob(), {
      width: 100,
      height: 20,
      bars: 3,
      color: '#ff0000',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 100 20"');
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('M50 1L50 19');
    expect(decodeAudioData).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it('falls back to webkitAudioContext when AudioContext is missing', async () => {
    const decodeAudioData = vi.fn().mockResolvedValue({
      getChannelData: () => new Float32Array([0.2, 0.4]),
    });
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal(
      'webkitAudioContext',
      class {
        decodeAudioData = decodeAudioData;
        close = vi.fn().mockResolvedValue(undefined);
      },
    );

    const svg = await createWaveformSvg(audioBlob());

    expect(svg).toContain('<path');
    expect(decodeAudioData).toHaveBeenCalledOnce();
  });

  it('returns null when Web Audio is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);

    await expect(createWaveformSvg(audioBlob())).resolves.toBeNull();
  });

  it('returns null when the audio context cannot be created', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('not allowed');
        }
      },
    );

    await expect(createWaveformSvg(audioBlob())).resolves.toBeNull();
  });

  it('returns null for empty decoded audio', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = vi.fn().mockResolvedValue({
          getChannelData: () => new Float32Array(),
        });
        close = vi.fn().mockResolvedValue(undefined);
      },
    );

    await expect(createWaveformSvg(audioBlob())).resolves.toBeNull();
  });

  it('returns null when decoding fails', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = vi.fn().mockRejectedValue(new Error('bad audio'));
        close = vi.fn().mockResolvedValue(undefined);
      },
    );

    await expect(createWaveformSvg(audioBlob())).resolves.toBeNull();
  });

  it('returns null for blobs without arrayBuffer support', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = vi.fn();
        close = vi.fn().mockResolvedValue(undefined);
      },
    );

    await expect(createWaveformSvg({} as unknown as Blob)).resolves.toBeNull();
  });

  it('supports a single bar and works without context.close', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = vi.fn().mockResolvedValue({
          getChannelData: () => [1.5, undefined] as unknown as Float32Array,
        });
      },
    );

    const svg = await createWaveformSvg(audioBlob(), { bars: 1 });

    expect(svg).toMatch(/<path d="M0 4L0 76"/);
  });
});
