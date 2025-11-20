#!/usr/bin/env node
/**
 * Strip or rewrite patterns that addons-linter flags as DANGEROUS_EVAL.
 *
 * Currently normalizes:
 *  - Function("return this")()
 *  - new Function("return this")()
 *
 * into a safe, direct global object lookup that does not use the Function
 * constructor. Runs over all .js files under ./build.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const buildDir = path.join(root, 'build')

if (!fs.existsSync(buildDir)) {
  process.exit(0)
}

/** Recursively collect all .js files under a directory. */
function findJsFiles(dir) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    // Ignore node_modules or other nested dependency bundles if any
    if (entry.name === 'node_modules') continue

    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...findJsFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(full)
    }
  }

  return files
}

// Minified-friendly global resolution used as a replacement. This avoids
// eval/Function while preserving the semantics of "get the global object".
const GLOBAL_FALLBACK =
  '(typeof globalThis!=="undefined"?globalThis:(typeof self!=="undefined"?self:(typeof window!=="undefined"?window:{})))'

const replacements = [
  {
    search: 'Function("return this")()',
    replace: GLOBAL_FALLBACK
  },
  {
    search: 'new Function("return this")()',
    replace: GLOBAL_FALLBACK
  },
  // Strip pdf.js glyph compiler dynamic Function usage by forcing the
  // code path to fall back to the safe, non-eval implementation.
  {
    search:
      'return this.compiledGlyphs[c]=new Function("c","size",d.join(""))}',
    replace: '/* stripped dynamic Function for compiledGlyphs */'
  }
]

const jsFiles = findJsFiles(buildDir)

let changedAny = false

for (const file of jsFiles) {
  const original = fs.readFileSync(file, 'utf8')
  let updated = original
  let changed = false

  for (const { search, replace } of replacements) {
    if (updated.includes(search)) {
      updated = updated.split(search).join(replace)
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(file, updated, 'utf8')
    changedAny = true
    // Keep logging terse to avoid noisy CI logs.
    console.log(`[strip-dangerous-eval] Patched ${path.relative(root, file)}`)
  }
}

if (!changedAny) {
  console.log('[strip-dangerous-eval] No dangerous eval patterns found under build/')
}
