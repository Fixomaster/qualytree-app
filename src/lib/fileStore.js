// 첨부 파일 저장소 — IndexedDB 기반 (교정성적서·점검기록 등 실제 파일 저장)
//
// localStorage는 용량이 매우 작아(브라우저별 5~10MB) PDF/이미지 등 바이너리를 담기에 부적합하므로,
// 파일 바이트(Blob)는 IndexedDB에, 메타데이터(파일명·크기·업로드일)는 파일 레코드 자체에 함께 저장한다.
// 서버 스토리지(Supabase Storage 등)가 준비되면 이 모듈의 구현만 교체하면 되도록 API를 좁게 유지한다.

const DB_NAME = 'qualytree-files'
const DB_VERSION = 1
const STORE_NAME = 'files'
export const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB / 파일

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB를 사용할 수 없습니다.')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

const uid = () => 'f_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const fileStore = {
  MAX_FILE_BYTES,

  /** File 객체를 저장하고 fileId를 반환. 5MB 초과 시 에러를 throw. */
  async saveFile(file) {
    if (!file) throw new Error('저장할 파일이 없습니다.')
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`파일 용량이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 파일당 최대 ${MAX_FILE_BYTES / 1024 / 1024}MB까지 저장할 수 있습니다.`)
    }
    const db = await openDB()
    const id = uid()
    const record = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      uploadedAt: Date.now(),
      blob: file,
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return id
  },

  /** fileId로 레코드(메타 + blob) 조회. 없으면 null. */
  async getFile(fileId) {
    if (!fileId) return null
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(fileId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  },

  /** 다운로드/미리보기용 Object URL 생성. 사용 후 URL.revokeObjectURL로 해제 권장. */
  async getObjectURL(fileId) {
    const rec = await this.getFile(fileId)
    if (!rec || !rec.blob) return null
    return URL.createObjectURL(rec.blob)
  },

  async deleteFile(fileId) {
    if (!fileId) return
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(fileId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },
}

export default fileStore
