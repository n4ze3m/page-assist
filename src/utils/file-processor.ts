export const processFileUpload = async (file: File) => {
  const { convertFileToSource } = await import("./to-source")
  return convertFileToSource({ file })
}