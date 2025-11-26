import React from "react"
import { Typography, Card, List, Tag, Space, Alert, Button } from "antd"
import { useTranslation } from "react-i18next"
import { tldwClient } from "@/services/tldw/TldwApiClient"
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
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const init = async () => {
      await loadProviders()
      if (cancelled) return
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [loadProviders])

  const models = (mlxProvider?.models_info || []) as Array<Record<string, any>>

  return (
    <PageShell>
      <Space direction="vertical" size="large" className="w-full py-6">
        <div>
          <Title level={2}>{t("option:header.adminMlx", "MLX LM Admin")}</Title>
          <Text type="secondary">
            {t(
              "settings:admin.mlxIntro",
              "Inspect configured MLX language models on your tldw server."
            )}
          </Text>
        </div>

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
              message={t("settings:admin.mlxError", "Unable to load MLX provider information")}
              description={error}
              showIcon
              className="mb-3"
            />
          )}

          {mlxProvider ? (
            <Space direction="vertical" size="small" className="w-full">
              <Space align="center" size="small">
                <Text strong>{t("settings:admin.mlxProviderName", "Provider")}:</Text>
                <Tag color="blue">{mlxProvider.name || "mlx"}</Tag>
              </Space>

              {models.length > 0 ? (
                <List
                  size="small"
                  bordered
                  dataSource={models}
                  renderItem={(m) => {
                    const id =
                      (m as any).id || (m as any).name || (m as any).model_id
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
      </Space>
    </PageShell>
  )
}

export default MlxAdminPage

