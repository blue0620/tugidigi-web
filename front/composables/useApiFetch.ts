export const useApiFetch = <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) => {
  const config = useRuntimeConfig();

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = `${config.public.apiPrefix}${normalizedPath}`;

  if (config.public.apiOrigin) {
    return $fetch<T>(apiPath, {
      ...options,
      baseURL: config.public.apiOrigin,
    });
  }

  return $fetch<T>(apiPath, options);
};
