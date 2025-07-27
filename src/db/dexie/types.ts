import { ChatDocuments } from '@/models/ChatTypes';

export type LastUsedModelType = { prompt_id?: string; prompt_content?: string }

export type HistoryInfo = {
  id: string;
  title: string;
  is_rag: boolean;
  message_source?: 'copilot' | 'web-ui' | 'branch';
  is_pinned?: boolean;
  createdAt: number;
  doc_id?: string;
  last_used_prompt?: LastUsedModelType;
  model_id?: string;
};

export type WebSearch = {
  search_engine: string;
  search_url: string;
  search_query: string;
  search_results: {
    title: string;
    link: string;
  }[];
};

export type UploadedFile = {
  id: string;
  filename: string;
  type: string;
  content: string;
  size: number;
  uploadedAt: number;
  embedding?: number[];
  processed: boolean;
};

export type SessionFiles = {
  id?: any 
  sessionId: string;
  files: UploadedFile[];
  retrievalEnabled: boolean;
  createdAt: number;
};

export type Message = {
  id: string;
  history_id: string;
  name: string;
  role: string;
  content: string;
  images?: string[];
  sources?: string[];
  search?: WebSearch;
  createdAt: number;
  reasoning_time_taken?: number;
  messageType?: string;
  generationInfo?: any;
  modelName?: string;
  modelImage?: string;
  documents?: ChatDocuments;
};

export type Webshare = {
  id: string;
  title: string;
  url: string;
  api_url: string;
  share_id: string;
  createdAt: number;
};

export type Prompt = {
  id: string;
  title: string;
  content: string;
  is_system: boolean;
  createdBy?: string;
  createdAt: number;
};

export type UserSettings = {
  id: string;
  user_id: string;
};

export type Source = {
  source_id: string;
  type: string;
  filename?: string;
  content: string;
};

export type Knowledge = {
  id: string;
  db_type: string;
  title: string;
  status: string;
  embedding_model: string;
  source: Source[];
  knownledge: any;
  createdAt: number;
  systemPrompt?: string;
  followupPrompt?: string;
};


export interface PageAssistVector {
  file_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

export type VectorData = {
  id: string;
  vectors: PageAssistVector[];
};


// Types for Document
export type DocumentSource = {
  source_id: string;
  type: string;
  filename?: string;
  content: string;
};

export type Document = {
  id: string;
  db_type: string;
  title: string;
  status: string;
  embedding_model: string;
  source: DocumentSource[];
  document: any;
  createdAt: number;
  systemPrompt?: string;
  followupPrompt?: string;
  compressedContent?: string;
};

export type OpenAIModelConfig = {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  createdAt: number
  provider?: string
  db_type: string
  fix_cors?: boolean
  headers?: { key: string; value: string }[]
}

export type Model = {
  id: string
  model_id: string
  name: string
  model_name?: string,
  model_image?: string,
  provider_id: string
  lookup: string
  model_type: string
  db_type: string
}

export type ModelNickname = {
  id: string,
  model_id: string,
  model_name: string,
  model_avatar?: string
}


export type MessageHistory = Message[];
export type ChatHistory = HistoryInfo[];
export type Prompts = Prompt[];
export type OpenAIModelConfigs = OpenAIModelConfig[]
export type Models = Model[]
export type ModelNicknames = ModelNickname[]