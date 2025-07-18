<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Button from '@/components/form/Button.vue';
import { IconDownload, IconX } from '@tabler/icons-vue';
import { debug, debugError } from '@/utils/debug';

const showInstallPrompt = ref(false);
const deferredPrompt = ref<any>(null);
const hasShownNativePrompt = ref(false);

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

onMounted(() => {
  debug('PWAInstallPrompt: Component mounted, setting up event listeners');
  
  // Listen for the beforeinstallprompt event
  const handleBeforeInstallPrompt = async (e: Event) => {
    debug('PWAInstallPrompt: beforeinstallprompt event fired');
    
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    debug('PWAInstallPrompt: preventDefault() called');
    
    // Store the event for later use
    deferredPrompt.value = e;
    
    // Call prompt() immediately to satisfy browser requirements
    // This prevents the warning about preventDefault() being called without prompt()
    try {
      debug('PWAInstallPrompt: Calling native prompt()');
      await (e as any).prompt();
      hasShownNativePrompt.value = true;
      debug('PWAInstallPrompt: Native prompt() called successfully');
      
      // Wait for user choice
      const { outcome } = await (e as any).userChoice;
      debug('PWAInstallPrompt: User choice outcome:', outcome);
      
      if (outcome === 'accepted') {
        debug('PWAInstallPrompt: User accepted the native install prompt');
        // App will be installed, no need to show our custom prompt
        return;
      } else {
        debug('PWAInstallPrompt: User dismissed the native install prompt, showing custom prompt');
        // Show our custom prompt as a fallback
        showInstallPrompt.value = true;
      }
    } catch (error) {
      debug('PWAInstallPrompt: Native prompt failed or was not supported, showing custom prompt:', error);
      // Show our custom prompt as fallback
      showInstallPrompt.value = true;
    }
  };
  
  // Listen for the appinstalled event
  const handleAppInstalled = () => {
    debug('PWAInstallPrompt: PWA was installed');
    showInstallPrompt.value = false;
    deferredPrompt.value = null;
    hasShownNativePrompt.value = false;
  };
  
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
  debug('PWAInstallPrompt: Event listeners added');
  
  // Cleanup
  onUnmounted(() => {
    debug('PWAInstallPrompt: Component unmounting, removing event listeners');
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });
});
</script>

<template>
  <div v-if="showInstallPrompt" class="pwa-install-prompt">
    <div class="pwa-install-content">
      <div class="pwa-install-icon">
        <img src="/icon-192.png" alt="D&D Notes" />
      </div>
      <div class="pwa-install-text">
        <h3>Install Owlbear's Dungeon Master Helper</h3>
        <p v-if="hasShownNativePrompt">
          You dismissed the install prompt. Would you like to try again?
        </p>
        <p v-else>
          Add this app to your home screen for quick access and offline use.
        </p>
      </div>
      <div class="pwa-install-actions">
        <Button @click="installApp" variant="primary" size="small">
          <IconDownload />
          <span>Install</span>
        </Button>
        <Button @click="dismissPrompt" variant="secondary" size="small">
          <IconX />
          <span>Not now</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  animation: slideUp 0.3s ease-out;
  width: auto;
  max-width: 100vw;
  box-sizing: border-box;
}

.pwa-install-content {
  display: flex;
  align-items: center;
  padding: 1rem;
  gap: 1rem;
}

.pwa-install-icon {
  flex-shrink: 0;
}

.pwa-install-icon img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}

.pwa-install-text {
  flex: 1;
  min-width: 0;
}

.pwa-install-text h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--color-text);
}

.pwa-install-text p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-light);
  line-height: 1.4;
}

.pwa-install-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.pwa-install-actions .si {
  margin-right: 0.5em;
}

.pwa-install-btn {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pwa-install-btn:hover {
  background: var(--color-primary-dark);
}

.pwa-dismiss-btn {
  background: transparent;
  color: var(--color-text-light);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pwa-dismiss-btn:hover {
  background: var(--color-background-soft);
  color: var(--color-text);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Responsive design */
@media (max-width: 480px) {
  .pwa-install-prompt {
    bottom: 10px;
    left: calc(50% - 45vw);
    right: 0;
    width: 90vw;
    max-width: 100vw;
  }
  
  .pwa-install-content {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .pwa-install-actions {
    width: 100%;
    justify-content: center;
  }
}
</style> 
