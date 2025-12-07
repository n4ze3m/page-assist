import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'path'

export default async function globalSetup() {
  // If a built chrome extension already exists, skip rebuilding.
  const builtChromePath = path.resolve('build/chrome-mv3')
  if (fs.existsSync(builtChromePath)) {
    return
  }

  // Build the extension once before running tests
  // Prefer npm (bun may be unavailable in some environments)
  try {
    execSync('npm run build:chrome', { stdio: 'inherit' })
  } catch {
    try {
      // Fallback: use wxt directly
      execSync('cross-env TARGET=chrome wxt build', { stdio: 'inherit' })
    } catch {
      // Last resort: bun (if present)
      execSync('bun run build:chrome', { stdio: 'inherit' })
    }
  }
}
