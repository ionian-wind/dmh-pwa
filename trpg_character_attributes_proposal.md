# TRPG Character Attributes and Models - Comprehensive Proposal

## Overview
This document outlines the comprehensive set of character attributes and models across various tabletop role-playing games (TRPGs). The goal is to establish a flexible, game-agnostic data structure that can accommodate the diverse mechanics of different TRPG systems while maintaining consistency for character sheet implementations.

## Common TRPG Systems Reviewed

### D&D (Dungeons & Dragons) 3.5e/5e
#### Core Attributes:
- **Ability Scores**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **Derived Stats**: AC, HP, Initiative, Speed, Proficiency Bonus
- **Skills**: Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, etc.
- **Combat**: Attack Bonuses, Saving Throws, Spell Attack Modifiers
- **Class Features**: Class-specific abilities, spell slots, hit dice

### Pathfinder 1e/2e
#### Core Attributes:
- **Attributes**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **Derived Stats**: AC, Fortitude, Reflex, Will saves, HP, Initiative, Speed
- **Skills**: Acrobatics, Arcana, Athletics, Crafting, Deception, Diplomacy, etc.
- **Ancestry/Heritage**: Racial features, size, speed
- **Class Features**: Class DC, spells, feats, focus points (2e)

### d20 Modern/Future
#### Core Attributes:
- **Ability Scores**: Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma
- **Derived Stats**: Defense, Grapple, Initiative, Speed, Reputation
- **Skills**: Bluff, Computer Use, Concentration, Drive, etc.
- **Feats**: Special abilities and bonuses

### GURPS (Generic Universal RolePlaying System)
#### Core Attributes:
- **Primary Stats**: Strength (ST), Dexterity (DX), Intelligence (IQ), Health (HT)
- **Secondary Stats**: Hit Points (HP), Fatigue Points (FP), Basic Speed, Basic Move
- **Skills**: Various skills based on attributes
- **Advantages/Disadvantages**: Supernatural/physical traits, mental traits
- **Perks/Quirks**: Minor advantages/disadvantages

### FATE Core
#### Core Attributes:
- **Aspects**: Descriptive phrases defining the character
- **Skills**: Approaches like Careful, Clever, Flashy, Forceful, Quick, Sneaky
- **Stunts**: Special abilities that break normal rules
- **Stress**: Physical and mental stress tracks
- **Refresh**: FATE points refresh rate

### World of Darkness (VtM, WtA, etc.)
#### Core Attributes:
- **Attributes**: Strength, Dexterity, Stamina, Charisma, Manipulation, Appearance, Perception, Intelligence, Wits
- **Skills**: Athletics, Brawl, Dodge, Empathy, Intimidation, Streetwise, etc.
- **Advantages**: Willpower, Humanity, etc.
- **Merits/Flaws**: Special advantages and disadvantages

### Shadowrun 5e
#### Core Attributes:
- **Attributes**: Body, Agility, Reaction, Strength, Will, Logic, Intuition, Charisma
- **Derived Stats**: Essence, Magic/Resonance, Edge, Initiative
- **Skills**: Pistols, Clubs, Sorcery, Hacking, etc.
- **Matrix**: Cyberdeck stats, programs
- **Qualities**: Special advantages/disadvantages

### Call of Cthulhu
#### Core Attributes:
- **Characteristics**: Strength, Constitution, Size, Dexterity, Appearance, Intelligence, Power, Education
- **Skills**: Accounting, Anthropology, Archaeology, Art/Craft, etc.
- **Sanity**: Sanity points, Cthulhu Mythos
- **Hit Points**: Based on Size and Constitution

### Exalted
#### Core Attributes:
- **Attributes**: Strength, Dexterity, Stamina, Charisma, Manipulation, Appearance, Perception, Intelligence, Wits
- **Essence**: Essence pools and points
- **Willpower**: Willpower pools
- **Virtues**: Compassion, Temperance, Valor
- **Anima**: Anima level and effects

