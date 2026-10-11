<script setup vapor lang="ts">
import MotionReveal from './MotionReveal.vue';

const technologies = [
  { name: 'Vue', slug: 'vuejs' },
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'Bun', slug: 'bun' },
  { name: 'Vite+', slug: 'viteplus' },
  { name: 'Vite', slug: 'vitejs' },
  { name: 'Tailwind CSS', slug: 'tailwindcss' },
  { name: 'Docker', slug: 'docker' },
  { name: 'Vitest', slug: 'vitest' },
  { name: 'Git', slug: 'git' },
  { name: 'Node.js', slug: 'nodejs' },
];
</script>

<template>
  <MotionReveal class="ag:mt-16">
    <p class="ag-eyebrow">BUILT WITH</p>
    <ul aria-label="技术栈" class="ag:mt-7 ag:grid ag:grid-cols-5 ag:gap-y-8 ag:lg:grid-cols-10">
      <li
        v-for="tech in technologies"
        :key="tech.slug"
        class="ag:flex ag:flex-col ag:items-center ag:gap-3"
        :title="tech.name"
      >
        <img
          :src="`/technologies/${tech.slug}.svg`"
          alt=""
          width="32"
          height="32"
          loading="lazy"
          class="ag:size-8 ag:object-contain"
        />
        <span class="ag:text-[10px] ag:text-ag-muted">{{ tech.name }}</span>
      </li>
    </ul>
  </MotionReveal>
</template>
