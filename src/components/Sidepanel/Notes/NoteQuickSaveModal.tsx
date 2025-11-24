import React from "react"
import { Input, Modal, Space, Typography } from "antd"

type NoteQuickSaveModalProps = {
  open: boolean
  title: string
  content: string
  suggestedTitle?: string
  sourceUrl?: string
  loading?: boolean
  error?: string | null
  modalTitle?: string
  saveText?: string
  cancelText?: string
  titleLabel?: string
  contentLabel?: string
  sourceLabel?: string
  helperText?: string
  titleRequiredText?: string
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}

const NoteQuickSaveModal: React.FC<NoteQuickSaveModalProps> = ({
  open,
  title,
  content,
  suggestedTitle,
  sourceUrl,
  loading,
  error,
  modalTitle,
  saveText,
  cancelText,
  titleLabel,
  contentLabel,
  sourceLabel,
  helperText,
  titleRequiredText,
  onTitleChange,
  onContentChange,
  onCancel,
  onSave
}) => {
  return (
    <Modal
      centered
      open={open}
      title={modalTitle || "Save to Notes"}
      okText={saveText || "Save"}
      cancelText={cancelText || "Cancel"}
      onCancel={onCancel}
      onOk={onSave}
      okButtonProps={{ loading, disabled: loading }}
      maskClosable={false}
    >
      <Space direction="vertical" size="middle" className="w-full">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Typography.Text strong>
              {titleLabel || "Title"}
            </Typography.Text>
            {suggestedTitle && !title.trim() && (
              <Typography.Text type="secondary" className="text-xs">
                Auto-filled
              </Typography.Text>
            )}
          </div>
          <Input
            allowClear
            value={title}
            placeholder={
              suggestedTitle ? `Suggested: ${suggestedTitle}` : "Add a title to save this note"
            }
            onChange={(e) => onTitleChange(e.target.value)}
          />
          {!suggestedTitle && (
            <Typography.Text type="secondary" className="text-xs">
              {titleRequiredText || "Title is required to create a note."}
            </Typography.Text>
          )}
        </div>

        <div className="space-y-1">
          <Typography.Text strong>
            {contentLabel || "Content"}
          </Typography.Text>
          <Input.TextArea
            value={content}
            autoSize={{ minRows: 6 }}
            onChange={(e) => onContentChange(e.target.value)}
          />
        </div>

        {sourceUrl ? (
          <Typography.Text type="secondary" className="text-xs break-all">
            {(sourceLabel || "Source") + ": "}{sourceUrl}
          </Typography.Text>
        ) : null}

        {error ? (
          <Typography.Text type="danger" className="text-xs">
            {error}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary" className="text-xs">
            {helperText || "Review or edit the selected text, then Save or Cancel."}
          </Typography.Text>
        )}
      </Space>
    </Modal>
  )
}

export default NoteQuickSaveModal
