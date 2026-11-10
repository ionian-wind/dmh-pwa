import type { DungeonLayerStyle } from '@/map-studio/domain/document/types';
import { createDungeonStyle } from '@/map-studio/domain/document/factories';

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
      ...createDungeonStyle(),
      floor: { visible: true, color: '#f4efe4' },
      walls: {
        visible: true,
        color: '#1f2933',
        width: 0.08,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: true, color: '#00000018', width: 1 },
      shadow: {
        visible: true,
        opacity: 0.24,
        offsetX: 0.07,
        offsetY: 0.07,
        color: '#000000',
        blendMode: 'multiply',
      },
      hatching: {
        visible: true,
        variant: 'diagonal',
        size: 0.45,
        color: '#1f2933',
        width: 0.012,
      },
      shading: {
        visible: true,
        size: 0.16,
        roughness: 1,
        color: '#000000',
        opacity: 0.26,
      },
    },
  },
  {
    id: 'minimal',
    nameKey: 'mapStudio.presets.minimal',
    style: {
      ...createDungeonStyle(),
      floor: { visible: true, color: '#ffffff' },
      walls: {
        visible: true,
        color: '#263238',
        width: 0.06,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: false, color: '#00000012', width: 1 },
      shadow: {
        visible: true,
        opacity: 0.18,
        offsetX: 0.05,
        offsetY: 0.05,
        color: '#000000',
        blendMode: 'multiply',
      },
      shading: {
        visible: true,
        size: 0.12,
        roughness: 0,
        color: '#000000',
        opacity: 0.2,
      },
    },
  },
  {
    id: 'blueprint',
    nameKey: 'mapStudio.presets.blueprint',
    style: {
      ...createDungeonStyle(),
      floor: { visible: true, color: '#0b3a5b' },
      walls: {
        visible: true,
        color: '#d7f0ff',
        width: 0.07,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: true, color: '#ffffff22', width: 1 },
      hatching: {
        visible: true,
        variant: 'cross',
        size: 0.6,
        color: '#8fc7e8',
        width: 0.01,
      },
      shading: {
        visible: true,
        size: 0.18,
        roughness: 1,
        color: '#001c2e',
        opacity: 0.35,
      },
    },
  },
  {
    id: 'cave',
    nameKey: 'mapStudio.presets.cave',
    style: {
      ...createDungeonStyle(),
      floor: { visible: true, color: '#2f2a24' },
      walls: {
        visible: true,
        color: '#0d0c0a',
        width: 0.12,
        blocksLight: true,
        dash: false,
      },
      grid: { visible: false, color: '#00000010', width: 1 },
      shadow: {
        visible: true,
        opacity: 0.35,
        offsetX: 0.12,
        offsetY: 0.12,
        color: '#000000',
        blendMode: 'multiply',
      },
      hatching: {
        visible: true,
        variant: 'brick',
        size: 0.55,
        color: '#0d0c0a',
        width: 0.014,
      },
      shading: {
        visible: true,
        size: 0.24,
        roughness: 3,
        color: '#000000',
        opacity: 0.42,
      },
    },
  },
];

export function getDungeonPreset(id: string): DungeonPreset | null {
  return DUNGEON_PRESETS.find((preset) => preset.id === id) ?? null;
}
