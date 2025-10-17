# Universal TRPG Character System - Implementation Types

## Overview
This proposal defines TypeScript interfaces and structures for a universal TRPG character system that can support any tabletop role-playing game system. The design is flexible enough to accommodate various game mechanics while maintaining a consistent API.

## Core Character Interface

### Base Character
```typescript
export interface Character {
  id: string;
  name: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  
  // Game System Information
  gameSystem: string;
  level?: number;
  experience?: number;
  characterType: 'pc' | 'npc' | 'companion' | 'ally';
  
  // Core Stats (flexible structure to support any system)
  attributes: Attributes;
  derivedStats: DerivedStats;
  skills: Record<string, Skill>;
  combat: Combat;
  
  // Universal Character Elements
  background?: string;
  personality?: string;
  appearance?: string;
  inventory?: Item[];
  relationships?: Relationship[];
  traits?: Trait[];
  feats?: Feat[];
  spells?: Spell[];
  equipment?: Equipment[];
  
  // System-specific extensions
  systemSpecific?: Record<string, any>;
  
  // General metadata
  metadata?: Record<string, any>;
}
```

### Attributes (Flexible)
```typescript
export interface Attributes {
  // d20/Pathfinder standard attributes
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  
  // Alternative naming conventions
  st?: number;  // GURPS Strength
  dx?: number;  // GURPS Dexterity
  iq?: number;  // GURPS Intelligence
  ht?: number;  // GURPS Health
  
  body?: number;      // Shadowrun
  reaction?: number;  // Shadowrun
  will?: number;      // Shadowrun/Exalted
  logic?: number;     // Shadowrun
  intuition?: number; // Shadowrun
  
  might?: number;     // Numenera
  speed?: number;     // Numenera
  intellect?: number; // Numenera
  
  // FATE aspects
  aspects?: Aspect[];
  
  // Index signature allows for custom attributes
  [key: string]: number | Aspect[] | undefined;
}

export interface Aspect {
  name: string;
  description: string;
}
```

### Derived Stats (Flexible)
```typescript
export interface DerivedStats {
  // Combat defense
  armorClass?: number;
  defense?: number;
  armorRating?: number;
  fortitude?: number;
  reflex?: number;
  will?: number;
  
  // Health and endurance
  hitPoints?: {
    current: number;
    maximum: number;
    temporary?: number;
  };
  health?: number;
  
  // Movement
  speed?: number;
  movement?: number;
  pace?: number;
  
  // Initiative/perception
  initiative?: number;
  perception?: number;
  
  // FATE-specific
  stress?: {
    physical: { current: number; maximum: number };
    mental: { current: number; maximum: number };
  };
  refresh?: number;
  
  // GURPS-specific
  basicSpeed?: number;
  basicMove?: number;
  fatiguePoints?: {
    current: number;
    maximum: number;
  };
  
  // CoC-specific
  sanity?: {
    current: number;
    maximum: number;
  };
  
  // Index signature for custom derived stats
  [key: string]: number | any;
}
```

### Skills
```typescript
export interface Skill {
  name: string;
  value: number;
  attribute?: string;  // Associated attribute (e.g., "dexterity")
  rank?: number;       // Alternative to value
  proficiency?: 'untrained' | 'trained' | 'expert' | 'master' | 'legendary';
  specialization?: string;
  description?: string;
  custom?: boolean;
}

export interface SkillGroup {
  name: string;
  skills: Skill[];
  attribute?: string;
}
```

### Combat
```typescript
export interface Combat {
  // Attacks
  attacks: Attack[];
  
  // Defensive stats
  armorClass?: number;
  dodge?: number;
  parry?: number;
  
  // Saving throws
  savingThrows?: Record<string, number>;
  
  // Initiative and actions
  initiative?: number;
  actionsPerRound?: number;
  bonusActions?: number;
  reactions?: number;
  
  // Custom combat fields
  [key: string]: any;
}

export interface Attack {
  id: string;
  name: string;
  attackBonus: number;
  damage: string;        // Dice notation like "1d8+3"
  damageType?: string;   // Piercing, Slashing, etc.
  range?: string;        // Melee, 30ft, etc.
  properties?: string[]; // Finesse, Reload, etc.
  description?: string;
  ammunition?: boolean;
  equipped: boolean;
}
```

## Character Components

### Traits & Features
```typescript
export interface Trait {
  id: string;
  name: string;
  type: 'trait' | 'feature' | 'ability' | 'power' | 'talent';
  category: string;    // 'racial', 'class', 'feat', 'background', 'talent', etc.
  description: string;
  effect: string;
  prerequisites?: string;
  activation?: 'passive' | 'action' | 'bonus' | 'reaction' | 'free' | 'legendary';
  duration?: string;
  range?: string;
  target?: string;
  source?: string;     // Where the trait comes from
  level?: number;
}
```

