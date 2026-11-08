import {
  onBeforeUnmount,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue';
import {
  getStoredFile,
  getStoredFileUrl,
  revokeStoredFileUrl,
} from '@/utils/files';

/**
 * Resolve a stored file id to a temporary object URL and revoke it when the
 * id changes or the owner unmounts.
 */
export function useStoredFileUrl(
  source: MaybeRefOrGetter<string | null | undefined>,
) {
  const url = ref<string | null>(null);
  let currentUrl: string | null = null;
  let requestId = 0;

  function release() {
    if (!currentUrl) return;
    revokeStoredFileUrl(currentUrl);
    currentUrl = null;
    url.value = null;
  }

  async function load(id: string | null | undefined) {
    const request = ++requestId;
    release();
    if (!id) return;

    try {
      const file = await getStoredFile(id);
      if (!file || request !== requestId) return;

      const nextUrl = await getStoredFileUrl(file);
      if (request !== requestId) {
        revokeStoredFileUrl(nextUrl);
        return;
      }
      currentUrl = nextUrl;
      url.value = nextUrl;
    } catch {
      // Missing or unreadable files render the placeholder.
    }
  }

  watch(() => toValue(source), load, { immediate: true });
  onBeforeUnmount(() => {
    requestId += 1;
    release();
  });

  return url;
}
