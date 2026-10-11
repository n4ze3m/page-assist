export type OAIApiProvider = {
  label: string
  value: string
  baseUrl: string
  apiKeyUrl?: string
}

export const OAI_API_PROVIDERS: OAIApiProvider[] = [
  {
    label: "Custom",
    value: "custom",
    baseUrl: ""
  },
  {
    label: "AIHubMix",
    value: "aihubmix",
    baseUrl: "https://aihubmix.com/v1",
    apiKeyUrl: "https://aihubmix.com/?aff=N9Wa"
  },
  {
    label: "LLaMa.cpp",
    value: "llamacpp",
    baseUrl: "http://localhost:8080/v1"
  },
  {
    label: "LM Studio",
    value: "lmstudio",
    baseUrl: "http://localhost:1234/v1"
  },
  {
    label: "Llamafile",
    value: "llamafile",
    baseUrl: "http://127.0.0.1:8080/v1"
  },
  {
    label: "llmman",
    value: "llmman",
    baseUrl: "http://localhost:17434/v1"
  },
  {
    label: "Ollama",
    value: "ollama2",
    baseUrl: "http://localhost:11434/v1"
  },
  {
    label: "OpenAI",
    value: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKeyUrl: "https://platform.openai.com/api-keys"
  },
  {
    label: "DeepSeek",
    value: "deepseek",
    baseUrl: "https://api.deepseek.com",
    apiKeyUrl: "https://platform.deepseek.com/api_keys"
  },
  {
    label: "Fireworks",
    value: "fireworks",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    apiKeyUrl: "https://fireworks.ai/account/api-keys"
  },
  {
    label: "Novita AI",
    value: "novita",
    baseUrl: "https://api.novita.ai/v3/openai"
  },
  {
    label: "Hugging Face",
    value: "huggingface",
    baseUrl: "https://router.huggingface.co/v1",
    apiKeyUrl: "https://huggingface.co/settings/tokens"
  },
  {
    label: "Groq",
    value: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyUrl: "https://console.groq.com/keys"
  },
  {
    label: "Together",
    value: "together",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyUrl: "https://api.together.ai/settings/projects/~current/api-keys"
  },
  {
    label: "OpenRouter",
    value: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyUrl: "https://openrouter.ai/settings/keys"
  },
  {
    label: "OrcaRouter",
    value: "orcarouter",
    baseUrl: "https://api.orcarouter.ai/v1"
  },
  {
    label: "UnoRouter",
    value: "unorouter",
    baseUrl: "https://api.unorouter.com/v1"
  },
  {
    label: "Google AI",
    value: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyUrl: "https://aistudio.google.com/app/apikey"
  },
  {
    label: "Gemini Enterprise Agent Platform (Vertex AI)",
    value: "vertex",
    baseUrl: ""
  },
  {
    label: "Mistral",
    value: "mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyUrl: "https://console.mistral.ai/api-keys/"
  },
  {
    label: "Infinigence AI",
    value: "infinitenceai",
    baseUrl: "https://cloud.infini-ai.com/maas/v1"
  },
  {
    label: "SiliconFlow",
    value: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1"
  },
  {
    label: "VolcEngine",
    value: "volcengine",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3"
  },
  {
    label: "TencentCloud",
    value: "tencentcloud",
    baseUrl: "https://api.lkeap.cloud.tencent.com/v1"
  },
  {
    label: "AliBaBaCloud",
    value: "alibabacloud",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyUrl: "https://bailian.console.aliyun.com/?tab=model#/api-key"
  },
  {
    label: "vLLM",
    value: "vllm",
    baseUrl: "http://localhost:8000/v1"
  },
  {
    label: "Moonshot",
    value: "moonshot",
    baseUrl: "https://api.moonshot.ai/v1",
    apiKeyUrl: "https://platform.moonshot.ai/console/api-keys"
  },
  {
    label: "xAI",
    value: "xai",
    baseUrl: "https://api.x.ai/v1"
  },
  {
    label: "Vercel AI Gateway",
    value: "vercel",
    baseUrl: "https://ai-gateway.vercel.sh/v1"
  },
  {
    label: "Chutes",
    value: "chutes",
    baseUrl: "https://llm.chutes.ai/v1"
  },
  {
    label: "Anthropic (Claude)",
    value: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyUrl: "https://platform.claude.com/settings/keys"
  },
  {
    label: "Canopy Wave",
    value: "canopywave",
    baseUrl: "https://inference.canopywave.io/v1"
  },
  {
    label: 'BigModel (Zhipu)',
    value: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyUrl: 'https://open.bigmodel.cn/apikey/platform'
  },
  {
    label: 'z.ai (Zhipu)',
    value: 'zai',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    apiKeyUrl: 'https://z.ai/manage-apikey/apikey-list'
  },
  {
    label: 'MiniMax',
    value: 'minimax',
    baseUrl: 'https://api.minimax.io/v1'
  },
  {
    label: 'Xiaomi Mimo',
    value: 'xiaomimimo',
    baseUrl: 'https://token-plan-sgp.xiaomimimo.com/v1'
  },
  {
    label: "Evolink",
    value: "evolink",
    baseUrl: "https://direct.evolink.ai/v1"
  },
  {
    label: "API Route",
    value: "api-route",
    baseUrl: "https://global.api-route.com/v1"
  },
  {
    label: "WebWright",
    value: "webwright",
    baseUrl: "https://webwright.ai/v1"
  },
  {
    label: "Atlas Cloud",
    value: "atlascloud",
    baseUrl: "https://api.atlascloud.ai/v1"
  },
]
