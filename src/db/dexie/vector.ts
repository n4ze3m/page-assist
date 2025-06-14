 
import { db } from "./schema";
import { PageAssistVector, VectorData } from "./types";

export class PageAssistVectorDb {
  async insertVector(id: string, vector: PageAssistVector[]): Promise<void> {
    const existingData = await db.vectors.get(id);
    
    if (!existingData) {
      await db.vectors.add({ id, vectors: vector });
    } else {
      const updatedData = {
        ...existingData,
        vectors: existingData.vectors.concat(vector)
      };
      await db.vectors.put(updatedData);
    }
  }

  async deleteVector(id: string): Promise<void> {
    await db.vectors.delete(id);
  }

  async deleteVectorByFileId(id: string, file_id: string): Promise<void> {
    const data = await db.vectors.get(id);
    if (data) {
      data.vectors = data.vectors.filter((v) => v.file_id !== file_id);
      await db.vectors.put(data);
    }
  }

  async getVector(id: string): Promise<VectorData | undefined> {
    return await db.vectors.get(id);  
  }

  async getAll(): Promise<VectorData[]> {
    return await db.vectors.toArray();
  }

  async saveImportedData(data: VectorData[]): Promise<void> {
    await db.vectors.bulkPut(data);
  }
async saveImportedDataV2(data: VectorData[], options: {
  replaceExisting?: boolean;
  mergeData?: boolean;
} = {}): Promise<void> {
  const { replaceExisting = false, mergeData = true } = options;
  
  if (!mergeData && !replaceExisting) {
    await db.vectors.clear();
  }
  
  for (const vectorData of data) {
    const existingVector = await db.vectors.get(vectorData.id);
    
    if (existingVector && !replaceExisting) {
      if (mergeData) {
        const mergedVectors = [...existingVector.vectors];
        for (const newVector of vectorData.vectors) {
          if (!mergedVectors.find(v => v.file_id === newVector.file_id && v.content === newVector.content)) {
            mergedVectors.push(newVector);
          }
        }
        await db.vectors.put({
          ...existingVector,
          vectors: mergedVectors
        });
      }
      continue;
    }
    
    await db.vectors.put(vectorData);
  }
}
  
}
export const importVectorsV2 = async (data: VectorData[], options: {
  replaceExisting?: boolean;
  mergeData?: boolean;
} = {}) => {
  const { replaceExisting = false, mergeData = true } = options;
  
  if (!mergeData && !replaceExisting) {
    await db.vectors.clear();
  }
  
  for (const vectorData of data) {
    const existingVector = await db.vectors.get(vectorData.id);
    
    if (existingVector && !replaceExisting) {
      if (mergeData) {
        // Merge vectors arrays, avoiding duplicates
        const mergedVectors = [...existingVector.vectors];
        for (const newVector of vectorData.vectors) {
          if (!mergedVectors.find(v => v.file_id === newVector.file_id && v.content === newVector.content)) {
            mergedVectors.push(newVector);
          }
        }
        await db.vectors.put({
          ...existingVector,
          vectors: mergedVectors
        });
      }
      continue;
    }
    
    await db.vectors.put(vectorData);
  }
  
}

export const saveImportedDataV2 = async (data: VectorData[], options: {
  replaceExisting?: boolean;
  mergeData?: boolean;
} = {}) => {
  const vectorDb = new PageAssistVectorDb();
  return vectorDb.saveImportedDataV2(data, options);
}

// Helper functions that match the original API
export const insertVector = async (
  id: string,
  vector: PageAssistVector[]
): Promise<void> => {
  const db = new PageAssistVectorDb();
  return db.insertVector(id, vector);
};

export const getVector = async (id: string): Promise<VectorData | undefined> => {
  const db = new PageAssistVectorDb();
  return db.getVector(id);
};

export const deleteVector = async (id: string): Promise<void> => {
  const db = new PageAssistVectorDb();
  return db.deleteVector(id);
};

export const deleteVectorByFileId = async (
  id: string,
  file_id: string
): Promise<void> => {
  const db = new PageAssistVectorDb();
  return db.deleteVectorByFileId(id, file_id);
};

export const exportVectors = async () => {
  const db = new PageAssistVectorDb();
  const data = await db.getAll();
  return data;
};

export const importVectors = async (data: VectorData[]) => {
  const db = new PageAssistVectorDb();
  return db.saveImportedData(data);
};