### Warhammer Fantasy Roleplay
#### Core Attributes:
- **Characteristics**: Weapon Skill, Ballistic Skill, Strength, Toughness, Agility, Intelligence, Will Power, Fellowship
- **Skills**: Academic Knowledge, Animal Care, Athletics, Charm, etc.
- **Talents**: Special abilities and bonuses
- **Corruption**: Corruption tracking

### Numenera
#### Core Attributes:
- **Pools**: Might, Speed, Intellect
- **Edge**: Reduction in pool costs
- **Effort**: Additional bonuses from stat spending
- **Skills**: Various skills based on tasks
- **Type**: Descriptor, Focus, Type combination

## Comprehensive Character Model

### Generic Character Interface
```typescript
export interface Character {
  id: UUID;
  name: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Essential Game Info
  gameSystem: string;
  level?: number;
  experience?: number;
  characterType: 'pc' | 'npc' | 'companion' | 'ally';
  
  // Basic Attributes (common across systems)
  attributes: Attributes;
  derivedStats: DerivedStats;
  skills: Record<string, Skill>;
  combat: Combat;
  
  // System-Specific Extensions
  systemSpecific: Record<string, any>;
  
  // Additional Information
  background?: string;
  personality?: string;
  appearance?: string;
  inventory?: Item[];
  relationships?: Relationship[];
  traits?: Trait[];
  feats?: Feat[];
  spells?: Spell[];
  equipment?: Equipment[];
  
  // Meta Information
  metadata?: Record<string, any>;
}
```

### Attributes Interface
```typescript
export interface Attributes {
  // d20/Pathfinder/Modern style
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  
  // GURPS style
  st?: number;        // Strength
  dx?: number;        // Dexterity
  iq?: number;        // Intelligence
  ht?: number;        // Health
  
  // World of Darkness style
  stamina?: number;
  manipulation?: number;
  appearance?: number;
  perception?: number;
  
  // Shadowrun style
  body?: number;
  reaction?: number;
  will?: number;
  logic?: number;
  intuition?: number;
  
  // Call of Cthulhu style
  power?: number;     // Psyche
  education?: number;
  size?: number;      // For HP calculation
  
  // Warhammer style
  weaponSkill?: number;
  ballisticSkill?: number;
  toughness?: number;
  willpower?: number;
  fellowship?: number;
  
  // Numenera style
  might?: number;
  speed?: number;
  intellect?: number;
  
  // Exalted style
  essence?: number;
  
  // FATE style
  aspects?: Aspect[];
  
  // Custom attributes for other systems
  [key: string]: number | Aspect[] | undefined;
}

export interface Aspect {
  name: string;
  description: string;
}
```

### DerivedStats Interface
```typescript
export interface DerivedStats {
  // Combat-related
  armorClass?: number;
  acrobatics?: number;
  defense?: number;
  armorRating?: number;
  
  // Hit Points
  hitPoints?: {
    current: number;
    maximum: number;
    temporary?: number;
  };
  health?: number;
  lifePoints?: number;
  woundTresholds?: number[];
  
  // Saving Throws
  fortitude?: number;
  reflex?: number;
  will?: number;
  savingThrows?: Record<string, number>;
  
  // Movement
  speed?: number;
  movement?: number;
  pace?: number;
  run?: number;
  
  // Initiative
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
  hitPointsMax?: number;
  fatiguePoints?: {
    current: number;
    maximum: number;
  };
  
  // Call of Cthulhu
  sanity?: {
    current: number;
    maximum: number;
  };
  sanityLoss?: number;
  
  // Custom derived stats
  [key: string]: number | any;
}
```

### Skills Interface
```typescript
export interface Skill {
  name: string;
  value: number;
  attribute?: string;  // Associated attribute (e.g., "dexterity" for Acrobatics)
  rank?: number;
  proficiency?: 'trained' | 'expert' | 'master' | 'legendary';
  specialization?: string;  // For games that have skill specializations
  description?: string;
  custom?: boolean;
}

export interface SkillGroup {
  name: string;
  skills: Skill[];
  attribute?: string;  // If skills in group are based on common attribute
}
```

