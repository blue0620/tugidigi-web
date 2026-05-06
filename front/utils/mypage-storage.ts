const LOCALSTORAGE_VIED_BOOK_HISTORY_KEY = 'viewed_book_history';
const LOCALSTORAGE_FULLTEXT_DEFAULT_SORT_KEY = 'fulltext_default_sort';
const LOCALSTORAGE_IS_VIEWED_BOOK_HISTORY_DISABLED_KEY = 'is_viewed_book_history_disabled';
const LOCALSTORAGE_IS_HISTORY_ALLOWED_KEY = 'is_history_allowed_key';
const LOCALSTORAGE_IS_TAG_ALLOWED_KEY = 'is_tag_allowed_key';

export const VALID_FULLTEXT_SORT_QUERY = ['', 'publishyear:asc', 'publishyear:desc'];

export const tryLocalStorageAvailable = (): boolean => {
  try {
    localStorage.setItem('is_available_test', 'test');
    localStorage.removeItem('is_available_test');
    return true;
  } catch {
    return false;
  }
};

export const checkHistoryPermission = (): boolean => {
  try {
    return Boolean(localStorage.getItem(LOCALSTORAGE_IS_HISTORY_ALLOWED_KEY));
  } catch {
    return false;
  }
};

export const setHistoryPermission = (): boolean => {
  try {
    localStorage.setItem(LOCALSTORAGE_IS_HISTORY_ALLOWED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
};

export const checkTagPermission = (): boolean => {
  try {
    return Boolean(localStorage.getItem(LOCALSTORAGE_IS_TAG_ALLOWED_KEY));
  } catch {
    return false;
  }
};

export const setTagPermission = (): boolean => {
  try {
    localStorage.setItem(LOCALSTORAGE_IS_TAG_ALLOWED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
};

export const isViewedBookHistoryDisabled = (): boolean => {
  try {
    return localStorage.getItem(LOCALSTORAGE_IS_VIEWED_BOOK_HISTORY_DISABLED_KEY) === '1';
  } catch {
    return false;
  }
};

export const setIsViewedBookHistoryDisabled = (toDisabled: boolean): boolean => {
  if (toDisabled) {
    try {
      localStorage.removeItem(LOCALSTORAGE_VIED_BOOK_HISTORY_KEY);
    } catch {
      // ignore
    }
  }

  try {
    localStorage.setItem(LOCALSTORAGE_IS_VIEWED_BOOK_HISTORY_DISABLED_KEY, toDisabled ? '1' : '');
    return true;
  } catch {
    return false;
  }
};

export const retreiveViewedBookHistory = (): string[] => {
  if (isViewedBookHistoryDisabled()) return [];

  try {
    return localStorage.getItem(LOCALSTORAGE_VIED_BOOK_HISTORY_KEY)?.split(',').filter(Boolean) || [];
  } catch {
    return [];
  }
};

export const retreiveFulltextDefaultSort = (): string => {
  try {
    const defaultSortQuery = localStorage.getItem(LOCALSTORAGE_FULLTEXT_DEFAULT_SORT_KEY) || '';
    return VALID_FULLTEXT_SORT_QUERY.includes(defaultSortQuery) ? defaultSortQuery : '';
  } catch {
    return '';
  }
};

export const setFulltextDefaultSort = (_sortQuery: string): boolean => {
  const sortQuery = _sortQuery === undefined ? '' : _sortQuery;
  if (!VALID_FULLTEXT_SORT_QUERY.includes(sortQuery)) return false;

  try {
    localStorage.setItem(LOCALSTORAGE_FULLTEXT_DEFAULT_SORT_KEY, sortQuery);
    return true;
  } catch {
    return false;
  }
};
