<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from '@/components/form/Button.vue';

const router = useRouter();
const { t, tm } = useI18n();

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  router.back();
};

const helpItems = tm('notFound.helpItems') as unknown as string[];

</script>

<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="error-code">{{ t('notFound.errorCode') }}</div>
      <h1>{{ t('notFound.title') }}</h1>
      <p class="error-message">
        {{ t('notFound.message') }}
      </p>
      <div class="actions">
        <Button @click="goHome" variant="primary">
          {{ t('notFound.goHome') }}
        </Button>
        <Button @click="goBack" variant="secondary">
          {{ t('notFound.goBack') }}
        </Button>
      </div>
      <div class="help-text">
        <p>{{ t('notFound.helpTitle') }}</p>
        <ul>
          <li v-for="item in helpItems" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.not-found-content {
  max-width: 500px;
  margin: 0 auto;
}

.error-code {
  font-size: 6rem;
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: 1rem;
  line-height: 1;
}

.error-message {
  font-size: 1.1rem;
  color: var(--color-text-light);
  margin-bottom: 2rem;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.help-text {
  text-align: left;
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.help-text p {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
  color: var(--color-text);
}

.help-text ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--color-text-light);
}

.help-text li {
  margin-bottom: 0.25rem;
}

@media (max-width: 600px) {
  .not-found {
    padding: 1rem;
  }
  
  .error-code {
    font-size: 4rem;
  }

  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  .actions .btn {
    width: 100%;
    max-width: 200px;
  }
}
</style> 
