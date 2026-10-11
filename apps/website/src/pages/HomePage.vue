<script setup vapor lang="ts">
import DeploySection from '../components/DeploySection.vue';
import FeatureSection from '../components/FeatureSection.vue';
import HeroSection from '../components/HeroSection.vue';
import HowSection from '../components/HowSection.vue';
import UsageSection from '../components/UsageSection.vue';
</script>

<template>
  <HeroSection />
  <FeatureSection />
  <div
    class="ag-hairline ag:mx-auto ag:h-px ag:w-[calc(100%_-_3rem)] ag:max-w-[1104px] ag:opacity-20"
    aria-hidden="true"
  ></div>
  <HowSection />
  <div
    class="ag-hairline ag:mx-auto ag:h-px ag:w-[calc(100%_-_3rem)] ag:max-w-[1104px] ag:opacity-20"
    aria-hidden="true"
  ></div>
  <UsageSection />
  <div
    class="ag-hairline ag:mx-auto ag:h-px ag:w-[calc(100%_-_3rem)] ag:max-w-[1104px] ag:opacity-20"
    aria-hidden="true"
  ></div>
  <DeploySection />
</template>
