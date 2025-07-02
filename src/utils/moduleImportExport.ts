import JSZip from 'jszip';
import type { Module, Note, ModuleTreeNode } from '@/types';
import {openDB, StorageError} from "./storage";
import { debugWarn } from './debug';

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
  notes: Pick<Note, 'id'>[]
): ImportValidationResult {
  const treeNoteIds = extractNoteIds(tree);
  const actualNoteIds = notes.map((n) => n.id);
  const missingNoteIds = treeNoteIds.filter(noteId => !actualNoteIds.includes(noteId));
  const orphanedNoteFiles = actualNoteIds.filter(noteId => !treeNoteIds.includes(noteId));
  const moduleNoteIds = extractNoteIds(module.noteTree || []);
  const treeMatchesModule = JSON.stringify(treeNoteIds.sort()) === JSON.stringify(moduleNoteIds.sort());

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
  const zip = await JSZip.loadAsync(zipFile);

  // Read module.json
  const moduleFile = zip.file('module.json');
  if (!moduleFile) {
    throw new Error('Module file not found in zip');
  }

  const moduleContent = await moduleFile.async('string');
  let moduleData: any;
  try {
    moduleData = JSON.parse(moduleContent);
  } catch (e) {
    throw new Error('Invalid module.json format');
  }

  // Read tree.json
  const treeFile = zip.file('tree.json');
  if (!treeFile) {
    throw new Error('Tree file not found in zip');
  }

  const treeContent = await treeFile.async('string');
  let treeData: any[];
  try {
    treeData = JSON.parse(treeContent);
  } catch (e) {
    throw new Error('Invalid tree.json format');
  }

  // Read all note files
  const notesFolder = zip.folder('notes');
  if (!notesFolder) {
    throw new Error('Notes folder not found in zip');
  }

  const noteFiles = Object.values(notesFolder.files).filter(file => !file.dir && file.name.startsWith('notes/'));
  const notes: any[] = [];

  for (const noteFile of noteFiles) {
    const noteContent = await noteFile.async('string');
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
    notes
  };
}

export async function importModuleFromZip({module: moduleData, tree: noteTree, notes: notesData }: { module: Omit<Module, 'noteTree'>, tree: Module['noteTree'], notes: Note[] }): Promise<{ moduleId: string, noteCount: number }> {
  // Update module data with new ID and updated note tree
  const module = {
    ...moduleData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    noteTree
  };

  const notes: Note[] = [];
  for (const noteInfo of notesData) {
    // Update note data
    const newNote = {
      ...noteInfo,
      moduleId: module.id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    notes.push(newNote);
  }

  // Import everything in a single transaction
  const db = await openDB();
  const tx = db.transaction(['modules', 'notes'], 'readwrite');

  try {
    // Import module
    await tx.objectStore('modules').put(module);

    // Import all notes
    for (const note of notes) {
      await tx.objectStore('notes').put(note);
    }

    // Commit the transaction
    await tx.done;

    return {
      moduleId: module.id,
      noteCount: notes.length
    };
  } catch (error) {
    // Transaction will automatically rollback on error
    throw new StorageError(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
} 
