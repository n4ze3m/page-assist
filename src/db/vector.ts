interface PageAssistVector {
  file_id: string
  content: string
  embedding: number[]
  metadata: Record<string, any>
}

export type VectorData = {
  id: string
  vectors: PageAssistVector[]
}

export class PageAssistVectorDb {
  db: chrome.storage.StorageArea

  constructor() {
    this.db = chrome.storage.local
  }

  insertVector = async (
    id: string,
    vector: PageAssistVector[]
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          const data = result[id] as VectorData
          if (!data) {
            this.db.set({ [id]: { id, vectors: vector } }, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
              } else {
                resolve()
              }
            })
          } else {
            this.db.set(
              {
                [id]: {
                  ...data,
                  vectors: data.vectors.concat(vector)
                }
              },
              () => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError)
                } else {
                  resolve()
                }
              }
            )
          }
        }
      })
    })
  }

  deleteVector = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.remove(id, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  deleteVectorByFileId = async (id: string, file_id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          const data = result[id] as VectorData
          data.vectors = data.vectors.filter((v) => v.file_id !== file_id)
          this.db.set({ [id]: data }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          })
        }
      })
    })
  }

  getVector = async (id: string): Promise<VectorData> => {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result[id] as VectorData)
        }
      })
    })
  }

  getAll = async (): Promise<VectorData[]> => {
    return new Promise((resolve, reject) => {
      this.db.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(Object.values(result))
        }
      })
    })
  }

  saveImportedData = async (data: VectorData[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      const obj: Record<string, VectorData> = {}
      data.forEach((d) => {
        obj[d.id] = d
      })
      this.db.set(obj, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }
}

export const insertVector = async (
  id: string,
  vector: PageAssistVector[]
): Promise<void> => {
  const db = new PageAssistVectorDb()
  return db.insertVector(id, vector)
}

export const getVector = async (id: string): Promise<VectorData> => {
  const db = new PageAssistVectorDb()
  return db.getVector(id)
}

export const deleteVector = async (id: string): Promise<void> => {
  const db = new PageAssistVectorDb()
  return db.deleteVector(id)
}

export const deleteVectorByFileId = async (
  id: string,
  file_id: string
): Promise<void> => {
  const db = new PageAssistVectorDb()
  return db.deleteVectorByFileId(id, file_id)
}

export const exportVectors = async () => {
  const db = new PageAssistVectorDb()
  const data = await db.getAll()
  return data
}

export const importVectors = async (data: VectorData[]) => {
  const db = new PageAssistVectorDb()
  return db.saveImportedData(data) 
}