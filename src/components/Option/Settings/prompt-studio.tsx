import React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Skeleton,
  Space,
  Typography
} from "antd"
import { useTranslation } from "react-i18next"

import {
  getPromptStudioStatus,
  hasPromptStudio,
  type PromptStudioStatus
} from "@/services/prompt-studio"
import {
  getPromptStudioDefaults,
  setPromptStudioDefaults
} from "@/services/prompt-studio-settings"

const { Title, Paragraph, Text } = Typography

const StatusDescription = ({ status }: { status: PromptStudioStatus | undefined }) => {
  if (!status) return null
  const leases = status.leases || {}
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="Queue depth">{status.queue_depth ?? 0}</Descriptions.Item>
      <Descriptions.Item label="Processing">{status.processing ?? 0}</Descriptions.Item>
      <Descriptions.Item label="Leases">
        <div className="space-x-3">
          <Text>{`Active: ${leases.active ?? 0}`}</Text>
          <Text>{`Expiring soon: ${leases.expiring_soon ?? 0}`}</Text>
          <Text>{`Stale processing: ${leases.stale_processing ?? 0}`}</Text>
        </div>
      </Descriptions.Item>
      <Descriptions.Item label="Avg processing (s)">
        {status.avg_processing_time_seconds ?? 0}
      </Descriptions.Item>
      <Descriptions.Item label="Success rate">
        {status.success_rate ?? 0}%
      </Descriptions.Item>
    </Descriptions>
  )
}

