export interface SearchResult<T> {
  list: T[];
  hit: number;
  from: number;
  facets?: ItemFacet[];
}

export interface ItemFacet {
  field: string;
  counts: Record<string, number>;
}

export interface Book {
  id: string;
  title?: string;
  volume?: string;
  index?: string[];
  autoTOCindex?: string[];
  contrastparam?: number;
  publishyear?: number;
  leftopen?: boolean;
  autoTOCflag?: boolean;
  illustrations?: string[];
  illusts?: Illustration[];
  responsibility?: string;
  creator?: string;
  publisher?: string;
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

export interface Page {
  id: string;
  book?: string;
  page: number;
  highlights?: string[];
  divide?: number;
  rectX?: number;
  rectY?: number;
  rectW?: number;
  rectH?: number;
  coordjson?: string;
}
