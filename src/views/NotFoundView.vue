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
  <div
    class="q-pa-xl flex flex-center column items-center text-center"
    style="min-height: 60vh"
  >
    <div style="max-width: 500px; width: 100%">
      <div class="text-h1 text-primary text-bold q-mb-md">
        {{ t('notFound.errorCode') }}
      </div>
      <h1 class="text-h4 q-mb-md">{{ t('notFound.title') }}</h1>
      <p class="text-subtitle1 text-grey-7 q-mb-xl">
        {{ t('notFound.message') }}
      </p>
      <div class="row q-gutter-md q-mb-xl flex-center">
        <div class="col-auto">
          <Button @click="goHome" variant="primary">{{
            t('notFound.goHome')
          }}</Button>
        </div>
        <div class="col-auto">
          <Button @click="goBack" variant="secondary">{{
            t('notFound.goBack')
          }}</Button>
        </div>
      </div>
      <div class="q-pa-md bg-grey-1 rounded-borders q-mt-md text-left">
        <p class="text-bold text-body1 q-mb-xs">
          {{ t('notFound.helpTitle') }}
        </p>
        <ul class="q-pl-md text-grey-7">
          <li v-for="item in helpItems" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Removed custom layout classes. Use Quasar classes. */
</style>
