const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const joinPath = (...parts: string[]) => {
  const [first = '', ...rest] = parts;
  const joinedRest = rest.map(trimSlashes).filter(Boolean).join('/');
  const normalizedFirst = first.endsWith('/') ? first : `${first}/`;

  return joinedRest ? `${normalizedFirst}${joinedRest}` : normalizedFirst;
};

export const useApiFetch = <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) => {
  const config = useRuntimeConfig();

  const apiPrefix = String(config.public.apiPrefix || 'api');
  const apiBasePath = apiPrefix.startsWith('/')
    ? apiPrefix
    : joinPath(config.app.baseURL || '/', apiPrefix);
  const apiPath = joinPath(apiBasePath, path);

  if (config.public.apiOrigin) {
    return $fetch<T>(apiPath, {
      ...options,
      baseURL: config.public.apiOrigin,
    });
  }

  return $fetch<T>(apiPath, options);
};
