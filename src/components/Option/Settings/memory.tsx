import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Empty, List, Modal, Input, Form, Popconfirm, Skeleton } from "antd"
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  getAllMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  deleteAllMemories
} from "@/db/dexie/memory"
import { Memory } from "@/db/dexie/types"

export const MemorySettings = () => {
  const { t } = useTranslation("settings")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: memories, isLoading } = useQuery({
    queryKey: ["memories"],
    queryFn: getAllMemories
  })

  const { mutate: addMemoryMutation, isPending: isAddingMemory } = useMutation({
    mutationFn: async (content: string) => {
      return await addMemory(content)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      setIsAddModalOpen(false)
      addForm.resetFields()
    }
  })

  const { mutate: updateMemoryMutation, isPending: isUpdatingMemory } =
    useMutation({
      mutationFn: async ({ id, content }: { id: string; content: string }) => {
        return await updateMemory(id, content)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["memories"] })
        setIsEditModalOpen(false)
        setSelectedMemory(null)
        editForm.resetFields()
      }
    })

  const { mutate: deleteMemoryMutation } = useMutation({
    mutationFn: async (id: string) => {
      return await deleteMemory(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
    }
  })

  const { mutate: clearAllMemories } = useMutation({
    mutationFn: async () => {
      return await deleteAllMemories()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] })
    }
  })

  const handleAddMemory = () => {
    addForm.validateFields().then((values) => {
      addMemoryMutation(values.content)
    })
  }

  const handleEditMemory = () => {
    editForm.validateFields().then((values) => {
      if (selectedMemory) {
        updateMemoryMutation({ id: selectedMemory.id, content: values.content })
      }
    })
  }

  const handleOpenEditModal = (memory: Memory) => {
    setSelectedMemory(memory)
    editForm.setFieldsValue({ content: memory.content })
    setIsEditModalOpen(true)
  }

  return (
    <div>
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("memory.title", "Memory (Experimental)")}
        </h2>
        <div className="flex gap-2">
          {memories && memories.length > 0 && (
            <Popconfirm
              title={t("memory.clearAll.confirm", "Clear all memories?")}
              onConfirm={() => clearAllMemories()}
              okText={t("memory.clearAll.ok", "Yes")}
              cancelText={t("memory.clearAll.cancel", "No")}>
              <button className="inline-flex items-center rounded-md border border-red-600 bg-transparent px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-950">
                {t("memory.clearAll.button", "Clear All")}
              </button>
            </Popconfirm>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-transparent bg-black px-3 py-1.5 text-sm font-medium text-white shadow-sm dark:bg-white dark:text-gray-800">
            <PlusOutlined />
            {t("memory.add.button", "Add Memory")}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t(
          "memory.description",
          "You can personalize your interactions with LLMs by adding memories, making them more helpful and tailored to you."
        )}
      </p>

      <div className="border border-b border-gray-200 dark:border-gray-600 mb-6"></div>

      {isLoading && <Skeleton active paragraph={{ rows: 3 }} />}

      {!isLoading && (!memories || memories.length === 0) && (
        <Empty
          description={t(
            "memory.empty",
            "No memories yet. Add your first memory to get started."
          )}
        />
      )}

      {!isLoading && memories && memories.length > 0 && (
        <List
          dataSource={memories}
          renderItem={(memory) => (
            <List.Item
              key={memory.id}
              actions={[
                <button
                  key="edit"
                  onClick={() => handleOpenEditModal(memory)}
                  className="inline-flex items-center p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  <EditOutlined />
                </button>,
                <Popconfirm
                  key="delete"
                  title={t("memory.delete.confirm", "Delete this memory?")}
                  onConfirm={() => deleteMemoryMutation(memory.id)}
                  okText={t("memory.delete.ok", "Yes")}
                  cancelText={t("memory.delete.cancel", "No")}>
                  <button className="inline-flex items-center p-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400">
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              ]}>
              <List.Item.Meta
                title={
                  <div className="text-sm text-gray-900 dark:text-white">
                    {memory.content}
                  </div>
                }
                description={
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("memory.created", "Created")}{": "}
                    {new Date(memory.createdAt).toLocaleString()}
                    {memory.updatedAt !== memory.createdAt &&
                      ` • ${t("memory.updated", "Updated")}: ${new Date(memory.updatedAt).toLocaleString()}`}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        title={t("memory.add.title", "Add New Memory")}
        open={isAddModalOpen}
        onOk={handleAddMemory}
        onCancel={() => {
          setIsAddModalOpen(false)
          addForm.resetFields()
        }}
        confirmLoading={isAddingMemory}
        okText={t("memory.add.ok", "Add")}
        cancelText={t("memory.add.cancel", "Cancel")}
        okButtonProps={{
          className: "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
        }}
        cancelButtonProps={{
          className: "border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
        }}>
        <Form form={addForm} layout="vertical" className="mt-4">
          <Form.Item
            name="content"
            label={t("memory.add.label", "Memory Content")}
            rules={[
              {
                required: true,
                message: t(
                  "memory.add.required",
                  "Please enter memory content"
                )
              },
              {
                min: 3,
                message: t(
                  "memory.add.minLength",
                  "Memory must be at least 3 characters"
                )
              }
            ]}>
            <Input.TextArea
              rows={4}
              placeholder={t(
                "memory.add.placeholder",
                "e.g., I prefer code examples in TypeScript"
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("memory.edit.title", "Edit Memory")}
        open={isEditModalOpen}
        onOk={handleEditMemory}
        onCancel={() => {
          setIsEditModalOpen(false)
          setSelectedMemory(null)
          editForm.resetFields()
        }}
        confirmLoading={isUpdatingMemory}
        okText={t("memory.edit.ok", "Save")}
        cancelText={t("memory.edit.cancel", "Cancel")}
        okButtonProps={{
          className: "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-200"
        }}
        cancelButtonProps={{
          className: "border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500"
        }}>
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item
            name="content"
            label={t("memory.edit.label", "Memory Content")}
            rules={[
              {
                required: true,
                message: t(
                  "memory.edit.required",
                  "Please enter memory content"
                )
              },
              {
                min: 3,
                message: t(
                  "memory.edit.minLength",
                  "Memory must be at least 3 characters"
                )
              }
            ]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
