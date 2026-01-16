import { describe, it, expect } from "vitest"
import { classNames } from "@/libs/class-name"

describe("classNames", () => {
  it("joins truthy classes with space", () => {
    expect(classNames("a", "", "b", "c")).toBe("a b c")
  })
  it("handles empty input", () => {
    expect(classNames()).toBe("")
  })
})
