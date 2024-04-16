import * as cheerio from "cheerio"

export const isTweet = (url: string) => {
  const TWEET_REGEX = /twitter\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+/g
  const X_REGEX = /x\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+/g
  return TWEET_REGEX.test(url) || X_REGEX.test(url)
}

export const isTwitterTimeline = (url: string) => {
  return url === "https://twitter.com/home" || url === "https://x.com/home"
}

export const isTwitterProfile = (url: string) => {
  const PROFILE_REGEX = /twitter\.com\/[a-zA-Z0-9_]+/g
  const X_REGEX = /x\.com\/[a-zA-Z0-9_]+/g
  return PROFILE_REGEX.test(url) || X_REGEX.test(url)
}

export const parseTwitterTimeline = (html: string) => {
  const $ = cheerio.load(html)
  const postElements = $("[data-testid=tweetText]")
  const authorElements = $("[data-testid=User-Name]")

  const posts = postElements
    .map((index, element) => {
      const post = $(element).text()
      const author = $(authorElements[index]).text()
      return {
        author,
        post
      }
    })
    .get()

  return posts
    .map((post) => {
      return `## Author: ${post.author}\n\n${post.post}\n\n---\n\n`
    })
    .filter((value, index, self) => self.indexOf(value) === index)
    .join("\n")
}

export const parseTweet = (html: string) => {
  const $ = cheerio.load(html)
  const postElements = $("[data-testid=tweetText]")
  const authorElements = $("[data-testid=User-Name]")

  const posts = postElements
    .map((index, element) => {
      const post = $(element).text()
      const author = $(authorElements[index]).text()
      return {
        author,
        post,
        isReply: index !== 0
      }
    })
    .get()

  return posts
    .map((post) => {
      return `##Author: ${post.author}\n\n${post.isReply ? "Reply:" : "Post:"} ${post.post}\n\n---\n\n`
    })
    .join("\n")
}

export const parseTweetProfile = (html: string) => {
  const $ = cheerio.load(html)

  const profileName = $("[data-testid=UserProfileHeader_Items]")
    .find("h1")
    .text()
  const profileBio = $("[data-testid=UserProfileHeader_Items]").find("p").text()
  const profileLocation = $("[data-testid=UserProfileHeader_Items]")
    .find("span")
    .text()
  const profileJoinDate = $("[data-testid=UserProfileHeader_Items]")
    .find("span")
    .text()
  const profileFollowers = $(
    "[data-testid=UserProfileHeader_Items] span"
  ).text()
  const profileFollowing = $(
    "[data-testid=UserProfileHeader_Items] span"
  ).text()

  const postElements = $("[data-testid=tweetText]")
  const authorElements = $("[data-testid=User-Name]")

  const posts = postElements
    .map((index, element) => {
      const post = $(element).text()
      const author = $(authorElements[index]).text()
      return {
        author,
        post
      }
    })
    .get()

  return `## Profile: ${profileName}\n\nBio: ${profileBio}\n\nLocation: ${profileLocation}\n\nJoin Date: ${profileJoinDate}\n\nFollowers: ${profileFollowers}\n\nFollowing: ${profileFollowing}\n\nPosts: ${posts.map((post) => `Author: ${post.author}\n\nPost: ${post.post}\n\n---\n\n`).join("\n")}`
}
