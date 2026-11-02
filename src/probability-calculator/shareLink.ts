const CODE_HASH_PREFIX = '#code=';

export function encodeSource(source: string): string {
  const bytes = new TextEncoder().encode(source);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeSource(encoded: string): string | null {
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Decode a source program from a URL hash, if one is present. */
export function sourceFromHash(hash: string): string | null {
  if (!hash.startsWith(CODE_HASH_PREFIX)) return null;
  return decodeSource(hash.slice(CODE_HASH_PREFIX.length));
}

/** Build a shareable URL with the program encoded in the hash fragment. */
export function buildShareUrl(source: string, href: string): string {
  const url = new URL(href);
  url.hash = `code=${encodeSource(source)}`;
  return url.toString();
}
