import { createModel } from "@/db/dexie/models"
import { getAllOpenAIConfig, getOpenAIConfigById } from "@/db/dexie/openai"
import { getAllOpenAIModels } from "@/libs/openai"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Input, Modal, Form, Select, Radio, AutoComplete, Spin } from "antd"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useMemo } from "react"
import { ProviderIcons } from "@/components/Common/ProviderIcon"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const AddCustomModelModal: React.FC<Props> = ({ open, setOpen }) => {
  const { t } = useTranslation(["openai"])
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const selectedProviderId = Form.useWatch("provider_id", form)
  const searchValue = Form.useWatch("model_id", form)

  const { data, isPending } = useQuery({
    queryKey: ["fetchProviders"],
    queryFn: async () => {
      const providers = await getAllOpenAIConfig()
      return providers.filter((provider) => provider.provider !== "lmstudio")
    }
  })

  const {
    data: providerModels,
    isFetching: isFetchingModels,
    status: modelsStatus
  } = useQuery({
    queryKey: ["providerModels", selectedProviderId],
    queryFn: async () => {
      const config = await getOpenAIConfigById(selectedProviderId as string)
      const models = await getAllOpenAIModels({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        customHeaders: config.headers
      })
      return models
    },
    enabled: !!selectedProviderId
  })

  const autoCompleteOptions = useMemo(() => {
    const list = providerModels ?? []
    const cleaned = list.map((m) => ({
      value: m.id,
      label: `${m.name ?? m.id}`.replaceAll(/accounts\/[^\/]+\/models\//g, "")
    }))
    if (searchValue && !cleaned.some((o) => o.value === searchValue)) {
      return [{ value: searchValue, label: searchValue }, ...cleaned]
    }
    return cleaned
  }, [providerModels, searchValue])

  const onFinish = async (values: {
    model_id: string
    model_type: "chat" | "embedding"
    provider_id: string
  }) => {
    await createModel(
      values.model_id,
      values.model_id,
      values.provider_id,
      values.model_type
    )

    return true
  }

  const { mutate: createModelMutation, isPending: isSaving } = useMutation({
    mutationFn: onFinish,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchCustomModels"]
      })
      queryClient.invalidateQueries({
        queryKey: ["fetchModel"]
      })
      setOpen(false)
      form.resetFields()
    }
  })

  return (
    <Modal
      footer={null}
      open={open}
      title={t("manageModels.modal.title")}
      onCancel={() => setOpen(false)}>
      <Form form={form} onFinish={createModelMutation} layout="vertical">
        <Form.Item
          name="model_id"
          label={t("manageModels.modal.form.name.label")}
          rules={[
            {
              required: true,
              message: t("manageModels.modal.form.name.required")
            }
          ]}>
          <AutoComplete
            options={autoCompleteOptions}
            placeholder={t("manageModels.modal.form.name.placeholder")}
            size="large"
            disabled={!selectedProviderId}
            filterOption={(inputValue, option) =>
              (option?.label as string)
                ?.toLowerCase()
                .includes(inputValue.toLowerCase()) ||
              (option?.value as string)
                ?.toLowerCase()
                .includes(inputValue.toLowerCase())
            }
            notFoundContent={
              selectedProviderId ? (
                modelsStatus === "pending" || isFetchingModels ? (
                  <div className="flex items-center justify-center py-2">
                    <Spin size="small" />
                  </div>
                ) : (
                  t("noModelFound")
                )
              ) : (
                t("manageModels.modal.form.provider.placeholder")
              )
            }
          />
        </Form.Item>

        <Form.Item
          name="provider_id"
          label={t("manageModels.modal.form.provider.label")}
          rules={[
            {
              required: true,
              message: t("manageModels.modal.form.provider.required")
            }
          ]}>
          <Select
            placeholder={t("manageModels.modal.form.provider.placeholder")}
            size="large"
            loading={isPending}
            showSearch
            filterOption={(input, option) => {
              //@ts-ignore
              return (
                option?.label?.props["data-title"]
                  ?.toLowerCase()
                  ?.indexOf(input.toLowerCase()) >= 0
              )
            }}
            options={data?.map((e: any) => ({
              value: e.id,
              label: (
                <span
                  key={e.id}
                  data-title={e.name}
                  className="flex flex-row gap-3 items-center ">
                  <ProviderIcons provider={e?.provider} className="size-4" />
                  <span className="line-clamp-2">{e.name}</span>
                </span>
              )
            }))}
          />
          {/* {data?.map((provider: any) => (
              <Select.Option key={provider.id} value={provider.id}>
                {provider.name}
              </Select.Option>
            ))} */}
          {/* </Select> */}
        </Form.Item>

        <Form.Item
          name="model_type"
          label={t("manageModels.modal.form.type.label")}
          initialValue="chat"
          rules={[
            {
              required: true,
              message: t("manageModels.modal.form.type.required")
            }
          ]}>
          <Radio.Group>
            <Radio value="chat">{t("radio.chat")}</Radio>
            <Radio value="embedding">{t("radio.embedding")}</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
            {!isSaving ? (
              t("common:save")
            ) : (
              <Loader2 className="w-5 h-5  animate-spin" />
            )}
          </button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
