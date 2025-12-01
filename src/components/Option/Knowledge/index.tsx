import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Input, Button, List, Switch, Spin, Select, Checkbox, Skeleton, Collapse } from "antd"
import { useMessageOption } from "@/hooks/useMessageOption"
import { useNavigate } from "react-router-dom"
import { useServerOnline } from "@/hooks/useServerOnline"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useDemoMode } from "@/context/demo-mode"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { getNoOfRetrievedDocs } from "@/services/app"
import { RagDocsPerReplyHint } from "./RagDocsPerReplyHint"
import { useAntdMessage } from "@/hooks/useAntdMessage"
import { useKnowledgeStatus } from "@/hooks/useConnectionState"

export const KnowledgeSettings = () => {
  const { t } = useTranslation(["knowledge", "common"])
  const navigate = useNavigate()
  const {
    chatMode,
    setChatMode,
    ragMediaIds,
    ragSearchMode,
    setRagSearchMode,
    ragTopK,
    setRagTopK,
    ragEnableGeneration,
    setRagEnableGeneration,
    ragEnableCitations,
    setRagEnableCitations,
    ragSources,
    setRagSources
  } = useMessageOption()
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const [ragQuery, setRagQuery] = useState("")
  const [ragLoading, setRagLoading] = useState(false)
  const [ragResults, setRagResults] = useState<any[]>([])
  const [ragError, setRagError] = useState<string | null>(null)
  const [ragAnswer, setRagAnswer] = useState<string | null>(null)
  const [ragCitations, setRagCitations] = useState<any[]>([])
  const [advancedOverridesText, setAdvancedOverridesText] = useState<string>("")
  const [advancedOverrides, setAdvancedOverrides] = useState<Record<string, any>>({})
  const [strategy, setStrategy] = useState<string | null>(null)
  const [enableReranking, setEnableReranking] = useState<boolean | null>(null)
  const [enableCache, setEnableCache] = useState<boolean | null>(null)
  const message = useAntdMessage()
  const { knowledgeStatus } = useKnowledgeStatus()

  const ragUnsupported = !capsLoading && capabilities && !capabilities.hasRag

  const autoRagOn = chatMode === "rag"
  const isRagSearchBlocked = false

  React.useEffect(() => {
    // Best-effort: pull defaults from any structured RAG config placed on the capabilities object.
    // We intentionally avoid typing this more strictly to stay forward-compatible with server changes.
    try {
      const anyCaps: any = capabilities
      const defaults = anyCaps?.rag?.defaults
      if (defaults && typeof defaults === "object") {
        if (typeof defaults.strategy === "string" && !strategy) {
          setStrategy(defaults.strategy)
        }
        if (
          typeof defaults.enable_reranking === "boolean" &&
          enableReranking == null
        ) {
          setEnableReranking(defaults.enable_reranking)
        }
        if (
          typeof defaults.enable_cache === "boolean" &&
          enableCache == null
        ) {
          setEnableCache(defaults.enable_cache)
        }
      }
    } catch {
      // ignore, defaults are optional
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capabilities])

  const handleRagSearch = async () => {
    const q = ragQuery.trim()
    if (!q) return
    setRagLoading(true)
    setRagError(null)
    setRagResults([])
    setRagAnswer(null)
    setRagCitations([])
    try {
      await tldwClient.initialize()
      const defaultTopK = await getNoOfRetrievedDocs()
      const top_k =
        typeof ragTopK === "number" && ragTopK > 0 ? ragTopK : defaultTopK
      const options: any = {
        top_k,
        search_mode: ragSearchMode
      }
      if (ragEnableGeneration) {
        options.enable_generation = true
      }
      if (ragEnableCitations) {
        options.enable_citations = true
      }
      if (Array.isArray(ragSources) && ragSources.length > 0) {
        options.sources = ragSources
      }
      if (strategy) {
        options.strategy = strategy
      }
      if (enableReranking != null) {
        options.enable_reranking = enableReranking
      }
      if (enableCache != null) {
        options.enable_cache = enableCache
      }
      if (advancedOverrides && typeof advancedOverrides === "object" && Object.keys(advancedOverrides).length > 0) {
        Object.assign(options, advancedOverrides)
      }
      const ragRes = await tldwClient.ragSearch(q, options)
      const docs = ragRes?.results || ragRes?.documents || ragRes?.docs || []
      setRagResults(Array.isArray(docs) ? docs : [])
      const answer =
        ragRes?.generated_answer ||
        ragRes?.answer ||
        ragRes?.response ||
        ""
      setRagAnswer(
        typeof answer === "string" && answer.trim().length > 0
          ? answer
          : null
      )
      const citations: any[] =
        ragRes?.citations ||
        ragRes?.chunk_citations ||
        ragRes?.academic_citations ||
        []
      setRagCitations(Array.isArray(citations) ? citations : [])
    } catch (e: any) {
      setRagResults([])
      setRagError(
        e?.message ||
          t("knowledge:rag.searchFailed", {
            defaultValue:
              "RAG search failed. Try again or check Diagnostics."
          })
      )
    } finally {
      setRagLoading(false)
    }
  }

  if (!isOnline) {
    return demoEnabled ? (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              Demo
            </span>
            <span>
              {t("knowledge:empty.demoTitle", {
                defaultValue: "Explore Knowledge in demo mode"
              })}
            </span>
          </span>
        }
        description={t("knowledge:empty.demoDescription", {
          defaultValue:
            "This demo shows how Knowledge can organize your sources for better search. Connect your own server later to index your real documents and transcripts."
        })}
        examples={[
          t("knowledge:empty.demoExample1", {
            defaultValue:
              "See how knowledge bases and sources appear in this table."
          }),
          t("knowledge:empty.demoExample2", {
            defaultValue:
              "When you connect, you’ll be able to upload files and text that tldw can search across."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    ) : (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
              Not connected
            </span>
            <span>
              {t("knowledge:empty.connectTitle", {
                defaultValue: "Connect to use Knowledge"
              })}
            </span>
          </span>
        }
        description={t("knowledge:empty.connectDescription", {
          defaultValue:
            "To use Knowledge, first connect to your tldw server so new sources can be indexed."
        })}
        examples={[
          t("knowledge:empty.connectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL."
          }),
          t("knowledge:empty.connectExample2", {
            defaultValue:
              "Use Diagnostics if your server is running but not reachable."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    )
  }

  if (knowledgeStatus === "empty") {
    return (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              {t("knowledge:empty.noSourcesPill", {
                defaultValue: "No sources yet"
              })}
            </span>
            <span>
              {t("knowledge:empty.noSourcesTitle", {
                defaultValue: "Index knowledge to use Knowledge QA"
              })}
            </span>
          </span>
        }
        description={t("knowledge:empty.noSourcesDescription", {
          defaultValue:
            "Your server is online, but no knowledge indexes were found. Add notes or ingest media to start using Knowledge search and grounded chat."
        })}
        examples={[
          t("knowledge:empty.noSourcesExample1", {
            defaultValue:
              "Use Quick ingest to add documents, web pages, and media for RAG."
          }),
          t("knowledge:empty.noSourcesExample2", {
            defaultValue:
              "Create notes from Chat or the Notes view to capture key ideas."
          }),
          t("knowledge:empty.noSourcesExample3", {
            defaultValue:
              "Once content is indexed, Knowledge QA can ground answers in your sources."
          })
        ]}
        primaryActionLabel={t("knowledge:empty.noSourcesPrimaryCta", {
          defaultValue: "Open Quick ingest"
        })}
        onPrimaryAction={() => {
          try {
            window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest-intro"))
          } catch {
            // ignore dispatch errors
          }
        }}
        secondaryActionLabel={t("knowledge:empty.noSourcesSecondaryCta", {
          defaultValue: "Open Notes"
        })}
        onSecondaryAction={() => navigate("/notes")}
      />
    )
  }

  const ragScopeText = (() => {
    if (Array.isArray(ragMediaIds) && ragMediaIds.length > 0) {
      return t("knowledge:ragWorkspace.scopeMediaOnly", {
        defaultValue: "RAG scope: This media only"
      })
    }
    return t("knowledge:ragWorkspace.scopeDefault", {
      defaultValue: "RAG scope: Default server configuration"
    })
  })()

  return (
    <div className="space-y-8">
      {/* RAG playground: options, quick search, and navigation into Chat */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#171717]">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t("knowledge:ragWorkspace.title", {
              defaultValue: "Knowledge search & chat"
            })}
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {t("knowledge:ragWorkspace.description", {
              defaultValue:
                "Configure knowledge search (RAG) options, run quick searches, and use Chat with grounded answers."
            })}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {t("knowledge:ragWorkspace.subtitleRag", {
              defaultValue:
                "Retrieval-augmented generation (RAG) lets the assistant ground answers in your media, notes, and other indexed knowledge sources."
            })}
          </p>
        </div>
        {ragUnsupported ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
            <div className="font-semibold">
              {t("knowledge:ragWorkspace.ragUnsupportedTitle", {
                defaultValue: "RAG search is not available on this server"
              })}
            </div>
            <p className="mt-1">
              {t("knowledge:ragWorkspace.ragUnsupportedDescription", {
                defaultValue:
                  "This tldw server does not advertise the RAG endpoints. Open Diagnostics to inspect available APIs or upgrade your server."
              })}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="small"
                onClick={() => navigate("/settings/health")}
              >
                {t("settings:healthSummary.diagnostics", {
                  defaultValue: "Open Diagnostics"
                })}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)]">
            {/* Left: RAG configuration & quick search */}
            <div className="space-y-3">
              <div className="space-y-2 rounded-md bg-gray-50 p-2 text-xs dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {t("knowledge:ragWorkspace.autoRagLabel", {
                      defaultValue: "Use RAG for every reply"
                    })}
                  </span>
                  <Switch
                    size="small"
                    checked={autoRagOn}
                    onChange={(checked) => setChatMode(checked ? "rag" : "normal")}
                  />
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300">
                  {t("knowledge:ragWorkspace.autoRagHelp", {
                    defaultValue:
                      "When enabled, the Chat workspace will run a RAG search before answering each message."
                  })}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t("knowledge:ragWorkspace.autoRagScopeHelp", {
                    defaultValue:
                      "This setting applies to replies in the main Chat view and sidepanel."
                  })}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {ragScopeText}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t("knowledge:ragWorkspace.docsPerReply.label", {
                      defaultValue: "Documents per reply (top-k)"
                    })}
                  </span>
                  <RagDocsPerReplyHint />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      if (!autoRagOn) {
                        setChatMode("rag")
                      }
                      navigate("/")
                      setTimeout(() => {
                        try {
                          window.dispatchEvent(
                            new CustomEvent("tldw:focus-composer")
                          )
                        } catch {
                          // ignore
                        }
                      }, 0)
                    }}
                  >
                    {t("knowledge:ragWorkspace.openChatCta", {
                      defaultValue: "Open Chat with RAG"
                    })}
                  </Button>
                  <Button
                    size="small"
                    type="default"
                    onClick={() => navigate("/settings/rag")}
                  >
                    {t("knowledge:ragWorkspace.openRagSettings", {
                      defaultValue: "RAG settings"
                    })}
                  </Button>
                </div>
              </div>

              {/* Quick RAG search panel */}
              <div className="space-y-2 rounded-md border border-gray-200 p-3 text-xs dark:border-gray-700 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {t("knowledge:ragWorkspace.searchTitle", {
                      defaultValue: "Quick RAG search"
                    })}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Input
                    size="small"
                    className="flex-1 min-w-[10rem]"
                    placeholder={t("knowledge:ragWorkspace.searchPlaceholder", {
                      defaultValue: "Search across configured RAG sources"
                    })}
                    disabled={isRagSearchBlocked}
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onPressEnter={() => {
                      if (isRagSearchBlocked) return
                      handleRagSearch()
                    }}
                  />
                  <Button
                    size="small"
                    onClick={handleRagSearch}
                    disabled={ragLoading || isRagSearchBlocked}
                  >
                    {t("knowledge:ragWorkspace.searchButton", {
                      defaultValue: "Search"
                    })}
                  </Button>
                </div>
                {!isRagSearchBlocked && (
                  <div className="mt-2 space-y-2 rounded-md bg-gray-50 p-2 text-[11px] text-gray-700 dark:bg-[#111111] dark:text-gray-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium">
                          {t("knowledge:ragWorkspace.optionsLabel", {
                            defaultValue: "RAG options"
                          })}
                        </span>
                      </div>
                      <Button
                        size="small"
                        type="default"
                        onClick={() => {
                          setRagSearchMode("hybrid")
                          setRagTopK(null)
                          setRagEnableGeneration(false)
                          setRagEnableCitations(false)
                          setRagSources([])
                        }}
                      >
                        {t("knowledge:ragWorkspace.resetOptions", {
                          defaultValue: "Reset to defaults"
                        })}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {t("knowledge:ragWorkspace.searchModeLabel", {
                          defaultValue: "Search mode"
                          })}
                        </span>
                        <Select
                          size="small"
                          value={ragSearchMode}
                          onChange={(val) =>
                            setRagSearchMode(val as "hybrid" | "vector" | "fts")
                          }
                          style={{ minWidth: 120 }}
                          options={[
                            {
                              value: "hybrid",
                              label: t(
                                "knowledge:ragWorkspace.searchModeHybrid",
                                { defaultValue: "Hybrid" }
                              )
                            },
                            {
                              value: "vector",
                              label: t(
                                "knowledge:ragWorkspace.searchModeVector",
                                { defaultValue: "Vector" }
                              )
                            },
                            {
                              value: "fts",
                              label: t(
                                "knowledge:ragWorkspace.searchModeFts",
                                { defaultValue: "Full-text" }
                              )
                            }
                          ]}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          {t("knowledge:ragWorkspace.topKLabel", {
                            defaultValue: "Top-k"
                          })}
                        </span>
                        <Input
                          size="small"
                          type="number"
                          className="w-20"
                          min={1}
                          max={50}
                          value={
                            typeof ragTopK === "number" && ragTopK > 0
                              ? String(ragTopK)
                              : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value
                            if (!v) {
                              setRagTopK(null)
                              return
                            }
                            const n = Number(v)
                            if (Number.isNaN(n)) return
                            setRagTopK(n)
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <Checkbox
                        checked={ragEnableGeneration}
                        onChange={(e) =>
                          setRagEnableGeneration(e.target.checked)
                        }
                      >
                        {t("knowledge:ragWorkspace.enableGeneration", {
                          defaultValue: "Enable answer generation"
                        })}
                      </Checkbox>
                      <Checkbox
                        checked={ragEnableCitations}
                        onChange={(e) =>
                          setRagEnableCitations(e.target.checked)
                        }
                      >
                        {t("knowledge:ragWorkspace.enableCitations", {
                          defaultValue: "Enable citations"
                        })}
                      </Checkbox>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {t("knowledge:ragWorkspace.sourcesLabel", {
                          defaultValue: "Sources"
                        })}
                      </span>
                      <Checkbox.Group
                        options={[
                          {
                            label: t(
                              "knowledge:ragWorkspace.sourceMedia",
                              { defaultValue: "Media" }
                            ),
                            value: "media_db"
                          },
                          {
                            label: t(
                              "knowledge:ragWorkspace.sourceNotes",
                              { defaultValue: "Notes" }
                            ),
                            value: "notes"
                          },
                          {
                            label: t(
                              "knowledge:ragWorkspace.sourceCharacters",
                              { defaultValue: "Characters" }
                            ),
                            value: "characters"
                          },
                          {
                            label: t(
                              "knowledge:ragWorkspace.sourceChats",
                              { defaultValue: "Chats" }
                            ),
                            value: "chats"
                          }
                        ]}
                        value={ragSources}
                        onChange={(vals) =>
                          setRagSources(vals as string[])
                        }
                      />
                    </div>
                    <Collapse
                      size="small"
                      className="mt-3 bg-transparent"
                      items={[
                        {
                          key: "advanced-flags",
                          label: t("knowledge:ragWorkspace.advancedFlagsLabel", {
                            defaultValue: "Advanced options"
                          }),
                          children: (
                            <div className="space-y-2 text-[11px]">
                              <div className="text-gray-500 dark:text-gray-400">
                                {t("knowledge:ragWorkspace.advancedFlagsHelp", {
                                  defaultValue:
                                    "Tweak common UnifiedRAGRequest flags without editing JSON."
                                })}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span>
                                  {t("knowledge:ragWorkspace.strategyLabel", {
                                    defaultValue: "Strategy"
                                  })}
                                </span>
                                <Select
                                  size="small"
                                  allowClear
                                  value={strategy || undefined}
                                  onChange={(val) => setStrategy(val || null)}
                                  style={{ minWidth: 140 }}
                                  placeholder={t("knowledge:ragWorkspace.strategyPlaceholder", {
                                    defaultValue: "Server default"
                                  }) as string}
                                  options={[
                                    {
                                      value: "standard",
                                      label: t("knowledge:ragWorkspace.strategyStandard", {
                                        defaultValue: "Standard"
                                      })
                                    },
                                    {
                                      value: "agentic",
                                      label: t("knowledge:ragWorkspace.strategyAgentic", {
                                        defaultValue: "Agentic"
                                      })
                                    }
                                  ]}
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <Checkbox
                                  checked={enableReranking === true}
                                  indeterminate={enableReranking === null}
                                  onChange={(e) =>
                                    setEnableReranking(
                                      e.target.checked ? true : null
                                    )
                                  }
                                >
                                  {t("knowledge:ragWorkspace.enableReranking", {
                                    defaultValue: "Enable reranking"
                                  })}
                                </Checkbox>
                                <Checkbox
                                  checked={enableCache === true}
                                  indeterminate={enableCache === null}
                                  onChange={(e) =>
                                    setEnableCache(e.target.checked ? true : null)
                                  }
                                >
                                  {t("knowledge:ragWorkspace.enableCache", {
                                    defaultValue: "Enable cache"
                                  })}
                                </Checkbox>
                              </div>
                            </div>
                          )
                        }
                      ]}
                    />
                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200">
                        {t("knowledge:ragWorkspace.advancedLabel", {
                          defaultValue: "Advanced RAG options (JSON)"
                        })}
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {t("knowledge:ragWorkspace.advancedHelp", {
                          defaultValue:
                            "Optional: paste a JSON object with any UnifiedRAGRequest fields (e.g., strategy, enable_reranking). Leave blank to use defaults."
                        })}
                      </p>
                      <Input.TextArea
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        value={advancedOverridesText}
                        onChange={(e) => setAdvancedOverridesText(e.target.value)}
                        placeholder={t("knowledge:ragWorkspace.advancedPlaceholder", {
                          defaultValue: '{ "strategy": "agentic", "enable_reranking": true }'
                        }) as string}
                      />
                      <div className="mt-1 flex justify-end gap-2">
                        <Button
                          size="small"
                          onClick={() => {
                            const raw = advancedOverridesText.trim()
                            if (!raw) {
                              setAdvancedOverrides({})
                              setAdvancedOverridesText("")
                              message.success(
                                t("knowledge:ragWorkspace.advancedCleared", {
                                  defaultValue: "Advanced RAG options cleared."
                                })
                              )
                              return
                            }
                            try {
                              const parsed = JSON.parse(raw)
                              if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                                throw new Error("Expected a JSON object")
                              }
                              setAdvancedOverrides(parsed)
                              message.success(
                                t("knowledge:ragWorkspace.advancedApplied", {
                                  defaultValue: "Advanced RAG options applied."
                                })
                              )
                            } catch (e: any) {
                              message.error(
                                t("knowledge:ragWorkspace.advancedInvalid", {
                                  defaultValue: "Invalid JSON for advanced RAG options."
                                })
                              )
                            }
                          }}
                        >
                          {t("knowledge:ragWorkspace.advancedApply", {
                            defaultValue: "Apply overrides"
                          })}
                        </Button>
                        <Button
                          size="small"
                          type="default"
                          onClick={() => {
                            setAdvancedOverrides({})
                            setAdvancedOverridesText("")
                          }}
                        >
                          {t("knowledge:ragWorkspace.advancedReset", {
                            defaultValue: "Clear"
                          })}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {t("knowledge:ragWorkspace.searchActiveHelp", {
                    defaultValue:
                      "Search runs against your configured RAG sources. Use Chat for multi-source RAG across media, notes, and more."
                  })}
                </p>
                <div className="mt-2 min-h-[4rem]">
                  {ragLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Spin size="small" />
                    </div>
                  ) : ragError ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100">
                      <div className="font-medium">
                        {t("knowledge:ragWorkspace.searchErrorTitle", {
                          defaultValue: "RAG search failed"
                        })}
                      </div>
                      <p className="mt-1">{ragError}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="small"
                          type="default"
                          onClick={() => navigate("/settings/health")}
                        >
                          {t("settings:healthSummary.diagnostics", {
                            defaultValue: "Open Diagnostics"
                          })}
                        </Button>
                      </div>
                    </div>
                  ) : !ragAnswer && ragResults.length === 0 ? (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t("knowledge:ragWorkspace.noResults", {
                        defaultValue:
                          "No RAG results yet. Enter a query to search your corpus."
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ragAnswer && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-900 dark:border-blue-700 dark:bg-[#102a43] dark:text-blue-50">
                          <div className="font-semibold">
                            {t("knowledge:ragWorkspace.answerTitle", {
                              defaultValue: "RAG answer"
                            })}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap">
                            {ragAnswer}
                          </p>
                          {ragEnableCitations &&
                            Array.isArray(ragCitations) &&
                            ragCitations.length > 0 && (
                              <div className="mt-2">
                                <div className="font-medium">
                                  {t("knowledge:ragWorkspace.citationsTitle", {
                                    defaultValue: "Citations"
                                  })}
                                </div>
                                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                                  {ragCitations.slice(0, 6).map((c, idx) => {
                                    const meta = (c && (c.metadata || c)) || {}
                                    const title =
                                      meta.title ||
                                      meta.source ||
                                      meta.url ||
                                      meta.id ||
                                      t("knowledge:ragWorkspace.untitled", {
                                        defaultValue: "Untitled snippet"
                                      })
                                    const url = meta.url || ""
                                    return (
                                      <li key={idx}>
                                        {url ? (
                                          <button
                                            type="button"
                                            className="underline"
                                            onClick={() =>
                                              window.open(String(url), "_blank")
                                            }
                                          >
                                            {String(title)}
                                          </button>
                                        ) : (
                                          <span>{String(title)}</span>
                                        )}
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                      {ragResults.length > 0 && (
                        <List
                          size="small"
                          dataSource={ragResults}
                          renderItem={(item: any) => {
                            const content =
                              item?.content || item?.text || item?.chunk || ""
                            const meta = item?.metadata || {}
                            const title =
                              meta?.title ||
                              meta?.source ||
                              meta?.url ||
                              t("knowledge:ragWorkspace.untitled", {
                                defaultValue: "Untitled snippet"
                              })
                            const url = meta?.url || meta?.source || ""
                            const snippet = String(content || "").slice(0, 260)
                            const insertText = `${snippet}${
                              url ? `\n\nSource: ${url}` : ""
                            }`
                            return (
                              <List.Item
                                actions={[
                                  <Button
                                    key="copy"
                                    type="link"
                                    size="small"
                                    onClick={() =>
                                      navigator.clipboard.writeText(insertText)
                                    }
                                  >
                                    {t("knowledge:ragWorkspace.copySnippet", {
                                      defaultValue: "Copy snippet"
                                    })}
                                  </Button>,
                                  url ? (
                                    <Button
                                      key="open"
                                      type="link"
                                      size="small"
                                      onClick={() =>
                                        window.open(String(url), "_blank")
                                      }
                                    >
                                      {t("knowledge:ragWorkspace.openSource", {
                                        defaultValue: "Open source"
                                      })}
                                    </Button>
                                  ) : null
                                ].filter(Boolean as any)}
                              >
                                <List.Item.Meta
                                  title={
                                    <span className="text-xs font-medium">
                                      {title}
                                    </span>
                                  }
                                  description={
                                    <div className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-3">
                                      {snippet}
                                    </div>
                                  }
                                />
                              </List.Item>
                            )
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: helper panel nudging into Chat with these RAG settings */}
            <div className="flex h-full flex-col rounded-md border border-gray-200 bg-white text-xs dark:border-gray-700 dark:bg-[#111111]">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {t("knowledge:ragWorkspace.chatTitle", {
                    defaultValue: "Knowledge QA chat"
                  })}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {autoRagOn
                    ? t("knowledge:ragWorkspace.chatModeRagOn", {
                        defaultValue: "Chat is using RAG for replies."
                      })
                    : t("knowledge:ragWorkspace.chatModeRagOff", {
                        defaultValue:
                          "Toggle “Use RAG for every reply” to ground answers."
                      })}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="flex h-full flex-col items-center justify-center px-3 py-4 text-[11px] text-gray-500 dark:text-gray-300">
                  <p className="text-center">
                    {t("knowledge:ragWorkspace.chatHint", {
                      defaultValue:
                        "Open the main Chat tab to see full conversation history with these RAG settings applied."
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        if (!autoRagOn) {
                          setChatMode("rag")
                        }
                        navigate("/")
                        setTimeout(() => {
                          try {
                            window.dispatchEvent(
                              new CustomEvent("tldw:focus-composer")
                            )
                          } catch {
                            // ignore
                          }
                        }, 0)
                      }}
                    >
                      {t("knowledge:ragWorkspace.chatOpenPlayground", {
                        defaultValue: "Open Chat with these RAG settings"
                      })}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
