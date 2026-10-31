const DB_NAME = "rike-project-files"
const STORE = "blobs"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("打不開檔案庫"))
  })
}

export function saveProjectBlob(id: string, blob: Blob): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(blob, id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error("檔案沒寫入"))
      }),
  )
}

export function loadProjectBlob(id: string): Promise<Blob | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id)
        request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null)
        request.onerror = () => reject(request.error ?? new Error("檔案沒讀到"))
      }),
  )
}

export function deleteProjectBlob(id: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error("檔案沒刪掉"))
      }),
  )
}
