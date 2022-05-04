import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { Vue3Mq } from 'vue3-mq'
import * as Sentry from '@sentry/vue'
import { BrowserTracing } from '@sentry/tracing'

import App from './App.vue'
import Map from './Map.vue'


const router = createRouter({
  history: createWebHistory(),
  routes: [{
    path: '/:catchAll(.*)',
    component: Map
  }],
});


const app = createApp(App);
app.use(Vue3Mq);
app.use(router);

if (import.meta.env.PROD) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new BrowserTracing,
    ],
    tracesSampleRate: 1.0,
  });
}

app.mount('#app');