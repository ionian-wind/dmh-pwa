import { Howl } from 'howler';

const MUSIC_CROSSFADE_MS = 1000;
const LAYER_CROSSFADE_MS = 500;

export class AudioEngine {
  private layers: Map<string, Howl> = new Map();
  private retiringLayers = new Set<Howl>();
  private musicTrack: Howl | null = null;
  private retiringMusicTracks = new Set<Howl>();
  private weatherTrack: Howl | null = null;
  private oneShots: Map<string, Howl> = new Map();
  private oneShotPlayIds: Map<string, number[]> = new Map();
  private masterVolume: number = 0.8;
  private currentMoodState: string = 'explore';
  private musicEndHandler: (() => void) | null = null;
  private musicNearEndHandler: (() => void) | null = null;
  private musicNearEndTimer: ReturnType<typeof setTimeout> | null = null;
  private oneShotEndHandler: ((sfxId: string) => void) | null = null;

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
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
      const targetVolume = volume * this.masterVolume;
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
      layer.fade(layer.volume(), volume * this.masterVolume, 100);
    }
  }

  isLayerPlaying(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    return layer ? layer.playing() : false;
  }

  loadOneShot(sfxId: string, audioUrl: string, format?: string[]): void {
    if (this.oneShots.has(sfxId)) {
      return;
    }
    const howl = new Howl({
      src: [audioUrl],
      volume: 1,
      html5: true,
      preload: true,
      // Allow the same one-shot to overlap with itself.
      pool: 8,
      onend: (soundId?: number) => {
        const activeIds = this.oneShotPlayIds.get(sfxId);
        if (activeIds) {
          if (soundId === undefined) {
            activeIds.length = 0;
          } else {
            const index = activeIds.indexOf(soundId);
            if (index >= 0) activeIds.splice(index, 1);
          }
          if (activeIds.length === 0) this.oneShotPlayIds.delete(sfxId);
        }
        this.oneShotEndHandler?.(sfxId);
      },
      ...(format ? { format } : {}),
    });
    this.oneShots.set(sfxId, howl);
  }

  playOneShot(sfxId: string, volume: number = 1): boolean {
    const sfx = this.oneShots.get(sfxId);
    if (!sfx) return false;
    // One-shots use their own volume and are independent of ambient buses.
    sfx.volume(Math.max(0, Math.min(1, volume)));
    const soundId = sfx.play();
    if (soundId === undefined) return false;
    const activeIds = this.oneShotPlayIds.get(sfxId) ?? [];
    activeIds.push(soundId);
    this.oneShotPlayIds.set(sfxId, activeIds);
    return true;
  }

  getOneShotProgress(sfxId: string): number {
    const sfx = this.oneShots.get(sfxId);
    if (!sfx) return 0;
    const activeIds = this.oneShotPlayIds.get(sfxId);
    const soundId = activeIds?.at(-1);
    if (soundId === undefined) return 0;
    try {
      const duration = sfx.duration(soundId);
      const seek = sfx.seek(soundId);
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
      this.musicTrack.volume(0);
      this.musicTrack.play();
      this.musicTrack.fade(0, volume * this.masterVolume, 1000);
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
    if (this.musicTrack && this.musicTrack.playing()) {
      this.musicTrack.fade(
        this.musicTrack.volume(),
        volume * this.masterVolume,
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
        track.fade(0, volume * this.masterVolume, 1000);
        this.scheduleMusicNearEnd();
      }, 1000);
    } else {
      this.loadMusic(newMoodState, newAudioUrl, loop, format);
      this.playMusic(volume);
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
    this.oneShots.forEach((sfx) => sfx.unload());
    this.musicTrack?.unload();
    this.retiringMusicTracks.forEach((track) => track.unload());
    this.retiringMusicTracks.clear();
    this.weatherTrack?.unload();
    this.layers.clear();
    this.oneShots.clear();
    this.musicTrack = null;
    this.weatherTrack = null;
  }
}

export const audioEngine = new AudioEngine();
