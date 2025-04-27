import { deleteVector, deleteVectorByFileId } from "./vector"
import { compressText, decompressData, arrayBufferToBase64, base64ToArrayBuffer } from "@/utils/compress"

export type Source = {
    source_id: string
    type: string
    filename?: string
    content: string
}

export type Document = {
    id: string
    db_type: string
    title: string
    status: string
    embedding_model: string
    source: Source[]
    document: any
    createdAt: number
    systemPrompt?: string,
    followupPrompt?: string
}

export const generateID = () => {
    return "pa_document_xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
        const r = Math.floor(Math.random() * 16)
        return r.toString(16)
    })
}

export class PageAssistDocument {
    db: chrome.storage.StorageArea

    constructor() {
        this.db = chrome.storage.local
    }

    getAll = async (): Promise<Document[]> => {
        return new Promise((resolve, reject) => {
            this.db.get(null, async (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError)
                } else {
                    const data = await Promise.all(
                        Object.keys(result)
                            .filter(key => key.startsWith('pa_document_'))
                            .map(async (key) => {
                                const doc = result[key];
                                if (doc.compressedContent) {
                                    const decompressedContent = await decompressData(
                                        base64ToArrayBuffer(doc.compressedContent)
                                    );
                                    return JSON.parse(decompressedContent);
                                }
                                return doc;
                            })
                    );
                    resolve(data);
                }
            })
        })
    }

    getById = async (id: string): Promise<Document> => {
        return new Promise((resolve, reject) => {
            this.db.get(id, async (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError)
                } else {
                    if (result[id].compressedContent) {
                        const decompressedContent = await decompressData(
                            base64ToArrayBuffer(result[id].compressedContent)
                        );
                        resolve(JSON.parse(decompressedContent));
                    } else {
                        resolve(result[id]);
                    }
                }
            })
        })
    }

    create = async (document: Document): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            const documentString = JSON.stringify(document);
            const compressedData = await compressText(documentString);
            const base64Data = arrayBufferToBase64(compressedData);

            this.db.set({
                [document.id]: {
                    id: document.id,
                    title: document.title,
                    status: document.status,
                    db_type: document.db_type,
                    createdAt: document.createdAt,
                    compressedContent: base64Data
                }
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError)
                } else {
                    resolve()
                }
            })
        })
    }

    update = async (document: Document): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            const documentString = JSON.stringify(document);
            const compressedData = await compressText(documentString);
            const base64Data = arrayBufferToBase64(compressedData);

            this.db.set({
                [document.id]: {
                    id: document.id,
                    title: document.title,
                    status: document.status,
                    db_type: document.db_type,
                    createdAt: document.createdAt,
                    compressedContent: base64Data
                }
            }, () => {
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
        return new Promise(async (resolve, reject) => {
            try {
                const data = await this.getById(id) as Document;
                data.source = data.source.filter((s) => s.source_id !== source_id);
                await this.update(data);
                resolve();
            } catch (error) {
                reject(error);
            }
        })
    }
}

export const createDocument = async ({
    source,
    title,
    embedding_model
}: {
    title: string
    source: Source[]
    embedding_model: string
}) => {
    const db = new PageAssistDocument()
    const id = generateID()
    const document: Document = {
        id,
        title,
        db_type: "document",
        source,
        status: "pending",
        document: {},
        embedding_model,
        createdAt: Date.now()
    }
    await db.create(document)
    return document
}

export const getDocumentById = async (id: string) => {
    const db = new PageAssistDocument()
    return db.getById(id)
}

export const updateDocumentStatus = async (id: string, status: string) => {
    const db = new PageAssistDocument()
    const document = await db.getById(id)
    if (status === "finished") {
        document.source = document?.source?.map(e => ({
            ...e,
            content: undefined,
        }))
    }
    await db.update({
        ...document,
        status
    })
}

export const addNewSources = async (id: string, source: Source[]) => {
    await updateDocumentStatus(id, "processing")
    const db = new PageAssistDocument()
    const document = await db.getById(id)
    await db.update({
        ...document,
        source: [...document.source, ...source]
    })
}

export const getAllDocuments = async (status?: string) => {
    const db = new PageAssistDocument()
    const data = await db.getAll()

    if (status) {
        return data
            .filter((d) => d?.db_type === "document")
            .filter((d) => d?.status === status)
            .map((d) => {
                d.source.forEach((s) => {
                    delete s.content
                })
                return d
            })
            .sort((a, b) => b.createdAt - a.createdAt)
    }

    return data
        .filter((d) => d?.db_type === "document")
        .map((d) => {
            d?.source.forEach((s) => {
                delete s.content
            })
            return d
        })
        .sort((a, b) => b.createdAt - a.createdAt)
}

export const deleteDocument = async (id: string) => {
    const db = new PageAssistDocument()
    await db.delete(id)
    await deleteVector(`vector:${id}`)
}

export const deleteSource = async (id: string, source_id: string) => {
    const db = new PageAssistDocument()
    await db.deleteSource(id, source_id)
    await deleteVectorByFileId(`vector:${id}`, source_id)
}

export const exportDocuments = async () => {
    const db = new PageAssistDocument()
    const data = await db.getAll()
    return data
}

export const importDocuments = async (data: Document[]) => {
    const db = new PageAssistDocument()
    for (const d of data) {
        await db.create(d)
    }
}

export const updateDocumentbase = async ({ id, systemPrompt, title }: {
    id: string,
    title: string,
    systemPrompt: string
}) => {
    const db = new PageAssistDocument()
    const documentBase = await db.getById(id)
    await db.update({
        ...documentBase,
        title,
        systemPrompt
    })
}