### Combat Interface
```typescript
export interface Combat {
  // Attacks
  attacks: Attack[];
  
  // Defensive stats
  armorClass?: number;
  dodge?: number;
  parry?: number;
  
  // Special combat features
  damageReduction?: number;
  spellResistance?: number;
  fortitude?: number;
  reflex?: number;
  will?: number;
  
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
  damage: string;  // Dice notation like "1d8+3"
  damageType?: string;  // Piercing, Slashing, etc.
  range?: string;  // Melee, 30ft, etc.
  properties?: string[];  // Finesse, Reload, etc.
  description?: string;
  ammunition?: boolean;
  equipped?: boolean;
}
```

### Additional Character Components

#### Traits & Features
```typescript
export interface Trait {
  id: string;
  name: string;
  type: 'trait' | 'feature' | 'ability' | 'power';
  category: string;  // 'racial', 'class', 'feat', 'background', etc.
  description: string;
  effect: string;
  prerequisites?: string;
  activation?: 'passive' | 'action' | 'bonus' | 'reaction' | 'free' | 'legendary';
  duration?: string;
  range?: string;
  target?: string;
  source?: string;  // Where the trait comes from
  level?: number;
}
```

#### Equipment & Items
```typescript
export interface Equipment {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'gear' | 'trinket' | 'magic';
  subtype?: string;  // 'simple melee', 'martial ranged', 'light', etc.
  quantity: number;
  weight?: number;
  value?: number;
  description?: string;
  properties?: string[];  // 'finesse', 'ammunition', 'versatile', etc.
  damage?: string;  // For weapons
  armorClassBonus?: number;  // For armor
  equipped: boolean;
  attuned?: boolean;  // For magic items
  charges?: number;
  maxCharges?: number;
  effects?: string[];  // Special effects
}
```

#### Spells & Abilities
```typescript
export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;  // Evocation, Transmutation, etc.
  castingTime: string;  // 1 action, 1 bonus action, etc.
  range: string;  // Self, Touch, 30 feet, etc.
  components: string;  // V, S, M
  material?: string;  // Material component details
  duration: string;  // Instantaneous, Concentration, etc.
  description: string;
  higherLevel?: string;  // Effects at higher levels
  prepared?: boolean;  // Whether prepared (for prepared casters)
  uses?: number;  // Current uses
  maxUses?: number;  // Maximum uses
  ritual?: boolean;
}
```

#### Relationships
```typescript
export interface Relationship {
  id: string;
  name: string;
  type: 'friend' | 'ally' | 'enemy' | 'rival' | 'mentor' | 'family' | 'romantic' | 'neutral';
  description?: string;
  intimacy?: number;  // Scale of relationship strength
  alignment?: 'same' | 'opposite' | 'neutral';  // How alignment matches
  status?: 'active' | 'inactive' | 'resolved' | 'complicated';
}
```

#### Feats & Special Abilities
```typescript
export interface Feat {
  id: string;
  name: string;
  type: 'feat' | 'talent' | 'stunt' | 'edge' | 'merit' | 'perk';
  category: string;  // 'combat', 'skill', 'magic', etc.
  prerequisites?: string;
  description: string;
  benefit: string;
  source?: string;
  level?: number;
}
```

## Game System Mapping

