<script setup vapor lang="ts">
import type { MemberView } from '@aglaea/shared';

defineProps<{
  members: MemberView[];
}>();

function dotClass(member: MemberView): string {
  if (member.role === 'owner') {
    return 'ag:bg-ag-gold';
  }

  if (member.kind === 'remote') {
    return 'ag:bg-ag-jade';
  }

  return 'ag:bg-ag-muted';
}
</script>

<template>
  <section>
    <div class="ag:flex ag:items-center ag:justify-between">
      <h2 class="ag:text-sm ag:text-ag-mist">房间成员</h2>
      <span class="ag:font-mono ag:text-[11px] ag:text-ag-muted">{{ members.length }}</span>
    </div>
    <p v-if="members.length === 0" class="ag:mt-3 ag:text-xs ag:text-ag-muted">暂无成员</p>
    <ul v-else class="ag-ui-scroll ag:mt-3 ag:max-h-64 ag:overflow-y-auto">
      <li
        v-for="member in members"
        :key="member.clientId"
        class="ag:flex ag:items-center ag:justify-between ag:gap-3 ag:border-b ag:border-white/10 ag:py-3 ag:text-xs"
      >
        <span class="ag:flex ag:min-w-0 ag:items-center ag:gap-2">
          <span
            class="ag:shrink-0 ag:h-1.5 ag:w-1.5 ag:rounded-full"
            :class="dotClass(member)"
          ></span>
          <span class="ag:truncate" :title="member.name">{{ member.name }}</span>
        </span>
        <span
          class="ag:shrink-0 ag:font-mono ag:text-[10px] ag:uppercase ag:tracking-[0.14em] ag:text-ag-muted"
          >{{ member.role }}</span
        >
      </li>
    </ul>
  </section>
</template>
