export interface ObjectUrlHandle {
  url: string;
  revoke: () => void;
}

/**
 * Create an object URL with a single-use revoke function. Owners should keep
 * the handle and revoke it when the URL is replaced or the owner unmounts.
 */
export function createObjectUrlHandle(blob: Blob): ObjectUrlHandle {
  const url = URL.createObjectURL(blob);
  let revoked = false;

  return {
    url,
    revoke: () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(url);
    },
  };
}
