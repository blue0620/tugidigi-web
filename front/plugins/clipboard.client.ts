export default defineNuxtPlugin(() => ({
  provide: {
    copyText: async (text: string) => {
      await navigator.clipboard.writeText(text);
    },
  },
}));
