import { execSync } from 'node:child_process'
import path from 'path'

export default async function globalSetup() {
  // Build the extension once before running tests
  // Prefer bun if available; fall back to npm
  try {
    execSync('bun run build', { stdio: 'inherit' })
  } catch {
    try {
      execSync('npm run build:chrome', { stdio: 'inherit' })
    } catch {
      // Final fallback: use wxt directly if available
      execSync('cross-env TARGET=chrome wxt build', { stdio: 'inherit' })
    }
  }
}
