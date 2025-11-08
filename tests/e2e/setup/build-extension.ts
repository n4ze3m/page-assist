import { execSync } from 'node:child_process'
import path from 'path'

export default async function globalSetup() {
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
