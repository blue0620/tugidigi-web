export default defineNuxtPlugin(() => {
  const messages = useState<Array<{ id: number; type: 'info' | 'success' | 'error'; text: string }>>(
    'notifications',
    () => [],
  );

  const notify = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    messages.value = [...messages.value, { id, type, text }];
    window.setTimeout(() => {
      messages.value = messages.value.filter((message) => message.id !== id);
    }, 3000);
  };

  return {
    provide: {
      notify,
      notifications: messages,
    },
  };
});
