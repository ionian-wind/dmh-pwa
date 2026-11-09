<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const isOnline = ref(navigator.onLine);
const isStandalone = ref(false);
const hasUpdate = ref(false);
const showUpdatePrompt = ref(false);

const checkPWAStatus = () => {
  // Check if running as standalone PWA
  isStandalone.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Check online status
  isOnline.value = navigator.onLine;
};

const updateApp = () => {
  // Reload the page to get the latest version
  window.location.reload();
};

const dismissUpdate = () => {
  showUpdatePrompt.value = false;
};

const handleOnline = () => {
  isOnline.value = true;
};

const handleOffline = () => {
  isOnline.value = false;
};

const handleControllerChange = () => {
  // The first controllerchange is the initial service-worker activation after
  // installation. Only a later change means an update is available.
  if (!hadController) {
    hadController = true;
    return;
  }
  hasUpdate.value = true;
  showUpdatePrompt.value = true;
};

let hadController = false;

onMounted(() => {
  checkPWAStatus();

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Listen for PWA update events
  if ('serviceWorker' in navigator) {
    hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
  }
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener(
      'controllerchange',
      handleControllerChange,
    );
  }
});
</script>

<template>
  <div class="pwa-status">
    <!-- Update Prompt -->
    <div v-if="showUpdatePrompt" class="pwa-update-prompt">
      <div class="pwa-update-content">
        <div class="pwa-update-icon">
          <QIcon name="tabler-gift" />
        </div>
        <div class="pwa-update-text">
          <h3>{{ t('pwa.updateAvailable') }}</h3>
          <p>{{ t('pwa.updateMessage') }}</p>
        </div>
        <div class="pwa-update-actions">
          <QBtn flat @click="updateApp" :color="'positive'">
            <QIcon name="tabler-download" />
            <span>{{ t('pwa.updateNow') }}</span>
          </QBtn>
          <QBtn flat @click="dismissUpdate">
            <QIcon name="tabler-x" />
            <span>{{ t('pwa.later') }}</span>
          </QBtn>
        </div>
      </div>
    </div>

    <!-- Status Indicators -->
    <div class="pwa-status-indicators">
      <div v-if="!isOnline" class="pwa-status-item offline">
        <QIcon name="tabler-signal-3g" class="pwa-status-icon" />
        <span class="pwa-status-text">{{ t('pwa.offlineMode') }}</span>
      </div>
      <div v-if="isStandalone" class="pwa-status-item standalone">
        <QIcon name="tabler-device-mobile" class="pwa-status-icon" />
        <span class="pwa-status-text">{{ t('pwa.appMode') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pwa-status {
  position: relative;
}

.pwa-update-prompt {
  position: fixed;
  top: calc(20px + var(--safe-top));
  left: calc(20px + var(--safe-left));
  right: calc(20px + var(--safe-right));
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  animation: slideDown 0.3s ease-out;
}

.pwa-update-content {
  display: flex;
  align-items: center;
  padding: 1rem;
  gap: 1rem;
}

.pwa-update-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.pwa-update-actions .si,
.pwa-status-item .si {
  margin-right: 0.5em;
}

.pwa-update-text {
  flex: 1;
  min-width: 0;
}

.pwa-update-text h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--color-text);
}

.pwa-update-text p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-light);
  line-height: 1.4;
}

.pwa-update-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.pwa-status-indicators {
  position: fixed;
  top: calc(20px + var(--safe-top));
  right: calc(20px + var(--safe-right));
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 1000;
}

.pwa-status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  color: var(--color-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pwa-status-item.offline {
  background: var(--color-warning, #ffc107);
  color: #212529;
  border-color: var(--color-warning-dark, #e0a800);
}

.pwa-status-item.standalone {
  background: var(--color-success, #28a745);
  color: white;
  border-color: var(--color-success-dark, #1e7e34);
}

.pwa-status-icon {
  font-size: 1rem;
}

.pwa-status-text {
  font-weight: 500;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Responsive design */
@media (max-width: 480px) {
  .pwa-update-prompt {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .pwa-update-content {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .pwa-update-actions {
    width: 100%;
    justify-content: center;
  }

  .pwa-status-indicators {
    top: 10px;
    right: 10px;
  }
}
</style>
