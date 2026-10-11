<script setup lang="ts">
import type { RoomSnapshot } from '@aglaea/shared';
import { Screen } from '@nativescript/core';
import { $closeModal, computed } from 'nativescript-vue';

const props = defineProps<{ getSnapshot: () => RoomSnapshot | undefined }>();
const members = computed(() => props.getSnapshot()?.members ?? []);
const roles = { owner: '房主', member: '成员', controller: '遥控器' };
const width = Math.min(420, Screen.mainScreen.widthDIPs - 32);
const height = Math.min(480, Screen.mainScreen.heightDIPs - 120);
</script>

<template>
  <GridLayout rows="auto, *, auto" class="modal-card" :width="width" :height="height">
    <Label row="0" :text="`房间成员 · ${members.length} 人`" class="modal-title" />
    <ScrollView row="1" marginTop="12" marginBottom="16">
      <StackLayout>
        <Label v-if="!members.length" text="暂无房间成员" class="caption" />
        <GridLayout
          v-for="member in members"
          :key="member.clientId"
          columns="*, auto"
          padding="12 0"
        >
          <Label col="0" :text="member.name" marginRight="12" textWrap="true" />
          <Label col="1" :text="roles[member.role]" class="caption" verticalAlignment="center" />
        </GridLayout>
      </StackLayout>
    </ScrollView>
    <Button row="2" text="关闭" class="button-ghost" @tap="$closeModal()" />
  </GridLayout>
</template>
