
import Dexie, { type Table } from 'dexie';
import {
  HistoryInfo,
  Message,
  Prompt,
  SessionFiles,
  UserSettings,
  Webshare,
  Knowledge,
  VectorData,
  Document,
  OpenAIModelConfig,
  Model,
  ModelNickname
} from "./types"

export class PageAssistDexieDB extends Dexie {
  chatHistories!: Table<HistoryInfo>;
  messages!: Table<Message>;
  prompts!: Table<Prompt>;
  webshares!: Table<Webshare>;
  sessionFiles!: Table<SessionFiles>;
  userSettings!: Table<UserSettings>;

  // Knowledge management tables
  knowledge!: Table<Knowledge>;
  documents!: Table<Document>;
  vectors!: Table<VectorData>;

  // Openai config
  openaiConfigs!: Table<OpenAIModelConfig>;
  customModels!: Table<Model>;
  modelNickname!: Table<ModelNickname>

  constructor() {
    super('PageAssistDatabase');

    this.version(1).stores({
      chatHistories: 'id, title, is_rag, message_source, is_pinned, createdAt, doc_id, last_used_prompt, model_id',
      messages: 'id, history_id, name, role, content, createdAt, messageType, modelName',
      prompts: 'id, title, content, is_system, createdBy, createdAt',
      webshares: 'id, title, url, api_url, share_id, createdAt',
      sessionFiles: 'sessionId, retrievalEnabled, createdAt',
      userSettings: 'id, user_id',
      // Knowledge management tables
      knowledge: 'id, db_type, title, status, embedding_model, systemPrompt, followupPrompt, createdAt',
      documents: 'id, db_type, title, status, embedding_model, createdAt',
      vectors: 'id, vectors',
      // OpenAI Configs
      openaiConfigs: 'id, name, baseUrl, apiKey, createdAt, provider, db_type, headers',
      customModels: 'id, model_id, name, model_name, model_image, provider_id, lookup, model_type, db_type',
      modelNickname: 'id, model_id, model_name, model_avatar'
    });
  }
}

export const db = new PageAssistDexieDB();
