type QueryValue = string | number | boolean | null | undefined;
type QueryInput = Record<string, QueryValue | QueryValue[]>;

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return typeof value === 'string' && value ? [value] : [];
};

const normalizeQuery = (input: QueryInput) => {
  const query: Record<string, string | string[]> = {};

  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const values = value
        .filter((item): item is Exclude<QueryValue, null | undefined> => item !== null && item !== undefined)
        .map(String)
        .filter(Boolean);
      if (values.length) query[key] = values;
      return;
    }

    if (value !== null && value !== undefined && value !== '') {
      query[key] = String(value);
    }
  });

  return query;
};

export const useQueryParams = () => ({
  asStringArray,
  normalizeQuery,
});
