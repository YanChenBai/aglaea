<script setup lang="ts">
import { Screen } from '@nativescript/core';
import { $closeModal, ref } from 'nativescript-vue';

import { normalizeRoomForm, type RoomForm } from '../room/form';

const props = defineProps<{ initial: RoomForm }>();
const serverUrl = ref(props.initial.serverUrl);
const name = ref(props.initial.name);
const roomCode = ref(props.initial.roomCode);
const error = ref('');
const width = Math.min(360, Screen.mainScreen.widthDIPs - 32);

function submit(): void {
  const value = normalizeRoomForm({
    serverUrl: serverUrl.value,
    name: name.value,
    roomCode: roomCode.value,
  });

  if (!value) {
    error.value = '请填写服务器地址、昵称和有效的六位房间码';

    return;
  }

  $closeModal(value);
}
</script>

<template>
  <StackLayout class="modal-card" :width="width">
    <Label text="加入房间" class="modal-title" />
    <Label text="连接同步服务，跟随房主观看。" class="caption" marginBottom="20" />
    <Label text="服务器地址" class="field-label" />
    <TextField
      v-model="serverUrl"
      hint="https://…"
      autocorrect="false"
      autocapitalizationType="none"
    />
    <Label text="你的昵称" class="field-label" />
    <TextField v-model="name" hint="昵称" maxLength="24" />
    <Label text="房间码" class="field-label" />
    <TextField
      v-model="roomCode"
      hint="六位房间码"
      maxLength="6"
      autocorrect="false"
      autocapitalizationType="allCharacters"
      returnKeyType="done"
      @returnPress="submit"
    />
    <Label v-if="error" :text="error" class="error-message" textWrap="true" />
    <GridLayout columns="*, 12, *" height="44" marginTop="8">
      <Button col="0" text="取消" class="button-ghost" @tap="$closeModal()" />
      <Button col="2" text="加入房间" class="button-primary" @tap="submit" />
    </GridLayout>
  </StackLayout>
</template>
