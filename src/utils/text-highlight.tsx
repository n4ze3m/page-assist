import React from "react"

/**
 * Highlights all occurrences of a search query in the given text.
 * Returns a React node with matched text wrapped in <mark> elements.
 *
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @param options - Optional configuration
 * @returns React node with highlighted matches, or the original text if no query
 */
export function highlightText(
  text: string,
  query: string,
  options: {
    caseSensitive?: boolean
    highlightClassName?: string
  } = {}
): React.ReactNode {
  if (!query || !text) {
    return text
  }

  const {
    caseSensitive = false,
    highlightClassName = "bg-yellow-200 dark:bg-yellow-700 rounded px-0.5"
  } = options

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  // Split query on whitespace to highlight multiple terms
  const terms = escapedQuery.split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return text
  }

  // Create a regex pattern that matches any of the terms
  const pattern = terms.join("|")
  const flags = caseSensitive ? "g" : "gi"
  const regex = new RegExp(`(${pattern})`, flags)

  const parts = text.split(regex)

  if (parts.length === 1) {
    // No matches found
    return text
  }

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches any of the search terms
        const isMatch = terms.some((term) =>
          caseSensitive
            ? part === term
            : part.toLowerCase() === term.toLowerCase()
        )

        if (isMatch) {
          return (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          )
        }
        return part
      })}
    </>
  )
}

/**
 * Checks if a text contains the search query.
 *
 * @param text - The text to search within
 * @param query - The search query
 * @param caseSensitive - Whether the search should be case-sensitive
 * @returns true if the text contains the query
 */
export function textContainsQuery(
  text: string,
  query: string,
  caseSensitive = false
): boolean {
  if (!query || !text) {
    return false
  }

  const terms = query.split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return false
  }

  const searchText = caseSensitive ? text : text.toLowerCase()

  return terms.some((term) => {
    const searchTerm = caseSensitive ? term : term.toLowerCase()
    return searchText.includes(searchTerm)
  })
}

/**
 * Counts the number of matches for a query in the given text.
 *
 * @param text - The text to search within
 * @param query - The search query
 * @param caseSensitive - Whether the search should be case-sensitive
 * @returns The number of matches
 */
export function countMatches(
  text: string,
  query: string,
  caseSensitive = false
): number {
  if (!query || !text) {
    return 0
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const terms = escapedQuery.split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return 0
  }

  const pattern = terms.join("|")
  const flags = caseSensitive ? "g" : "gi"
  const regex = new RegExp(pattern, flags)

  const matches = text.match(regex)
  return matches ? matches.length : 0
}
