import React from "react"
import { Typography, Card, Descriptions, Button, Space, Alert } from "antd"
import { useTranslation } from "react-i18next"
import { tldwClient, type TldwConfig } from "@/services/tldw/TldwApiClient"
import { PageShell } from "@/components/Common/PageShell"

const { Title, Text } = Typography

export const ServerAdminPage: React.FC = () => {
  const { t } = useTranslation(["option", "settings"])
  const [config, setConfig] = React.useState<TldwConfig | null>(null)
  const [stats, setStats] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const cfg = await tldwClient.getConfig()
        if (!cancelled) {
          setConfig(cfg)
        }
      } catch {
        // ignore; health checks will surface errors
      }
      try {
        setLoading(true)
        const data = await tldwClient.getSystemStats()
        if (!cancelled) {
          setStats(data)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load system statistics.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleRefresh = async () => {
    try {
      setLoading(true)
      const data = await tldwClient.getSystemStats()
      setStats(data)
      setError(null)
    } catch (e: any) {
      setError(e?.message || "Failed to load system statistics.")
    } finally {
      setLoading(false)
    }
  }

  const users = stats?.users || {}
  const storage = stats?.storage || {}
  const sessions = stats?.sessions || {}

  return (
    <PageShell>
      <Space direction="vertical" size="large" className="w-full py-6">
        <div>
          <Title level={2}>{t("option:header.adminServer", "Server Admin")}</Title>
          <Text type="secondary">
            {t(
              "settings:admin.serverIntro",
              "Monitor core stats and configuration for your connected tldw server."
            )}
          </Text>
        </div>

        {config && (
          <Card title={t("settings:admin.connectionCardTitle", "Connection")} size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t("settings:admin.serverUrl", "Server URL")}>
                {config.serverUrl || "–"}
              </Descriptions.Item>
              <Descriptions.Item label={t("settings:admin.authMode", "Auth mode")}>
                {config.authMode || "single-user"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Card
          title={t("settings:admin.systemStatsTitle", "System statistics")}
          loading={loading}
          extra={
            <Button size="small" onClick={handleRefresh} disabled={loading}>
              {t("common:refresh", "Refresh")}
            </Button>
          }>
          {error && (
            <Alert
              type="error"
              message={t("settings:admin.systemStatsError", "Unable to load system statistics")}
              description={error}
              showIcon
              className="mb-3"
            />
          )}
          {stats ? (
            <Space direction="vertical" size="large" className="w-full">
              <Descriptions title={t("settings:admin.userStats", "Users")} column={3} size="small">
                <Descriptions.Item label={t("settings:admin.users.total", "Total")}>
                  {users.total ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.users.active", "Active")}>
                  {users.active ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.users.admins", "Admins")}>
                  {users.admins ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.users.verified", "Verified")}>
                  {users.verified ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.users.new30d", "New (30d)")}>
                  {users.new_last_30d ?? "–"}
                </Descriptions.Item>
              </Descriptions>

              <Descriptions title={t("settings:admin.storageStats", "Storage")} column={3} size="small">
                <Descriptions.Item label={t("settings:admin.storage.totalUsed", "Total used (MB)")}>
                  {storage.total_used_mb ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.storage.totalQuota", "Total quota (MB)")}>
                  {storage.total_quota_mb ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.storage.averageUsed", "Average used (MB)")}>
                  {storage.average_used_mb ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.storage.maxUsed", "Max used (MB)")}>
                  {storage.max_used_mb ?? "–"}
                </Descriptions.Item>
              </Descriptions>

              <Descriptions title={t("settings:admin.sessionStats", "Sessions")} column={2} size="small">
                <Descriptions.Item label={t("settings:admin.sessions.active", "Active sessions")}>
                  {sessions.active ?? "–"}
                </Descriptions.Item>
                <Descriptions.Item label={t("settings:admin.sessions.uniqueUsers", "Unique users")}>
                  {sessions.unique_users ?? "–"}
                </Descriptions.Item>
              </Descriptions>
            </Space>
          ) : !loading && !error ? (
            <Text type="secondary">
              {t("settings:admin.systemStatsEmpty", "No system statistics available yet.")}
            </Text>
          ) : null}
        </Card>
      </Space>
    </PageShell>
  )
}

export default ServerAdminPage

