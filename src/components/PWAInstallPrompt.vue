<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconDownload, IconX } from '@tabler/icons-vue';
import { debug, debugError } from '@/utils/debug';
import { getHelpLocale, helpHref } from '@/helpcenter/links';

const props = withDefaults(
  defineProps<{
    enabled?: boolean;
  }>(),
  {
    enabled: true,
  },
);

const showInstallPrompt = ref(false);
const deferredPrompt = ref<any>(null);
const hasShownNativePrompt = ref(false);
const { t, locale } = useI18n();

const installApp = async () => {
  if (!deferredPrompt.value) return;

  try {
    // Show the install prompt
    await deferredPrompt.value.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.value.userChoice;

    if (outcome === 'accepted') {
      debug('User accepted the install prompt');
    } else {
      debug('User dismissed the install prompt');
    }
  } catch (error) {
    debugError('Error showing install prompt:', error);
  } finally {
    // Clear the deferredPrompt
    deferredPrompt.value = null;
    showInstallPrompt.value = false;
    hasShownNativePrompt.value = false;
  }
};

const dismissPrompt = () => {
  showInstallPrompt.value = false;
  deferredPrompt.value = null;
  hasShownNativePrompt.value = false;
};

const handleBeforeInstallPrompt = (e: Event) => {
  if (!props.enabled) return;
  debug('PWAInstallPrompt: beforeinstallprompt event fired');
  deferredPrompt.value = e;
  showInstallPrompt.value = true;
};

const handleAppInstalled = () => {
  debug('PWAInstallPrompt: PWA was installed');
  showInstallPrompt.value = false;
  deferredPrompt.value = null;
  hasShownNativePrompt.value = false;
};

onMounted(() => {
  debug('PWAInstallPrompt: Component mounted, setting up event listeners');
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
});

onUnmounted(() => {
  debug('PWAInstallPrompt: Component unmounting, removing event listeners');
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', handleAppInstalled);
});
</script>

<template>
  <div
    v-if="props.enabled && showInstallPrompt"
    class="pwa-install-banner-float shadow-1 absolute-bottom"
  >
    <QBanner :class="'bg-secondary'">
      <template #avatar>
        <QAvatar size="75px" :style="'square'">
          <img src="/dmh-pwa/icon-192.png" alt="Owlbear's DMH" />
        </QAvatar>
      </template>

      <h5>{{ t('pwa.installTitle') }}</h5>
      <p v-if="hasShownNativePrompt">
        {{ t('pwa.installRetry') }}
      </p>
      <p v-else>
        {{ t('pwa.installDescription') }}
      </p>

      <template #action>
        <QBtn @click="installApp" color="positive" size="small">
          <IconDownload />
          {{ t('pwa.install') }}
        </QBtn>
        <QBtn @click="dismissPrompt" color="primary" size="small">
          <IconX />
          {{ t('pwa.notNow') }}
        </QBtn>
        <a
          class="pwa-install-help"
          :href="helpHref('getting-started/install', getHelpLocale(locale))"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('pwa.installHelp') }}
        </a>
      </template>
    </QBanner>
  </div>
</template>

<style scoped>
.pwa-install-banner-float {
  position: fixed;
  bottom: calc(24px + var(--safe-bottom));
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100vw - var(--safe-left) - var(--safe-right) - 32px);
  z-index: 2000;
}

.pwa-install-help {
  align-self: center;
  margin-left: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-primary);
  text-decoration: underline;
}
</style>
