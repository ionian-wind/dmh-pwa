type PauseHandler = (() => void) | null;

let pauseAmbientHandler: PauseHandler = null;
let pauseJukeboxHandler: PauseHandler = null;

export function setAmbientPauseHandler(handler: PauseHandler): void {
  pauseAmbientHandler = handler;
}

export function setJukeboxPauseHandler(handler: PauseHandler): void {
  pauseJukeboxHandler = handler;
}

/** Called when jukebox playback starts: pause ambient playback. */
export function pauseAmbientForJukebox(): void {
  pauseAmbientHandler?.();
}

/** Called when ambient playback starts: pause jukebox playback. */
export function pauseJukeboxForAmbient(): void {
  pauseJukeboxHandler?.();
}

/** Test helper: clear registered handlers. */
export function resetPlaybackCoordinator(): void {
  pauseAmbientHandler = null;
  pauseJukeboxHandler = null;
}
