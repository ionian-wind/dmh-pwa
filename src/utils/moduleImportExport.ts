import type { Module, Note, ModuleTreeNode } from '@/types';
import { generateId, openDB, StorageError } from './storage';
import { debugWarn } from './debug';
import { extractMentionedEntities } from './markdownParser';
import { listZipFiles, openZip, readZipText } from './files/zip';
import {
  canValidate,
  registerValidationSchema,
  validateSchema,
} from './schemaValidator';
import moduleSchema from '@/schemas/module.schema.json';
import noteSchema from '@/schemas/note.schema.json';

export interface ImportValidationResult {
  missingNoteIds: string[]; // noteIds in tree but not in notes
  orphanedNoteFiles: string[]; // note files not referenced in tree
  treeMatchesModule: boolean;
}

function extractNoteIds(nodes: ModuleTreeNode[]): string[] {
  const noteIds: string[] = [];
  for (const node of nodes) {
    noteIds.push(node.noteId);
    if (node.children && node.children.length > 0) {
      noteIds.push(...extractNoteIds(node.children));
    }
  }
  return noteIds;
}

/**
 * Validates that every noteId in the module's noteTree exists in the notes array,
 * and that all note files are referenced in the tree.
 */
export function validateModuleImport(
  module: Pick<Module, 'noteTree'>,
  tree: ModuleTreeNode[],
  notes: Pick<Note, 'id'>[],
): ImportValidationResult {
  const treeNoteIds = extractNoteIds(tree);
  const actualNoteIds = notes.map((n) => n.id);
  const missingNoteIds = treeNoteIds.filter(
    (noteId) => !actualNoteIds.includes(noteId),
  );
  const orphanedNoteFiles = actualNoteIds.filter(
    (noteId) => !treeNoteIds.includes(noteId),
  );
  const moduleNoteIds = extractNoteIds(module.noteTree || []);
  const treeMatchesModule =
    JSON.stringify(treeNoteIds.sort()) === JSON.stringify(moduleNoteIds.sort());

  return {
    missingNoteIds,
    orphanedNoteFiles,
    treeMatchesModule,
  };
}

export async function parseModuleZip(zipFile: Blob): Promise<{
  module: any;
  tree: any[];
  notes: any[];
}> {
  const entries = await openZip(zipFile);

  // Read module.json
  const moduleContent = await readZipText(entries, ['module.json']);
  if (moduleContent === null) {
    throw new Error('Module file not found in zip');
  }
  let moduleData: any;
  try {
    moduleData = JSON.parse(moduleContent);
  } catch (e) {
    throw new Error('Invalid module.json format');
  }

  // Read tree.json
  const treeContent = await readZipText(entries, ['tree.json']);
  if (treeContent === null) {
    throw new Error('Tree file not found in zip');
  }
  let treeData: any[];
  try {
    treeData = JSON.parse(treeContent);
  } catch (e) {
    throw new Error('Invalid tree.json format');
  }

  // Read all note files
  const noteFiles = listZipFiles(entries, 'notes/');
  const notes: any[] = [];

  for (const noteFile of noteFiles) {
    const noteContent = await noteFile.text();
    let noteData: any;
    try {
      noteData = JSON.parse(noteContent);
    } catch (e) {
      debugWarn(`Skipping invalid note file: ${noteFile.name}`);
      continue;
    }
    notes.push(noteData);
  }

  return {
    module: moduleData,
    tree: treeData,
    notes,
  };
}

export interface ImportedModuleData {
  module: Omit<Module, 'noteTree'> & Partial<Pick<Module, 'noteTree'>>;
  tree: ModuleTreeNode[];
  notes: Array<
    Omit<Note, 'createdAt' | 'updatedAt'> &
      Partial<Pick<Note, 'createdAt' | 'updatedAt'>>
  >;
}

/**
 * Give an imported module and its notes fresh IDs and rewrite every reference.
 * This makes imports additive instead of overwriting records with the same IDs
 * that were used in the archive.
 */
export function remapImportedModule({
  module: moduleData,
  tree,
  notes: notesData,
}: ImportedModuleData): {
  module: Module;
  tree: ModuleTreeNode[];
  notes: Note[];
} {
  const moduleId = generateId();
  const idMap = new Map<string, string>();

  for (const note of notesData) {
    idMap.set(note.id, generateId());
  }

  const remapTree = (nodes: ModuleTreeNode[]): ModuleTreeNode[] =>
    nodes.map((node) => ({
      noteId: idMap.get(node.noteId) ?? generateId(),
      children: node.children ? remapTree(node.children) : [],
    }));

  const noteTree = remapTree(tree);
  const now = Date.now();

  return {
    module: {
      ...(moduleData as Module),
      id: moduleId,
      noteTree,
      createdAt: moduleData.createdAt ?? now,
      updatedAt: moduleData.updatedAt ?? now,
    },
    tree: noteTree,
    notes: notesData.map((note) => ({
      ...(note as Note),
      id: idMap.get(note.id) ?? generateId(),
      moduleIds: [moduleId],
      contentType: note.contentType ?? 'text',
      hidden: note.hidden ?? true,
      createdAt: note.createdAt ?? now,
      updatedAt: note.updatedAt ?? now,
    })),
  };
}

export async function importModuleFromZip({
  module: moduleData,
  tree,
  notes: notesData,
}: {
  module: Omit<Module, 'noteTree'>;
  tree: Module['noteTree'];
  notes: Note[];
}): Promise<{ moduleId: string; noteCount: number }> {
  if (!canValidate('modules')) {
    registerValidationSchema('modules', moduleSchema);
  }
  if (!canValidate('notes')) {
    registerValidationSchema('notes', noteSchema);
  }

  const { module, notes } = remapImportedModule({
    module: moduleData,
    tree: tree ?? [],
    notes: notesData,
  });

  const moduleValidation = await validateSchema('modules', module);
  if (!moduleValidation.valid) {
    throw new StorageError(
      `Invalid imported module: ${moduleValidation.errors.join('; ')}`,
    );
  }
  for (const note of notes) {
    const validation = await validateSchema('notes', note);
    if (!validation.valid) {
      throw new StorageError(
        `Invalid imported note '${note.title || note.id}': ${validation.errors.join('; ')}`,
      );
    }
  }

  const indexRecords = notes
    .map((note) => {
      const links = extractMentionedEntities(note.content || '');
      const seen = new Set<string>();
      const uniqueLinks = links.filter((link) => {
        const key = `${link.kind}:${link.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return uniqueLinks.length > 0
        ? { id: `note:${note.id}`, links: uniqueLinks }
        : null;
    })
    .filter((record): record is { id: string; links: any[] } => !!record);

  const db = await openDB();
  const tx = db.transaction(
    ['modules', 'notes', 'indexations_mentions'],
    'readwrite',
  );

  try {
    await tx.objectStore('modules').put(module);
    for (const note of notes) {
      await tx.objectStore('notes').put(note);
    }
    for (const record of indexRecords) {
      await tx.objectStore('indexations_mentions').put(record);
    }
    await tx.done;

    return {
      moduleId: module.id,
      noteCount: notes.length,
    };
  } catch (error) {
    throw new StorageError(
      `Import failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
