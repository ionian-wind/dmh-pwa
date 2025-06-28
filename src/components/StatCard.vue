<template>
  <router-link :to="item.route" class="stat-card" exact>
    <div class="stat-icon">{{ item.icon }}</div>
    <div class="stat-content">
      <h3>{{ t('statCard.' + item.key) }}</h3>
      <p>{{ item.count }} {{ t('statCard.' + item.key).toLowerCase() }}</p>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
  item: {
    route: string;
    icon: string;
    key: string;
    count: number;
  };
}>();
</script>

<style scoped>
.stat-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-color: var(--color-info);
}

.stat-icon {
  font-size: 2rem;
  background: var(--color-background-soft);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.stat-content {
  flex: 1;
}

.stat-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text);
}

.stat-content p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-light);
}
</style> 