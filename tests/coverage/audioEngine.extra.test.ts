import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const howler = vi.hoisted(() => {
  class FakeHowl {
    opts: any;
    unloaded = false;
    private playId = 0;
    private currentVolume: number;
    private isPlaying = false;

    constructor(opts: any) {
      this.opts = opts;
      this.currentVolume = opts.volume ?? 1;
      howler.instances.push(this);
    }

    volume(value?: number) {
      if (value === undefined) return this.currentVolume;
      this.currentVolume = value;
      return this;
    }

    playing() {
      return this.isPlaying;
    }

    play() {
      this.isPlaying = true;
      this.playId += 1;
      return this.playId;
    }

    pause() {
      this.isPlaying = false;
      return this;
    }

    stop() {
      this.isPlaying = false;
      return this;
    }

    duration(_id?: number) {
      return 10;
    }

    seek(_id?: number) {
      return 4;
    }

    unload() {
      this.unloaded = true;
      return this;
    }

    fade(_from: number, to: number, _duration: number) {
      this.currentVolume = to;
      return this;
    }
  }

  return {
    instances: [] as FakeHowl[],
    FakeHowl,
    volume: vi.fn(),
  };
});

vi.mock('howler', () => ({
  Howl: howler.FakeHowl,
  Howler: { volume: howler.volume },
}));

import { AudioEngine } from '@/ambient-sound/utils/audioEngine';

function instance(index: number) {
  return howler.instances[index];
}

