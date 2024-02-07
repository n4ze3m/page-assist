// clean url ending if it with /
export const cleanUrl = (url: string) => {
  if (url.endsWith("/")) {
    return url.slice(0, -1)
  }
  return url
}
