import TurndownService from "turndown"
import * as cheerio from "cheerio"

export const isAmazonURL = (url: string) => {
  const AMAZON_REGEX = /amazon\.[a-z]{2,}/gi
  return AMAZON_REGEX.test(url)
}

export const parseAmazonWebsite = (html: string) => {
  if (!html) {
    return ""
  }

  const $ = cheerio.load(html)

  // Remove unnecessary elements
  $("script, style, link, svg, nav, footer, header, [src^='data:image/']").remove()
  $(".a-popover, .a-declarative, .a-offscreen").remove()
  $("#navbar, #navFooter, #rhf").remove()

  // Amazon product-specific selectors
  const productSelectors = [
    // Product title
    "#productTitle",
    "h1.a-size-large",
    
    // Price information
    ".a-price",
    ".a-price-whole",
    ".a-price-fraction",
    ".a-price-symbol",
    "#priceblock_dealprice",
    "#priceblock_ourprice",
    ".a-price-current",
    
    // Product details
    "#feature-bullets",
    "#productDescription",
    "#aplus",
    ".a-unordered-list.a-nostyle.a-vertical.feature",
    
    // Product specifications
    "#productDetails_techSpec_section_1",
    "#productDetails_detailBullets_sections1",
    ".a-keyvalue",
    
    // Reviews summary
    "#averageCustomerReviews",
    ".a-icon-alt",
    "#acrPopover",
    
    // Availability
    "#availability",
    ".a-color-success",
    ".a-color-price",
    
    // Product images (keep alt text)
    "#landingImage",
    ".a-dynamic-image",
    
    // Brand and manufacturer
    "#bylineInfo",
    ".a-brand",
    
    // Product variations (size, color, etc.)
    "#variation_size_name",
    "#variation_color_name",
    ".a-button-text",
    
    // Key product features
    ".a-spacing-mini",
    ".a-list-item"
  ]

  // Extract only product-related content
  let productContent = ""
  
  productSelectors.forEach(selector => {
    const elements = $(selector)
    elements.each((_, element) => {
      const $element = $(element)
      // Clean up attributes but keep essential ones
      $element.find("*").each((_, child) => {
        if ("attribs" in child) {
          const attributes = child.attribs
          for (const attr in attributes) {
            if (!["href", "src", "alt"].includes(attr)) {
              $(child).removeAttr(attr)
            }
          }
        }
      })
      productContent += $element.html() || ""
    })
  })

  // If no specific product content found, fallback to main content but filter it
  if (!productContent.trim()) {
    const mainContent = $('[role="main"]').html() || $("main").html() || $("#dp").html() || ""
    if (mainContent) {
      const $main = cheerio.load(mainContent)
      // Remove non-product elements from main content
      $main("nav, footer, .nav-sprite, .a-popover, #navbar").remove()
      productContent = $main.html() || ""
    }
  }

  if (!productContent.trim()) {
    return ""
  }

  // Clean up attributes in the final content
  const $final = cheerio.load(productContent)
  $final("*").each((_, element) => {
    if ("attribs" in element) {
      const attributes = element.attribs
      for (const attr in attributes) {
        if (!["href", "src", "alt"].includes(attr)) {
          $final(element).removeAttr(attr)
        }
      }
    }
  })

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced"
  })

  // Configure turndown to handle product-specific elements better
  turndownService.addRule('productPrice', {
    filter: function (node) {
      return node.className && node.className.includes('a-price')
    },
    replacement: function (content) {
      return `**Price: ${content.trim()}**\n\n`
    }
  })

  turndownService.addRule('productTitle', {
    filter: function (node) {
      return node.id === 'productTitle' || (node.tagName === 'H1' && node.className && node.className.includes('a-size-large'))
    },
    replacement: function (content) {
      return `# ${content.trim()}\n\n`
    }
  })

  const markdown = turndownService.turndown($final.html() || "")

  return markdown.trim()
}
