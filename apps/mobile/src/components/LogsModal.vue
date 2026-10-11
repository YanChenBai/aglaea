<script setup lang="ts">
import { Screen } from '@nativescript/core';
import { $closeModal, computed } from 'nativescript-vue';

const props = defineProps<{ getLogs: () => string[] }>();
const text = computed(() => props.getLogs().join('\n') || '暂无日志');
const width = Math.min(420, Screen.mainScreen.widthDIPs - 32);
const height = Math.min(560, Screen.mainScreen.heightDIPs - 120);
</script>

<template>
  <GridLayout rows="auto, *, auto" class="modal-card" :width="width" :height="height">
    <Label row="0" text="详细日志" class="modal-title" />
    <ScrollView row="1" marginTop="12" marginBottom="16">
      <Label :text="text" class="log-content" textWrap="true" />
    </ScrollView>
    <Button row="2" text="关闭" class="button-ghost" @tap="$closeModal()" />
  </GridLayout>
</template>
