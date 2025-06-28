#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get migration name from command line arguments
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('Usage: npm run migration:generate <migration-name>');
  console.error('Example: npm run generate-migration add_user_field');
  process.exit(1);
}

// Validate migration name (only lowercase letters, numbers, and underscores)
if (!/^[a-z0-9_]+$/.test(migrationName)) {
  console.error('Migration name must contain only lowercase letters, numbers, and underscores');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, 'src', 'migrations');

// Read existing migrations to determine next version
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.ts') && file !== 'index.ts' && file !== 'README.md')
  .sort();

let nextVersion = 1;
if (migrationFiles.length > 0) {
  // Extract version from the last migration file
  const lastMigrationFile = migrationFiles[migrationFiles.length - 1];
  const versionMatch = lastMigrationFile.match(/^(\d+)_/);
  if (versionMatch) {
    nextVersion = parseInt(versionMatch[1]) + 1;
  }
}

// Create version prefix (padded with zeros, max 10 symbols)
const versionPrefix = nextVersion.toString().padStart(10, '0');

// Create migration filename
const migrationFileName = `${versionPrefix}_${migrationName}.ts`;
const migrationFilePath = path.join(migrationsDir, migrationFileName);

// Migration template
const migrationTemplate = `import type { Migration } from '@/types/migration';

export const ${migrationName}Migration: Migration = {
  version: ${nextVersion},
  name: '${migrationName}',
  affectedStores: [],
  go: async () => {
    // TODO: Implement migration logic
  }
};
`;

// Write migration file
fs.writeFileSync(migrationFilePath, migrationTemplate);

console.log(`✅ Created migration: ${migrationFileName}`);
console.log(`📁 Location: ${migrationFilePath}`);
console.log(`🔢 Version: ${nextVersion}`);
console.log('');
console.log('Next steps:');
console.log('1. Implement the migration logic in the up() method');
console.log('2. Add the migration to src/migrations/index.ts');
console.log('3. Test the migration'); 
