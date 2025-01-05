import { getPromptById } from "@/db"
import { useMessageOption } from "@/hooks/useMessageOption"
import { getAllModelSettings } from "@/services/model-settings"
import { useStoreChatModelSettings } from "@/store/model"
import { useQuery } from "@tanstack/react-query"
import {
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Skeleton,
  Switch,
} from "antd"
import React, { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { SaveButton } from "../SaveButton"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
  useDrawer?: boolean
}

export const CurrentChatModelSettings = ({
  open,
  setOpen,
  useDrawer
}: Props) => {
  const { t } = useTranslation("common")
  const [form] = Form.useForm()
  const cUserSettings = useStoreChatModelSettings()
  const { selectedSystemPrompt } = useMessageOption()

  const savePrompt = useCallback(
    (value: string) => {
      cUserSettings.setX("systemPrompt", value)
    },
    [cUserSettings]
  )

  const saveSettings = useCallback(
    (values: any) => {
      Object.entries(values).forEach(([key, value]) => {
        if (key !== "systemPrompt") {
          cUserSettings.setX(key, value)
        }
      })
    },
    [cUserSettings]
  )

  const { isPending: isLoading } = useQuery({
    queryKey: ["fetchModelConfig2", open],
    queryFn: async () => {
      const data = await getAllModelSettings()

      let tempSystemPrompt = ""

      // i hate this method but i need this feature so badly that i need to do this
      if (selectedSystemPrompt) {
        const prompt = await getPromptById(selectedSystemPrompt)
        tempSystemPrompt = prompt?.content ?? ""
      }

      form.setFieldsValue({
        temperature: cUserSettings.temperature ?? data.temperature,
        topK: cUserSettings.topK ?? data.topK,
        topP: cUserSettings.topP ?? data.topP,
        keepAlive: cUserSettings.keepAlive ?? data.keepAlive,
        numCtx: cUserSettings.numCtx ?? data.numCtx,
        seed: cUserSettings.seed,
        numGpu: cUserSettings.numGpu ?? data.numGpu,
        numPredict: cUserSettings.numPredict ?? data.numPredict,
        systemPrompt: cUserSettings.systemPrompt ?? tempSystemPrompt,
        useMMap: cUserSettings.useMMap ?? data.useMMap,
        minP: cUserSettings.minP ?? data.minP,
        repeatLastN: cUserSettings.repeatLastN ?? data.repeatLastN,
        repeatPenalty: cUserSettings.repeatPenalty ?? data.repeatPenalty,
        useMlock: cUserSettings.useMlock ?? data.useMlock,
        tfsZ: cUserSettings.tfsZ ?? data.tfsZ,
        numKeep: cUserSettings.numKeep ?? data.numKeep,
        numThread: cUserSettings.numThread ?? data.numThread
      })
      return data
    },
    enabled: open,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })

  const renderBody = () => {
    return (
      <>
        {!isLoading ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              saveSettings(values)
              setOpen(false)
            }}>
            {useDrawer && (
              <>
                <Form.Item
                  name="systemPrompt"
                  help={t("modelSettings.form.systemPrompt.help")}
                  label={t("modelSettings.form.systemPrompt.label")}>
                  <Input.TextArea
                    rows={4}
                    placeholder={t(
                      "modelSettings.form.systemPrompt.placeholder"
                    )}
                    onChange={(e) => savePrompt(e.target.value)}
                  />
                </Form.Item>
                <Divider />
              </>
            )}
            <Form.Item
              name="keepAlive"
              help={t("modelSettings.form.keepAlive.help")}
              label={t("modelSettings.form.keepAlive.label")}>
              <Input
                placeholder={t("modelSettings.form.keepAlive.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="temperature"
              label={t("modelSettings.form.temperature.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.temperature.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="seed"
              help={t("modelSettings.form.seed.help")}
              label={t("modelSettings.form.seed.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.seed.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="numCtx"
              label={t("modelSettings.form.numCtx.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.numCtx.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="numPredict"
              label={t("modelSettings.form.numPredict.label")}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder={t("modelSettings.form.numPredict.placeholder")}
              />
            </Form.Item>

            <Divider />

            <Collapse
              ghost
              className="border-none bg-transparent"
              items={[
                {
                  key: "1",
                  label: t("modelSettings.advanced"),
                  children: (
                    <React.Fragment>
                      <Form.Item
                        name="topK"
                        label={t("modelSettings.form.topK.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.topK.placeholder")}
                        />
                      </Form.Item>

                      <Form.Item
                        name="topP"
                        label={t("modelSettings.form.topP.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.topP.placeholder")}
                        />
                      </Form.Item>

                      <Form.Item
                        name="numGpu"
                        label={t("modelSettings.form.numGpu.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.numGpu.placeholder"
                          )}
                        />
                      </Form.Item>

                      <Form.Item
                        name="minP"
                        label={t("modelSettings.form.minP.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.minP.placeholder")}
                        />
                      </Form.Item>
                      <Form.Item
                        name="repeatPenalty"
                        label={t("modelSettings.form.repeatPenalty.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.repeatPenalty.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="repeatLastN"
                        label={t("modelSettings.form.repeatLastN.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.repeatLastN.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="tfsZ"
                        label={t("modelSettings.form.tfsZ.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t("modelSettings.form.tfsZ.placeholder")}
                        />
                      </Form.Item>
                      <Form.Item
                        name="numKeep"
                        label={t("modelSettings.form.numKeep.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.numKeep.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="numThread"
                        label={t("modelSettings.form.numThread.label")}>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={t(
                            "modelSettings.form.numThread.placeholder"
                          )}
                        />
                      </Form.Item>
                      <Form.Item
                        name="useMMap"
                        label={t("modelSettings.form.useMMap.label")}>
                        <Switch />
                      </Form.Item>
                      <Form.Item
                        name="useMlock"
                        label={t("modelSettings.form.useMlock.label")}>
                        <Switch />
                      </Form.Item>
                    </React.Fragment>
                  )
                }
              ]}
            />
            <SaveButton
              className="w-full text-center inline-flex items-center justify-center"
              btnType="submit"
            />
          </Form>
        ) : (
          <Skeleton active />
        )}
      </>
    )
  }

  if (useDrawer) {
    return (
      <Drawer
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        width={500}
        title={t("currentChatModelSettings")}>
        {renderBody()}
      </Drawer>
    )
  }

  return (
    <Modal
      title={t("currentChatModelSettings")}
      open={open}
      onOk={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      footer={null}>
      {renderBody()}
    </Modal>
  )
}
