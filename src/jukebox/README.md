# Jukebox (Music Player) Integration

This directory contains the rewritten and integrated version of [minht11/local-music-pwa](https://github.com/minht11/local-music-pwa), adapted to use Vue and styled to match the main project.

## Structure
- All music player components and assets live here.
- The player is exposed as a Vue component for use in the main app.

## Refactor Plan
1. **Rewrite UI in Vue**: Convert the original Preact/JSX code to Vue SFCs.
2. **Design Adaptation**: Use project-wide styles and shared components.
3. **Routing**: Expose the player at `/music` via the main router.
4. **Dependency Management**: Use only the main app's dependencies.

---

For details, see the main project README and this file. 