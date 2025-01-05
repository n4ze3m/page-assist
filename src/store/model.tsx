import { create } from "zustand"

type CurrentChatModelSettings = {
  f16KV?: boolean
  frequencyPenalty?: number
  keepAlive?: string
  logitsAll?: boolean
  mirostat?: number
  mirostatEta?: number
  mirostatTau?: number
  numBatch?: number
  numCtx?: number
  numGpu?: number
  numGqa?: number
  numKeep?: number
  numPredict?: number
  numThread?: number
  penalizeNewline?: boolean
  presencePenalty?: number
  repeatLastN?: number
  repeatPenalty?: number
  ropeFrequencyBase?: number
  ropeFrequencyScale?: number
  temperature?: number
  tfsZ?: number
  topK?: number
  topP?: number
  typicalP?: number
  useMLock?: boolean
  useMMap?: boolean
  vocabOnly?: boolean
  seed?: number
  minP?: number

  setF16KV?: (f16KV: boolean) => void
  setFrequencyPenalty?: (frequencyPenalty: number) => void
  setKeepAlive?: (keepAlive: string) => void
  setLogitsAll?: (logitsAll: boolean) => void
  setMirostat?: (mirostat: number) => void
  setMirostatEta?: (mirostatEta: number) => void
  setMirostatTau?: (mirostatTau: number) => void
  setNumBatch?: (numBatch: number) => void
  setNumCtx?: (numCtx: number) => void
  setNumGpu?: (numGpu: number) => void
  setNumGqa?: (numGqa: number) => void
  setNumKeep?: (numKeep: number) => void
  setNumPredict?: (numPredict: number) => void
  setNumThread?: (numThread: number) => void
  setPenalizeNewline?: (penalizeNewline: boolean) => void
  setPresencePenalty?: (presencePenalty: number) => void
  setRepeatLastN?: (repeatLastN: number) => void
  setRepeatPenalty?: (repeatPenalty: number) => void
  setRopeFrequencyBase?: (ropeFrequencyBase: number) => void
  setRopeFrequencyScale?: (ropeFrequencyScale: number) => void
  setTemperature?: (temperature: number) => void
  setTfsZ?: (tfsZ: number) => void
  setTopK?: (topK: number) => void
  setTopP?: (topP: number) => void
  setTypicalP?: (typicalP: number) => void
  setUseMLock?: (useMLock: boolean) => void
  setUseMMap?: (useMMap: boolean) => void
  setVocabOnly?: (vocabOnly: boolean) => void
  seetSeed?: (seed: number) => void

  setX: (key: string, value: any) => void
  reset: () => void
  systemPrompt?: string
  setSystemPrompt: (systemPrompt: string) => void
  useMlock?: boolean
  setUseMlock: (useMlock: boolean) => void

  setMinP: (minP: number) => void
}

export const useStoreChatModelSettings = create<CurrentChatModelSettings>(
  (set) => ({
    setF16KV: (f16KV: boolean) => set({ f16KV }),
    setFrequencyPenalty: (frequencyPenalty: number) =>
      set({ frequencyPenalty }),
    setKeepAlive: (keepAlive: string) => set({ keepAlive }),
    setLogitsAll: (logitsAll: boolean) => set({ logitsAll }),
    setMirostat: (mirostat: number) => set({ mirostat }),
    setMirostatEta: (mirostatEta: number) => set({ mirostatEta }),
    setMirostatTau: (mirostatTau: number) => set({ mirostatTau }),
    setNumBatch: (numBatch: number) => set({ numBatch }),
    setNumCtx: (numCtx: number) => set({ numCtx }),
    setNumGpu: (numGpu: number) => set({ numGpu }),
    setNumGqa: (numGqa: number) => set({ numGqa }),
    setNumKeep: (numKeep: number) => set({ numKeep }),
    setNumPredict: (numPredict: number) => set({ numPredict }),
    setNumThread: (numThread: number) => set({ numThread }),
    setPenalizeNewline: (penalizeNewline: boolean) => set({ penalizeNewline }),
    setPresencePenalty: (presencePenalty: number) => set({ presencePenalty }),
    setRepeatLastN: (repeatLastN: number) => set({ repeatLastN }),
    setRepeatPenalty: (repeatPenalty: number) => set({ repeatPenalty }),
    setRopeFrequencyBase: (ropeFrequencyBase: number) =>
      set({ ropeFrequencyBase }),
    setRopeFrequencyScale: (ropeFrequencyScale: number) =>
      set({ ropeFrequencyScale }),
    setTemperature: (temperature: number) => set({ temperature }),
    setTfsZ: (tfsZ: number) => set({ tfsZ }),
    setTopK: (topK: number) => set({ topK }),
    setTopP: (topP: number) => set({ topP }),
    setTypicalP: (typicalP: number) => set({ typicalP }),
    setUseMLock: (useMLock: boolean) => set({ useMLock }),
    setUseMMap: (useMMap: boolean) => set({ useMMap }),
    setVocabOnly: (vocabOnly: boolean) => set({ vocabOnly }),
    seetSeed: (seed: number) => set({ seed }),
    setX: (key: string, value: any) => set({ [key]: value }),
    systemPrompt: undefined,
    setMinP: (minP: number) => set({ minP }),
    setSystemPrompt: (systemPrompt: string) => set({ systemPrompt }),
    setUseMlock: (useMlock: boolean) => set({ useMlock }),
    reset: () =>
      set({
        f16KV: undefined,
        frequencyPenalty: undefined,
        keepAlive: undefined,
        logitsAll: undefined,
        mirostat: undefined,
        mirostatEta: undefined,
        mirostatTau: undefined,
        numBatch: undefined,
        numCtx: undefined,
        numGpu: undefined,
        numGqa: undefined,
        numKeep: undefined,
        numPredict: undefined,
        numThread: undefined,
        penalizeNewline: undefined,
        presencePenalty: undefined,
        repeatLastN: undefined,
        repeatPenalty: undefined,
        ropeFrequencyBase: undefined,
        ropeFrequencyScale: undefined,
        temperature: undefined,
        tfsZ: undefined,
        topK: undefined,
        topP: undefined,
        typicalP: undefined,
        useMLock: undefined,
        useMMap: undefined,
        vocabOnly: undefined,
        seed: undefined,
        systemPrompt: undefined,
        minP: undefined,
        useMlock: undefined,
      })
  })
)
