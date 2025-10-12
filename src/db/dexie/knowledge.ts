import { db } from "./schema"
import { Knowledge, Source } from "./types"
import { deleteVector, deleteVectorByFileId } from "./vector"

export const generateID = () => {
  return "pa_knowledge_xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export class PageAssistKnowledge {
  async getAll(): Promise<Knowledge[]> {
    return await db.knowledge.orderBy("createdAt").reverse().toArray()
  }

  async getById(id: string): Promise<Knowledge | undefined> {
    return await db.knowledge.get(id)
  }

  async create(knowledge: Knowledge): Promise<void> {
    await db.knowledge.add(knowledge)
  }

  async update(knowledge: Knowledge): Promise<void> {
    await db.knowledge.put(knowledge)
  }

  async delete(id: string): Promise<void> {
    await db.knowledge.delete(id)
  }

  async deleteSource(id: string, source_id: string): Promise<void> {
    const knowledge = await this.getById(id)
    if (knowledge) {
      knowledge.source = knowledge.source.filter(
        (s) => s.source_id !== source_id
      )
      await this.update(knowledge)
    }
  }

  async importDataV2(
    data: Knowledge[],
    options: {
      replaceExisting?: boolean
      mergeData?: boolean
    } = {}
  ): Promise<void> {
    const { replaceExisting = false, mergeData = true } = options

    if (!mergeData && !replaceExisting) {
      await db.knowledge.clear()
    }

    for (const knowledge of data) {
      const existingKnowledge = await this.getById(knowledge.id)

      if (existingKnowledge && !replaceExisting) {
        if (mergeData) {
          const mergedSources = [...existingKnowledge.source]
          for (const newSource of knowledge.source) {
            if (
              !mergedSources.find((s) => s.source_id === newSource.source_id)
            ) {
              mergedSources.push(newSource)
            }
          }
          await this.update({
            ...existingKnowledge,
            source: mergedSources
          })
        }
        continue
      }

      await this.create(knowledge)
    }
  }
}
export const importKnowledgeV2 = async (
  data: Knowledge[],
  options: {
    replaceExisting?: boolean
    mergeData?: boolean
  } = {}
) => {
  try {
    const { replaceExisting = false, mergeData = true } = options
    const knowledgeDb = new PageAssistKnowledge()

    if (!mergeData && !replaceExisting) {
      await db.knowledge.clear()
    }

    for (const knowledge of data) {
      const existingKnowledge = await knowledgeDb.getById(knowledge.id)

      if (existingKnowledge && !replaceExisting) {
        if (mergeData) {
          // Merge sources arrays, avoiding duplicates
          const mergedSources = [...existingKnowledge.source]
          for (const newSource of knowledge.source) {
            if (
              !mergedSources.find((s) => s.source_id === newSource.source_id)
            ) {
              mergedSources.push(newSource)
            }
          }
          await knowledgeDb.update({
            ...existingKnowledge,
            source: mergedSources
          })
        }
        continue
      }

      await knowledgeDb.create(knowledge)
    }
  } catch (e) {
    console.warn(e)
  }
}
// Helper functions that match the original API
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
  if (knowledge) {
    if (status === "finished") {
      knowledge.source = knowledge?.source?.map((e) => ({
        ...e,
        content: undefined
      }))
    }
    await db.update({
      ...knowledge,
      status
    })
  }
}

export const addNewSources = async (id: string, source: Source[]) => {
  await updateKnowledgeStatus(id, "processing")
  const db = new PageAssistKnowledge()
  const knowledge = await db.getById(id)
  if (knowledge) {
    await db.update({
      ...knowledge,
      source: [...knowledge.source, ...source]
    })
  }
}

export const getAllKnowledge = async (status?: string) => {
  try {
    const db = new PageAssistKnowledge()
    const data = await db.getAll()

    if (status) {
      return data
        .filter((d) => d?.db_type === "knowledge")
        .filter((d) => d?.status === status)
        .map((d) => {
          d.source.forEach((s) => {
            delete (s as any).content
          })
          return d
        })
        .sort((a, b) => b.createdAt - a.createdAt)
    }

    return data
      .filter((d) => d?.db_type === "knowledge")
      .map((d) => {
        d?.source.forEach((s) => {
          delete (s as any).content
        })
        return d
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch (e) {
    return []
  }
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

export const updateKnowledgebase = async ({
  id,
  title,
  systemPrompt,
  followupPrompt
}: {
  id: string
  title: string
  systemPrompt?: string
  followupPrompt?: string
}) => {
  const kb = new PageAssistKnowledge()
  const knowledgeBase = await kb.getById(id)
  if (knowledgeBase) {
    await kb.update({
      ...knowledgeBase,
      title,
      systemPrompt,
      followupPrompt,
    })
  }
}
