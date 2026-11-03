import { Howl } from 'howler';

export class AudioEngine {
  private layers: Map<string, Howl> = new Map();
  private musicTrack: Howl | null = null;
  private weatherTrack: Howl | null = null;
  private oneShots: Map<string, Howl> = new Map();
  private oneShotPlayIds: Map<string, number> = new Map();
  private masterVolume: number = 0.8;
  private currentMoodState: string = 'explore';
  private musicEndHandler: (() => void) | null = null;
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
      if (!replace) return;
      this.layers.get(layerId)?.unload();
      this.layers.delete(layerId);
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

  setMusicEndHandler(handler: (() => void) | null): void {
    this.musicEndHandler = handler;
  }

  setOneShotEndHandler(handler: ((sfxId: string) => void) | null): void {
    this.oneShotEndHandler = handler;
  }

  private handleMusicEnd(): void {
    this.musicEndHandler?.();
  }

  playLayer(layerId: string, volume: number = 0.5): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      const targetVolume = volume * this.masterVolume;
      layer.volume(targetVolume);
      if (!layer.playing()) {
        layer.fade(0, targetVolume, 500);
        layer.play();
      } else {
        layer.fade(layer.volume(), targetVolume, 100);
      }
    }
  }

  stopLayer(layerId: string, fadeOut: boolean = true): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      if (fadeOut && layer.playing()) {
        layer.fade(layer.volume(), 0, 500);
        setTimeout(() => {
          layer.stop();
        }, 500);
      } else {
        layer.stop();
      }
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
      onend: (soundId?: number) => {
        if (
          soundId === undefined ||
          this.oneShotPlayIds.get(sfxId) === soundId
        ) {
          this.oneShotPlayIds.delete(sfxId);
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
    this.oneShotPlayIds.set(sfxId, soundId);
    return true;
  }

  getOneShotProgress(sfxId: string): number {
    const sfx = this.oneShots.get(sfxId);
    if (!sfx) return 0;
    try {
      const soundId = this.oneShotPlayIds.get(sfxId);
      const duration =
        soundId !== undefined ? sfx.duration(soundId) : sfx.duration();
      if (!Number.isFinite(duration) || duration <= 0) return 0;
      const seek = soundId !== undefined ? sfx.seek(soundId) : sfx.seek();
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
    this.musicTrack?.unload();
    this.musicTrack = new Howl({
      src: [audioUrl],
      loop,
      volume: 0,
      html5: true,
      preload: true,
      onend: () => this.handleMusicEnd(),
      ...(format ? { format } : {}),
    });
    this.currentMoodState = moodState;
  }

  playMusic(volume: number = 0.5): void {
    if (this.musicTrack && !this.musicTrack.playing()) {
      this.musicTrack.volume(volume * this.masterVolume);
      this.musicTrack.fade(0, volume * this.masterVolume, 1000);
      this.musicTrack.play();
    }
  }

  stopMusic(fadeOut: boolean = true): void {
    if (this.musicTrack) {
      if (fadeOut && this.musicTrack.playing()) {
        this.musicTrack.fade(this.musicTrack.volume(), 0, 1000);
        setTimeout(() => {
          this.musicTrack?.stop();
        }, 1000);
      } else {
        this.musicTrack.stop();
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
    if (this.musicTrack) {
      this.musicTrack.fade(this.musicTrack.volume(), 0, 1000);
      setTimeout(() => {
        this.musicTrack?.stop();
        this.musicTrack?.unload();
        this.musicTrack = new Howl({
          src: [newAudioUrl],
          loop,
          volume: 0,
          html5: true,
          preload: true,
          onend: () => this.handleMusicEnd(),
          ...(format ? { format } : {}),
        });
        this.currentMoodState = newMoodState;
        this.musicTrack.play();
        this.musicTrack.fade(0, volume * this.masterVolume, 1000);
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
    this.layers.forEach((layer) => layer.pause());
    this.musicTrack?.pause();
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
    }
    if (this.weatherTrack && this.weatherTrack.volume() > 0) {
      this.weatherTrack.play();
    }
  }

  stopAll(): void {
    this.layers.forEach((layer) => layer.stop());
    this.musicTrack?.stop();
    this.weatherTrack?.stop();
  }

  dispose(): void {
    this.layers.forEach((layer) => layer.unload());
    this.oneShots.forEach((sfx) => sfx.unload());
    this.musicTrack?.unload();
    this.weatherTrack?.unload();
    this.layers.clear();
    this.oneShots.clear();
    this.musicTrack = null;
    this.weatherTrack = null;
  }
}

export const audioEngine = new AudioEngine();
