import assert from "node:assert/strict"
import { test } from "node:test"

import { replaceThinkTagToEM } from "../src/libs/reasoning.ts"

const emphasis = (text: string) =>
  `<em style="font-style: italic; font-size: 0.9em; margin-bottom: 1em;">${text}</em>\n\n`

for (const tag of [
  "think",
  "reason",
  "reasoning",
  "thought",
  "THINK",
  "ReAsOn"
]) {
  test(`formats ${tag} content without retaining its tags`, () => {
    assert.equal(
      replaceThinkTagToEM(`<${tag}>Planning\nnext step</${tag}>Answer`),
      `${emphasis("Planning\nnext step")}Answer`
    )
  })
}

test("formats multiple reasoning blocks and preserves surrounding text", () => {
  assert.equal(
    replaceThinkTagToEM(
      "Before <reason>first</reason> between <thought>second</thought> after"
    ),
    `Before ${emphasis("first")} between ${emphasis("second")} after`
  )
})

test("formats an empty reasoning block", () => {
  assert.equal(replaceThinkTagToEM("<reason></reason>"), emphasis(""))
})

for (const text of [
  "Plain **Markdown**",
  "<unknown>content</unknown>",
  "<reason>unfinished",
  "<THINK>unfinished"
]) {
  test(`preserves text without a complete supported block: ${text}`, () => {
    assert.equal(replaceThinkTagToEM(text), text)
  })
}

test("preserves existing cleanup of unmatched lowercase think tags", () => {
  assert.equal(replaceThinkTagToEM("<think>unfinished"), "unfinished")
  assert.equal(replaceThinkTagToEM("text</think>"), "text")
})

test("preserves content markup inside a reasoning block", () => {
  assert.equal(
    replaceThinkTagToEM(
      "<reason>Use <strong>bold</strong> and **Markdown**</reason>"
    ),
    emphasis("Use <strong>bold</strong> and **Markdown**")
  )
})
