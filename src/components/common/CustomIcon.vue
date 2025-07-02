<template>
  <span :style="wrapperStyle" v-html="svgContent" :class="['custom-icon', $attrs.class || '']" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';

const props = defineProps<{
  path: string;
  width?: string | number;
  height?: string | number;
  fill?: string;
  stroke?: string;
}>();

const svgContent = ref('');

const wrapperStyle = computed(() => ({
  display: 'inline-block',
  width: props.width ? (typeof props.width === 'number' ? props.width + 'px' : props.width) : '1em',
  height: props.height ? (typeof props.height === 'number' ? props.height + 'px' : props.height) : '1em',
  verticalAlign: 'middle',
}));

async function fetchSvg() {
  if (!props.path) {
    svgContent.value = '';
    return;
  }
  try {
    const res = await fetch(props.path);
    if (!res.ok) throw new Error('SVG not found');
    let svg = await res.text();
    // Optionally inject fill/stroke if provided
    if (props.fill || props.stroke) {
      svg = svg.replace('<svg', `<svg${props.fill ? ` fill=\"${props.fill}\"` : ''}${props.stroke ? ` stroke=\"${props.stroke}\"` : ''}`);
    }
    svgContent.value = svg;
  } catch (e) {
    svgContent.value = '<!-- SVG not found -->';
  }
}

watch(() => [props.path, props.fill, props.stroke], fetchSvg, { immediate: true });
</script>

<style scoped>
.custom-icon {
  line-height: 0;
}
</style> 