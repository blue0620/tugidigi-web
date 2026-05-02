import type { Book, Illustration, Page, SearchResult } from '~/types/domain';

type RouteQueryValue = string | string[] | null | undefined;
type RouteQuery = Record<string, RouteQueryValue>;

const appendQueryValue = (params: URLSearchParams, key: string, value: RouteQueryValue) => {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item !== null && item !== undefined && item !== '') params.append(key, item);
    });
    return;
  }

  if (value !== null && value !== undefined && value !== '') {
    params.append(key, value);
  }
};

const routeQueryToSearchParams = (query: RouteQuery, overrides: RouteQuery = {}) => {
  const params = new URLSearchParams();
  const merged = { ...query, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    appendQueryValue(params, key, value);
  });

  return params;
};

const withQueryString = (path: string, params: URLSearchParams) => {
  const query = params.toString();

  return query ? `${path}?${query}` : path;
};

export const useSearchApi = () => {
  const searchBooks = (query: RouteQuery, overrides: RouteQuery = {}) => {
    const params = routeQueryToSearchParams(query, overrides);

    return useApiFetch<SearchResult<Book>>(withQueryString('/book/search', params));
  };

  const searchNgramBooks = (query: RouteQuery, overrides: RouteQuery = {}) => {
    const params = routeQueryToSearchParams(query, overrides);

    return useApiFetch<SearchResult<Book>>(withQueryString('/book/ngram-search', params));
  };

  const searchMetaBooks = (query: RouteQuery, overrides: RouteQuery = {}) => {
    const params = routeQueryToSearchParams(query, { ...overrides, searchfield: 'metaonly' });

    return useApiFetch<SearchResult<Book>>(withQueryString('/book/search', params));
  };

  const searchIllustrations = (query: RouteQuery, overrides: RouteQuery = {}) => {
    const params = routeQueryToSearchParams(query, overrides);

    return useApiFetch<SearchResult<Illustration>>(withQueryString('/illustration/searcheachimage', params));
  };

  const searchBookIllustrations = (query: RouteQuery, overrides: RouteQuery = {}) => {
    const params = routeQueryToSearchParams(query, overrides);

    return useApiFetch<SearchResult<Illustration>>(withQueryString('/illustration/search', params));
  };

  const searchIllustrationsByFeature = (feature: number[]) => {
    return useApiFetch<SearchResult<Illustration>>('/illustration/searchbyfeature', {
      method: 'POST',
      body: feature,
    });
  };

  const searchIllustrationsByTextFeature = (feature: number[]) => {
    return useApiFetch<SearchResult<Illustration>>('/illustration/searchbytxtfeature', {
      method: 'POST',
      body: feature,
    });
  };

  const getIllustration = (id: string) => {
    return useApiFetch<Illustration>(`/illustration/${encodeURIComponent(id)}`);
  };

  const getDefaultIllustrations = () => {
    return useApiFetch<Illustration[]>('/illustration/default');
  };

  const getRandomIllustrationsWithFacet = (facetType: 'graphic' | 'picture' | 'imgonly' | 'map') => {
    const params = new URLSearchParams({ size: '10' });
    if (facetType === 'graphic') {
      params.append('f-graphictags.tagname', 'graphic');
      params.append('f-graphictags.tagname', '-picture');
    } else if (facetType === 'picture') {
      params.append('f-graphictags.tagname', 'picture');
      params.append('f-graphictags.tagname', '-graphic');
    } else if (facetType === 'map') {
      params.append('f-graphictags.tagname', 'graphic_map');
    }
    return useApiFetch<Illustration[]>(withQueryString('/illustration/randomwithfacet', params));
  };

  const searchPages = (query: RouteQuery, overrides: RouteQuery = {}) => {
    const params = routeQueryToSearchParams(query, overrides);

    return useApiFetch<SearchResult<Page>>(withQueryString('/page/search', params));
  };

  const getIllustrationsByIds = (ids: string[]) => {
    if (!ids.length) return Promise.resolve([] as Illustration[]);

    return useApiFetch<Illustration[]>(`/illustration/multi-get?ids=${ids.map(encodeURIComponent).join(',')}`);
  };

  const getIllustrationsByBook = async (bookId: string) => {
    const result = await useApiFetch<SearchResult<Illustration>>(`/illustration/of/${encodeURIComponent(bookId)}`);

    return result.list || [];
  };

  return {
    searchBooks,
    searchNgramBooks,
    searchMetaBooks,
    searchIllustrations,
    searchBookIllustrations,
    searchIllustrationsByFeature,
    searchIllustrationsByTextFeature,
    searchPages,
    getIllustration,
    getDefaultIllustrations,
    getRandomIllustrationsWithFacet,
    getIllustrationsByIds,
    getIllustrationsByBook,
  };
};