### Items & Equipment
```typescript
export interface Equipment {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'gear' | 'trinket' | 'magic' | 'cyberware' | 'bioware';
  subtype?: string;     // 'simple melee', 'martial ranged', 'light armor', etc.
  quantity: number;
  weight?: number;
  value?: number;
  description?: string;
  properties?: string[]; // 'finesse', 'ammunition', 'versatile', etc.
  damage?: string;       // For weapons
  armorClassBonus?: number; // For armor
  equipped: boolean;
  attuned?: boolean;     // For magic items
  charges?: number;
  maxCharges?: number;
  effects?: string[];    // Special effects
}
```

### Spells & Abilities
```typescript
export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;        // Evocation, Transmutation, etc.
  castingTime: string;   // 1 action, 1 bonus action, etc.
  range: string;         // Self, Touch, 30 feet, etc.
  components: string;    // V, S, M
  material?: string;     // Material component details
  duration: string;      // Instantaneous, Concentration, etc.
  description: string;
  higherLevel?: string;  // Effects at higher levels
  prepared?: boolean;    // Whether prepared (for prepared casters)
  uses?: number;         // Current uses
  maxUses?: number;      // Maximum uses
  ritual?: boolean;
}

export interface Feat {
  id: string;
  name: string;
  type: 'feat' | 'talent' | 'stunt' | 'edge' | 'merit' | 'perk' | 'advantage' | 'disadvantage';
  category: string;      // 'combat', 'skill', 'magic', etc.
  prerequisites?: string;
  description: string;
  benefit: string;
  source?: string;
  level?: number;
}
```

### Relationships
```typescript
export interface Relationship {
  id: string;
  name: string;
  type: 'friend' | 'ally' | 'enemy' | 'rival' | 'mentor' | 'family' | 'romantic' | 'neutral' | 'acquaintance' | 'business';
  description?: string;
  intimacy?: number;      // Scale of relationship strength (0-10)
  alignment?: 'same' | 'opposite' | 'neutral'; // How alignment matches
  status?: 'active' | 'inactive' | 'resolved' | 'complicated' | 'estranged' | 'secret';
}
```

## System-Specific Extensions

### D&D 5e Extension
```typescript
export interface DnD5eSpecific {
  hitDice: {
    type: string;    // "d8", "d10", etc.
    current: number;
    maximum: number;
  };
  inspiration: boolean;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  armor?: string;
  shield?: boolean;
  proficiencies: {
    weapons: string[];
    armor: string[];
    tools: string[];
    languages: string[];
  };
  spellcasting?: {
    ability: 'wisdom' | 'intelligence' | 'charisma';
    saveDc: number;
    attackBonus: number;
  };
  spellSlots: Record<string, { used: number; max: number }>; // "1st", "2nd", etc.
}
```

### GURPS Extension
```typescript
export interface GURPSSpecific {
  points: {
    attributes: number;
    advantages: number;
    skills: number;
    quirks: number;
    total: number;
  };
  encumbrance: {
    current: number;
    maximum: number;
    level: 'none' | 'light' | 'medium' | 'heavy' | 'xheavy';
  };
  advantages: Advantage[];
  disadvantages: Advantage[]; // Same structure, negative points
  quirks: string[];
  perks: string[];
}

export interface Advantage {
  id: string;
  name: string;
  type: 'advantage' | 'disadvantage';
  category: string;    // 'physical', 'mental', 'social', etc.
  points: number;
  level?: number;
  modifiers: string[];
  prerequisites?: string;
  description: string;
  notes?: string;
}
```

### FATE Extension
```typescript
export interface FATESpecific {
  aspects: {
    highConcept: string;
    trouble: string;
    otherAspects: string[];
  };
  consequences: {
    mild: { taken: boolean; value: string }[];
    moderate: { taken: boolean; value: string }[];
    severe: { taken: boolean; value: string }[];
  };
  stunts: Stunt[];
  fatePoints: number;
}

export interface Stunt {
  id: string;
  name: string;
  description: string;
  benefit: string;
  cost: number;      // Refresh cost if any
  prerequisites?: string;
}
```

## Utility Types

### UUID and Timestamp Types
```typescript
export type UUID = string;
export type Timestamp = number;

// Base type for entities with ID and timestamps
export interface Entity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Character Creation Helper
```typescript
// Helper interface for character creation with optional fields
export interface CharacterCreationData {
  name: string;
  gameSystem: string;
  characterType?: 'pc' | 'npc';
  attributes?: Partial<Attributes>;
  skills?: Record<string, Skill>;
  background?: string;
  personality?: string;
  appearance?: string;
  systemSpecific?: Record<string, any>;
}
```

## Implementation Notes

### Extensibility
- Use index signatures (`[key: string]: any`) for system-specific data
- Interfaces can be extended for game-specific features
- Generic types can be used for collections

### Performance
- Implement lazy loading for complex character components
- Use computed properties for derived stats
- Cache frequently accessed data

### Validation
- Implement validation functions for character creation
- Validate game system-specific constraints
- Ensure data integrity across systems

### Storage
- Serialize to JSON for storage
- Implement versioning for backward compatibility
- Support import/export of character data