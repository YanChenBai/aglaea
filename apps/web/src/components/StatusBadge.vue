<script setup vapor lang="ts">
import { UiBadge } from '@aglaea/ui';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    status: 'idle' | 'connecting' | 'connected' | 'error';
    idleText?: string;
    connectingText?: string;
    connectedText?: string;
    errorText?: string;
  }>(),
  {
    idleText: '未连接',
    connectingText: '连接中',
    connectedText: '已连接',
    errorText: '异常',
  },
);

const label = computed(() => {
  switch (props.status) {
    case 'connected': {
      return props.connectedText;
    }

    case 'connecting': {
      return props.connectingText;
    }

    case 'error': {
      return props.errorText;
    }

    default: {
      return props.idleText;
    }
  }
});

const tone = computed(() => {
  switch (props.status) {
    case 'connected': {
      return 'success';
    }

    case 'error': {
      return 'danger';
    }

    default: {
      return 'warning';
    }
  }
});
</script>

<template>
  <UiBadge :tone="tone">{{ label }}</UiBadge>
</template>