### D&D 5e Mapping
```typescript
export interface DnD5eCharacter {
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  
  derivedStats: {
    armorClass: number;
    initiative: number;
    speed: number;
    proficiencyBonus: number;
    inspiration: boolean;
    passivePerception: number;
    passiveInvestigation: number;
    passiveInsight: number;
    hitPoints: {
      maximum: number;
      current: number;
      temporary: number;
    };
    hitDice: {
      type: string;  // e.g. "d10"
      current: number;
      maximum: number;
    };
  };
  
  savingThrows: {
    strength: { value: number; proficient: boolean };
    dexterity: { value: number; proficient: boolean };
    constitution: { value: number; proficient: boolean };
    intelligence: { value: number; proficient: boolean };
    wisdom: { value: number; proficient: boolean };
    charisma: { value: number; proficient: boolean };
  };
  
  skills: {
    acrobatics: { value: number; proficient: boolean | number };
    animalHandling: { value: number; proficient: boolean | number };
    arcana: { value: number; proficient: boolean | number };
    athletics: { value: number; proficient: boolean | number };
    deception: { value: number; proficient: boolean | number };
    history: { value: number; proficient: boolean | number };
    insight: { value: number; proficient: boolean | number };
    intimidation: { value: number; proficient: boolean | number };
    investigation: { value: number; proficient: boolean | number };
    medicine: { value: number; proficient: boolean | number };
    nature: { value: number; proficient: boolean | number };
    perception: { value: number; proficient: boolean | number };
    performance: { value: number; proficient: boolean | number };
    persuasion: { value: number; proficient: boolean | number };
    religion: { value: number; proficient: boolean | number };
    sleightOfHand: { value: number; proficient: boolean | number };
    stealth: { value: number; proficient: boolean | number };
    survival: { value: number; proficient: boolean | number };
  };
  
  // Additional D&D specific
  armor?: string;
  shield?: boolean;
  proficiencies: {
    weapons: string[];
    armor: string[];
    tools: string[];
    languages: string[];
  };
  spellcasting?: {
    ability: string;  // "wisdom", "intelligence", "charisma"
    saveDc: number;
    attackBonus: number;
  };
  spellSlots: Record<string, { used: number; max: number }>;  // "1st", "2nd", etc.
}
```

### GURPS Mapping
```typescript
export interface GURPSCharacter {
  attributes: {
    st: number;  // Strength
    dx: number;  // Dexterity
    iq: number;  // Intelligence
    ht: number;  // Health
  };
  
  secondaryStats: {
    hitPoints: {
      current: number;
      maximum: number;
    };
    will: number;  // Based on IQ
    perception: number;  // Based on IQ
    fatiguePoints: {
      current: number;
      maximum: number;
    };
    basicSpeed: number;
    basicMove: number;
  };
  
  skills: Record<string, {
    name: string;
    attribute: string;  // "DX", "IQ", etc.
    level: number;
    relativeLevel: string;  // "DX+1", "IQ-2", etc.
  }>;
  
  advantages: Advantage[];
  disadvantages: Advantage[];  // Same structure, negative points
  quirks: string[];
  perks: string[];
  
  encumbrance: {
    current: number;
    maximum: number;
    level: 'none' | 'light' | 'medium' | 'heavy' | 'xheavy';
  };
  
  points: {
    attributes: number;
    advantages: number;
    skills: number;
    quirks: number;
    total: number;
  };
}

export interface Advantage {
  id: string;
  name: string;
  type: 'advantage' | 'disadvantage';
  category: string;  // 'physical', 'mental', 'social', etc.
  points: number;
  level?: number;  // For leveled advantages
  modifiers: string[];
  prerequisites?: string;
  description: string;
  notes?: string;
}
```

### FATE Mapping
```typescript
export interface FATECharacter {
  aspects: {
    highConcept: string;
    trouble: string;
    otherAspects: string[];
  };
  
  skills: Record<string, number>;  // Skill name to rank (typically -1 to 5+)
  
  stress: {
    physical: { tracks: number[]; current: number };  // Filled stress boxes
    mental: { tracks: number[]; current: number };
  };
  
  consequences: {
    mild: { taken: boolean; value: string }[];
    moderate: { taken: boolean; value: string }[];
    severe: { taken: boolean; value: string }[];
  };
  
  stunts: Stunt[];
  refresh: number;
  fatePoints: number;
}

export interface Stunt {
  id: string;
  name: string;
  description: string;
  benefit: string;  // What the stunt does
  cost: number;  // Refresh cost if any
  prerequisites?: string;
}
```

## Implementation Considerations

### Flexibility
- The model uses generics and index signatures where appropriate to accommodate system-specific attributes
- System-specific interfaces extend the base Character interface
- Custom fields can be added via metadata objects

### Extensibility
- New game systems can be accommodated by extending the base interfaces
- Plugin architecture for system-specific rules and calculations
- Modular components that can be mixed and matched

### Performance
- Lazy loading of complex character components
- Caching for frequently accessed derived stats
- Efficient querying for character lists

### Storage
- Normalized storage for common attributes
- JSON storage for system-specific data
- Versioning for character sheet format changes