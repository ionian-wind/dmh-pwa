export interface FileIdentity {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export function buildFileSignature(file: FileIdentity): string {
  return JSON.stringify([file.name, file.size, file.lastModified, file.type]);
}
