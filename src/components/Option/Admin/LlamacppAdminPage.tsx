import React from "react"
import { Typography, Card, Button, List, Tag, Space, Alert, Select } from "antd"
import { useTranslation } from "react-i18next"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { PageShell } from "@/components/Common/PageShell"

const { Title, Text } = Typography

type LlamacppStatus = {
  backend?: string
  model?: string
  state?: string
  port?: number
  [key: string]: any
}

export const LlamacppAdminPage: React.FC = () => {
  const { t } = useTranslation(["option", "settings"])
  const [status, setStatus] = React.useState<LlamacppStatus | null>(null)
  const [models, setModels] = React.useState<string[]>([])
  const [selectedModel, setSelectedModel] = React.useState<string | undefined>()
  const [loadingStatus, setLoadingStatus] = React.useState(false)
  const [loadingModels, setLoadingModels] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadStatus = React.useCallback(async () => {
    try {
      setLoadingStatus(true)
      const data = await tldwClient.getLlamacppStatus()
      setStatus(data as LlamacppStatus)
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Failed to load Llama.cpp status.")
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  const loadModels = React.useCallback(async () => {
    try {
      setLoadingModels(true)
      const res = await tldwClient.listLlamacppModels()
      const list = Array.isArray(res?.available_models)
        ? (res.available_models as string[])
        : []
      setModels(list)
      if (!selectedModel && list.length > 0) {
        setSelectedModel(list[0])
      }
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Failed to list Llama.cpp models.")
    } finally {
      setLoadingModels(false)
    }
  }, [selectedModel])

  React.useEffect(() => {
    let cancelled = false
    const init = async () => {
      await Promise.all([loadStatus(), loadModels()])
      if (cancelled) return
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [loadModels, loadStatus])

  const handleStart = async () => {
    if (!selectedModel) return
    try {
      setActionLoading(true)
      await tldwClient.startLlamacppServer(selectedModel)
      await loadStatus()
    } catch (e: any) {
      setError(e?.message || "Failed to start Llama.cpp server.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    try {
      setActionLoading(true)
      await tldwClient.stopLlamacppServer()
      await loadStatus()
    } catch (e: any) {
      setError(e?.message || "Failed to stop Llama.cpp server.")
    } finally {
      setActionLoading(false)
    }
  }

  const effectiveState =
    status?.state || status?.status || status?.backend || "unknown"
  const stateColor =
    effectiveState === "running" || effectiveState === "online"
      ? "green"
      : effectiveState === "stopped" || effectiveState === "offline"
        ? "red"
        : "default"

  return (
    <PageShell>
      <Space direction="vertical" size="large" className="w-full py-6">
        <div>
          <Title level={2}>{t("option:header.adminLlamacpp", "Llama.cpp Admin")}</Title>
          <Text type="secondary">
            {t(
              "settings:admin.llamacppIntro",
              "Manage the built-in Llama.cpp backend: start/stop the server and inspect available models."
            )}
          </Text>
        </div>

        <Card
          title={t("settings:admin.llamacppStatusTitle", "Llama.cpp status")}
          loading={loadingStatus}
          extra={
            <Button size="small" onClick={loadStatus} disabled={loadingStatus || actionLoading}>
              {t("common:refresh", "Refresh")}
            </Button>
          }>
          {error && (
            <Alert
              type="error"
              message={t("settings:admin.llamacppStatusError", "Unable to load Llama.cpp status")}
              description={error}
              showIcon
              className="mb-3"
            />
          )}
          {status ? (
            <Space direction="vertical" size="small">
              <Space align="center" size="small">
                <Text strong>{t("settings:admin.llamacppState", "State")}:</Text>
                <Tag color={stateColor}>{String(effectiveState)}</Tag>
              </Space>
              {status.model && (
                <Space align="center" size="small">
                  <Text strong>{t("settings:admin.llamacppActiveModel", "Active model")}:</Text>
                  <Text code>{status.model}</Text>
                </Space>
              )}
              {status.port && (
                <Space align="center" size="small">
                  <Text strong>{t("settings:admin.llamacppPort", "Port")}:</Text>
                  <Text code>{String(status.port)}</Text>
                </Space>
              )}
            </Space>
          ) : !loadingStatus ? (
            <Text type="secondary">
              {t(
                "settings:admin.llamacppStatusEmpty",
                "No status information available yet. Try refreshing or starting the server."
              )}
            </Text>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="primary"
              onClick={handleStart}
              loading={actionLoading}
              disabled={!selectedModel}>
              {t("settings:admin.llamacppStart", "Start with selected model")}
            </Button>
            <Button onClick={handleStop} loading={actionLoading}>
              {t("settings:admin.llamacppStop", "Stop server")}
            </Button>
          </div>
        </Card>

        <Card
          title={t("settings:admin.llamacppModelsTitle", "Available Llama.cpp models")}
          loading={loadingModels}
          extra={
            <Button size="small" onClick={loadModels} disabled={loadingModels || actionLoading}>
              {t("common:refresh", "Refresh")}
            </Button>
          }>
          {models.length > 0 ? (
            <Space direction="vertical" size="small" className="w-full">
              <Space align="center" className="w-full">
                <Text strong>{t("settings:admin.llamacppSelectModel", "Select model")}:</Text>
                <Select
                  size="small"
                  value={selectedModel}
                  onChange={(v) => setSelectedModel(v)}
                  options={models.map((m) => ({ label: m, value: m }))}
                  style={{ minWidth: 260 }}
                />
              </Space>
              <List
                size="small"
                bordered
                dataSource={models}
                renderItem={(m) => (
                  <List.Item>
                    <Text code>{m}</Text>
                  </List.Item>
                )}
              />
            </Space>
          ) : !loadingModels ? (
            <Text type="secondary">
              {t(
                "settings:admin.llamacppModelsEmpty",
                "No local GGUF models detected. Configure your Llama.cpp models directory on the server to see them here."
              )}
            </Text>
          ) : null}
        </Card>
      </Space>
    </PageShell>
  )
}

export default LlamacppAdminPage
