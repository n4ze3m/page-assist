import React from "react"
import {
  Typography,
  Card,
  Descriptions,
  Button,
  Space,
  Alert,
  Table,
  Tag,
  Select,
  Switch,
  Divider,
  Input,
  Popconfirm,
  Form
} from "antd"
import { useTranslation } from "react-i18next"
import {
  tldwClient,
  type TldwConfig,
  type AdminUserListResponse,
  type AdminUserSummary,
  type AdminRole
} from "@/services/tldw/TldwApiClient"
import { PageShell } from "@/components/Common/PageShell"

const { Title, Text } = Typography

export const ServerAdminPage: React.FC = () => {
  const { t } = useTranslation(["option", "settings"])
  const [config, setConfig] = React.useState<TldwConfig | null>(null)
  const [stats, setStats] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [adminGuard, setAdminGuard] = React.useState<"forbidden" | "notFound" | null>(null)
  const [usersData, setUsersData] = React.useState<AdminUserListResponse | null>(null)
  const [usersLoading, setUsersLoading] = React.useState(false)
  const [usersError, setUsersError] = React.useState<string | null>(null)
  const [roles, setRoles] = React.useState<AdminRole[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)
  const [rolesError, setRolesError] = React.useState<string | null>(null)
  const [userRoleFilter, setUserRoleFilter] = React.useState<string | undefined>(undefined)
  const [userActiveFilter, setUserActiveFilter] = React.useState<string | undefined>(undefined)
  const [usersPage, setUsersPage] = React.useState(1)
  const [usersPageSize, setUsersPageSize] = React.useState(20)
  const [updatingUserId, setUpdatingUserId] = React.useState<number | null>(null)
  const [creatingRole, setCreatingRole] = React.useState(false)
  const [deletingRoleId, setDeletingRoleId] = React.useState<number | null>(null)
  const [roleForm] = Form.useForm()

  const markAdminGuardFromError = (err: any) => {
    const msg = String(err?.message || "")
    if (msg.includes("Request failed: 403")) {
      setAdminGuard("forbidden")
    } else if (msg.includes("Request failed: 404")) {
      setAdminGuard("notFound")
    }
  }

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
          markAdminGuardFromError(e)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }

      // Initial users + roles
      void loadUsers(1, usersPageSize, userRoleFilter, userActiveFilter)
      void loadRoles()
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUsers = React.useCallback(
    async (
      page: number,
      limit: number,
      role?: string,
      activeFilter?: string
    ) => {
      try {
        setUsersLoading(true)
        const is_active =
          activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
        const data = await tldwClient.listAdminUsers({
          page,
          limit,
          role,
          is_active
        })
        setUsersData(data)
        setUsersError(null)
      } catch (e: any) {
        setUsersError(e?.message || "Failed to load users.")
        markAdminGuardFromError(e)
      } finally {
        setUsersLoading(false)
      }
    },
    []
  )

  const loadRoles = React.useCallback(async () => {
    try {
      setRolesLoading(true)
      const data = await tldwClient.listAdminRoles()
      setRoles(data || [])
      setRolesError(null)
    } catch (e: any) {
      setRolesError(e?.message || "Failed to load roles.")
      markAdminGuardFromError(e)
    } finally {
      setRolesLoading(false)
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
      markAdminGuardFromError(e)
    } finally {
      setLoading(false)
    }
  }

  const users = stats?.users || {}
  const storage = stats?.storage || {}
  const sessions = stats?.sessions || {}

  const handleUserTableChange = (pagination: any) => {
    const page = pagination.current || 1
    const pageSize = pagination.pageSize || usersPageSize
    setUsersPage(page)
    setUsersPageSize(pageSize)
    void loadUsers(page, pageSize, userRoleFilter, userActiveFilter)
  }

  const handleUserFilterChange = (nextRole?: string, nextActive?: string) => {
    const role = typeof nextRole === "string" && nextRole.length > 0 ? nextRole : undefined
    const active = typeof nextActive === "string" && nextActive.length > 0 ? nextActive : undefined
    setUserRoleFilter(role)
    setUserActiveFilter(active)
    setUsersPage(1)
    void loadUsers(1, usersPageSize, role, active)
  }

  const handleToggleUserActive = async (user: AdminUserSummary, nextActive: boolean) => {
    try {
      setUpdatingUserId(user.id)
      await tldwClient.updateAdminUser(user.id, { is_active: nextActive })
      await loadUsers(usersPage, usersPageSize, userRoleFilter, userActiveFilter)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to update user active state", e)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleChangeUserRole = async (user: AdminUserSummary, role: string) => {
    try {
      setUpdatingUserId(user.id)
      await tldwClient.updateAdminUser(user.id, { role })
      await loadUsers(usersPage, usersPageSize, userRoleFilter, userActiveFilter)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to update user role", e)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleCreateRole = async () => {
    try {
      const values = await roleForm.validateFields()
      const name = String(values.name || "").trim()
      const description = values.description ? String(values.description).trim() : undefined
      if (!name) return
      setCreatingRole(true)
      await tldwClient.createAdminRole(name, description)
      roleForm.resetFields()
      await loadRoles()
    } catch (e) {
      // validation or request error; log-only
      // eslint-disable-next-line no-console
      if (e) console.error("Failed to create role", e)
    } finally {
      setCreatingRole(false)
    }
  }

  const handleDeleteRole = async (roleId: number) => {
    try {
      setDeletingRoleId(roleId)
      await tldwClient.deleteAdminRole(roleId)
      await loadRoles()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete role", e)
    } finally {
      setDeletingRoleId(null)
    }
  }

  const userRoleOptions =
    roles && roles.length > 0
      ? roles.map((r) => ({ label: r.name, value: r.name }))
      : [
          { label: "user", value: "user" },
          { label: "admin", value: "admin" },
          { label: "service", value: "service" }
        ]

  const userColumns = [
    {
      title: t("settings:admin.users.username", "Username"),
      dataIndex: "username",
      key: "username"
    },
    {
      title: t("settings:admin.users.email", "Email"),
      dataIndex: "email",
      key: "email"
    },
    {
      title: t("settings:admin.users.role", "Role"),
      dataIndex: "role",
      key: "role",
      render: (role: string, record: AdminUserSummary) => (
        <Select
          size="small"
          value={role}
          style={{ minWidth: 120 }}
          onChange={(value) => handleChangeUserRole(record, value)}
          loading={updatingUserId === record.id}
          options={userRoleOptions}
        />
      )
    },
    {
      title: t("settings:admin.users.active", "Active"),
      dataIndex: "is_active",
      key: "is_active",
      render: (value: boolean, record: AdminUserSummary) => (
        <Switch
          size="small"
          checked={Boolean(value)}
          onChange={(checked) => handleToggleUserActive(record, checked)}
          loading={updatingUserId === record.id}
        />
      )
    },
    {
      title: t("settings:admin.users.verified", "Verified"),
      dataIndex: "is_verified",
      key: "is_verified",
      render: (value: boolean) =>
        value ? (
          <Tag color="green">
            {t("settings:admin.users.verifiedLabel", "Verified")}
          </Tag>
        ) : (
          <Tag>
            {t("settings:admin.users.unverifiedLabel", "Unverified")}
          </Tag>
        )
    },
    {
      title: t("settings:admin.users.storage", "Storage"),
      key: "storage",
      render: (_: any, record: AdminUserSummary) => (
        <span>
          {record.storage_used_mb} / {record.storage_quota_mb} MB
        </span>
      )
    }
  ]

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
        {adminGuard && (
          <Text type="secondary">
            {t(
              "settings:admin.adminGuardLimitedInfo",
              "Admin-level details and controls are hidden until admin APIs are available."
            )}
          </Text>
        )}
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
            {adminGuard && (
              <Text type="secondary">
                {t(
                  "settings:admin.adminGuardConnectionHint",
                  "Only basic connection details are shown; admin dashboards are disabled until admin APIs are available."
                )}
              </Text>
            )}
          </Card>
        )}

        {!adminGuard && (
          <>
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

            <Card
              title={t("settings:admin.usersAndRolesTitle", "Users & roles")}
              extra={
                <Space size="small">
                  <Button
                    size="small"
                    onClick={() =>
                      loadUsers(usersPage, usersPageSize, userRoleFilter, userActiveFilter)
                    }
                    disabled={usersLoading}>
                    {t("common:refresh", "Refresh")}
                  </Button>
                  <Button size="small" onClick={loadRoles} disabled={rolesLoading}>
                    {t("settings:admin.roles.refresh", "Refresh roles")}
                  </Button>
                </Space>
              }>
              <Space direction="vertical" size="middle" className="w-full">
                {usersError && (
                  <Alert
                    type="error"
                    message={t("settings:admin.usersError", "Unable to load users")}
                    description={usersError}
                    showIcon
                  />
                )}
                <Space align="center" wrap>
                  <Text strong>
                    {t("settings:admin.users.filtersTitle", "Filters")}
                  </Text>
                  <Select
                    size="small"
                    allowClear
                    placeholder={t("settings:admin.users.filterRole", "Role")}
                    value={userRoleFilter}
                    style={{ minWidth: 140 }}
                    onChange={(value) => handleUserFilterChange(value, userActiveFilter)}
                    options={[
                      { label: "user", value: "user" },
                      { label: "admin", value: "admin" },
                      { label: "service", value: "service" }
                    ]}
                  />
                  <Select
                    size="small"
                    allowClear
                    placeholder={t("settings:admin.users.filterActive", "Status")}
                    value={userActiveFilter}
                    style={{ minWidth: 160 }}
                    onChange={(value) => handleUserFilterChange(userRoleFilter, value)}
                    options={[
                      {
                        label: t("settings:admin.users.filterActiveOnly", "Active only"),
                        value: "active"
                      },
                      {
                        label: t("settings:admin.users.filterInactiveOnly", "Inactive only"),
                        value: "inactive"
                      }
                    ]}
                  />
                </Space>

                <Table<AdminUserSummary>
                  size="small"
                  rowKey="id"
                  loading={usersLoading}
                  dataSource={usersData?.users || []}
                  columns={userColumns as any}
                  pagination={{
                    current: usersPage,
                    pageSize: usersPageSize,
                    total: usersData?.total || 0,
                    showSizeChanger: true
                  }}
                  onChange={handleUserTableChange}
                />

                <Divider />

                {rolesError && (
                  <Alert
                    type="error"
                    message={t("settings:admin.rolesError", "Unable to load roles")}
                    description={rolesError}
                    showIcon
                  />
                )}

                <Space direction="vertical" size="small" className="w-full">
                  <Text strong>
                    {t("settings:admin.roles.title", "Roles")}
                  </Text>
                  <Table<AdminRole>
                    size="small"
                    rowKey="id"
                    loading={rolesLoading}
                    dataSource={roles}
                    pagination={false}
                    columns={[
                      {
                        title: t("settings:admin.roles.name", "Name"),
                        dataIndex: "name",
                        key: "name"
                      },
                      {
                        title: t("settings:admin.roles.description", "Description"),
                        dataIndex: "description",
                        key: "description",
                        render: (value: string | null | undefined) =>
                          value || (
                            <Text type="secondary">
                              {t(
                                "settings:admin.roles.noDescription",
                                "No description provided"
                              )}
                            </Text>
                          )
                      },
                      {
                        title: t("settings:admin.roles.system", "System"),
                        dataIndex: "is_system",
                        key: "is_system",
                        render: (value: boolean) =>
                          value ? (
                            <Tag color="blue">
                              {t("settings:admin.roles.systemLabel", "System")}
                            </Tag>
                          ) : (
                            <Tag>
                              {t("settings:admin.roles.customLabel", "Custom")}
                            </Tag>
                          )
                      },
                      {
                        title: t("settings:admin.roles.actions", "Actions"),
                        key: "actions",
                        render: (_: any, record: AdminRole) =>
                          record.is_system ? null : (
                            <Popconfirm
                              title={t(
                                "settings:admin.roles.deleteConfirmTitle",
                                "Delete role?"
                              )}
                              description={t(
                                "settings:admin.roles.deleteConfirmDescription",
                                "This will remove the role from the server. Existing users will lose this role."
                              )}
                              okText={t("common:confirm", "Confirm")}
                              cancelText={t("common:cancel", "Cancel")}
                              onConfirm={() => handleDeleteRole(record.id)}>
                              <Button
                                danger
                                size="small"
                                loading={deletingRoleId === record.id}>
                                {t("common:delete", "Delete")}
                              </Button>
                            </Popconfirm>
                          )
                      }
                    ]}
                  />
                  <Form
                    form={roleForm}
                    layout="inline"
                    className="mt-2 flex flex-wrap gap-2"
                    onFinish={handleCreateRole}>
                    <Form.Item
                      name="name"
                      rules={[
                        {
                          required: true,
                          message: t(
                            "settings:admin.roles.nameRequired",
                            "Enter a role name"
                          )
                        }
                      ]}>
                      <Input
                        size="small"
                        placeholder={t(
                          "settings:admin.roles.namePlaceholder",
                          "Role name (e.g. analyst)"
                        )}
                      />
                    </Form.Item>
                    <Form.Item name="description">
                      <Input
                        size="small"
                        placeholder={t(
                          "settings:admin.roles.descriptionPlaceholder",
                          "Optional description"
                        )}
                        style={{ minWidth: 220 }}
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button
                        type="primary"
                        size="small"
                        htmlType="submit"
                        loading={creatingRole}>
                        {t("settings:admin.roles.create", "Create role")}
                      </Button>
                    </Form.Item>
                  </Form>
                </Space>
              </Space>
            </Card>
          </>
        )}
      </Space>
    </PageShell>
  )
}

export default ServerAdminPage
