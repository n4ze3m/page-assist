import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

const css = postcss.parse(readFileSync("src/assets/tailwind.css", "utf8"))

// Evaluate the table background's cascade against app and OS theme choices.
function tableBackground(appDark: boolean, systemDark: boolean) {
  document.documentElement.classList.toggle("dark", appDark)
  const table = document.createElement("div")
  table.className = "table-wrapper"
  document.body.append(table)
  let background = ""
  css.walkRules((rule) => {
    if (
      !rule.selector.includes(".table-wrapper") ||
      !table.matches(rule.selector)
    )
      return
    if (rule.parent.type === "atrule" && rule.parent.name === "media") {
      if (rule.parent.params === "(prefers-color-scheme: dark)" && !systemDark)
        return
    }
    rule.walkDecls("background-color", (decl) => {
      background = decl.value
    })
  })
  table.remove()
  return background
}

describe("manual theme override", () => {
  it("uses light table styles when the OS is dark", () => {
    expect(tableBackground(false, true)).toBe("var(--tbl-bg-light)")
  })
  it("uses dark table styles when the OS is light", () => {
    expect(tableBackground(true, false)).toBe("var(--tbl-bg-dark)")
  })
})
