export const iconUrl = (icon: string, url: string) => {
    // check if icon is valid url  (http:// or https://)
    if (icon.startsWith("http://") || icon.startsWith("https://")) {
      return icon;
    }

    // check if icon is valid url  (//)
    if (icon.startsWith("//")) {
      return `https:${icon}`;
    }

    const host = new URL(url).hostname;
    const protocol = new URL(url).protocol;

    return `${protocol}//${host}/${icon}`;
  };
