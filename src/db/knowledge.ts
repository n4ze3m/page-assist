import { deleteVector, deleteVectorByFileId } from "./vector"

export type Source = {
  source_id: string
  type: string
  filename?: string
  content: string
}

export type Knowledge = {
  id: string
  db_type: string
  title: string
  status: string
  embedding_model: string
  source: Source[]
  knownledge: any
  createdAt: number
}
export const generateID = () => {
  return "pa_knowledge_xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}
export class PageAssistKnowledge {
  db: chrome.storage.StorageArea

  constructor() {
    this.db = chrome.storage.local
  }

  getAll = async (): Promise<Knowledge[]> => {
    return new Promise((resolve, reject) => {
      this.db.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          const data = Object.keys(result).map((key) => result[key])
          resolve(data)
        }
      })
    })
  }

  getById = async (id: string): Promise<Knowledge> => {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result[id])
        }
      })
    })
  }

  create = async (knowledge: Knowledge): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.set({ [knowledge.id]: knowledge }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  update = async (knowledge: Knowledge): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.set({ [knowledge.id]: knowledge }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  delete = async (id: string): Promise<void> => {
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

  deleteSource = async (id: string, source_id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          const data = result[id] as Knowledge
          data.source = data.source.filter((s) => s.source_id !== source_id)
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
}

export const createKnowledge = async ({
  source,
  title,
  embedding_model
}: {
  title: string
  source: Source[]
  embedding_model: string
}) => {
  const db = new PageAssistKnowledge()
  const id = generateID()
  const knowledge: Knowledge = {
    id,
    title,
    db_type: "knowledge",
    source,
    status: "pending",
    knownledge: {},
    embedding_model,
    createdAt: Date.now()
  }
  await db.create(knowledge)
  return knowledge
}

export const getKnowledgeById = async (id: string) => {
  const db = new PageAssistKnowledge()
  return db.getById(id)
}

export const updateKnowledgeStatus = async (id: string, status: string) => {
  const db = new PageAssistKnowledge()
  const knowledge = await db.getById(id)
  if(status === "finished") {
    knowledge.source = knowledge.source.map(e => ({
      ...e,
      content: undefined,
    }))
  }
  await db.update({
    ...knowledge,
    status
  })
}

export const getAllKnowledge = async (status?: string) => {
  const db = new PageAssistKnowledge()
  const data = await db.getAll()

  if (status) {
    return data
      .filter((d) => d.db_type === "knowledge")
      .filter((d) => d.status === status)
      .map((d) => {
        d.source.forEach((s) => {
          delete s.content
        })
        return d
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  return data
    .filter((d) => d.db_type === "knowledge")
    .map((d) => {
      d.source.forEach((s) => {
        delete s.content
      })
      return d
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export const deleteKnowledge = async (id: string) => {
  const db = new PageAssistKnowledge()
  await db.delete(id)
  await deleteVector(`vector:${id}`)
}

export const deleteSource = async (id: string, source_id: string) => {
  const db = new PageAssistKnowledge()
  await db.deleteSource(id, source_id)
  await deleteVectorByFileId(`vector:${id}`, source_id)
}

export const exportKnowledge = async () => {
  const db = new PageAssistKnowledge()
  const data = await db.getAll()
  return data
}

export const importKnowledge = async (data: Knowledge[]) => {
  const db = new PageAssistKnowledge()
  for (const d of data) {
    await db.create(d)
  }
}