export const PromptStudioSettings: React.FC = () => {
  const { t } = useTranslation(["settings", "common"])
  const [form] = Form.useForm()
  const [statusResult, setStatusResult] = React.useState<PromptStudioStatus | null>(null)
  const [statusError, setStatusError] = React.useState<string | null>(null)

  const capabilityQuery = useQuery({
    queryKey: ["prompt-studio", "capability"],
    queryFn: hasPromptStudio
  })

  const defaultsQuery = useQuery({
    queryKey: ["prompt-studio", "defaults"],
    queryFn: getPromptStudioDefaults
  })

  React.useEffect(() => {
    if (!defaultsQuery.data) return
    form.setFieldsValue({
      defaultProjectId: defaultsQuery.data.defaultProjectId ?? undefined,
      executeProvider: defaultsQuery.data.executeProvider,
      executeModel: defaultsQuery.data.executeModel,
      executeTemperature: defaultsQuery.data.executeTemperature,
      executeMaxTokens: defaultsQuery.data.executeMaxTokens,
      evalModelName: defaultsQuery.data.evalModelName,
      evalTemperature: defaultsQuery.data.evalTemperature,
      evalMaxTokens: defaultsQuery.data.evalMaxTokens,
      pageSize: defaultsQuery.data.pageSize,
      warnSeconds: defaultsQuery.data.warnSeconds
    })
  }, [defaultsQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      await setPromptStudioDefaults({
        defaultProjectId: values.defaultProjectId ?? null,
        executeProvider: values.executeProvider,
        executeModel: values.executeModel,
        executeTemperature: values.executeTemperature,
        executeMaxTokens: values.executeMaxTokens,
        evalModelName: values.evalModelName,
        evalTemperature: values.evalTemperature,
        evalMaxTokens: values.evalMaxTokens,
        pageSize: values.pageSize,
        warnSeconds: values.warnSeconds
      })
      return await getPromptStudioDefaults()
    },
    onSuccess: (next) => {
      form.setFieldsValue(next)
    }
  })

  const testStatusMutation = useMutation({
    mutationFn: async (warnSeconds?: number) => {
      setStatusError(null)
      const resp = await getPromptStudioStatus({ warn_seconds: warnSeconds })
      if (!resp?.success) {
        throw new Error(resp?.error || "Status failed")
      }
      return resp.data
    },
    onSuccess: (data) => {
      setStatusResult(data || null)
    },
    onError: (err: any) => {
      setStatusResult(null)
      setStatusError(err?.message || "Status failed")
    }
  })

  const capabilityReady = capabilityQuery.data === true

  return (
    <div className="space-y-4">
      <Title level={3} className="mb-0">
        {t("settings:promptStudio.title", "Prompt Studio")}
      </Title>
      <Paragraph className="text-gray-600 dark:text-gray-300">
        {t(
          "settings:promptStudio.subtitle",
          "Configure defaults and monitor Prompt Studio health. Connection and auth reuse the main server settings."
        )}
      </Paragraph>

      {capabilityQuery.isLoading && <Skeleton active paragraph={{ rows: 3 }} />}

      {capabilityQuery.isError && (
        <Alert
          type="error"
          message={t("settings:promptStudio.probeError", "Unable to reach Prompt Studio")}
        />
      )}

      <Space direction="vertical" size="large" className="w-full">
        <Card
          title={t("settings:promptStudio.statusCard", "Status")}
          extra={
            <Text type="secondary">
              {t("settings:promptStudio.statusHint", "Button calls /prompt-studio/status with warn_seconds.")}
            </Text>
          }>
          {defaultsQuery.isLoading && <Skeleton active paragraph={{ rows: 2 }} />}
          <Form
            form={form}
            layout="inline"
            onFinish={() => {
              const warn = form.getFieldValue("warnSeconds")
              testStatusMutation.mutate(warn)
            }}>
            <Form.Item
              label={t("settings:promptStudio.warnSeconds", "Warn seconds")}
              name="warnSeconds">
              <InputNumber min={1} max={3600} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={testStatusMutation.isPending}
                disabled={!capabilityReady}>
                {t("settings:promptStudio.testButton", "Test Prompt Studio")}
              </Button>
            </Form.Item>
          </Form>
          {statusError && (
            <Alert
              className="mt-3"
              type="error"
              message={t("settings:promptStudio.statusError", "Status endpoint unavailable")}
              description={statusError}
            />
          )}
          {statusResult && (
            <div className="mt-3">
              <StatusDescription status={statusResult} />
            </div>
          )}
        </Card>

        <Card
          title={t("settings:promptStudio.defaultsCard", "Defaults")}
          extra={
            <Text type="secondary">
              {t("settings:promptStudio.defaultsHint", "Store default project, model configs, and list page size.")}
            </Text>
          }>
          {defaultsQuery.isLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={(values) => saveMutation.mutate(values)}
              initialValues={{
                executeProvider: "openai",
                executeModel: "gpt-3.5-turbo",
                executeTemperature: 0.2,
                executeMaxTokens: 256,
                evalModelName: "gpt-3.5-turbo",
                evalTemperature: 0.2,
                evalMaxTokens: 512,
                pageSize: 10,
                warnSeconds: 30
              }}>
              <div className="grid gap-4 md:grid-cols-2">
                <Form.Item
                  label={t("settings:promptStudio.defaultProject", "Default project ID")}
                  name="defaultProjectId">
                  <InputNumber min={1} placeholder="Optional project id" />
                </Form.Item>
                <Form.Item
                  label={t("settings:promptStudio.pageSize", "Page size")}
                  name="pageSize"
                  rules={[{ required: true, type: "number", min: 1, max: 100 }]}>
                  <InputNumber min={1} max={100} />
                </Form.Item>
              </div>

              <Card size="small" title={t("settings:promptStudio.executeDefaults", "Execute defaults")}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item
                    label={t("settings:promptStudio.executeProvider", "Provider")}
                    name="executeProvider"
                    rules={[{ required: true }]}>
                    <Input placeholder="openai" />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:promptStudio.executeModel", "Model")}
                    name="executeModel"
                    rules={[{ required: true }]}>
                    <Input placeholder="gpt-3.5-turbo" />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:promptStudio.executeTemperature", "Temperature")}
                    name="executeTemperature"
                    rules={[{ type: "number", min: 0, max: 2 }]}>
                    <InputNumber step={0.1} min={0} max={2} />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:promptStudio.executeMaxTokens", "Max tokens")}
                    name="executeMaxTokens"
                    rules={[{ type: "number", min: 1 }]}>
                    <InputNumber min={1} />
                  </Form.Item>
                </div>
              </Card>

              <Card
                size="small"
                className="mt-4"
                title={t("settings:promptStudio.evalDefaults", "Evaluation defaults")}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Form.Item
                    label={t("settings:promptStudio.evalModel", "Model")}
                    name="evalModelName"
                    rules={[{ required: true }]}>
                    <Input placeholder="gpt-3.5-turbo" />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:promptStudio.evalTemperature", "Temperature")}
                    name="evalTemperature"
                    rules={[{ type: "number", min: 0, max: 2 }]}>
                    <InputNumber step={0.1} min={0} max={2} />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:promptStudio.evalMaxTokens", "Max tokens")}
                    name="evalMaxTokens"
                    rules={[{ type: "number", min: 1 }]}>
                    <InputNumber min={1} />
                  </Form.Item>
                </div>
              </Card>

              <div className="mt-4">
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={saveMutation.isPending}>
                    {t("common:save", "Save")}
                  </Button>
                </Space>
              </div>
            </Form>
          )}
        </Card>
      </Space>

      {!capabilityReady && !capabilityQuery.isLoading && (
        <Alert
          type="info"
          message={t(
            "settings:promptStudio.unavailable",
            "Prompt Studio isn’t available on the server yet."
          )}
          description={t(
            "settings:promptStudio.unavailableBody",
            "Once enabled, you can monitor queue health and set defaults here."
          )}
        />
      )}
    </div>
  )
}
