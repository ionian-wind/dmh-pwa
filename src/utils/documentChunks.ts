import type { ModuleTreeNode, Note } from '@/types';

export interface DocumentChunk {
  id: string;
  title: string;
  content: string;
  level: number;
  noteId: string;
}

/**
 * Flatten a module tree into renderable document chunks. Cycles are guarded by
 * the visited set, and missing notes are skipped while their children are still
 * traversed.
 */
export function buildDocumentChunks(
  nodes: ModuleTreeNode[],
  notes: Pick<Note, 'id' | 'title' | 'content'>[],
  depth = 1,
  visited = new Set<string>(),
): DocumentChunk[] {
  const result: DocumentChunk[] = [];

  for (const node of nodes) {
    if (visited.has(node.noteId)) continue;
    visited.add(node.noteId);

    const note = notes.find((candidate) => candidate.id === node.noteId);
    if (note) {
      result.push({
        id: `note-${note.id}`,
        title: note.title,
        content: `${'#'.repeat(depth + 1)} ${note.title} {#note-${note.id}}\n\n${note.content || ''}\n\n`,
        level: depth + 1,
        noteId: note.id,
      });
    }

    if (node.children && node.children.length > 0) {
      result.push(
        ...buildDocumentChunks(node.children, notes, depth + 1, visited),
      );
    }
  }

  return result;
}
