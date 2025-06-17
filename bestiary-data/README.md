# D&D 5e Bestiary Data

This directory contains parsed monster data from the D&D 5e bestiary, extracted from HTML files in the `content/bestiary` folder.

## Structure

- **Individual Monster Files**: Each monster is saved as a separate JSON file named after its folder (e.g., `9-zombie.json`)
- **Index File**: `index.json` contains a reference list of all monsters with key information
- **Total Count**: 3,325 monsters processed

## File Format

### Individual Monster Files

Each monster JSON file contains:

```json
{
  "name": "Monster Name [English Name]",
  "folder": "original-folder-name",
  "file": "index.html",
  "size": "Size category",
  "type": "Monster type",
  "alignment": "Alignment",
  "armorClass": 15,
  "hitPoints": 45,
  "hitDice": {
    "number": 6,
    "sides": 8
  },
  "speed": "30 feet",
  "abilities": {
    "Strength": {
      "score": 16,
      "modifier": "+3"
    },
    // ... other abilities
  },
  "savingThrows": "Dex +4",
  "damageImmunities": "fire",
  "conditionImmunities": "poisoned",
  "senses": "darkvision 60 ft.",
  "challengeRating": "3",
  "experiencePoints": 700,
  "proficiencyBonus": 2,
  "environment": "forest",
  "sources": "Monster Manual, etc.",
  "actions": "Multiattack. The monster makes two attacks...",
  "description": "Monster description text...",
  "specialAbilities": {
    "Ability Name": "Ability description..."
  },
  "metadata": {
    "parsedAt": "2025-06-17T15:51:49.040Z",
    "source": "content/bestiary"
  }
}
```

### Index File

The `index.json` file contains a summary of all monsters:

```json
{
  "metadata": {
    "totalMonsters": 3325,
    "createdAt": "2025-06-17T15:51:51.178Z",
    "source": "content/bestiary"
  },
  "monsters": [
    {
      "name": "Monster Name",
      "folder": "folder-name",
      "filename": "filename.json",
      "size": "Size",
      "type": "Type",
      "alignment": "Alignment",
      "challengeRating": "CR",
      "hitPoints": 45,
      "armorClass": 15
    }
    // ... all monsters
  ]
}
```

## Usage Examples

### Load a specific monster
```javascript
const zombie = JSON.parse(fs.readFileSync('bestiary-data/9-zombie.json', 'utf8'));
console.log(zombie.name); // "Зомби [Zombie]"
console.log(zombie.hitPoints); // 22
```

### Search monsters by type
```javascript
const index = JSON.parse(fs.readFileSync('bestiary-data/index.json', 'utf8'));
const dragons = index.monsters.filter(m => m.type.includes('Дракон'));
console.log(`Found ${dragons.length} dragons`);
```

### Find monsters by challenge rating
```javascript
const cr1Monsters = index.monsters.filter(m => m.challengeRating === "1");
console.log(`Found ${cr1Monsters.length} CR 1 monsters`);
```

## Data Quality Notes

- Some text may contain Russian characters and tooltip references (marked with `?`)
- Challenge ratings are preserved as strings to handle fractions like "1/4"
- Hit dice information is parsed when available
- Special abilities and actions are extracted from HTML subsections
- Sources are listed as they appear in the original files

## Parser Information

Generated using `bestiary-parser.js` which:
- Processes HTML files in batches to manage memory
- Extracts structured data from D&D 5e monster stat blocks
- Handles Russian and English text
- Creates safe filenames from monster names/folders
- Includes metadata for tracking and validation

## File Count

- **Total Files**: 3,326 (3,325 monsters + 1 index)
- **Total Size**: ~50MB
- **Average Monster File**: ~15KB
- **Index File**: ~1.1MB 