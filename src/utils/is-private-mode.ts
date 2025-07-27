export const isFireFox = import.meta.env.BROWSER === "firefox"

export const isFireFoxPrivateMode =
  isFireFox && browser.extension.inIncognitoContext
