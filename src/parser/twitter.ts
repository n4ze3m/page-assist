import * as cheerio from "cheerio"

export const isTweet = (url: string) => {
  const TWEET_REGEX = /twitter\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+/g
  return TWEET_REGEX.test(url)
}

export const isTwitterProfile = (url: string) => {
  const PROFILE_REGEX = /twitter\.com\/[a-zA-Z0-9_]+/g
  return PROFILE_REGEX.test(url)
}

export const isTwitterTimeline = (url: string) => {
  const TIMELINE_REGEX = /twitter\.com\/home/g
  return TIMELINE_REGEX.test(url)
}

export const isTwitter = (url: string) => {
  return isTweet(url) || isTwitterProfile(url) || isTwitterTimeline(url)
}

export const isTwitterNotification = (url: string) => {
  const NOTIFICATION_REGEX = /twitter\.com\/notifications/g
  return NOTIFICATION_REGEX.test(url)
}

export const parseTweet = (html: string, url: string) => {
  if (!html) {
    return ""
  }

  const $ = cheerio.load(html)

  if (isTweet(url)) {
    console.log("tweet")
    const tweet = $("div[data-testid='tweet']")
    const tweetContent = tweet.find("div[lang]")
    const tweetMedia = tweet.find("div[role='group']")
    const author = tweet.find("a[role='link']").text()
    const date = tweet.find("time").text()
    return `<div>${author} ${tweetContent.text()} ${tweetMedia.html()} ${date}</div>`
  }

  if (isTwitterTimeline(url)) {
    console.log("timeline")
    const timeline = $("div[data-testid='primaryColumn']")
    const timelineContent = timeline.find("div[data-testid='tweet']")
    console.log(timelineContent.html())
    const tweet = timelineContent
      .map((i, el) => {
        const author = $(el).find("a[role='link']").text()
        const content = $(el).find("div[lang]").text()
        const media = $(el).find("div[role='group']").html()
        const date = $(el).find("time").text()
        return `<div>${author} ${content} ${media} ${date}</div>`
      })
      .get()
      .join("")
    console.log(tweet)
    return `<div>${tweet}</div>`
  }

  if (isTwitterNotification(url)) {
    console.log("notification")
    const notification = $("div[data-testid='primaryColumn']")
    const notificationContent = notification.find("div[data-testid='tweet']")
    return `<div>${notificationContent.html()}</div>`
  }
  if (isTwitterProfile(url)) {
    console.log("profile")
    const profile = $("div[data-testid='primaryColumn']")
    const profileContent = profile.find(
      "div[data-testid='UserProfileHeader_Items']"
    )
    const profileTweets = profile.find("div[data-testid='tweet']")
    return `<div>${profileContent.html()}</div><div>${profileTweets.html()}</div>`
  }
  console.log("no match")
  const timeline = $("div[data-testid='primaryColumn']")
  const timelineContent = timeline.find("div[data-testid='tweet']")
  const tweet = timelineContent.map((i, el) => {
    const author = $(el).find("a[role='link']").text()
    const content = $(el).find("div[lang]").text()
    const media = $(el).find("div[role='group']").html()
    const date = $(el).find("time").text()
    return `<div>${author} ${content} ${media} ${date}</div>`
  })

  return `<div>${tweet}</div>`
}
