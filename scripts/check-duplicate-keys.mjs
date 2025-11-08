#!/usr/bin/env node
/**
 * Detect duplicate keys inside JSON objects.
 *
 * Scans i18n JSON files under:
 *  - src/assets/locale/**.json
 *  - src/public/_locales/**.json
 *
 * Exits with code 1 if any duplicate keys are found, printing the file,
 * JSON path and line:column for each occurrence beyond the first.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const targets = [
  path.join(root, 'src/assets/locale'),
  path.join(root, 'src/public/_locales')
]

/** Recursively collect all .json files under a directory (if it exists). */
function findJsonFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.output')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...findJsonFiles(p))
    else if (e.isFile() && e.name.endsWith('.json')) files.push(p)
  }
  return files
}

/**
 * Very small JSON scanner that tracks object boundaries and flags duplicate keys.
 * Not a full JSON parser — only enough to identify keys in object literals.
 */
function detectDuplicateKeys(jsonText) {
  const duplicates = []

  // Stack frames for containers
  // - type: 'object' | 'array'
  // - keys: Set (for object)
  // - expectingKey: boolean (for object)
  // - lastKey: string | undefined (for object)
  // - path: string (human-readable JSON path)
  // - index: number (for array)
  const stack = []

  // Track string parsing state
  let i = 0
  const len = jsonText.length

  function skipWhitespace(pos) {
    while (pos < len) {
      const c = jsonText.charCodeAt(pos)
      // space, tab, CR, LF
      if (c === 32 || c === 9 || c === 13 || c === 10) pos++
      else break
    }
    return pos
  }

  function parseString(start) {
    // Assumes jsonText[start] === '"'
    let s = ''
    let pos = start + 1
    while (pos < len) {
      const ch = jsonText.charCodeAt(pos)
      if (ch === 34) {
        // closing quote
        return [s, pos + 1]
      }
      if (ch === 92) {
        // escape
        const next = jsonText.charCodeAt(pos + 1)
        switch (next) {
          case 34:
            s += '"'
            pos += 2
            break
          case 92:
            s += '\\'
            pos += 2
            break
          case 47:
            s += '/'
            pos += 2
            break
          case 98:
            s += '\b'
            pos += 2
            break
          case 102:
            s += '\f'
            pos += 2
            break
          case 110:
            s += '\n'
            pos += 2
            break
          case 114:
            s += '\r'
            pos += 2
            break
          case 116:
            s += '\t'
            pos += 2
            break
          case 117: {
            // \uXXXX
            const hex = jsonText.slice(pos + 2, pos + 6)
            const code = Number.parseInt(hex, 16)
            if (!Number.isNaN(code)) s += String.fromCharCode(code)
            pos += 6
            break
          }
          default:
            // unknown escape, keep literal
            s += jsonText[pos + 1]
            pos += 2
        }
        continue
      }
      s += jsonText[pos]
      pos++
    }
    // Unterminated string — treat as end
    return [s, pos]
  }

  function currentFrame() {
    return stack[stack.length - 1]
  }

  function posToLineCol(pos) {
    // Simple conversion by counting newlines up to pos
    const upTo = jsonText.slice(0, pos)
    const lines = upTo.split('\n')
    const line = lines.length // 1-based
    const col = lines[lines.length - 1].length + 1 // 1-based
    return { line, col }
  }

  while (i < len) {
    const ch = jsonText[i]

    if (ch === '"') {
      const keyStart = i
      const [str, nextPos] = parseString(i)
      // Peek next non-space char
      const after = skipWhitespace(nextPos)
      const frame = currentFrame()
      if (frame && frame.type === 'object' && frame.expectingKey && jsonText[after] === ':') {
        // We found a key in current object
        if (frame.keys.has(str)) {
          const { line, col } = posToLineCol(keyStart)
          duplicates.push({ path: frame.path, key: str, line, col })
        } else {
          frame.keys.add(str)
        }
        frame.lastKey = str
        frame.expectingKey = false
        i = after + 1 // skip the ':'
        continue
      }
      // Not a key (string value), just skip it
      i = nextPos
      continue
    }

    // Structural tokens
    if (ch === '{') {
      // Determine path for this new object
      let pathStr = '$'
      const parent = currentFrame()
      if (parent) {
        if (parent.type === 'object') {
          // Object value of the most recent key
          const seg = parent.lastKey ?? '?'
          pathStr = parent.path + '.' + seg
        } else if (parent.type === 'array') {
          const idx = parent.index
          pathStr = parent.path + '[' + (Number.isInteger(idx) ? idx : '*') + ']'
        }
      }
      stack.push({ type: 'object', keys: new Set(), expectingKey: true, lastKey: undefined, path: pathStr })
      i++
      continue
    }
    if (ch === '}') {
      stack.pop()
      // After closing an object, if parent is object we are after a value
      i++
      continue
    }
    if (ch === '[') {
      let pathStr = '$'
      const parent = currentFrame()
      if (parent) {
        if (parent.type === 'object') {
          const seg = parent.lastKey ?? '?'
          pathStr = parent.path + '.' + seg
        } else if (parent.type === 'array') {
          const idx = parent.index
          pathStr = parent.path + '[' + (Number.isInteger(idx) ? idx : '*') + ']'
        }
      }
      stack.push({ type: 'array', path: pathStr, index: 0 })
      i++
      continue
    }
    if (ch === ']') {
      stack.pop()
      i++
      continue
    }

    // Comma toggles state inside containers
    if (ch === ',') {
      const frame = currentFrame()
      if (frame) {
        if (frame.type === 'object') {
          frame.expectingKey = true
          frame.lastKey = undefined
        } else if (frame.type === 'array') {
          frame.index = (frame.index ?? 0) + 1
        }
      }
      i++
      continue
    }

    // Ignore whitespace/other tokens
    i++
  }

  return duplicates
}

const allFiles = targets.flatMap(findJsonFiles)
let totalDupes = 0
for (const file of allFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const dupes = detectDuplicateKeys(text)
  if (dupes.length) {
    console.error(`Duplicate keys found in ${path.relative(root, file)}`)
    for (const d of dupes) {
      console.error(`  ${d.path}.${d.key} at ${d.line}:${d.col}`)
    }
    totalDupes += dupes.length
  }
}

if (totalDupes > 0) {
  console.error(`\nFound ${totalDupes} duplicate key occurrence(s).`)
  process.exit(1)
} else {
  console.log('No duplicate keys detected in i18n JSON.')
}

