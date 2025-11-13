/**
 * Utility functions for model capabilities and detection
 */

/**
 * Check if a model supports thinking/reasoning mode
 * Based on Ollama's documentation, models like DeepSeek R1, Qwen, and others support thinking
 *
 * @param modelId - The model identifier (e.g., "deepseek-r1:7b", "qwen2.5:14b")
 * @returns true if the model supports thinking mode
 */
export function isThinkingCapableModel(modelId: string | null | undefined): boolean {
  if (!modelId) return false;

  const normalizedModel = modelId.toLowerCase();

  // List of model name patterns that support thinking mode
  const thinkingPatterns = [
    'deepseek-r1',      // DeepSeek R1 family
    'deepseek-v3',      // DeepSeek v3.1
    'qwen',             // Qwen 3 family (text and vision)
    'gpt-oss',          // GPT-OSS
    'o1',               // OpenAI o1 models (if used via compatible API)
    'thinking',         // Generic thinking models
    'reason',           // Models with reasoning in the name
  ];

  return thinkingPatterns.some(pattern => normalizedModel.includes(pattern));
}

/**
 * Check if a model is GPT-OSS (which requires level-based thinking instead of boolean)
 *
 * @param modelId - The model identifier
 * @returns true if the model is gpt-oss
 */
export function isGptOssModel(modelId: string | null | undefined): boolean {
  if (!modelId) return false;
  return modelId.toLowerCase().includes('gpt-oss');
}

/**
 * Determine what type of thinking parameter a model uses
 *
 * @param modelId - The model identifier
 * @returns "levels" for gpt-oss (uses "low"|"medium"|"high"), "boolean" for others (uses true|false)
 */
export function getThinkingType(modelId: string | null | undefined): "boolean" | "levels" {
  if (isGptOssModel(modelId)) {
    return "levels";
  }
  return "boolean";
}
