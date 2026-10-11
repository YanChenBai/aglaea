/// <reference types="vite/client" />

declare module '*.vue' {
  import type { VaporComponent } from 'vue';

  const component: VaporComponent;
  export default component;
}

declare module 'vue/dist/vue.runtime-with-vapor.esm-browser.js' {
  export { createVaporApp, defineVaporComponent, vaporInteropPlugin } from 'vue';
}
