export interface SearchResult<T> {
  list: T[];
  hit: number;
  from: number;
  facets?: Array<{
    field: string;
    counts: Record<string, number>;
  }>;
}

export interface Book {
  id: string;
  title?: string;
  index?: string[];
  autoTOCindex?: string[];
  publishyear?: number;
  leftopen?: boolean;
  autoTOCflag?: boolean;
  illustrations?: string[];
}

export interface Illustration {
  id: string;
  pid: string;
  title?: string;
  page?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  graphictags?: Array<{ tagname: string }>;
}
