<script setup lang="ts">
import { Motion, useReducedMotion } from 'motion-v';

withDefaults(defineProps<{ as?: 'div' | 'article' | 'li'; delay?: number; hover?: boolean }>(), {
  as: 'div',
  delay: 0,
  hover: false,
});

const reducedMotion = useReducedMotion();
</script>

<template>
  <Motion
    :as="as"
    :initial="reducedMotion ? false : { opacity: 0, y: 20 }"
    :while-in-view="{ opacity: 1, y: 0 }"
    :in-view-options="{ once: true, amount: 0.12 }"
    :while-hover="hover && !reducedMotion ? { y: -4 } : undefined"
    :transition="{ duration: reducedMotion ? 0 : 0.65, delay, ease: [0.22, 1, 0.36, 1] }"
  >
    <slot />
  </Motion>
</template>
