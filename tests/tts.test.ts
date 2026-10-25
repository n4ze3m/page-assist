import assert from "node:assert/strict"
import { test } from "node:test"
import { sanitizeEmojis } from "../src/utils/tts.ts"

for (const [label, emoji] of [
  ["a single emoji", "🎉"],
  ["an emoji with a variation selector", "❤️"],
  ["a text-style emoji", "✔"],
  ["a skin tone", "👍🏽"],
  ["a joined family", "👨‍👩‍👧"],
  ["a joined emoji with a skin tone", "🧑🏽‍💻"],
  ["a flag", "🇺🇸"],
  ["a subdivision flag", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"]
] as const) {
  test(`removes ${label}`, () => {
    assert.equal(sanitizeEmojis(`a${emoji}b`), "ab")
  })
}

test("keeps the digit of a keycap emoji", () => {
  assert.equal(sanitizeEmojis("1️⃣ Install"), "1 Install")
})

test("keeps text symbols, joiners inside words, and non-emoji characters", () => {
  for (const text of [
    "© 2026 Page Assist™ ®",
    "അവന്\u{200D}",
    "क्\u{200D}ष",
    "𠀋 𝐀",
    "A → B"
  ]) {
    assert.equal(sanitizeEmojis(text), text)
  }
})
