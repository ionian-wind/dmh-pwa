import { toRaw } from 'vue';

export function deepUnwrap(obj: any): any {
  // Do not unwrap FileSystemFileHandle or FileSystemDirectoryHandle
  if (
    obj &&
    (obj.constructor?.name === 'FileSystemFileHandle' ||
     obj.constructor?.name === 'FileSystemDirectoryHandle' ||
     obj instanceof Blob)
  ) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepUnwrap);
  }
  if (obj && typeof obj === 'object') {
    if (typeof obj === 'function') return undefined;
    if (obj.__v_isRef) return deepUnwrap(obj.value);
    if (obj.__v_isReactive) obj = toRaw(obj);
    const out: any = {};
    for (const key in obj) {
      out[key] = deepUnwrap(obj[key]);
    }
    return out;
  }
  return obj;
} 