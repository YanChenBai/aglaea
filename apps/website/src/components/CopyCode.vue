<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { Copy, Check, CircleAlert } from 'lucide-vue-next';
import { computed, ref } from 'vue';
const props = defineProps<{ code: string; label: string; compact?: boolean; flat?: boolean }>();

const lines = computed(() =>
  props.code.split('\n').map(line => {
    const comment = line.trimStart().startsWith('#');
    const match = !comment && /^(\S+?)(=|\s)(.*)$/.exec(line);

    return {
      text: line,
      comment,
      head: match ? match[1] : '',
      tail: match ? match[2] + match[3] : '',
    };
  }),
);

const { copy, copied } = useClipboard({ source: () => props.code, legacy: true });
const failed = ref(false);

async function copyCode() {
  failed.value = false;

  try {
    await copy();
  } catch {
    failed.value = true;
  }
}
</script>

<template>
  <div
    class="ag:min-w-0 ag:overflow-hidden"
    :class="flat ? '' : 'ag:rounded-lg ag:border ag:border-white/8 ag:bg-white/[0.015]'"
  >
    <div
      class="ag:flex ag:items-center ag:justify-between ag:gap-3 ag:py-3"
      :class="flat ? '' : compact ? 'ag:px-5 ag:py-4' : 'ag:border-b ag:border-white/6 ag:px-5'"
    >
      <span
        class="ag:min-w-0 ag:font-mono ag:text-[11px]"
        :class="compact ? 'ag:break-all ag:text-ag-gold-pale' : 'ag:text-ag-muted'"
        >{{ compact ? code : label }}</span
      >
      <button
        type="button"
        @click="copyCode"
        :aria-label="`复制${label}`"
        class="ag-focus ag:flex ag:shrink-0 ag:cursor-pointer ag:items-center ag:gap-1.5 ag:rounded ag:px-2 ag:py-1 ag:text-[11px] ag:text-ag-muted ag:transition-colors ag:hover:bg-white/5 ag:hover:text-ag-paper"
      >
        <component
          :is="failed ? CircleAlert : copied ? Check : Copy"
          :size="13"
          :stroke-width="1.5"
          aria-hidden="true"
        />
        <span aria-live="polite">{{
          failed ? '复制失败，请手动选择' : copied ? '已复制' : '复制'
        }}</span>
      </button>
    </div>
    <pre
      v-if="!compact"
      class="ag:overflow-x-auto ag:whitespace-pre-wrap ag:break-all ag:font-mono ag:text-[11px] ag:leading-7 ag:text-ag-mist ag:md:text-xs"
      :class="flat ? 'ag:pb-3' : 'ag:p-5'"
    ><code><span v-for="(line, index) in lines" :key="index" class="ag:block ag:min-h-7" :class="line.comment ? 'ag:text-ag-muted/70' : ''"><template v-if="line.head"><span class="ag:text-ag-gold-pale">{{ line.head }}</span>{{ line.tail }}</template><template v-else>{{ line.text }}</template></span></code></pre>
  </div>
</template>
