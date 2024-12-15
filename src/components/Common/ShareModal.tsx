import { Form, Image, Input, Modal, Tooltip, message } from "antd"
import { Share } from "lucide-react"
import { useState } from "react"
import type { Message } from "~/store/option"
import Markdown from "./Markdown"
import React from "react"
import { useMutation } from "@tanstack/react-query"
import { getPageShareUrl } from "~/services/ollama"
import { cleanUrl } from "~/libs/clean-url"
import { getTitleById, getUserId, saveWebshare } from "@/db"
import { useTranslation } from "react-i18next"
import fetcher from "@/libs/fetcher"

type Props = {
  messages: Message[]
  historyId: string
  open: boolean
  setOpen: (state: boolean) => void
}

const reformatMessages = (messages: Message[], username: string) => {
  return messages.map((message, idx) => {
    return {
      id: idx,
      name: message.isBot ? message.name : username,
      isBot: message.isBot,
      message: message.message,
      images: message.images
    }
  })
}

export const PlaygroundMessage = (
  props: Message & {
    username: string
  }
) => {
  return (
    <div className="group w-full text-gray-800 dark:text-gray-100">
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl flex lg:px-0 m-auto w-full">
        <div className="flex flex-row gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl m-auto w-full">
          <div className="w-8 flex flex-col relative items-end">
            <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center  text-opacity-100r">
              {props.isBot ? (
                <div className="absolute h-8 w-8 rounded-full bg-gradient-to-r from-green-300 to-purple-400"></div>
              ) : (
                <div className="absolute h-8 w-8 rounded-full from-blue-400 to-blue-600 bg-gradient-to-r"></div>
              )}
            </div>
          </div>
          <div className="flex w-[calc(100%-50px)] flex-col gap-3 lg:w-[calc(100%-115px)]">
            <span className="text-xs font-bold text-gray-800 dark:text-white">
              {props.isBot ? props.name : props.username}
            </span>

            <div className="flex flex-grow flex-col">
              <Markdown message={props.message} />
            </div>
            {/* source if aviable */}
            {props.images && props.images.length > 0 && (
              <div className="flex md:max-w-2xl lg:max-w-xl xl:max-w-3xl mt-4 m-auto w-full">
                {props.images
                  .filter((image) => image.length > 0)
                  .map((image, index) => (
                    <Image
                      key={index}
                      src={image}
                      alt="Uploaded Image"
                      width={180}
                      className="rounded-md relative"
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ShareModal: React.FC<Props> = ({
  messages,
  historyId,
  open,
  setOpen
}) => {
  const { t } = useTranslation("common")
  const [form] = Form.useForm()
  const name = Form.useWatch("name", form)

  React.useEffect(() => {
    if (messages.length > 0) {
      getTitleById(historyId).then((title) => {
        form.setFieldsValue({
          title
        })
      })
    }
  }, [messages, historyId])

  const onSubmit = async (values: { title: string; name: string }) => {
    const owner_id = await getUserId()
    const chat = reformatMessages(messages, values.name)
    const title = values.title
    const url = await getPageShareUrl()
    const res = await fetcher(`${cleanUrl(url)}/api/v1/share/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        owner_id,
        messages: chat,
        title
      })
    })

    if (!res.ok) throw new Error(t("share.notification.failGenerate"))

    const data = await res.json()

    return {
      ...data,
      url: `${cleanUrl(url)}/share/${data.chat_id}`,
      api_url: cleanUrl(url),
      share_id: data.chat_id
    }
  }

  const { mutate: createShareLink, isPending } = useMutation({
    mutationFn: onSubmit,
    onSuccess: async (data) => {
      const url = data.url
      navigator.clipboard.writeText(url)
      message.success(t("share.notification.successGenerate"))
      await saveWebshare({
        title: data.title,
        url,
        api_url: data.api_url,
        share_id: data.share_id
      })
      setOpen(false)
    },
    onError: (error) => {
      message.error(error?.message || t("share.notification.failGenerate"))
    }
  })

  return (
    <Modal
      title={t("share.modal.title")}
      open={open}
      footer={null}
      width={600}
      onCancel={() => setOpen(false)}>
      <Form
        form={form}
        layout="vertical"
        onFinish={createShareLink}
        initialValues={{
          title: t("share.form.defaultValue.title"),
          name: t("share.form.defaultValue.name")
        }}>
        <Form.Item
          name="title"
          label={t("share.form.title.label")}
          rules={[{ required: true, message: t("share.form.title.required") }]}>
          <Input size="large" placeholder={t("share.form.title.placeholder")} />
        </Form.Item>
        <Form.Item
          name="name"
          label={t("share.form.name.label")}
          rules={[{ required: true, message: t("share.form.name.required") }]}>
          <Input size="large" placeholder={t("share.form.name.placeholder")} />
        </Form.Item>

        <Form.Item>
          <div className="max-h-[180px] overflow-x-auto border dark:border-gray-700 rounded-md p-2">
            <div className="flex flex-col p-3">
              {messages.map((message, index) => (
                <PlaygroundMessage key={index} {...message} username={name} />
              ))}
            </div>
          </div>
        </Form.Item>

        <Form.Item>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2.5 text-md font-medium leading-4 text-white shadow-sm dark:bg-white dark:text-gray-800 disabled:opacity-50 ">
              {isPending
                ? t("share.form.btn.saving")
                : t("share.form.btn.save")}
            </button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}
