import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const posix = path.posix;

async function collectEntries(dir, prefix = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push({ relativePath, absolutePath, isDirectory: true });
      result.push(...(await collectEntries(absolutePath, relativePath)));
    } else {
      result.push({ relativePath, absolutePath, isDirectory: false });
    }
  }
  return result;
}

async function assertPackDirectory(packDir) {
  const stat = await fs.stat(packDir).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Sound pack directory not found: ${packDir}`);
  }
  await fs.access(path.join(packDir, 'pack.json')).catch(() => {
    throw new Error(`Missing pack.json in ${packDir}`);
  });
}

function basename(filePath) {
  return posix.basename(filePath.replaceAll('\\', '/'));
}

function normalizeRelative(filePath) {
  return filePath
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        if (value[key] !== undefined) {
          result[key] = canonicalValue(value[key]);
        }
        return result;
      }, {});
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256(...parts) {
  const hash = crypto.createHash('sha256');
  for (const part of parts) {
    hash.update(part);
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** Remove every `id` key, including nested variation and preset IDs. */
function withoutIds(value) {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      if (key !== 'id' && value[key] !== undefined) {
        result[key] = withoutIds(value[key]);
      }
      return result;
    }, {});
  }
  return value;
}

function layerVariations(layer) {
  if (Array.isArray(layer.variations) && layer.variations.length) {
    return layer.variations;
  }
  if (Array.isArray(layer.samples) && layer.samples.length) {
    return [{ id: 'default', name: 'Default', samples: layer.samples }];
  }
  if (layer.file) {
    return [{ id: 'default', name: 'Default', samples: [layer.file] }];
  }
  return [];
}

function sceneMusicPresets(scene) {
  if (Array.isArray(scene.musicPresets) && scene.musicPresets.length) {
    return scene.musicPresets;
  }
  if (Array.isArray(scene.music?.files) && scene.music.files.length) {
    return [{ id: 'default', name: 'Default', files: scene.music.files }];
  }
  return [];
}

function extensionOf(relativePath) {
  return posix.extname(relativePath).toLowerCase();
}

function hashedAssetPath(folder, file) {
  return `${folder}/${file.hash}${file.extension}`;
}

async function resolveAsset(packDir, candidates) {
  const root = path.resolve(packDir);
  for (const candidate of candidates) {
    const relative = normalizeRelative(candidate);
    if (!relative) continue;
    const absolute = path.resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
      continue;
    }
    const stat = await fs.stat(absolute).catch(() => null);
    if (stat?.isFile()) {
      const buffer = await fs.readFile(absolute);
      return {
        relative,
        buffer,
        hash: sha256(buffer),
        extension: extensionOf(relative),
      };
    }
  }
  return null;
}

function requireAsset(resolved, description) {
  if (!resolved) throw new Error(`Missing audio file for ${description}`);
  return resolved;
}

async function hashAmbience(packDir, ambience, outputFiles, referencedSources) {
  const hashBySample = new Map();
  const resolvedFiles = [];
  for (const variation of layerVariations(ambience)) {
    for (const sample of variation.samples ?? []) {
      const resolved = requireAsset(
        await resolveAsset(packDir, [
          sample,
          `ambiences/${basename(sample)}`,
          `layers/${basename(sample)}`,
          basename(sample),
        ]),
        `ambience "${ambience.name}" sample "${sample}"`,
      );
      hashBySample.set(sample, resolved.hash);
      resolvedFiles.push(resolved);
      referencedSources.add(resolved.relative);
      outputFiles.set(hashedAssetPath('ambiences', resolved), resolved.buffer);
    }
  }

  const hashInput = withoutIds(ambience);
  if (Array.isArray(hashInput.variations)) {
    hashInput.variations = hashInput.variations.map((variation) => ({
      ...variation,
      samples: (variation.samples ?? []).map(
        (sample) => hashBySample.get(sample) ?? sample,
      ),
    }));
  }
  if (Array.isArray(hashInput.samples)) {
    hashInput.samples = hashInput.samples.map(
      (sample) => hashBySample.get(sample) ?? sample,
    );
  }
  if (hashInput.file) {
    hashInput.file = hashBySample.get(hashInput.file) ?? hashInput.file;
  }

  const id = sha256(
    canonicalJson(hashInput),
    ...[...new Set(resolvedFiles.map((file) => file.hash))].sort(),
  );

  ambience.id = id;
  for (const variation of ambience.variations ?? []) {
    variation.samples = (variation.samples ?? []).map((sample) => {
      const resolved = resolvedFiles.find(
        (file) => file.hash === hashBySample.get(sample),
      );
      return resolved ? hashedAssetPath('ambiences', resolved) : sample;
    });
  }
  if (Array.isArray(ambience.samples)) {
    ambience.samples = ambience.samples.map((sample) => {
      const resolved = resolvedFiles.find(
        (file) => file.hash === hashBySample.get(sample),
      );
      return resolved ? hashedAssetPath('ambiences', resolved) : sample;
    });
  }
  if (ambience.file) {
    const resolved = resolvedFiles.find(
      (file) => file.hash === hashBySample.get(ambience.file),
    );
    if (resolved) ambience.file = hashedAssetPath('ambiences', resolved);
  }
}

async function hashOneShot(packDir, oneShot, outputFiles, referencedSources) {
  const resolved = requireAsset(
    await resolveAsset(packDir, [
      oneShot.file,
      `one-shots/${basename(oneShot.file)}`,
      `sfx/${basename(oneShot.file)}`,
      basename(oneShot.file),
    ]),
    `one-shot "${oneShot.name}" file "${oneShot.file}"`,
  );
  referencedSources.add(resolved.relative);
  const outputPath = hashedAssetPath('one-shots', resolved);
  outputFiles.set(outputPath, resolved.buffer);

  const hashInput = withoutIds(oneShot);
  hashInput.file = resolved.hash;
  oneShot.id = sha256(canonicalJson(hashInput), resolved.hash);
  oneShot.file = outputPath;
}

async function resolveSceneFiles(packDir, scene, referencedSources) {
  const sceneDir = `scenes/${scene.id}/music`;
  const files = [];
  for (const [presetIndex, preset] of sceneMusicPresets(scene).entries()) {
    for (const file of preset.files ?? []) {
      const resolved = requireAsset(
        await resolveAsset(packDir, [
          file,
          `${sceneDir}/${basename(file)}`,
          `music/${basename(file)}`,
          basename(file),
        ]),
        `scene "${scene.name}" music "${file}"`,
      );
      referencedSources.add(resolved.relative);
      files.push({ ...resolved, presetIndex });
    }
  }
  return files;
}

function sceneHashInput(scene, ambienceIds, oneShotIds, files) {
  const input = withoutIds(scene);
  input.ambiences = (scene.ambiences ?? []).map((selection) => ({
    ...selection,
    ambienceId:
      ambienceIds.get(selection.ambienceId) ?? selection.ambienceId,
  }));
  input.oneShotIds = (scene.oneShotIds ?? []).map(
    (id) => oneShotIds.get(id) ?? id,
  );

  const filesByPreset = new Map();
  for (const file of files) {
    const list = filesByPreset.get(file.presetIndex) ?? [];
    list.push(file);
    filesByPreset.set(file.presetIndex, list);
  }

  if (Array.isArray(scene.musicPresets) && scene.musicPresets.length) {
    input.musicPresets = scene.musicPresets.map((preset, index) => {
      const cleanPreset = withoutIds(preset);
      cleanPreset.files = (filesByPreset.get(index) ?? []).map(
        (file) => file.hash,
      );
      return cleanPreset;
    });
  }
  if (scene.music?.files?.length) {
    input.music = {
      ...withoutIds(scene.music),
      files: files.map((file) => file.hash),
    };
  }
  return input;
}

async function hashSoundPackContents(packDir) {
  const manifest = JSON.parse(
    await fs.readFile(path.join(packDir, 'pack.json'), 'utf8'),
  );
  const ambiences = manifest.ambiences ?? manifest.layers ?? [];
  const oneShots = manifest.oneShots ?? [];
  const scenes = manifest.scenes ?? [];
  if (ambiences.length === 0 && oneShots.length === 0 && scenes.length === 0) {
    throw new Error(
      'Sound pack cannot be empty: add at least one ambience, one-shot or scene',
    );
  }
  const outputFiles = new Map();
  const referencedSources = new Set();

  const ambienceIds = new Map();
  for (const ambience of ambiences) {
    const previousId = ambience.id;
    await hashAmbience(packDir, ambience, outputFiles, referencedSources);
    ambienceIds.set(previousId, ambience.id);
  }

  const oneShotIds = new Map();
  for (const oneShot of oneShots) {
    const previousId = oneShot.id;
    await hashOneShot(packDir, oneShot, outputFiles, referencedSources);
    oneShotIds.set(previousId, oneShot.id);
  }

  const sceneIds = new Map();
  for (const scene of scenes) {
    const previousId = scene.id;
    const files = await resolveSceneFiles(packDir, scene, referencedSources);
    const id = sha256(
      canonicalJson(sceneHashInput(scene, ambienceIds, oneShotIds, files)),
      ...[...new Set(files.map((file) => file.hash))].sort(),
    );
    sceneIds.set(previousId, id);
    scene.id = id;
    scene.ambiences = (scene.ambiences ?? []).map((selection) => ({
      ...selection,
      ambienceId:
        ambienceIds.get(selection.ambienceId) ?? selection.ambienceId,
    }));
    scene.oneShotIds = (scene.oneShotIds ?? []).map(
      (oneShotId) => oneShotIds.get(oneShotId) ?? oneShotId,
    );

    const filesByPreset = new Map();
    for (const file of files) {
      const list = filesByPreset.get(file.presetIndex) ?? [];
      list.push(file);
      filesByPreset.set(file.presetIndex, list);
      outputFiles.set(
        `scenes/${id}/music/${file.hash}${file.extension}`,
        file.buffer,
      );
    }

    if (Array.isArray(scene.musicPresets) && scene.musicPresets.length) {
      scene.musicPresets.forEach((preset, index) => {
        preset.files = (filesByPreset.get(index) ?? []).map(
          (file) =>
            `scenes/${id}/music/${file.hash}${file.extension}`,
        );
      });
    }
    if (scene.music?.files?.length) {
      scene.music.files = files.map(
        (file) => `scenes/${id}/music/${file.hash}${file.extension}`,
      );
    }
  }

  manifest.id = sha256(
    canonicalJson({
      ambiences: [...ambienceIds.values()].sort(),
      oneShots: [...oneShotIds.values()].sort(),
      scenes: [...sceneIds.values()].sort(),
    }),
  );

  return { manifest, outputFiles, referencedSources };
}

export async function createSoundPackBuffer(packDir) {
  await assertPackDirectory(packDir);
  const { manifest, outputFiles, referencedSources } =
    await hashSoundPackContents(packDir);

  for (const entry of await collectEntries(packDir)) {
    if (entry.isDirectory) continue;
    if (entry.relativePath === 'pack.json') continue;
    if (referencedSources.has(entry.relativePath)) continue;
    outputFiles.set(entry.relativePath, await fs.readFile(entry.absolutePath));
  }
  outputFiles.set(
    'pack.json',
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
  );

  const directories = new Set();
  for (const outputPath of outputFiles.keys()) {
    const parts = outputPath.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(`${parts.slice(0, index).join('/')}/`);
    }
  }

  const zip = new JSZip();
  for (const directory of [...directories].sort()) {
    zip.folder(directory.slice(0, -1));
  }
  for (const [outputPath, buffer] of [...outputFiles.entries()].sort()) {
    zip.file(outputPath, buffer);
  }

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

export async function writeSoundPackArchive(packDir, outputFile) {
  const buffer = await createSoundPackBuffer(packDir);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, buffer);
  return { outputPath: outputFile, bytes: buffer.length };
}

export async function unpackSoundPackArchive(input, outputDir) {
  const buffer = Buffer.isBuffer(input) ? input : await fs.readFile(input);
  const zip = await JSZip.loadAsync(buffer);
  const root = path.resolve(outputDir);
  const written = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const destination = path.resolve(root, entry.name);
    if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Unsafe path in sound pack: ${entry.name}`);
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, await entry.async('nodebuffer'));
    written.push(destination);
  }

  return written;
}
