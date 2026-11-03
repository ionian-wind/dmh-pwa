import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const howler = vi.hoisted(() => {
  class FakeHowl {
    opts: any;
    unloaded = false;
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
      return 1;
    }

    pause() {
      this.isPlaying = false;
      return this;
    }

    stop() {
      this.isPlaying = false;
      return this;
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

describe('ambient audio engine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    howler.instances.length = 0;
    howler.volume.mockClear();
    engine = new AudioEngine();
    engine.setMasterVolume(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clamps and applies the master volume', () => {
    engine.setMasterVolume(2);
    expect(engine.getMasterVolume()).toBe(1);
    engine.setMasterVolume(-1);
    expect(engine.getMasterVolume()).toBe(0);
    expect(howler.volume).toHaveBeenLastCalledWith(0);
  });

  it('loads, fades, plays and stops layers', () => {
    engine.loadLayer('rain', 'blob:rain');
    engine.loadLayer('rain', 'blob:rain');
    expect(howler.instances).toHaveLength(1);

    engine.playLayer('rain', 0.5);
    const layer = instance(0);
    expect(layer.playing()).toBe(true);
    expect(layer.volume()).toBe(0.5);

    engine.playLayer('rain', 0.25);
    expect(layer.volume()).toBe(0.25);

    engine.setLayerVolume('rain', 1);
    expect(layer.volume()).toBe(1);
    expect(engine.isLayerPlaying('rain')).toBe(true);

    vi.useFakeTimers();
    engine.stopLayer('rain');
    vi.advanceTimersByTime(500);
    expect(layer.playing()).toBe(false);

    layer.play();
    engine.stopLayer('rain', false);
    expect(layer.playing()).toBe(false);
    engine.stopLayer('missing');
  });

  it('loads and plays one-shot effects', () => {
    engine.loadOneShot('thunder', 'blob:thunder');
    engine.loadOneShot('thunder', 'blob:thunder');
    expect(howler.instances).toHaveLength(1);
    engine.playOneShot('thunder', 0.5);
    expect(instance(0).volume()).toBe(0.5);
    engine.playOneShot('missing');
  });

  it('manages music tracks and transitions', () => {
    engine.loadMusic('explore', 'blob:explore');
    engine.loadMusic('explore', 'blob:explore');
    expect(howler.instances).toHaveLength(1);

    engine.playMusic(0.4);
    const music = instance(0);
    expect(music.playing()).toBe(true);
    expect(music.volume()).toBe(0.4);

    engine.setMusicVolume(0.2);
    expect(music.volume()).toBe(0.2);

    engine.loadMusic('combat', 'blob:combat');
    expect(instance(0).unloaded).toBe(true);
    expect(howler.instances).toHaveLength(2);

    vi.useFakeTimers();
    engine.transitionToMusic('rest', 'blob:rest', 0.3);
    vi.advanceTimersByTime(1000);
    expect(instance(1).unloaded).toBe(true);
    expect(howler.instances).toHaveLength(3);
    expect(instance(2).playing()).toBe(true);

    engine.stopMusic();
    vi.advanceTimersByTime(1000);
    expect(instance(2).playing()).toBe(false);

    instance(2).play();
    engine.stopMusic(false);
    expect(instance(2).playing()).toBe(false);
  });

  it('starts music and transitions when no track is loaded', () => {
    engine.transitionToMusic('explore', 'blob:explore', 0.5);
    expect(howler.instances).toHaveLength(1);
    expect(instance(0).playing()).toBe(true);
  });

  it('manages weather audio', () => {
    engine.loadWeather('storm', 'blob:storm');
    engine.loadWeather('storm-2', 'blob:storm-2');
    expect(howler.instances[0].unloaded).toBe(true);

    engine.playWeather(0.5);
    const weather = instance(1);
    expect(weather.playing()).toBe(true);
    expect(weather.volume()).toBe(0.5);

    engine.setWeatherVolume(0.1);
    expect(weather.volume()).toBe(0.1);

    vi.useFakeTimers();
    engine.stopWeather();
    vi.advanceTimersByTime(500);
    expect(weather.playing()).toBe(false);

    weather.play();
    engine.stopWeather(false);
    expect(weather.playing()).toBe(false);
  });

  it('pauses, resumes, stops and disposes all tracks', () => {
    engine.loadLayer('rain', 'blob:rain');
    engine.loadOneShot('thunder', 'blob:thunder');
    engine.loadMusic('explore', 'blob:explore');
    engine.loadWeather('storm', 'blob:storm');

    engine.playLayer('rain');
    engine.playMusic();
    engine.playWeather();
    engine.pauseAll();
    expect(instance(0).playing()).toBe(false);
    expect(instance(2).playing()).toBe(false);
    expect(instance(3).playing()).toBe(false);

    engine.resumeAll();
    expect(instance(0).playing()).toBe(true);
    expect(instance(2).playing()).toBe(true);
    expect(instance(3).playing()).toBe(true);

    engine.stopAll();
    expect(instance(0).playing()).toBe(false);
    expect(instance(2).playing()).toBe(false);
    expect(instance(3).playing()).toBe(false);

    engine.dispose();
    expect(howler.instances.every((item) => item.unloaded)).toBe(true);
  });
});
