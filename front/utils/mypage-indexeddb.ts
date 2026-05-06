const TAGS_AND_BOOKS_OBJECT_STORE_NAME = 'tagsAndIds';

export type Tag = {
  tagName: string;
  bookIds: string[];
  updatedAt: Date;
};

export const openIDB = async (): Promise<IDBDatabase> => {
  const openRequest = indexedDB.open('mypage', 1);

  return new Promise((resolve, reject) => {
    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      const store = db.createObjectStore(TAGS_AND_BOOKS_OBJECT_STORE_NAME, {
        keyPath: 'tagName',
      });
      store.createIndex('bookIdIndex', 'bookIds', { multiEntry: true });
      store.createIndex('updatedAtIndex', 'updatedAt');
      store.add({
        tagName: 'like',
        bookIds: [],
        updatedAt: new Date(),
      } satisfies Tag);
    };

    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error);
  });
};

export const getTagsAndBooksObjectStore = async (isWritable = false) => {
  const db = await openIDB();
  const transactionMode = isWritable ? 'readwrite' : 'readonly';
  const store = db.transaction(TAGS_AND_BOOKS_OBJECT_STORE_NAME, transactionMode).objectStore(TAGS_AND_BOOKS_OBJECT_STORE_NAME);
  db.close();
  return store;
};

export const IDBRequestPromise = async <T = unknown>(req: IDBRequest): Promise<T> => {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const retrieveObjectByTagName = async (tagName: Tag['tagName']): Promise<Tag | undefined> => {
  const store = await getTagsAndBooksObjectStore();
  return IDBRequestPromise(store.get(IDBKeyRange.only(tagName)));
};

export const putTagObject = async (tag: Omit<Tag, 'updatedAt'>): Promise<Tag['tagName']> => {
  const store = await getTagsAndBooksObjectStore(true);
  return IDBRequestPromise(
    store.put({
      ...tag,
      updatedAt: new Date(),
    }),
  );
};

export const addTagObject = async (tag: Omit<Tag, 'updatedAt'>): Promise<Tag['tagName']> => {
  const store = await getTagsAndBooksObjectStore(true);
  return IDBRequestPromise(
    store.add({
      ...tag,
      updatedAt: new Date(),
    }),
  );
};

export const deleteTagObject = async (tag: Omit<Tag, 'updatedAt'>): Promise<unknown> => {
  const store = await getTagsAndBooksObjectStore(true);
  return IDBRequestPromise(store.delete(IDBKeyRange.only(tag.tagName)));
};

export const retrieveAllObjectByBookId = async (bookId: string): Promise<Tag[]> => {
  const store = await getTagsAndBooksObjectStore();
  return IDBRequestPromise(store.index('bookIdIndex').getAll(IDBKeyRange.only(bookId)));
};

export const pushBookIdByTagName = async ({
  bookId,
  tagName,
}: {
  bookId: string;
  tagName: string;
}): Promise<Tag['tagName'] | null> => {
  const tag = await retrieveObjectByTagName(tagName);
  if (!tag || tag.bookIds.includes(bookId)) return null;

  tag.bookIds.push(bookId);
  return putTagObject(tag);
};

export const deleteBookIdByTagName = async ({
  bookId,
  tagName,
}: {
  bookId: string;
  tagName: string;
}): Promise<Tag['tagName'] | null> => {
  const tag = await retrieveObjectByTagName(tagName);
  if (!tag || !tag.bookIds.includes(bookId)) return null;

  tag.bookIds = tag.bookIds.filter((taggedBookId) => taggedBookId !== bookId);
  if (!tag.bookIds.length) {
    await deleteTagObject(tag);
    return null;
  }

  return putTagObject(tag);
};

export const retrieveAllTagNames = async (): Promise<string[]> => {
  const store = await getTagsAndBooksObjectStore();
  return IDBRequestPromise(store.getAllKeys());
};

export const renameTagName = async (targetTagName: string, newTagName: string): Promise<Tag['tagName'] | null> => {
  if (!newTagName || newTagName === targetTagName) return targetTagName;

  const tag = await retrieveObjectByTagName(targetTagName);
  if (!tag) return null;

  const allTagNames = await retrieveAllTagNames();
  if (allTagNames.includes(newTagName)) return null;

  await deleteTagObject(tag);
  return addTagObject({
    ...tag,
    tagName: newTagName,
  });
};
