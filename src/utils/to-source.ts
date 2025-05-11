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
  mime
}: {
  file: UploadFile, mime?: string
}): Promise<Source> => {
  let type = mime || file.type
  let filename = file.name
  const content = await toBase64(file.originFileObj)
  return { content, type, filename, source_id: generateSourceId() }
}


export const convertFileToSource = async ({
  file,
  mime
}: {
  file: File, mime?: string
}): Promise<Source> => {
  let type = mime || file.type
  let filename = file.name
  const url = await toBase64(file)
  const content = await processSource({
    filename,
    url,
    type
  })
  return { content, type, filename, source_id: generateSourceId() }
}
