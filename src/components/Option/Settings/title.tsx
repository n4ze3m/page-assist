import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, Form, Input, Select, Skeleton, Switch } from "antd"
import { SaveButton } from "~/components/Common/SaveButton" 
import {
  isTitleGenEnabled,
  setTitleGenEnabled,
  getTitleGenerationPrompt,
  setTitleGenerationPrompt,
  titleGenerationModel,
  DEFAULT_TITLE_GEN_PROMPT,
  setTitleGenerationModel
} from "~/services/title"
import { ProviderIcons } from "@/components/Common/ProviderIcon"
import { fetchChatModels } from "@/services/ollama"

export const SettingTitle = () => {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

 
  const { status, data } = useQuery({
    queryKey: ["fetchTitleSettings"],
    queryFn: async () => {
      const [models, enabled, prompt, model] = await Promise.all([
        fetchChatModels({ returnEmpty: true }),
        isTitleGenEnabled(),
        getTitleGenerationPrompt(),
        titleGenerationModel() 
      ])

      return {
        models,
        enabled,
        prompt,
        model
      }
    }
  })

  const { mutate: saveTitleSettings, isPending } = useMutation({
    mutationFn: async (values: {
      enabled: boolean
      prompt: string
      model: string
    }) => {
      await setTitleGenEnabled(values.enabled)
      await setTitleGenerationPrompt(values.prompt)
      await setTitleGenerationModel(values.model)
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchTitleSettings"]
      })
    }
  })

  return (
    <div className="flex flex-col gap-3">
      {status === "pending" && <Skeleton paragraph={{ rows: 4 }} active />}

      {status === "success" && (
        <div>
          <div>
            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
              Title Generation Settings
            </h2>
            <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              saveTitleSettings({
                enabled: values.enabled,
                prompt: values.prompt,
                model: values.model
              })
            }}
            initialValues={{
              enabled: data.enabled,
              prompt: data.prompt || DEFAULT_TITLE_GEN_PROMPT,
              model: data.model || ""
            }}>
            <Form.Item
              name="enabled"
              label="Enable Title Generation"
              valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              name="model"
              label="Title Generation Model"
              help="Select a model for generating chat titles. Leave empty to use the default chat model."
              rules={[
                {
                  required: false
                }
              ]}>
              <Select
                size="large"
                showSearch
                allowClear
                placeholder="Select a model (optional)"
                style={{ width: "100%" }}
                className="mt-4"
                filterOption={(input, option) =>
                  option.label.key
                    .toLowerCase()
                    .indexOf(input.toLowerCase()) >= 0
                }
                options={data.models?.map((model) => ({
                  label: (
                    <span
                      key={model.model}
                      className="flex flex-row gap-3 items-center truncate">
                      {model?.avatar ? (
                        <Avatar
                          src={model.avatar}
                          alt={model.name}
                          size="small"
                        />
                      ) : (
                        <ProviderIcons
                          provider={model?.provider}
                          className="w-5 h-5"
                        />
                      )}
                      <span className="truncate">
                        {model?.nickname || model?.name}
                      </span>
                    </span>
                  ),
                  value: model.model
                }))}
              />
            </Form.Item>

            <Form.Item
              name="prompt"
              label="Title Generation Prompt"
              help="Use {{query}} as a placeholder for the user's query."
              rules={[
                {
                  required: true,
                  message: "Enter a title generation prompt."
                }
              ]}>
              <Input.TextArea
                rows={10}
                placeholder="Enter the prompt for generating titles..."
              />
            </Form.Item>

            <Form.Item>
              <div className="flex justify-end">
                <SaveButton disabled={isPending} btnType="submit" />
              </div>
            </Form.Item>
          </Form>
        </div>
      )}
    </div>
  )
}
