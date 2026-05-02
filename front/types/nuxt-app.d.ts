export {};

import type { Ref } from 'vue';

declare module '#app' {
  interface NuxtApp {
    $appRuntime: {
      lang: Ref<'ja' | 'en'>;
      setLang: (nextLang: 'ja' | 'en') => void;
      t: (ja: string, en: string) => string;
    };
    $notify: (text: string, type?: 'info' | 'success' | 'error') => void;
    $notifications: Ref<Array<{ id: number; type: 'info' | 'success' | 'error'; text: string }>>;
    $copyText: (text: string) => Promise<void>;
  }
}
