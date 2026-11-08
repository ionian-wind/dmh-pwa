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

  it('clamps the master volume without changing the global Howler volume', () => {
    engine.setMasterVolume(2);
    expect(engine.getMasterVolume()).toBe(1);
    engine.setMasterVolume(-1);
    expect(engine.getMasterVolume()).toBe(0);
    expect(howler.volume).not.toHaveBeenCalled();
  });

  it('applies master volume to active layers, music and one-shots', () => {
    engine.loadLayer('rain', 'blob:rain');
    engine.playLayer('rain', 0.8);
    engine.loadMusic('explore', 'blob:explore');
    engine.playMusic(0.5);
    engine.loadOneShot('thunder', 'blob:thunder');
    engine.playOneShot('thunder', 0.8);

    const layer = instance(0);
    const music = instance(1);
    const oneShot = instance(2);
    expect(layer.volume()).toBe(0.8);
    expect(music.volume()).toBe(0.5);
    expect(oneShot.volume()).toBe(0.8);

    engine.setMasterVolume(0.5);
    expect(layer.volume()).toBe(0.4);
    expect(music.volume()).toBe(0.25);
    expect(oneShot.volume()).toBe(0.4);

    engine.setAmbienceVolume(0.5);
    engine.setMoodVolume(0.5);
    engine.setOneShotVolume(0.5);
    expect(layer.volume()).toBe(0.2);
    expect(music.volume()).toBe(0.125);
    expect(oneShot.volume()).toBe(0.2);

    engine.setMasterVolume(0);
    expect(layer.volume()).toBe(0);
    expect(music.volume()).toBe(0);
    expect(oneShot.volume()).toBe(0);
  });

  it('loads, fades, plays and stops layers', () => {
    engine.loadLayer('rain', 'blob:rain');
    engine.loadLayer('rain', 'blob:rain');
    expect(howler.instances).toHaveLength(1);

    const layer = instance(0);
    const layerFade = vi.spyOn(layer, 'fade');
    engine.playLayer('rain', 0.5);
    expect(layer.playing()).toBe(true);
    expect(layerFade).toHaveBeenCalledWith(0, 0.5, 500);
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
    expect(layer.unloaded).toBe(true);

    engine.loadLayer('rain', 'blob:rain');
    engine.playLayer('rain', 0.5);
    const replacement = instance(1);
    engine.stopLayer('rain', false);
    expect(replacement.playing()).toBe(false);
    engine.stopLayer('missing');
  });

  it('crossfades layer samples when replacing an active layer', () => {
    vi.useFakeTimers();
    engine.loadLayer('rain', 'blob:one');
    engine.playLayer('rain', 0.5);
    const first = instance(0);

    engine.loadLayer('rain', 'blob:two', true);
    const second = instance(1);
    engine.playLayer('rain', 0.5);

    expect(first.unloaded).toBe(false);
    expect(second.playing()).toBe(true);
    vi.advanceTimersByTime(500);
    expect(first.unloaded).toBe(true);
    expect(second.playing()).toBe(true);
  });

  it('loads and plays one-shot effects', () => {
    const onEnd = vi.fn();
    engine.setOneShotEndHandler(onEnd);
    engine.loadOneShot('thunder', 'blob:thunder');
    engine.loadOneShot('thunder', 'blob:thunder');
    expect(howler.instances).toHaveLength(1);
    expect(engine.playOneShot('thunder', 0.5)).toBe(true);
    expect(instance(0).volume()).toBe(0.5);
    expect(engine.getOneShotProgress('thunder')).toBe(0.4);
    expect(engine.playOneShot('missing')).toBe(false);
    expect(engine.getOneShotProgress('missing')).toBe(0);

    instance(0).opts.onend();
    expect(onEnd).toHaveBeenCalledWith('thunder');
  });

  it('reports current music progress', () => {
    engine.loadMusic('explore', 'blob:theme');
    expect(engine.getMusicProgress()).toBe(0.4);

    engine.musicTrack = null;
    expect(engine.getMusicProgress()).toBe(0);
  });

  it('picks a random sample when a one-shot has several', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    engine.loadOneShot('thunder', ['blob:one', 'blob:two']);
    expect(howler.instances).toHaveLength(2);

    expect(engine.playOneShot('thunder', 0.5)).toBe(true);
    expect(instance(0).playing()).toBe(false);
    expect(instance(1).playing()).toBe(true);
    expect(instance(1).volume()).toBe(0.5);
    random.mockRestore();
  });

  it('allows the same one-shot to overlap with itself', () => {
    engine.loadOneShot('thunder', 'blob:thunder');
    const howl = instance(0);
    expect(howl.opts.pool).toBe(8);
    expect(engine.playOneShot('thunder')).toBe(true);
    expect(engine.playOneShot('thunder')).toBe(true);
    howl.seek = (id?: number) => (id === 2 ? 8 : 4);
    expect(engine.getOneShotProgress('thunder')).toBe(0.8);

    howl.opts.onend(1);
    expect(engine.getOneShotProgress('thunder')).toBe(0.8);

    howl.opts.onend(2);
    expect(engine.getOneShotProgress('thunder')).toBe(0);
  });

  it('returns zero one-shot progress when duration is unavailable', () => {
    engine.loadOneShot('thunder', 'blob:thunder');
    engine.playOneShot('thunder');
    instance(0).duration = () => {
      throw new Error('not ready');
    };
    expect(engine.getOneShotProgress('thunder')).toBe(0);
  });

  it('replaces layer samples and reports temporary music end', () => {
    engine.loadLayer('rain', 'blob:one');
    engine.loadLayer('rain', 'blob:two', true);
    expect(instance(0).unloaded).toBe(true);
    expect(howler.instances).toHaveLength(2);

    const onEnd = vi.fn();
    engine.setMusicEndHandler(onEnd);
    engine.loadMusic('victory', 'blob:victory', false);
    const music = instance(2);
    expect(music.opts.loop).toBe(false);
    music.opts.onend();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('crossfades music tracks and transitions', () => {
    vi.useFakeTimers();
    engine.loadMusic('explore', 'blob:explore');
    engine.loadMusic('explore', 'blob:explore');
    expect(howler.instances).toHaveLength(1);

    const music = instance(0);
    const musicFade = vi.spyOn(music, 'fade');
    engine.playMusic(0.4);
    expect(music.playing()).toBe(true);
    expect(musicFade).toHaveBeenCalledWith(0, 0.4, 1000);
    expect(music.volume()).toBe(0.4);

    engine.setMusicVolume(0.2);
    expect(music.volume()).toBe(0.2);

    const fade = vi.spyOn(music, 'fade');
    engine.loadMusic('combat', 'blob:combat');
    expect(fade).toHaveBeenCalledWith(0.2, 0, 1000);
    expect(music.unloaded).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(music.unloaded).toBe(true);
    expect(howler.instances).toHaveLength(2);

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

  it('reports when music is about to end so variants can blend', () => {
    vi.useFakeTimers();
    const onNearEnd = vi.fn();
    engine.setMusicNearEndHandler(onNearEnd);
    engine.loadMusic('explore', 'blob:explore');
    engine.playMusic();

    vi.advanceTimersByTime(4999);
    expect(onNearEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onNearEnd).toHaveBeenCalledTimes(1);
  });

  it('ignores end events from a retired music track', () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    engine.setMusicEndHandler(onEnd);
    engine.loadMusic('explore', 'blob:explore');
    const retired = instance(0);
    engine.playMusic();
    engine.loadMusic('combat', 'blob:combat');

    retired.opts.onend();
    expect(onEnd).not.toHaveBeenCalled();

    instance(1).opts.onend();
    expect(onEnd).toHaveBeenCalledTimes(1);
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
