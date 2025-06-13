import { getAllModelNicknames } from '../nickname';
import {
  ChatHistory,
  HistoryInfo,
  Message,
  MessageHistory,
  Prompt,
  Prompts,
  SessionFiles,
  UploadedFile,
  Webshare,

} from "./types"
import { db } from './schema';

function simpleFuzzyMatch(text: string, query: string): boolean {
  if (!text || !query) {
    return false;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  if (lowerQuery === '') {
    return true;
  }

  if (lowerText.includes(lowerQuery)) {
    return true;
  }

  const queryWords = lowerQuery.split(/\s+/).filter((word) => word.length > 2);

  if (queryWords.length > 1) {
    const matchedWords = queryWords.filter((word) => lowerText.includes(word));
    return matchedWords.length >= Math.ceil(queryWords.length * 0.7);
  }

  if (lowerQuery.length > 3) {
    const maxDistance = Math.floor(lowerQuery.length * 0.3);

    const textWords = lowerText.split(/\s+/);
    return textWords.some((word) => {
      if (Math.abs(word.length - lowerQuery.length) > maxDistance) {
        return false;
      }
      let matches = 0;
      for (let i = 0; i < lowerQuery.length; i++) {
        if (word.includes(lowerQuery[i])) {
          matches++;
        }
      }

      return matches >= lowerQuery.length - maxDistance;
    });
  }

  return false;
}


export class PageAssistDatabase {

  async getSessionFiles(sessionId: string): Promise<UploadedFile[]> {
    const sessionFiles = await db.sessionFiles.get(sessionId);
    return sessionFiles?.files || [];
  }

  async getSessionFilesInfo(sessionId: string): Promise<SessionFiles | null> {
    const sessionFiles = await db.sessionFiles.get(sessionId);
    return sessionFiles || null;
  }

  async addFileToSession(sessionId: string, file: UploadedFile) {
    const sessionFiles = await this.getSessionFilesInfo(sessionId);
    const updatedFiles = sessionFiles ? [...sessionFiles.files, file] : [file];
    const sessionData: SessionFiles = {
      sessionId,
      files: updatedFiles,
      retrievalEnabled: sessionFiles?.retrievalEnabled || false,
      createdAt: sessionFiles?.createdAt || Date.now()
    };
    await db.sessionFiles.put(sessionData);
  }

  async removeFileFromSession(sessionId: string, fileId: string) {
    const sessionFiles = await this.getSessionFilesInfo(sessionId);
    if (sessionFiles) {
      const updatedFiles = sessionFiles.files.filter(f => f.id !== fileId);
      const sessionData: SessionFiles = {
        ...sessionFiles,
        files: updatedFiles
      };
      await db.sessionFiles.put(sessionData);
    }
  }

  async updateFileInSession(sessionId: string, fileId: string, updates: Partial<UploadedFile>) {
    const sessionFiles = await this.getSessionFilesInfo(sessionId);
    if (sessionFiles) {
      const updatedFiles = sessionFiles.files.map(f =>
        f.id === fileId ? { ...f, ...updates } : f
      );
      const sessionData: SessionFiles = {
        ...sessionFiles,
        files: updatedFiles
      };
      await db.sessionFiles.put(sessionData);
    }
  }

  async setRetrievalEnabled(sessionId: string, enabled: boolean) {
    const sessionFiles = await this.getSessionFilesInfo(sessionId);
    const sessionData: SessionFiles = {
      sessionId,
      files: sessionFiles?.files || [],
      retrievalEnabled: enabled,
      createdAt: sessionFiles?.createdAt || Date.now()
    };
    await db.sessionFiles.put(sessionData);
  }

  async clearSessionFiles(sessionId: string) {
    await db.sessionFiles.delete(sessionId);
  }

  async getChatHistory(id: string): Promise<MessageHistory> {
    const modelNicknames = await getAllModelNicknames();
    const messages = await db.messages.where('history_id').equals(id).toArray();

    return messages.map((message) => {
      return {
        ...message,
        modelName: modelNicknames[message.name]?.model_name || message.name,
        modelImage: modelNicknames[message.name]?.model_avatar || undefined
      };
    });
  }

  async getChatHistories(): Promise<ChatHistory> {
    return await db.chatHistories.orderBy('createdAt').reverse().toArray();
  }

  async getChatHistoryTitleById(id: string): Promise<string> {
    const chatHistory = await db.chatHistories.get(id);
    return chatHistory?.title || '';
  }

  async addChatHistory(history: HistoryInfo) {
    await db.chatHistories.add(history);
  }

  async addMessage(message: Message) {
    await db.messages.add(message);
  }

  async updateMessage(history_id: string, message_id: string, content: string) {
    await db.messages.where('id').equals(message_id).modify({ content });
  }

  async removeChatHistory(id: string) {
    await db.chatHistories.delete(id);
  }

  async removeMessage(history_id: string, message_id: string) {
    await db.messages.delete(message_id);
  }

  async clear() {
    await db.delete();
    await db.open();
  }

  async deleteChatHistory(id: string) {
    await db.transaction('rw', [db.chatHistories, db.messages], async () => {
      await db.chatHistories.delete(id);
      await db.messages.where('history_id').equals(id).delete();
    });
  }

  async deleteAllChatHistory() {
    await db.transaction('rw', [db.chatHistories, db.messages], async () => {
      await db.chatHistories.clear();
      await db.messages.clear();
    });
  }

  async clearDB() {
    await db.delete();
    await db.open();
  }

  async deleteMessage(history_id: string) {
    await db.messages.where('history_id').equals(history_id).delete();
  }

  // Prompts Methods
  async getAllPrompts(): Promise<Prompts> {
    return await db.prompts.orderBy('createdAt').reverse().toArray();
  }

  async addPrompt(prompt: Prompt) {
    await db.prompts.add(prompt);
  }

  async deletePrompt(id: string) {
    await db.prompts.delete(id);
  }

  async updatePrompt(id: string, title: string, content: string, is_system: boolean) {
    await db.prompts.update(id, { title, content, is_system });
  }

  async getPromptById(id: string): Promise<Prompt | undefined> {
    return await db.prompts.get(id);
  }

  // Webshare Methods
  async getWebshare(id: string) {
    return await db.webshares.get(id);
  }

  async getAllWebshares(): Promise<Webshare[]> {
    return await db.webshares.orderBy('createdAt').reverse().toArray();
  }

  async addWebshare(webshare: Webshare) {
    await db.webshares.add(webshare);
  }

  async deleteWebshare(id: string) {
    await db.webshares.delete(id);
  }

  // User Settings Methods
  async getUserID(): Promise<string> {
    const userSettings = await db.userSettings.get('main');
    return userSettings?.user_id || '';
  }

  async setUserID(id: string) {
    await db.userSettings.put({ id: 'main', user_id: id });
  }

  // Search Methods
  async searchChatHistories(query: string): Promise<ChatHistory> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.getChatHistories();
    }

    const allHistories = await this.getChatHistories();
    const matchedHistories: ChatHistory = [];
    const matchedHistoryIds = new Set<string>();

    for (const history of allHistories) {
      if (simpleFuzzyMatch(history.title, normalizedQuery)) {
        if (!matchedHistoryIds.has(history.id)) {
          matchedHistories.push(history);
          matchedHistoryIds.add(history.id);
        }
        continue;
      }

      try {
        const messages = await this.getChatHistory(history.id);
        for (const message of messages) {
          if (
            message.content &&
            simpleFuzzyMatch(message.content, normalizedQuery)
          ) {
            if (!matchedHistoryIds.has(history.id)) {
              matchedHistories.push(history);
              matchedHistoryIds.add(history.id);
            }
            break;
          }
        }
      } catch (error) {
        console.error(
          `Error fetching messages for history ${history.id}:`,
          error
        );
      }
    }

    return matchedHistories;
  }
  async importChatHistoryV2(data: any[], options: {
    replaceExisting?: boolean;
    mergeData?: boolean;
  } = {}) {
    const { replaceExisting = false, mergeData = true } = options;

    if (!mergeData && !replaceExisting) {
      // Clear existing data
      await this.deleteAllChatHistory();
    }

    for (const item of data) {
      if (item.history) {
        await db.chatHistories.put(item.history);
      }

      if (item.messages) {
        for (const message of item.messages) {
          const existingMessage = await db.messages.get(message.id);

          if (existingMessage && !replaceExisting) {
            continue;
          }

          await db.messages.put(message);
        }
      }
    }
  }

  async importPromptsV2(data: Prompt[], options: {
    replaceExisting?: boolean;
    mergeData?: boolean;
  } = {}) {
    const { replaceExisting = false, mergeData = true } = options;

    if (!mergeData && !replaceExisting) {
      await db.prompts.clear();
    }

    for (const prompt of data) {
      const existingPrompt = await db.prompts.get(prompt.id);

      if (existingPrompt && !replaceExisting) {
        continue;
      }

      await db.prompts.put(prompt);
    }
  }

  async importSessionFilesV2(data: SessionFiles[], options: {
    replaceExisting?: boolean;
    mergeData?: boolean;
  } = {}) {
    const { replaceExisting = false, mergeData = true } = options;

    if (!mergeData && !replaceExisting) {
      await db.sessionFiles.clear();
    }

    for (const sessionFile of data) {
      const existingSessionFile = await db.sessionFiles.get(sessionFile.sessionId);

      if (existingSessionFile && !replaceExisting) {
        if (mergeData) {
          // Merge files arrays
          const mergedFiles = [...existingSessionFile.files];
          for (const newFile of sessionFile.files) {
            if (!mergedFiles.find(f => f.id === newFile.id)) {
              mergedFiles.push(newFile);
            }
          }
          await db.sessionFiles.put({
            ...existingSessionFile,
            files: mergedFiles
          });
        }
        continue;
      }

      await db.sessionFiles.put(sessionFile);
    }
  }

}

