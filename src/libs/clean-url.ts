// clean url ending if it with /
export const cleanUrl = (url: string) => {
  if (url.endsWith("/") && !url.replace("://", "").slice(0, -1).includes("/")) {
    return url.slice(0, -1)
  }
  return url
}
