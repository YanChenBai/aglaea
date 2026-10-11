<script setup vapor lang="ts">
import { RouterView } from 'vue-router';

import GlobalBackdrop from './components/GlobalBackdrop.vue';
import SiteFooter from './components/SiteFooter.vue';
import SiteHeader from './components/SiteHeader.vue';
</script>

<template>
  <GlobalBackdrop />
  <SiteHeader />
  <main><RouterView /></main>
  <SiteFooter />
</template>
