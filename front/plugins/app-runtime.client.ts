export default defineNuxtPlugin(() => {
  const lang = useState<'ja' | 'en'>('app-lang', () => {
    const storedLang = localStorage.getItem('lang');
    const browserLang = navigator.language?.slice(0, 2);

    return storedLang === 'ja' || storedLang === 'en'
      ? storedLang
      : browserLang === 'ja'
        ? 'ja'
        : 'en';
  });

  const setLang = (nextLang: 'ja' | 'en') => {
    lang.value = nextLang;
    localStorage.setItem('lang', nextLang);
  };

  return {
    provide: {
      appRuntime: {
        lang,
        setLang,
        t: (ja: string, en: string) => (lang.value === 'ja' ? ja : en),
      },
    },
  };
});
