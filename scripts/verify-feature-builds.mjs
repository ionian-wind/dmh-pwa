import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { FEATURES } from './feature-catalog.mjs';

const viteBin = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
);

function allFlags(value = true) {
  return Object.fromEntries(FEATURES.map((feature) => [feature.id, value]));
}

function envFor(flags) {
  return {
    ...process.env,
    FEATURE_AUDIT: '1',
    ...Object.fromEntries(
      FEATURES.map((feature) => [feature.envKey, String(flags[feature.id])]),
    ),
  };
}

function disabledClosure(id) {
  const disabled = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const feature of FEATURES) {
      if (disabled.has(feature.id)) continue;
      if (feature.requires.some((required) => disabled.has(required))) {
        disabled.add(feature.id);
        changed = true;
      }
    }
  }
  return disabled;
}

function build(config) {
  const result = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: process.cwd(),
    env: envFor(config.flags),
    encoding: 'utf8',
  });
  if (result.status === 0) {
    const manifest = JSON.parse(
      readFileSync('dist/manifest.webmanifest', 'utf8'),
    );
    const expectedShortcuts =
      Number(config.flags.help) +
      Number(config.flags.notes) +
      Number(config.flags.timers) +
      Number(config.flags.jukebox);
    if ((manifest.shortcuts?.length ?? 0) !== expectedShortcuts) {
      console.error(
        `FAIL ${config.name}: expected ${expectedShortcuts} PWA shortcuts, got ${manifest.shortcuts?.length ?? 0}`,
      );
      return false;
    }
    console.log(`PASS ${config.name}`);
    return true;
  }
  console.error(`FAIL ${config.name}`);
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const details = output
    .split('\n')
    .filter(
      (line) =>
        line.includes('Disabled feature') ||
        line.includes('Invalid feature') ||
        line.includes('requires VITE_FEATURE') ||
        line.includes('Unknown feature') ||
        /^  [a-z]+: \/.*src\//.test(line),
    )
    .slice(0, 30);
  console.error(details.join('\n') || output.slice(-3000));
  return false;
}

const configs = [
  { name: 'all-on', flags: allFlags(true) },
  { name: 'all-off', flags: allFlags(false) },
];

for (const feature of FEATURES) {
  const disabled = disabledClosure(feature.id);
  const flags = allFlags(true);
  for (const id of disabled) flags[id] = false;
  configs.push({
    name: `${feature.id}-off (${[...disabled].join(',')} disabled)`,
    flags,
  });
}

let failed = false;
for (const config of configs) {
  if (!build(config)) failed = true;
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`All ${configs.length} feature build configurations passed.`);
}
