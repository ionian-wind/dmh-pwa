<script setup lang="ts">
interface Props {
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'success'
    | 'warning'
    | 'link'
    | 'light'
    | 'none';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  icon?: string;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  type: 'button',
  loading: false,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent | Event): void;
}>();

// QBtn click event: (evt: Event, go?: Function)
function handleClick(evt: Event, go?: Function) {
  if (!props.disabled && !props.loading) {
    evt.stopPropagation();
    // Try to emit as MouseEvent if possible
    emit('click', evt instanceof MouseEvent ? evt : (evt as Event));
    if (go) go();
  }
}

// Map variant to Quasar color
const colorMap: Record<string, string> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'negative',
  success: 'positive',
  warning: 'warning',
  link: 'primary',
  light: 'grey-2',
  none: '',
};

// Map size to Quasar size prop
const sizeMap: Record<string, string> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};
</script>

<template>
  <QBtn
    :type="type"
    :color="colorMap[variant]"
    :size="sizeMap[size]"
    :disable="disabled || loading"
    :loading="loading"
    @click="handleClick"
    v-bind="$attrs"
  >
    <slot />
  </QBtn>
</template>
