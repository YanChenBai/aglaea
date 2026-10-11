import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
    { path: '/design', name: 'design', component: () => import('./pages/DesignPage.vue') },
    { path: '/design.html', redirect: '/design' },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return { el: to.hash, top: 88 };
    }

    return { top: 0 };
  },
});

router.afterEach(to => {
  document.title =
    to.name === 'design' ? 'Aglaea · 设计元素与规格' : 'Aglaea 阿格莱亚 · B 站同步播放';
});
