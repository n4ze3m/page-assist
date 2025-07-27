export const isFireFoxPrivateMode =
  import.meta.env.BROWSER === "firefox" && browser.extension.inIncognitoContext
