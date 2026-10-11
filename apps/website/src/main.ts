import { createVaporApp, vaporInteropPlugin } from 'vue';

import App from './App.vue';
import { router } from './router.ts';

import './styles.css';

createVaporApp(App).use(vaporInteropPlugin).use(router).mount('#app');
