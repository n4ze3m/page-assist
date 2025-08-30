import { Source } from "@/db/knowledge"
import { processSource } from "@/libs/process-source"
import { UploadFile } from "antd"

export const toBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("File does not exist"))
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => {
      console.error("Failed to convert file to Base64:", error)
      reject(error)
    }
  })
}

export const toArrayBufferFromBase64 = async (base64: string) => {
  const res = await fetch(base64)
  const blob = await res.blob()
  return await blob.arrayBuffer()
}

export const generateSourceId = () => {
  return "XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX".replace(/[XY]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "X" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const convertToSource = async ({
  file,
  mime,
  sourceType
}: {
  file: UploadFile, mime?: string, sourceType?: string
}): Promise<Source> => {
  let type = mime || file.type
  let filename = file.name
  const content = await toBase64(file.originFileObj)
  return { content, type, filename, source_id: generateSourceId(), sourceType }
}


export const convertFileToSource = async ({
  file,
  mime,
  sourceType
}: {
  file: File, mime?: string, sourceType?: string
}): Promise<Source> => {
  const allowedTypes = [
    "application/pdf",
    "text/csv",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
  let type = mime || file.type
  if (!allowedTypes.includes(type)) {
    type = "text/plain"
  }
  let filename = file.name
  const url = await toBase64(file)
  const content = await processSource({
    filename,
    url,
    type
  })
  return { content, type, filename, source_id: generateSourceId(), sourceType }
}

// Helper to convert raw text into a synthetic text file and then into a Source
export const convertTextToSource = async ({
  text,
  filename = "pasted.txt",
  mime = "text/plain",
  asMarkdown = false,
  sourceType = "text_input"
}: {
  text: string,
  filename?: string,
  mime?: string,
  asMarkdown?: boolean,
  sourceType?: string
}): Promise<Source> => {
  const finalMime = asMarkdown ? "text/markdown" : mime
  const blob = new Blob([text], { type: finalMime })
  const file = new File([blob], filename, { type: finalMime })
  const content = await toBase64(file)
  return { content, type: finalMime, filename, source_id: generateSourceId(), sourceType }
}
