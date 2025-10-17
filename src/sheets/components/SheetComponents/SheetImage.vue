<template>
  <div class="sheet-image">
    <div v-if="label" class="label-text q-mb-sm">{{ label }}</div>
    <div class="image-container">
      <img
        v-if="src"
        :src="src"
        :alt="alt"
        :class="imageClass"
        @error="handleImageError"
      />
      <div v-else class="placeholder">
        {{ placeholderText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  label?: string;
  src?: string;
  alt?: string;
  imageClass?: string;
  placeholderText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  src: '',
  alt: 'Image',
  imageClass: '',
  placeholderText: 'No image provided',
});

const imageError = ref(false);

const handleImageError = () => {
  imageError.value = true;
};
</script>

<style scoped>
.sheet-image {
  width: 100%;
  text-align: center;
}

.label-text {
  font-weight: bold;
  color: #555;
  font-size: 0.85em;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

.image-container img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.placeholder {
  color: #999;
  font-style: italic;
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 4px;
}
</style>
