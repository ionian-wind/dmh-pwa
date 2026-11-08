import type { Drawing } from '@/types';
import {
  generateId,
  idbDeleteItem,
  idbGetItem,
  idbPutItem,
} from '@/utils/storage';
import { registerValidationSchema } from '@/utils/schemaValidator';
import drawingSchema from '@/schemas/drawing.schema.json';

export const DRAWINGS_STORE = 'drawings';

registerValidationSchema(DRAWINGS_STORE, drawingSchema);

export async function getDrawing(id: string): Promise<Drawing | undefined> {
  return idbGetItem<Drawing>(DRAWINGS_STORE, id);
}

export interface DrawingInput {
  snapshot: string;
  preview: string;
}

export async function saveDrawing(
  input: DrawingInput,
  id?: string,
): Promise<Drawing> {
  const now = Date.now();
  const existing = id ? await getDrawing(id) : undefined;
  const drawing: Drawing = {
    id: existing?.id ?? id ?? generateId(),
    snapshot: input.snapshot,
    preview: input.preview,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await idbPutItem(DRAWINGS_STORE, drawing);
  return drawing;
}

export async function deleteDrawing(id: string): Promise<void> {
  await idbDeleteItem(DRAWINGS_STORE, id);
}
