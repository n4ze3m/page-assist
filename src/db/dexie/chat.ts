import {
  ChatHistory,
  HistoryInfo,
  LastUsedModelType,
  Message,
  MessageHistory,
  Prompt,
  Prompts,
  SessionFiles,
  UploadedFile,
  Webshare,

} from "./types"
import { db } from './schema';
import { getAllModelNicknames } from "./nickname";
const PAGE_SIZE = 30;

function searchQueryInContent(content: string, query: string): boolean {
  if (!content || !query) {
    return false;
  }
  
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();
  
  const wordBoundaryPattern = new RegExp(`\\b${normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  
  return wordBoundaryPattern.test(normalizedContent);
}

function fastForward(lastRow: any, idProp: string, otherCriterion?: (item: any) => boolean) {
  let fastForwardComplete = false;
  return (item: any) => {
    if (fastForwardComplete) return otherCriterion ? otherCriterion(item) : true;
    if (item[idProp] === lastRow[idProp]) {
      fastForwardComplete = true;
    }
    return false;
  };
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

  async fullTextSearchChatHistories(query: string): Promise<ChatHistory> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.getChatHistories();
    }

    const titleMatches = await db.chatHistories
      .where('title')
      .startsWithIgnoreCase(normalizedQuery)
      .or('title')
      .anyOfIgnoreCase(normalizedQuery.split(' '))
      .toArray();

    const messageMatches = await db.messages
      .filter(message => searchQueryInContent(message.content, normalizedQuery))
      .toArray();

    const historyIdsFromMessages = [...new Set(messageMatches.map(msg => msg.history_id))];

    const historiesFromMessages = await db.chatHistories
      .where('id')
      .anyOf(historyIdsFromMessages)
      .toArray();

    const allMatches = [...titleMatches, ...historiesFromMessages];
    const uniqueHistories = allMatches.filter((history, index, self) =>
      index === self.findIndex(h => h.id === history.id)
    );

    return uniqueHistories.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getChatHistoryTitleById(id: string): Promise<string> {
    const chatHistory = await db.chatHistories.get(id);
    return chatHistory?.title || '';
  }

  async getHistoryInfo(id: string): Promise<HistoryInfo> {
    return db.chatHistories.get(id);
  }

  async addChatHistory(history: HistoryInfo) {
    await db.chatHistories.add(history);
  }

  async updateChatHistoryCreatedAt(id: string, createdAt: number) {
    await db.chatHistories.update(id, { createdAt });
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

  async updateLastUsedModel(history_id: string, model_id: string) {
    await db.chatHistories.update(history_id, { model_id });
  }

  async updateLastUsedPrompt(history_id: string, usedPrompt: LastUsedModelType) {
    await db.chatHistories.update(history_id, { last_used_prompt: usedPrompt });
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
  async getChatHistoriesPaginated(page: number = 1, searchQuery?: string): Promise<{
    histories: ChatHistory;
    hasMore: boolean;
    totalCount: number;
  }> {
    const offset = (page - 1) * PAGE_SIZE;

    if (searchQuery) {
      console.log("Searching chat histories with query:", searchQuery);
      const allResults = await this.fullTextSearchChatHistories(searchQuery);
      const paginatedResults = allResults.slice(offset, offset + PAGE_SIZE)
      console.log("Paginated search results:", paginatedResults);
      return {
        histories: paginatedResults,
        hasMore: offset + PAGE_SIZE < allResults.length,
        totalCount: allResults.length
      };
    }

    if (page === 1) {
      const histories = await db.chatHistories
        .orderBy('createdAt')
        .reverse()
        .limit(PAGE_SIZE)
        .toArray();

      const totalCount = await db.chatHistories.count();

      return {
        histories,
        hasMore: histories.length === PAGE_SIZE,
        totalCount
      };
    } else {
      const skipCount = offset;
      const histories = await db.chatHistories
        .orderBy('createdAt')
        .reverse()
        .offset(skipCount)
        .limit(PAGE_SIZE)
        .toArray();

      const totalCount = await db.chatHistories.count();

      return {
        histories,
        hasMore: offset + PAGE_SIZE < totalCount,
        totalCount
      };
    }
  }
  async getChatHistoriesPaginatedOptimized(lastEntry?: any, searchQuery?: string): Promise<{
    histories: ChatHistory;
    hasMore: boolean;
  }> {
    if (searchQuery) {
      const allResults = await this.fullTextSearchChatHistories(searchQuery);
      return {
        histories: allResults.slice(0, PAGE_SIZE),
        hasMore: allResults.length > PAGE_SIZE
      };
    }

    if (!lastEntry) {
      const histories = await db.chatHistories
        .orderBy('createdAt')
        .reverse()
        .limit(PAGE_SIZE)
        .toArray();

      return {
        histories,
        hasMore: histories.length === PAGE_SIZE
      };
    } else {
      const histories = await db.chatHistories
        .where('createdAt')
        .belowOrEqual(lastEntry.createdAt)
        .filter(fastForward(lastEntry, "id"))
        .limit(PAGE_SIZE)
        .reverse()
        .toArray();

      return {
        histories,
        hasMore: histories.length === PAGE_SIZE
      };
    }
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

