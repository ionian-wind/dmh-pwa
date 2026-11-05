export interface WaveformOptions {
  width?: number;
  height?: number;
  bars?: number;
  color?: string;
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  const globals = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  return globals.AudioContext ?? globals.webkitAudioContext;
}

/**
 * Decode an audio file and render a compact SVG waveform.
 *
 * Returns null when Web Audio is unavailable or the file cannot be decoded.
 */
export async function createWaveformSvg(
  file: Blob,
  options: WaveformOptions = {},
): Promise<string | null> {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor || typeof file.arrayBuffer !== 'function') return null;

  const { width = 600, height = 80, bars = 180, color = '#666666' } = options;
  let context: AudioContext | undefined;

  try {
    context = new AudioContextCtor();
    const buffer = await file.arrayBuffer();
    const audio = await context.decodeAudioData(buffer.slice(0));
    const channel = audio.getChannelData(0);
    if (!channel.length) return null;

    const barCount = Math.max(1, Math.min(bars, channel.length));
    const blockSize = Math.max(1, Math.floor(channel.length / barCount));
    const peaks: number[] = [];

    for (let i = 0; i < barCount; i += 1) {
      const start = i * blockSize;
      const end = Math.min(channel.length, start + blockSize);
      let peak = 0;
      for (let j = start; j < end; j += 1) {
        const value = Math.abs(channel[j] ?? 0);
        if (value > peak) peak = value;
      }
      peaks.push(peak > 1 ? 1 : peak);
    }

    const middle = height / 2;
    const amplitude = middle * 0.9;
    const step = barCount > 1 ? width / (barCount - 1) : 0;
    const path = peaks
      .map((peak, index) => {
        const x = Number((index * step).toFixed(2));
        const half = Number((peak * amplitude).toFixed(2));
        return `M${x} ${middle - half}L${x} ${middle + half}`;
      })
      .join('');

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">`,
      `<path d="${path}" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round"/>`,
      '</svg>',
    ].join('');
  } catch {
    return null;
  } finally {
    await context?.close?.().catch?.(() => undefined);
  }
}
