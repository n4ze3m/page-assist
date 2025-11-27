import React from "react"
import { Typography, Card, List, Tag, Space, Alert, Button, Input, Select, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { tldwClient, type MlxStatus, type MlxLoadRequest } from "@/services/tldw/TldwApiClient"
import { PageShell } from "@/components/Common/PageShell"

const { Title, Text } = Typography

type ProviderConfig = {
  name?: string
  models_info?: Array<Record<string, any>>
  [key: string]: any
}

export const MlxAdminPage: React.FC = () => {
  const { t } = useTranslation(["option", "settings"])
  const [mlxProvider, setMlxProvider] = React.useState<ProviderConfig | null>(
    null
  )
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<MlxStatus | null>(null)
  const [statusLoading, setStatusLoading] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [modelPath, setModelPath] = React.useState<string>("")
  const [device, setDevice] = React.useState<string | undefined>()
  const [compileFlag, setCompileFlag] = React.useState<boolean>(true)
  const [warmupFlag, setWarmupFlag] = React.useState<boolean>(true)
  const [maxConcurrent, setMaxConcurrent] = React.useState<string>("")

  const [adminGuard, setAdminGuard] = React.useState<"forbidden" | "notFound" | null>(null)

  const markAdminGuardFromError = (err: any) => {
    const msg = String(err?.message || "")
    if (msg.includes("Request failed: 403")) {
      setAdminGuard("forbidden")
    } else if (msg.includes("Request failed: 404")) {
      setAdminGuard("notFound")
    }
  }

  const loadStatus = React.useCallback(async () => {
    try {
      setStatusLoading(true)
      const data = await tldwClient.getMlxStatus()
      setStatus(data)
      setError(null)
      if (data?.model && !modelPath) {
        setModelPath(String(data.model))
      }
      if (data?.config) {
        setDevice(data.config.device || undefined)
        setCompileFlag(
          typeof data.config.compile === "boolean" ? data.config.compile : true
        )
        setWarmupFlag(
          typeof data.config.warmup === "boolean" ? data.config.warmup : true
        )
        if (typeof data.max_concurrent === "number") {
          setMaxConcurrent(String(data.max_concurrent))
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load MLX status.")
      markAdminGuardFromError(e)
    } finally {
      setStatusLoading(false)
    }
  }, [modelPath])

  const loadProviders = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await tldwClient.getLlmProviders()
      const providers: ProviderConfig[] = Array.isArray(data?.providers)
        ? (data.providers as ProviderConfig[])
        : []
      const match =
        providers.find(
          (p) =>
            p.name?.toLowerCase() === "mlx" ||
            p.name?.toLowerCase() === "mlx_lm"
        ) || null
      setMlxProvider(match)
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Failed to load LLM providers.")
      markAdminGuardFromError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLoadModel = async () => {
    const path = modelPath.trim()
    if (!path) {
      return
    }
    const payload: MlxLoadRequest = {
      model_path: path,
      device: device || undefined,
      compile: compileFlag,
      warmup: warmupFlag
    }
    const mc = parseInt(maxConcurrent, 10)
    if (!Number.isNaN(mc) && mc > 0) {
      payload.max_concurrent = mc
    }
    try {
      setActionLoading(true)
      const data = await tldwClient.loadMlxModel(payload)
      setStatus(data)
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Failed to load MLX model.")
      markAdminGuardFromError(e)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnloadModel = async () => {
    try {
      setActionLoading(true)
      await tldwClient.unloadMlxModel()
      await loadStatus()
    } catch (e: any) {
      setError(e?.message || "Failed to unload MLX model.")
      markAdminGuardFromError(e)
    } finally {
      setActionLoading(false)
    }
  }

  React.useEffect(() => {
    let cancelled = false
    const init = async () => {
      await Promise.all([loadStatus(), loadProviders()])
      if (cancelled) return
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [loadProviders, loadStatus])

  const models = (mlxProvider?.models_info || []) as Array<Record<string, any>>

  return (
    <PageShell>
      <Space direction="vertical" size="large" className="w-full py-6">
        {adminGuard && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message={
              adminGuard === "forbidden"
                ? t(
                    "settings:admin.adminGuardForbiddenTitle",
                    "Admin access required for these controls"
                  )
                : t(
                    "settings:admin.adminGuardNotFoundTitle",
                    "Admin APIs are not available on this server"
                  )
            }
            description={
              <span>
                {adminGuard === "forbidden"
                  ? t(
                      "settings:admin.adminGuardForbiddenBody",
                      "Sign in as an admin user on your tldw server to view and manage users, roles, and system statistics."
                    )
                  : t(
                      "settings:admin.adminGuardNotFoundBody",
                      "This tldw server does not expose the /admin endpoints, or they are disabled. Upgrade or reconfigure the server to enable these views."
                    )}{" "}
                <a
                  href="https://github.com/rmusser01/tldw_server#documentation--resources"
                  target="_blank"
                  rel="noreferrer">
                  {t(
                    "settings:admin.adminGuardLearnMore",
                    "Learn more in the tldw server documentation."
                  )}
                </a>
              </span>
            }
          />
        )}
        <div>
          <Title level={2}>{t("option:header.adminMlx", "MLX LM Admin")}</Title>
          <Text type="secondary">
            {t(
              "settings:admin.mlxIntro",
              "Inspect configured MLX language models on your tldw server."
            )}
          </Text>
        </div>

        {adminGuard && (
          <Text type="secondary">
            {t(
              "settings:admin.adminGuardLimitedInfo",
              "Admin-level details and controls are hidden until admin APIs are available."
            )}
          </Text>
        )}

        {!adminGuard && (
          <>
            <Card
              title={t("settings:admin.mlxStatusTitle", "MLX status")}
              loading={statusLoading}
              extra={
                <Button size="small" onClick={loadStatus} disabled={statusLoading}>
                  {t("common:refresh", "Refresh")}
                </Button>
              }>
              {error && (
                <Alert
                  type="error"
                  message={t(
                    "settings:admin.mlxError",
                    "Unable to load MLX provider information"
                  )}
                  description={error}
                  showIcon
                  className="mb-3"
                />
              )}
              {status ? (
                <Space direction="vertical" size="small" className="w-full">
                  <Space align="center" size="small">
                    <Text strong>{t("settings:admin.mlxActiveLabel", "Active")}:</Text>
                    <Tag color={status.active ? "green" : "default"}>
                      {status.active
                        ? t("settings:admin.mlxActive", "Active")
                        : t("settings:admin.mlxInactive", "Inactive")}
                    </Tag>
                  </Space>
                  <Space align="center" size="small">
                    <Text strong>{t("settings:admin.mlxCurrentModel", "Current model")}:</Text>
                    <Text code>{status.model || t("settings:admin.mlxNoActiveModel", "None")}</Text>
                  </Space>
                  <Space align="center" size="small">
                    <Text strong>
                      {t("settings:admin.mlxConcurrency", "Max concurrent requests")}:
                    </Text>
                    <Text>{status.max_concurrent}</Text>
                  </Space>
                  {status.config && (
                    <Space direction="vertical" size="small">
                      <Text strong>
                        {t("settings:admin.mlxConfigHeading", "Effective configuration")}
                      </Text>
                      <Text type="secondary">
                        {t(
                          "settings:admin.mlxConfigSummary",
                          "Device: {{device}} · dtype: {{dtype}} · compile: {{compile}} · warmup: {{warmup}}",
                          {
                            device: status.config.device || "auto",
                            dtype: status.config.dtype || "auto",
                            compile: String(
                              typeof status.config.compile === "boolean"
                                ? status.config.compile
                                : true
                            ),
                            warmup: String(
                              typeof status.config.warmup === "boolean"
                                ? status.config.warmup
                                : true
                            )
                          }
                        )}
                      </Text>
                    </Space>
                  )}
                </Space>
              ) : (
                <Text type="secondary">
                  {t(
                    "settings:admin.mlxStatusEmpty",
                    "No MLX model is currently loaded. Use the controls below to load one."
                  )}
                </Text>
              )}
            </Card>

            <Card
              title={t("settings:admin.mlxManageTitle", "Load / unload MLX model")}
              extra={
                status?.active ? (
                  <Tag color="green">
                    {t("settings:admin.mlxManageActiveHint", "A model is currently loaded")}
                  </Tag>
                ) : null
              }>
              <Space direction="vertical" size="small" className="w-full">
                <Space direction="vertical" size="small" className="w-full">
                  <Text strong>
                    {t("settings:admin.mlxModelPathLabel", "Model path or repo id")}
                  </Text>
                  <Input
                    size="small"
                    value={modelPath}
                    onChange={(e) => setModelPath(e.target.value)}
                    placeholder={t(
                      "settings:admin.mlxModelPathPlaceholder",
                      "E.g. mlx-community/Meta-Llama-3.1-8B-Instruct-4bit"
                    )}
                  />
                </Space>

                <Space wrap>
                  <Space direction="vertical" size="small">
                    <Text strong>{t("settings:admin.mlxDeviceLabel", "Device")}</Text>
                    <Select
                      size="small"
                      value={device || "auto"}
                      style={{ minWidth: 140 }}
                      onChange={(val) => setDevice(val === "auto" ? undefined : val)}
                      options={[
                        { label: "auto", value: "auto" },
                        { label: "mps", value: "mps" },
                        { label: "cpu", value: "cpu" }
                      ]}
                    />
                  </Space>
                  <Space direction="vertical" size="small">
                    <Text strong>
                      {t("settings:admin.mlxCompileLabel", "Compile at load")}
                    </Text>
                    <Switch
                      size="small"
                      checked={compileFlag}
                      onChange={(val) => setCompileFlag(val)}
                    />
                  </Space>
                  <Space direction="vertical" size="small">
                    <Text strong>
                      {t("settings:admin.mlxWarmupLabel", "Warmup after load")}
                    </Text>
                    <Switch
                      size="small"
                      checked={warmupFlag}
                      onChange={(val) => setWarmupFlag(val)}
                    />
                  </Space>
                  <Space direction="vertical" size="small">
                    <Text strong>
                      {t("settings:admin.mlxMaxConcurrentLabel", "Max concurrent")}
                    </Text>
                    <Input
                      size="small"
                      style={{ width: 80 }}
                      value={maxConcurrent}
                      onChange={(e) => setMaxConcurrent(e.target.value)}
                      placeholder="1"
                    />
                  </Space>
                </Space>

                <Space className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleLoadModel}
                    loading={actionLoading}>
                    {t("settings:admin.mlxLoadCta", "Load model")}
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={handleUnloadModel}
                    loading={actionLoading}
                    disabled={!status?.active}>
                    {t("settings:admin.mlxUnloadCta", "Unload model")}
                  </Button>
                </Space>
              </Space>
            </Card>

            <Card
              title={t("settings:admin.mlxProviderTitle", "MLX provider")}
              loading={loading}
              extra={
                <Button size="small" onClick={loadProviders} disabled={loading}>
                  {t("common:refresh", "Refresh")}
                </Button>
              }>
              {error && (
                <Alert
                  type="error"
                  message={t(
                    "settings:admin.mlxError",
                    "Unable to load MLX provider information"
                  )}
                  description={error}
                  showIcon
                  className="mb-3"
                />
              )}

              {mlxProvider ? (
                <Space direction="vertical" size="small" className="w-full">
                  <Space align="center" size="small">
                    <Text strong>
                      {t("settings:admin.mlxProviderName", "Provider")}:
                    </Text>
                    <Tag color="blue">{mlxProvider.name || "mlx"}</Tag>
                  </Space>

                  {models.length > 0 ? (
                    <List
                      size="small"
                      bordered
                      dataSource={models}
                      renderItem={(m) => {
                        const id =
                          (m as any).id ||
                          (m as any).name ||
                          (m as any).model_id
                        const notes = (m as any).notes as string | undefined
                        const capabilities = (m as any).capabilities as
                          | Record<string, boolean>
                          | undefined
                        return (
                          <List.Item>
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Text code>{id || "model"}</Text>
                                {capabilities?.vision && (
                                  <Tag color="purple">
                                    {t("settings:admin.mlxVision", "Vision")}
                                  </Tag>
                                )}
                                {capabilities?.tool_use && (
                                  <Tag color="geekblue">
                                    {t("settings:admin.mlxTools", "Tools")}
                                  </Tag>
                                )}
                                {capabilities?.audio_input && (
                                  <Tag color="volcano">
                                    {t("settings:admin.mlxAudio", "Audio")}
                                  </Tag>
                                )}
                              </div>
                              {notes && (
                                <Text type="secondary" className="text-xs">
                                  {notes}
                                </Text>
                              )}
                            </div>
                          </List.Item>
                        )
                      }}
                    />
                  ) : (
                    <Text type="secondary">
                      {t(
                        "settings:admin.mlxNoModels",
                        "No MLX models are configured. Enable provider=mlx on the server to see models here."
                      )}
                    </Text>
                  )}
                </Space>
              ) : !loading ? (
                <Text type="secondary">
                  {t(
                    "settings:admin.mlxProviderMissing",
                    "MLX is not currently configured as an LLM provider on this server."
                  )}
                </Text>
              ) : null}
            </Card>
          </>
        )}
      </Space>
    </PageShell>
  )
}

export default MlxAdminPage
