import { expect, it } from "vitest"
import { useQuoteReply } from "../quote"
it("clears the selected reply text", () => {
  useQuoteReply.getState().setQuotedText("selected text")
  expect(useQuoteReply.getState().quotedText).toBe("selected text")
  useQuoteReply.getState().clearQuotedText()
  expect(useQuoteReply.getState().quotedText).toBeNull()
})
