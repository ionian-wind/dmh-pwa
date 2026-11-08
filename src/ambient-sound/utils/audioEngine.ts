import { Howl } from 'howler';

const MUSIC_CROSSFADE_MS = 1000;
const LAYER_CROSSFADE_MS = 500;

export class AudioEngine {
  private layers: Map<string, Howl> = new Map();
  private layerBaseVolumes = new Map<string, number>();
  private retiringLayers = new Set<Howl>();
  private musicTrack: Howl | null = null;
  private musicBaseVolume: number = 0.5;
  private retiringMusicTracks = new Set<Howl>();
  private weatherTrack: Howl | null = null;
  private oneShots: Map<string, Howl[]> = new Map();
  private oneShotBaseVolumes = new Map<string, number>();
  private oneShotPlayIds = new Map<
    string,
    Array<{ howl: Howl; soundId: number }>
  >();
  private masterVolume: number = 0.8;
  private moodVolume: number = 1;
  private ambienceVolume: number = 1;
  private oneShotVolume: number = 1;
  private currentMoodState: string = 'explore';
  private musicEndHandler: (() => void) | null = null;
  private musicNearEndHandler: (() => void) | null = null;
  private musicNearEndTimer: ReturnType<typeof setTimeout> | null = null;
  private oneShotEndHandler: ((sfxId: string) => void) | null = null;

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.applyLayerVolumes();
    this.applyMusicVolume();
    this.applyOneShotVolumes();
  }

  setMoodVolume(volume: number): void {
    this.moodVolume = Math.max(0, Math.min(1, volume));
    this.applyMusicVolume();
  }

  setAmbienceVolume(volume: number): void {
    this.ambienceVolume = Math.max(0, Math.min(1, volume));
    this.applyLayerVolumes();
  }

  setOneShotVolume(volume: number): void {
    this.oneShotVolume = Math.max(0, Math.min(1, volume));
    this.applyOneShotVolumes();
  }

  private applyLayerVolumes(): void {
    this.layers.forEach((layer, layerId) => {
      const target =
        (this.layerBaseVolumes.get(layerId) ?? 0) *
        this.ambienceVolume *
        this.masterVolume;
      if (layer.playing()) layer.fade(layer.volume(), target, 100);
      else layer.volume(target);
    });
  }

  private applyMusicVolume(): void {
    if (!this.musicTrack) return;
    const target = this.musicBaseVolume * this.moodVolume * this.masterVolume;
    if (this.musicTrack.playing()) {
      this.musicTrack.fade(this.musicTrack.volume(), target, 100);
    } else {
      this.musicTrack.volume(target);
    }
  }

  private applyOneShotVolumes(): void {
    this.oneShots.forEach((howls, sfxId) => {
      const target =
        (this.oneShotBaseVolumes.get(sfxId) ?? 1) *
        this.oneShotVolume *
        this.masterVolume;
      howls.forEach((howl) => howl.volume(target));
    });
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  loadLayer(
    layerId: string,
    audioUrl: string,
    replace = false,
    format?: string[],
  ): void {
    if (this.layers.has(layerId)) {
      const existing = this.layers.get(layerId)!;
      if (!replace) return;
      this.layers.delete(layerId);
      this.layerBaseVolumes.delete(layerId);
      if (existing.playing()) {
        this.fadeOutRetiringLayer(existing);
      } else {
        existing.unload();
      }
    }
    const howl = new Howl({
      src: [audioUrl],
      loop: true,
      volume: 0,
      html5: true,
      preload: true,
      ...(format ? { format } : {}),
    });
    this.layers.set(layerId, howl);
  }

  private fadeOutRetiringLayer(layer: Howl): void {
    if (this.retiringLayers.has(layer)) return;
    this.retiringLayers.add(layer);
    layer.fade(layer.volume(), 0, LAYER_CROSSFADE_MS);
    setTimeout(() => {
      layer.stop();
      layer.unload();
      this.retiringLayers.delete(layer);
    }, LAYER_CROSSFADE_MS);
  }

  setMusicEndHandler(handler: (() => void) | null): void {
    this.musicEndHandler = handler;
  }

  setMusicNearEndHandler(handler: (() => void) | null): void {
    this.musicNearEndHandler = handler;
  }

  setOneShotEndHandler(handler: ((sfxId: string) => void) | null): void {
    this.oneShotEndHandler = handler;
  }

  private handleMusicEnd(track: Howl): void {
    if (track !== this.musicTrack) return;
    this.musicEndHandler?.();
  }

  private clearMusicNearEndTimer(): void {
    if (this.musicNearEndTimer !== null) {
      clearTimeout(this.musicNearEndTimer);
      this.musicNearEndTimer = null;
    }
  }

  private scheduleMusicNearEnd(): void {
    this.clearMusicNearEndTimer();
    const track = this.musicTrack;
    if (!track || !track.playing()) return;

    const duration = track.duration();
    const seek = track.seek();
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (typeof seek !== 'number' || !Number.isFinite(seek)) return;

    const remainingMs = (duration - seek) * 1000;
    const delay = remainingMs - MUSIC_CROSSFADE_MS;
    if (delay <= 0) return;

    this.musicNearEndTimer = setTimeout(() => {
      this.musicNearEndTimer = null;
      if (track !== this.musicTrack) return;
      this.musicNearEndHandler?.();
    }, delay);
  }

  playLayer(layerId: string, volume: number = 0.5): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      const baseVolume = Math.max(0, Math.min(1, volume));
      this.layerBaseVolumes.set(layerId, baseVolume);
      const targetVolume = baseVolume * this.ambienceVolume * this.masterVolume;
      if (!layer.playing()) {
        layer.volume(0);
        layer.play();
        layer.fade(0, targetVolume, 500);
      } else {
        layer.fade(layer.volume(), targetVolume, 100);
      }
    }
  }

  stopLayer(layerId: string, fadeOut: boolean = true): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    this.layers.delete(layerId);
    this.layerBaseVolumes.delete(layerId);
    if (fadeOut && layer.playing()) {
      this.fadeOutRetiringLayer(layer);
    } else {
      layer.stop();
      layer.unload();
    }
  }

  setLayerVolume(layerId: string, volume: number): void {
    const layer = this.layers.get(layerId);
    if (layer && layer.playing()) {
      const baseVolume = Math.max(0, Math.min(1, volume));
      this.layerBaseVolumes.set(layerId, baseVolume);
      layer.fade(
        layer.volume(),
        baseVolume * this.ambienceVolume * this.masterVolume,
        100,
      );
    }
  }

  isLayerPlaying(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    return layer ? layer.playing() : false;
  }

  loadOneShot(
    sfxId: string,
    audioUrl: string | string[],
    format?: string[],
  ): void {
    if (this.oneShots.has(sfxId)) {
      return;
    }
    const urls = Array.isArray(audioUrl) ? audioUrl : [audioUrl];
    const howls = urls.map((url) => {
      const howl = new Howl({
        src: [url],
        volume: 0,
        html5: true,
        preload: true,
        // Allow the same one-shot to overlap with itself.
        pool: 8,
        onend: (soundId?: number) =>
          this.handleOneShotEnd(sfxId, howl, soundId),
        ...(format ? { format } : {}),
      });
      return howl;
    });
    this.oneShots.set(sfxId, howls);
  }

  private handleOneShotEnd(sfxId: string, howl: Howl, soundId?: number): void {
    const active = this.oneShotPlayIds.get(sfxId);
    if (!active) return;

    let removed = false;
    for (let index = active.length - 1; index >= 0; index -= 1) {
      const entry = active[index];
      if (
        entry.howl === howl &&
        (soundId === undefined || entry.soundId === soundId)
      ) {
        active.splice(index, 1);
        removed = true;
        if (soundId !== undefined) break;
      }
    }

    if (active.length === 0) this.oneShotPlayIds.delete(sfxId);
    if (removed) this.oneShotEndHandler?.(sfxId);
  }

  playOneShot(sfxId: string, volume: number = 1): boolean {
    const howls = this.oneShots.get(sfxId);
    if (!howls?.length) return false;
    // One-shots use their own entry volume, scaled by the scene buses.
    const baseVolume = Math.max(0, Math.min(1, volume));
    this.oneShotBaseVolumes.set(sfxId, baseVolume);
    const targetVolume = baseVolume * this.oneShotVolume * this.masterVolume;
    howls.forEach((howl) => howl.volume(targetVolume));

    const howl = howls[Math.floor(Math.random() * howls.length)];
    const soundId = howl.play();
    if (soundId === undefined) return false;
    const active = this.oneShotPlayIds.get(sfxId) ?? [];
    active.push({ howl, soundId });
    this.oneShotPlayIds.set(sfxId, active);
    return true;
  }

  getOneShotProgress(sfxId: string): number {
    const active = this.oneShotPlayIds.get(sfxId);
    const entry = active?.at(-1);
    if (!entry) return 0;
    try {
      const duration = entry.howl.duration(entry.soundId);
      const seek = entry.howl.seek(entry.soundId);
      if (!Number.isFinite(duration) || duration <= 0) return 0;
      if (typeof seek !== 'number' || !Number.isFinite(seek)) return 0;
      return Math.max(0, Math.min(1, seek / duration));
    } catch {
      return 0;
    }
  }

  getMusicProgress(): number {
    const track = this.musicTrack;
    if (!track) return 0;
    try {
      const duration = track.duration();
      const seek = track.seek();
      if (!Number.isFinite(duration) || duration <= 0) return 0;
      if (typeof seek !== 'number' || !Number.isFinite(seek)) return 0;
      return Math.max(0, Math.min(1, seek / duration));
    } catch {
      return 0;
    }
  }

  loadMusic(
    moodState: string,
    audioUrl: string,
    loop = true,
    format?: string[],
    replace = false,
  ): void {
    if (this.musicTrack && this.currentMoodState === moodState && !replace) {
      return;
    }
    this.clearMusicNearEndTimer();
    if (this.musicTrack) {
      if (this.musicTrack.playing()) {
        this.fadeOutRetiringTrack(this.musicTrack);
      } else {
        this.musicTrack.unload();
      }
    }
    const track = new Howl({
      src: [audioUrl],
      loop,
      volume: 0,
      html5: true,
      preload: true,
      onend: () => this.handleMusicEnd(track),
      onload: () => this.scheduleMusicNearEnd(),
      ...(format ? { format } : {}),
    });
    this.musicTrack = track;
    this.currentMoodState = moodState;
  }

  private fadeOutRetiringTrack(track: Howl): void {
    this.retiringMusicTracks.add(track);
    track.fade(track.volume(), 0, MUSIC_CROSSFADE_MS);
    setTimeout(() => {
      track.stop();
      track.unload();
      this.retiringMusicTracks.delete(track);
    }, MUSIC_CROSSFADE_MS);
  }

  playMusic(volume: number = 0.5): void {
    if (this.musicTrack && !this.musicTrack.playing()) {
      const baseVolume = Math.max(0, Math.min(1, volume));
      this.musicBaseVolume = baseVolume;
      this.musicTrack.volume(0);
      this.musicTrack.play();
      this.musicTrack.fade(
        0,
        baseVolume * this.moodVolume * this.masterVolume,
        1000,
      );
      this.scheduleMusicNearEnd();
    }
  }

  stopMusic(fadeOut: boolean = true): void {
    this.clearMusicNearEndTimer();
    this.retiringMusicTracks.forEach((track) => {
      track.stop();
      track.unload();
    });
    this.retiringMusicTracks.clear();
    if (this.musicTrack) {
      const track = this.musicTrack;
      if (fadeOut && track.playing()) {
        track.fade(track.volume(), 0, 1000);
        setTimeout(() => {
          track.stop();
        }, 1000);
      } else {
        track.stop();
      }
    }
  }

  setMusicVolume(volume: number): void {
    const baseVolume = Math.max(0, Math.min(1, volume));
    this.musicBaseVolume = baseVolume;
    if (this.musicTrack && this.musicTrack.playing()) {
      this.musicTrack.fade(
        this.musicTrack.volume(),
        baseVolume * this.moodVolume * this.masterVolume,
        100,
      );
    }
  }

  transitionToMusic(
    newMoodState: string,
    newAudioUrl: string,
    volume: number = 0.5,
    loop = true,
    format?: string[],
  ): void {
    this.clearMusicNearEndTimer();
    const baseVolume = Math.max(0, Math.min(1, volume));
    this.musicBaseVolume = baseVolume;
    if (this.musicTrack) {
      this.musicTrack.fade(this.musicTrack.volume(), 0, 1000);
      setTimeout(() => {
        this.musicTrack?.stop();
        this.musicTrack?.unload();
        const track = new Howl({
          src: [newAudioUrl],
          loop,
          volume: 0,
          html5: true,
          preload: true,
          onend: () => this.handleMusicEnd(track),
          onload: () => this.scheduleMusicNearEnd(),
          ...(format ? { format } : {}),
        });
        this.musicTrack = track;
        this.currentMoodState = newMoodState;
        track.play();
        track.fade(0, baseVolume * this.moodVolume * this.masterVolume, 1000);
        this.scheduleMusicNearEnd();
      }, 1000);
    } else {
      this.loadMusic(newMoodState, newAudioUrl, loop, format);
      this.playMusic(baseVolume);
    }
  }

  loadWeather(weatherId: string, audioUrl: string): void {
    if (this.weatherTrack) {
      this.weatherTrack.unload();
    }
    this.weatherTrack = new Howl({
      src: [audioUrl],
      loop: true,
      volume: 0,
      html5: true,
      preload: true,
    });
  }

  playWeather(volume: number = 0.5): void {
    if (this.weatherTrack && !this.weatherTrack.playing()) {
      this.weatherTrack.volume(volume * this.masterVolume);
      this.weatherTrack.fade(0, volume * this.masterVolume, 500);
      this.weatherTrack.play();
    }
  }

  stopWeather(fadeOut: boolean = true): void {
    if (this.weatherTrack) {
      if (fadeOut && this.weatherTrack.playing()) {
        this.weatherTrack.fade(this.weatherTrack.volume(), 0, 500);
        setTimeout(() => {
          this.weatherTrack?.stop();
        }, 500);
      } else {
        this.weatherTrack.stop();
      }
    }
  }

  setWeatherVolume(volume: number): void {
    if (this.weatherTrack && this.weatherTrack.playing()) {
      this.weatherTrack.fade(
        this.weatherTrack.volume(),
        volume * this.masterVolume,
        100,
      );
    }
  }

  pauseAll(): void {
    this.clearMusicNearEndTimer();
    this.layers.forEach((layer) => layer.pause());
    this.retiringLayers.forEach((layer) => layer.pause());
    this.musicTrack?.pause();
    this.retiringMusicTracks.forEach((track) => track.pause());
    this.weatherTrack?.pause();
  }

  resumeAll(): void {
    this.layers.forEach((layer) => {
      if (layer.volume() > 0) {
        layer.play();
      }
    });
    if (this.musicTrack && this.musicTrack.volume() > 0) {
      this.musicTrack.play();
      this.scheduleMusicNearEnd();
    }
    if (this.weatherTrack && this.weatherTrack.volume() > 0) {
      this.weatherTrack.play();
    }
  }

  stopAll(): void {
    this.clearMusicNearEndTimer();
    this.layers.forEach((layer) => layer.stop());
    this.retiringLayers.forEach((layer) => layer.stop());
    this.retiringLayers.clear();
    this.musicTrack?.stop();
    this.retiringMusicTracks.forEach((track) => track.stop());
    this.retiringMusicTracks.clear();
    this.weatherTrack?.stop();
  }

  dispose(): void {
    this.clearMusicNearEndTimer();
    this.layers.forEach((layer) => layer.unload());
    this.retiringLayers.forEach((layer) => layer.unload());
    this.retiringLayers.clear();
    this.oneShots.forEach((howls) => howls.forEach((howl) => howl.unload()));
    this.musicTrack?.unload();
    this.retiringMusicTracks.forEach((track) => track.unload());
    this.retiringMusicTracks.clear();
    this.weatherTrack?.unload();
    this.layers.clear();
    this.layerBaseVolumes.clear();
    this.oneShots.clear();
    this.oneShotBaseVolumes.clear();
    this.musicTrack = null;
    this.weatherTrack = null;
  }
}

export const audioEngine = new AudioEngine();