describe('ambient audio engine additional branches', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    howler.instances.length = 0;
    howler.volume.mockClear();
    engine = new AudioEngine();
    engine.setMasterVolume(1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('applies volume fallbacks to loaded but idle layers, music and one-shots', () => {
    engine.loadLayer('rain', 'blob:rain');
    engine.loadMusic('explore', 'blob:explore');
    engine.loadOneShot('thunder', 'blob:thunder');

    engine.setMasterVolume(0.5);

    const layer = instance(0);
    const music = instance(1);
    const oneShot = instance(2);
    expect(layer.volume()).toBe(0);
    expect(music.volume()).toBe(0.25);
    expect(oneShot.volume()).toBe(0.5);
  });

  it('passes explicit formats to every loader and transition', () => {
    engine.loadLayer('rain', 'blob:rain', false, ['mp3']);
    expect(instance(0).opts.format).toEqual(['mp3']);

    engine.loadOneShot('thunder', 'blob:thunder', ['wav']);
    expect(instance(1).opts.format).toEqual(['wav']);

    engine.loadMusic('explore', 'blob:explore', true, ['ogg']);
    expect(instance(2).opts.format).toEqual(['ogg']);

    vi.useFakeTimers();
    engine.playMusic();
    engine.transitionToMusic('rest', 'blob:rest', 0.5, true, ['flac']);
    vi.advanceTimersByTime(1000);

    expect(instance(3).opts.format).toEqual(['flac']);
  });

  it('guards near-end scheduling for idle, invalid and stale music tracks', () => {
    vi.useFakeTimers();
    const onNearEnd = vi.fn();
    engine.setMusicNearEndHandler(onNearEnd);
    engine.loadMusic('explore', 'blob:explore');
    const music = instance(0);

    // Loaded but not playing.
    music.opts.onload();
    expect(onNearEnd).not.toHaveBeenCalled();

    music.play();
    music.opts.onload();
    vi.advanceTimersByTime(4999);
    expect(onNearEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onNearEnd).toHaveBeenCalledTimes(1);

    // Invalid durations and seek positions cancel scheduling.
    music.duration = () => 0;
    music.opts.onload();
    music.duration = () => Number.NaN;
    music.opts.onload();
    music.duration = () => 10;
    music.seek = () => Number.POSITIVE_INFINITY;
    music.opts.onload();
    music.seek = () => 'invalid' as any;
    music.opts.onload();
    music.seek = () => 9.9;
    music.opts.onload();

    // A timer that outlives its track must not fire the handler.
    music.seek = () => 4;
    music.opts.onload();
    (engine as any).musicTrack = null;
    vi.advanceTimersByTime(5000);
    expect(onNearEnd).toHaveBeenCalledTimes(1);

    // Scheduling with no track at all is a no-op.
    (engine as any).scheduleMusicNearEnd();
  });

  it('ignores missing layers and one-shot edge cases', () => {
    engine.playLayer('missing');
    engine.loadLayer('idle', 'blob:idle');
    engine.setLayerVolume('idle', 0.5);
    expect(engine.isLayerPlaying('missing')).toBe(false);

    engine.loadOneShot('ghost', 'blob:ghost');
    const ghost = instance(1);
    // Ending a one-shot that never started is ignored.
    ghost.opts.onend();

    engine.playOneShot('ghost');
    // A non-matching sound id leaves the active entry in place.
    ghost.opts.onend(999);
    expect(engine.getOneShotProgress('ghost')).toBe(0.4);

    engine.loadOneShot('never', 'blob:never');
    const never = instance(2);
    never.play = () => undefined as any;
    expect(engine.playOneShot('never')).toBe(false);
  });

  it('returns zero progress for invalid one-shot and music timing values', () => {
    engine.loadOneShot('thunder', 'blob:thunder');
    const oneShot = instance(0);
    engine.playOneShot('thunder');

    oneShot.duration = () => 0;
    expect(engine.getOneShotProgress('thunder')).toBe(0);
    oneShot.duration = () => Number.NaN;
    expect(engine.getOneShotProgress('thunder')).toBe(0);

    oneShot.duration = () => 10;
    oneShot.seek = () => Number.POSITIVE_INFINITY;
    expect(engine.getOneShotProgress('thunder')).toBe(0);
    oneShot.seek = () => 'invalid' as any;
    expect(engine.getOneShotProgress('thunder')).toBe(0);
    oneShot.seek = () => 4;
    expect(engine.getOneShotProgress('thunder')).toBe(0.4);

    engine.loadMusic('explore', 'blob:explore');
    const music = instance(1);
    music.duration = () => 0;
    expect(engine.getMusicProgress()).toBe(0);
    music.duration = () => Number.NaN;
    expect(engine.getMusicProgress()).toBe(0);

    music.duration = () => 10;
    music.seek = () => Number.NEGATIVE_INFINITY;
    expect(engine.getMusicProgress()).toBe(0);
    music.seek = () => 'invalid' as any;
    expect(engine.getMusicProgress()).toBe(0);
    music.seek = () => 4;
    expect(engine.getMusicProgress()).toBe(0.4);
  });

  it('handles idle music transports and volume changes', () => {
    const idle = new AudioEngine();
    idle.setMasterVolume(1);

    // No music track loaded.
    idle.playMusic();
    idle.stopMusic();
    idle.setMusicVolume(0.4);
    idle.stopMusic(false);

    // An existing track that is not playing.
    engine.loadMusic('explore', 'blob:explore');
    const music = instance(0);
    engine.setMusicVolume(0.3);
    expect(music.volume()).toBe(0);

    engine.loadMusic('combat', 'blob:combat');
    expect(music.unloaded).toBe(true);

    const combat = instance(1);
    engine.playMusic();
    expect(combat.volume()).toBe(0.5);
    engine.setMusicVolume(0.2);
    expect(combat.volume()).toBe(0.2);
  });

  it('handles idle and already playing weather tracks', () => {
    const idle = new AudioEngine();
    idle.playWeather();
    idle.stopWeather();
    idle.setWeatherVolume(0.3);

    engine.playWeather();
    engine.stopWeather();
    engine.setWeatherVolume(0.3);

    engine.loadWeather('storm', 'blob:storm');
    const weather = instance(0);
    engine.playWeather(0.5);
    const play = vi.spyOn(weather, 'play');
    engine.playWeather(0.5);
    expect(play).not.toHaveBeenCalled();

    engine.stopWeather(false);
    engine.setWeatherVolume(0.2);
    expect(weather.volume()).toBe(0.5);
  });

  it('skips silent tracks when resuming', () => {
    engine.loadLayer('rain', 'blob:rain');
    engine.playLayer('rain', 0);
    engine.loadMusic('explore', 'blob:explore');
    engine.playMusic(0);
    engine.loadWeather('storm', 'blob:storm');
    engine.playWeather(0);

    const layer = instance(0);
    const music = instance(1);
    const weather = instance(2);
    const layerPlay = vi.spyOn(layer, 'play');
    const musicPlay = vi.spyOn(music, 'play');
    const weatherPlay = vi.spyOn(weather, 'play');

    engine.resumeAll();

    expect(layerPlay).not.toHaveBeenCalled();
    expect(musicPlay).not.toHaveBeenCalled();
    expect(weatherPlay).not.toHaveBeenCalled();
  });

  it('ignores duplicate retirement requests for the same layer', () => {
    vi.useFakeTimers();
    engine.loadLayer('rain', 'blob:rain');
    engine.playLayer('rain', 0.5);
    const layer = instance(0);

    (engine as any).fadeOutRetiringLayer(layer);
    (engine as any).fadeOutRetiringLayer(layer);
    vi.advanceTimersByTime(500);

    expect(layer.unloaded).toBe(true);
  });
});
