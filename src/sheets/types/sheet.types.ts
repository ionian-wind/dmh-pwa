import type { UUID, Timestamp } from '@/types';

// Main sheet interface
export interface Sheet {
  id: UUID;
  name: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  layout: LayoutItem[];
  gameSystem: string;
  sheetConfig?: Record<string, any>; // Additional configuration specific to sheets
  characterId?: UUID; // Optional link to existing character
}

export interface LayoutItem {
  id: string;
  componentType: string;
  x: number; // Grid x position
  y: number; // Grid y position
  width: number; // Grid width (in columns)
  height: number; // Grid height (in rows)
  properties: Record<string, any>;
  locked?: boolean;
  name?: string; // User-friendly name for the component
}

// Component definition for the editor
export interface ComponentDefinition {
  type: string;
  name: string;
  icon: string;
  defaultProps: Record<string, any>;
  validator?: (props: Record<string, any>) => boolean;
  editorComponent: string; // Component for editing properties
  displayComponent: string; // Component for rendering
}

// Component category for the palette
export interface ComponentCategory {
  name: string;
  components: ComponentDefinition[];
}

// Sheet template for reusable layouts
export interface SheetTemplate {
  id: UUID;
  name: string;
  gameSystem: string;
  layout: LayoutItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  description?: string;
}

// Character link for optional character association
export interface CharacterSheetLink {
  characterId: UUID;
  sheetId: UUID;
  createdAt: Timestamp;
}
