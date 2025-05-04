
const YT_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]+)/


export const isYoutubeLink = (url: string) => {
    return YT_REGEX.test(url)
}