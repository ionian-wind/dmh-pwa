import type { DungeonLayerStyle } from '@/map-studio/domain/document/types';

export interface DungeonPreset {
  id: string;
  nameKey: string;
  style: DungeonLayerStyle;
}

export const DUNGEON_PRESETS: DungeonPreset[] = [
  {
    id: 'classic-hatching',
    nameKey: 'mapStudio.presets.classic',
    style: {
      floor: { visible: true, color: '#f4efe4' },
      walls: {
        visible: true,
        color: '#1f2933',
        width: 0.08,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: true, color: '#00000018', width: 1 },
    },
  },
  {
    id: 'minimal',
    nameKey: 'mapStudio.presets.minimal',
    style: {
      floor: { visible: true, color: '#ffffff' },
      walls: {
        visible: true,
        color: '#263238',
        width: 0.06,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: false, color: '#00000012', width: 1 },
    },
  },
  {
    id: 'blueprint',
    nameKey: 'mapStudio.presets.blueprint',
    style: {
      floor: { visible: true, color: '#0b3a5b' },
      walls: {
        visible: true,
        color: '#d7f0ff',
        width: 0.07,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: true, color: '#ffffff22', width: 1 },
    },
  },
  {
    id: 'cave',
    nameKey: 'mapStudio.presets.cave',
    style: {
      floor: { visible: true, color: '#2f2a24' },
      walls: {
        visible: true,
        color: '#0d0c0a',
        width: 0.12,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: false, color: '#00000010', width: 1 },
    },
  },
];

export function getDungeonPreset(id: string): DungeonPreset | null {
  return DUNGEON_PRESETS.find((preset) => preset.id === id) ?? null;
}
