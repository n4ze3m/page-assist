import katex from "katex"

interface KatexOptions {
  displayMode?: boolean
  throwOnError?: boolean
  errorColor?: string
  macros?: Record<string, string>
  minRuleThickness?: number
  colorIsTextColor?: boolean
  maxSize?: number
  maxExpand?: number
  strict?: boolean | string | Function
  trust?: boolean | Function
  fleqn?: boolean
  leqno?: boolean
  output?: "html" | "mathml" | "htmlAndMathml"
  nonStandard?: boolean
}

interface KatexToken {
  type: "inlineKatex" | "blockKatex"
  raw: string
  text: string
  displayMode: boolean
}

interface MarkedToken {
  type: string
  raw: string
  [key: string]: any
}

interface TokenizerThis {
  lexer: {
    state: {
      inLink: boolean
      inRawBlock: boolean
      top: boolean
    }
  }
}

interface MarkedExtension {
  name: string
  level: "inline" | "block"
  start?: (src: string) => number | void
  tokenizer: (
    this: TokenizerThis,
    src: string,
    tokens: MarkedToken[]
  ) => KatexToken | void
  renderer: (token: KatexToken) => string
}

interface KatexMarkedExtension {
  extensions: MarkedExtension[]
}

type RendererFunction = (token: KatexToken) => string

const inlineRule =
  /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/
const inlineRuleNonStandard =
  /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1/ // Non-standard, even if there are no spaces before and after $ or $, try to parse

const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/

export default function markedKatexExtension(options: KatexOptions = {}): KatexMarkedExtension {
  return {
    extensions: [
      inlineKatex(options, createRenderer(options, false)),
      blockKatex(options, createRenderer(options, true))
    ]
  }
}

function createRenderer(options: any, newlineAfter: boolean): RendererFunction {
  return (token: KatexToken): string => {
    try {
      return (
        katex.renderToString(token.text, {
          ...options,
          displayMode: token.displayMode
        }) + (newlineAfter ? "\n" : "")
      )
    } catch (error) {
      console.error("KaTeX rendering error:", error)
      return `<span class="katex-error" title="${error instanceof Error ? error.message : "Unknown error"}">${token.text}</span>`
    }
  }
}

function inlineKatex(
  options: KatexOptions,
  renderer: RendererFunction
): MarkedExtension {
  const nonStandard = options && options.nonStandard
  const ruleReg = nonStandard ? inlineRuleNonStandard : inlineRule

  return {
    name: "inlineKatex",
    level: "inline",
    start(src: string): number | void {
      let index: number
      let indexSrc = src

      while (indexSrc) {
        index = indexSrc.indexOf("$")
        if (index === -1) {
          return
        }
        const f = nonStandard
          ? index > -1
          : index === 0 || indexSrc.charAt(index - 1) === " "
        if (f) {
          const possibleKatex = indexSrc.substring(index)

          if (possibleKatex.match(ruleReg)) {
            return index
          }
        }

        indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, "")
      }
    },
    tokenizer(
      this: TokenizerThis,
      src: string,
      tokens: MarkedToken[]
    ): KatexToken | void {
      const match = src.match(ruleReg)
      if (match) {
        return {
          type: "inlineKatex",
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2
        }
      }
    },
    renderer
  }
}

function blockKatex(
  options: KatexOptions,
  renderer: RendererFunction
): MarkedExtension {
  return {
    name: "blockKatex",
    level: "block",
    tokenizer(
      this: TokenizerThis,
      src: string,
      tokens: MarkedToken[]
    ): KatexToken | void {
      const match = src.match(blockRule)
      if (match) {
        return {
          type: "blockKatex",
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2
        }
      }
    },
    renderer
  }
}
