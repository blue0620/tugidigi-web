const trimPathSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

export const useAppUrl = () => {
  const config = useRuntimeConfig();
  const baseURL = config.app.baseURL || '/';
  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;

  const url = (path: string) => {
    const normalizedPath = trimPathSlashes(path);

    return normalizedPath ? `${normalizedBaseURL}${normalizedPath}` : normalizedBaseURL;
  };

  return {
    baseURL: normalizedBaseURL,
    url,
  };
};
