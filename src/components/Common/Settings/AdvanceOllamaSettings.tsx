import { Divider, Input, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { Form } from "antd"
import React from "react"
import {
  customOllamaHeaders,
  getRewriteUrl,
  isUrlRewriteEnabled,
  setCustomOllamaHeaders,
  setRewriteUrl,
  setUrlRewriteEnabled
} from "@/services/app"
import { Trash2Icon } from "lucide-react"
import { SaveButton } from "../SaveButton"

export const AdvanceOllamaSettings = () => {
  const [form] = Form.useForm()
  const watchUrlRewriteEnabled = Form.useWatch("urlRewriteEnabled", form)

  const fetchAdvancedData = async () => {
    const [urlRewriteEnabled, rewriteUrl, headers] = await Promise.all([
      isUrlRewriteEnabled(),
      getRewriteUrl(),
      customOllamaHeaders()
    ])
    form.setFieldsValue({ urlRewriteEnabled, rewriteUrl, headers })
  }

  React.useEffect(() => {
    fetchAdvancedData()
  }, [])

  const { t } = useTranslation("settings")

  return (
    <Form
      onFinish={(e) => {
        const headers = e?.headers?.filter(
          (header: { key: string; value: string }) => header.key && header.value
        )
        setUrlRewriteEnabled(e.urlRewriteEnabled)
        setRewriteUrl(e.rewriteUrl)
        setCustomOllamaHeaders(headers)
      }}
      form={form}
      layout="vertical"
      className="space-y-4">
      <Form.Item
        name="urlRewriteEnabled"
        label={t("ollamaSettings.settings.advanced.urlRewriteEnabled.label")}>
        <Switch />
      </Form.Item>
      <Form.Item
        required={watchUrlRewriteEnabled}
        name="rewriteUrl"
        label={t("ollamaSettings.settings.advanced.rewriteUrl.label")}>
        <Input
          disabled={!watchUrlRewriteEnabled}
          className="w-full"
          placeholder={t(
            "ollamaSettings.settings.advanced.rewriteUrl.placeholder"
          )}
        />
      </Form.Item>

      <Form.List name="headers">
        {(fields, { add, remove }) => (
          <div className="flex flex-col ">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-semibold">
                {t("ollamaSettings.settings.advanced.headers.label")}
              </h3>
              <button
                type="button"
                className="dark:bg-white dark:text-black text-white bg-black p-1.5 text-xs rounded-md"
                onClick={() => {
                  add()
                }}>
                {t("ollamaSettings.settings.advanced.headers.add")}
              </button>
            </div>
            {fields.map((field, index) => (
              <div key={field.key} className="flex items-center   w-full">
                <div className="flex-grow flex space-x-4">
                  <Form.Item
                    label={t(
                      "ollamaSettings.settings.advanced.headers.key.label"
                    )}
                    name={[field.name, "key"]}
                    className="flex-1 mb-0">
                    <Input
                      className="w-full"
                      placeholder={t(
                        "ollamaSettings.settings.advanced.headers.key.placeholder"
                      )}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t(
                      "ollamaSettings.settings.advanced.headers.value.label"
                    )}
                    name={[field.name, "value"]}
                    className="flex-1 mb-0">
                    <Input
                      className="w-full"
                      placeholder={t(
                        "ollamaSettings.settings.advanced.headers.value.placeholder"
                      )}
                    />
                  </Form.Item>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    remove(field.name)
                  }}
                  className="shrink-0 ml-2 text-red-500 dark:text-red-400">
                  <Trash2Icon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Form.List>
      <Divider />

      <Form.Item className="flex justify-end">
        <SaveButton btnType="submit" />
      </Form.Item>
    </Form>
  )
}
