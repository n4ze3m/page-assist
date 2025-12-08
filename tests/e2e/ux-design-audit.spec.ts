/**
 * UX Design Audit - Senior UX Designer Perspective
 *
 * This test suite performs comprehensive walkthroughs of the extension from a
 * user experience perspective, identifying friction points, confusing states,
 * and missing steps in typical workflows.
 */

import { test as base, expect } from "@playwright/test"
import { launchWithExtension } from "./utils/extension"
import path from "path"
import { requireRealServerConfig } from "./utils/real-server"

const TEST_EXT_PATH = path.resolve("build/chrome-mv3")

interface UXIssue {
  severity: 'critical' | 'major' | 'minor' | 'enhancement'
  workflow: string
  issue: string
  expected: string
  location?: string
}

const allUxIssues: UXIssue[] = []

const test = base.extend<{ uxIssues: UXIssue[] }>({
  uxIssues: async ({}, use) => {
    const issues: UXIssue[] = []
    await use(issues)
    allUxIssues.push(...issues)
  }
})

function logIssue(uxIssues: UXIssue[], issue: UXIssue) {
  uxIssues.push(issue)
  console.log(`[UX ${issue.severity.toUpperCase()}] ${issue.workflow}: ${issue.issue}`)
}

async function launchExtension(options?: { seedConfig?: Record<string, any> }) {
  return await launchWithExtension(TEST_EXT_PATH, options || {})
}

test.describe('UX Design Audit', () => {
  let serverUrl: string
  let apiKey: string

  test.beforeAll(async () => {
    const cfg = requireRealServerConfig(test)
    serverUrl = cfg.serverUrl
    apiKey = cfg.apiKey
  })

  test.afterAll(async () => {
    // Print summary report
    console.log('\n' + '='.repeat(80))
    console.log('UX AUDIT SUMMARY REPORT')
    console.log('='.repeat(80))

    const critical = allUxIssues.filter(i => i.severity === 'critical')
    const major = allUxIssues.filter(i => i.severity === 'major')
    const minor = allUxIssues.filter(i => i.severity === 'minor')
    const enhancement = allUxIssues.filter(i => i.severity === 'enhancement')

    console.log(`\nTotal Issues Found: ${allUxIssues.length}`)
    console.log(`  Critical: ${critical.length}`)
    console.log(`  Major: ${major.length}`)
    console.log(`  Minor: ${minor.length}`)
    console.log(`  Enhancement: ${enhancement.length}`)

    if (critical.length > 0) {
      console.log('\n--- CRITICAL ISSUES ---')
      critical.forEach((i, idx) => {
        console.log(`\n${idx + 1}. [${i.workflow}] ${i.issue}`)
        console.log(`   Expected: ${i.expected}`)
        if (i.location) console.log(`   Location: ${i.location}`)
      })
    }

    if (major.length > 0) {
      console.log('\n--- MAJOR ISSUES ---')
      major.forEach((i, idx) => {
        console.log(`\n${idx + 1}. [${i.workflow}] ${i.issue}`)
        console.log(`   Expected: ${i.expected}`)
        if (i.location) console.log(`   Location: ${i.location}`)
      })
    }

    if (minor.length > 0) {
      console.log('\n--- MINOR ISSUES ---')
      minor.forEach((i, idx) => {
        console.log(`\n${idx + 1}. [${i.workflow}] ${i.issue}`)
        console.log(`   Expected: ${i.expected}`)
        if (i.location) console.log(`   Location: ${i.location}`)
      })
    }

    if (enhancement.length > 0) {
      console.log('\n--- ENHANCEMENT SUGGESTIONS ---')
      enhancement.forEach((i, idx) => {
        console.log(`\n${idx + 1}. [${i.workflow}] ${i.issue}`)
        console.log(`   Expected: ${i.expected}`)
        if (i.location) console.log(`   Location: ${i.location}`)
      })
    }

    console.log('\n' + '='.repeat(80))
  })

  test.describe('1. First-Run Onboarding Experience', () => {
    test('fresh install shows clear onboarding with progress indication', async ({ uxIssues }) => {
      const { context, page } = await launchExtension()

      try {
        // Check for welcome/onboarding UI on first load
        await page.waitForLoadState('networkidle')

        // Look for onboarding indicators
        const hasWelcome = await page.getByText(/welcome|get started|let's connect/i).isVisible().catch(() => false)
        const hasStepIndicator = await page.getByText(/step\s*\d|1\s*of\s*\d/i).isVisible().catch(() => false)
        const hasProgressBar = await page.locator('[role="progressbar"], .progress, .stepper').isVisible().catch(() => false)

        if (!hasWelcome) {
          logIssue(uxIssues, {
            severity: 'major',
            workflow: 'Onboarding',
            issue: 'No clear welcome message on first run',
            expected: 'User should see a welcoming message explaining what the extension does'
          })
        }

        if (!hasStepIndicator && !hasProgressBar) {
          logIssue(uxIssues, {
            severity: 'minor',
            workflow: 'Onboarding',
            issue: 'No progress indicator during onboarding wizard',
            expected: 'User should see "Step 1 of 3" or a progress bar to set expectations'
          })
        }

        // Check server URL input clarity
        const urlInput = page.getByLabel(/server\s*url/i).or(page.getByPlaceholder(/server|url|http/i))
        const urlInputVisible = await urlInput.isVisible().catch(() => false)

        if (urlInputVisible) {
          // Check for placeholder/example text
          const placeholder = await urlInput.getAttribute('placeholder')
          if (!placeholder || !placeholder.includes('http')) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Onboarding',
              issue: 'Server URL input lacks helpful placeholder example',
              expected: 'Placeholder should show example like "http://localhost:8000"'
            })
          }

          // Check for help text explaining what a tldw server is
          const hasHelpText = await page.getByText(/tldw.*server|what.*server|where.*find/i).isVisible().catch(() => false)
          if (!hasHelpText) {
            logIssue(uxIssues, {
              severity: 'major',
              workflow: 'Onboarding',
              issue: 'No explanation of what a "tldw server" is or where to get one',
              expected: 'First-time users need context: link to docs, explanation of the server'
            })
          }
        }

        await page.screenshot({ path: 'test-results/ux-audit-onboarding-fresh.png' })

      } finally {
        await context.close()
      }
    })

    test('server URL validation provides real-time feedback', async ({ uxIssues }) => {
      const { context, page } = await launchExtension()

      try {
        await page.waitForLoadState('networkidle')

        const urlInput = page.getByLabel(/server\s*url/i).or(page.getByPlaceholder(/server|url|http/i)).first()

        if (await urlInput.isVisible()) {
          // Test invalid URL
          await urlInput.fill('not-a-valid-url')

          const hasErrorIndicator = await page.getByText(/invalid|error|not.*valid/i).isVisible().catch(() => false)
          const hasRedBorder = await urlInput.evaluate(el => {
            const styles = window.getComputedStyle(el)
            return styles.borderColor.includes('red') || styles.borderColor.includes('rgb(239')
          }).catch(() => false)

          if (!hasErrorIndicator && !hasRedBorder) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Onboarding',
              issue: 'Invalid URL input shows no immediate validation feedback',
              expected: 'User should see red border or error message when URL format is invalid'
            })
          }

          // Test valid URL that's unreachable
          await urlInput.fill('http://localhost:9999')

          const hasReachabilityFeedback = await page.getByText(/cannot.*reach|unreachable|connection.*failed|offline/i).isVisible().catch(() => false)
          if (!hasReachabilityFeedback) {
            logIssue(uxIssues, {
              severity: 'major',
              workflow: 'Onboarding',
              issue: 'No feedback when server URL is valid format but unreachable',
              expected: 'User should see "Cannot reach server" message with retry option'
            })
          }

          // Test valid + reachable URL
          await urlInput.fill(serverUrl)

          const hasSuccessFeedback = await page.getByText(/connected|reachable|success|ready/i).isVisible().catch(() => false)
          if (!hasSuccessFeedback) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Onboarding',
              issue: 'No positive feedback when server is successfully reached',
              expected: 'Green checkmark or "Server connected" message for positive reinforcement'
            })
          }
        }

      } finally {
        await context.close()
      }
    })

    test('auth mode selection is clear and complete', async ({ uxIssues }) => {
      const { context, page } = await launchExtension()

      try {
        await page.waitForLoadState('networkidle')

        // Navigate past URL step if needed
        const urlInput = page.getByLabel(/server\s*url/i).or(page.getByPlaceholder(/server|url|http/i)).first()
        if (await urlInput.isVisible()) {
          await urlInput.fill(serverUrl)
          const nextBtn = page.getByRole('button', { name: /next|continue/i })
          if (await nextBtn.isVisible()) {
            await nextBtn.click()
          }
        }

        // Look for auth mode options
        const singleUserOption = await page.getByText(/single.*user|api.*key/i).isVisible().catch(() => false)
        const multiUserOption = await page.getByText(/multi.*user|username|password/i).isVisible().catch(() => false)

        if (singleUserOption || multiUserOption) {
          // Check for explanatory text about each mode
          const hasAuthExplanation = await page.getByText(/recommended|choose|when.*use/i).isVisible().catch(() => false)
          if (!hasAuthExplanation) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Onboarding',
              issue: 'Auth modes lack explanation of when to use each',
              expected: 'Brief description: "Single User: For personal use" vs "Multi User: For shared servers"'
            })
          }
        }

        // Check API key input
        const apiKeyInput = page.getByLabel(/api.*key/i).or(page.getByPlaceholder(/api.*key|enter.*key/i))
        if (await apiKeyInput.isVisible()) {
          // Check if it's a password field for security
          const inputType = await apiKeyInput.getAttribute('type')
          if (inputType !== 'password') {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Onboarding',
              issue: 'API key input is not masked (type="password")',
              expected: 'API keys should be masked by default with show/hide toggle'
            })
          }

          // Check for "where to find API key" help
          const hasKeyHelp = await page.getByText(/where.*find|how.*get|generate/i).isVisible().catch(() => false)
          if (!hasKeyHelp) {
            logIssue(uxIssues, {
              severity: 'major',
              workflow: 'Onboarding',
              issue: 'No guidance on where to find/generate API key',
              expected: 'Link or explanation: "Find your API key in tldw server settings"'
            })
          }
        }

        await page.screenshot({ path: 'test-results/ux-audit-onboarding-auth.png' })

      } finally {
        await context.close()
      }
    })
  })

  test.describe('2. Main Navigation & Orientation', () => {
    test('navigation clearly indicates current location', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        // Navigate to different sections
        const routes = ['#/media', '#/notes', '#/review', '#/settings']

        for (const route of routes) {
          await page.goto(optionsUrl + route)
          await page.waitForLoadState('networkidle')

          // Check for active state indicator
          const navLinks = page.locator('nav a, [role="navigation"] a, .nav-link, .menu-item')
          const activeLink = navLinks.locator('.active, [aria-current="page"], [data-active="true"]')

          const hasActiveIndicator = await activeLink.count() > 0
          if (!hasActiveIndicator) {
            // Check for visual active state via class
            const anyActiveState = await page.locator('[class*="active"], [class*="selected"], [class*="current"]').count() > 0
            if (!anyActiveState) {
              logIssue(uxIssues, {
                severity: 'minor',
                workflow: 'Navigation',
                issue: `No clear active state indicator on route ${route}`,
                expected: 'Current section should be highlighted in navigation',
                location: route
              })
            }
          }
        }

        // Check for breadcrumbs or location context
        await page.goto(optionsUrl + '#/settings/knowledge')
        await page.waitForLoadState('networkidle')

        const hasBreadcrumb = await page.getByText(/settings\s*[>\/]\s*knowledge/i).isVisible().catch(() => false)
        const hasBackButton = await page.getByRole('button', { name: /back|←/i }).isVisible().catch(() => false)

        if (!hasBreadcrumb && !hasBackButton) {
          logIssue(uxIssues, {
            severity: 'minor',
            workflow: 'Navigation',
            issue: 'Nested settings pages lack breadcrumbs or back navigation',
            expected: 'Show "Settings > Knowledge" breadcrumb or back button for context'
          })
        }

        await page.screenshot({ path: 'test-results/ux-audit-navigation.png' })

      } finally {
        await context.close()
      }
    })

    test('keyboard navigation works throughout the app', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        await page.goto(optionsUrl)
        await page.waitForLoadState('networkidle')

        // Test Tab navigation
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')

        const focusedElement = await page.locator(':focus').count()
        if (focusedElement === 0) {
          logIssue(uxIssues, {
            severity: 'major',
            workflow: 'Accessibility',
            issue: 'Tab navigation does not focus interactive elements',
            expected: 'Tab should cycle through focusable elements with visible focus ring'
          })
        }

        // Check for visible focus indicator
        const hasFocusRing = await page.locator(':focus').evaluate(el => {
          if (!el) return false
          const styles = window.getComputedStyle(el)
          return styles.outline !== 'none' || styles.boxShadow.includes('rgb')
        }).catch(() => false)

        if (!hasFocusRing) {
          logIssue(uxIssues, {
            severity: 'major',
            workflow: 'Accessibility',
            issue: 'Focused elements lack visible focus indicator',
            expected: 'All focusable elements should show a clear focus ring for keyboard users'
          })
        }

      } finally {
        await context.close()
      }
    })
  })

  test.describe('3. Chat Experience', () => {
    test('empty chat state guides user action', async ({ uxIssues }) => {
      const { context, page, openSidepanel } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        // Test sidepanel chat
        const sidepanel = await openSidepanel()
        await sidepanel.waitForLoadState('networkidle')

        // Check for empty state messaging
        const hasEmptyStateMessage = await sidepanel.getByText(/start.*conversation|type.*message|ask.*question/i).isVisible().catch(() => false)
        const hasExamples = await sidepanel.getByText(/example|try asking|suggest/i).isVisible().catch(() => false)

        if (!hasEmptyStateMessage) {
          logIssue(uxIssues, {
            severity: 'minor',
            workflow: 'Chat',
            issue: 'Empty chat shows no guidance or prompts',
            expected: 'Show helpful text like "Start a conversation" or example prompts'
          })
        }

        // Check message input is clearly visible and accessible
        const messageInput = sidepanel.getByPlaceholder(/type.*message|ask|chat/i).or(sidepanel.getByRole('textbox'))
        const inputVisible = await messageInput.isVisible().catch(() => false)

        if (!inputVisible) {
          logIssue(uxIssues, {
            severity: 'critical',
            workflow: 'Chat',
            issue: 'Message input not visible or discoverable in sidepanel',
            expected: 'Chat input should be prominently visible at bottom of sidepanel'
          })
        }

        // Check for model selection if no model configured
        const hasModelSelector = await sidepanel.getByRole('combobox').or(sidepanel.getByText(/select.*model|choose.*model/i)).isVisible().catch(() => false)
        const hasNoModelWarning = await sidepanel.getByText(/no.*model|select.*model.*first/i).isVisible().catch(() => false)

        // This is informational - just note if model selection is present
        if (!hasModelSelector && !hasNoModelWarning) {
          logIssue(uxIssues, {
            severity: 'enhancement',
            workflow: 'Chat',
            issue: 'Model selection not visible in chat interface',
            expected: 'Show current model or selector so user knows which AI they\'re talking to'
          })
        }

        await sidepanel.screenshot({ path: 'test-results/ux-audit-chat-empty.png' })

      } finally {
        await context.close()
      }
    })

    test('sending message shows clear feedback states', async ({ uxIssues }) => {
      const { context, openSidepanel } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        const sidepanel = await openSidepanel()
        await sidepanel.waitForLoadState('networkidle')

        const messageInput = sidepanel.getByPlaceholder(/type.*message/i).or(sidepanel.getByRole('textbox')).first()

        if (await messageInput.isVisible()) {
          // Type and send message
          await messageInput.fill('Hello, this is a test message')

          // Check for send button or Enter key affordance
          const sendButton = sidepanel.getByRole('button', { name: /send|submit/i }).or(sidepanel.locator('button[type="submit"]'))
          const hasSendButton = await sendButton.isVisible().catch(() => false)

          if (!hasSendButton) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Chat',
              issue: 'No visible send button (Enter-only submission)',
              expected: 'Visible send button for discoverability, especially on mobile'
            })
          }

          // Send the message
          await messageInput.press('Enter')

          // Check for loading/thinking indicator
          const hasLoadingIndicator = await sidepanel.locator('.loading, .thinking, .typing, [class*="spinner"], [class*="loading"]').or(sidepanel.getByText(/thinking|generating|typing/i)).isVisible().catch(() => false)

          if (!hasLoadingIndicator) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Chat',
              issue: 'No loading indicator while waiting for AI response',
              expected: 'Show typing indicator or spinner while generating response'
            })
          }

          // Check that user message is shown
          const userMessageVisible = await sidepanel.getByText('Hello, this is a test message').isVisible().catch(() => false)
          if (!userMessageVisible) {
            logIssue(uxIssues, {
              severity: 'major',
              workflow: 'Chat',
              issue: 'Sent message not displayed in chat history',
              expected: 'User messages should appear immediately in the chat'
            })
          }
        }

        await sidepanel.screenshot({ path: 'test-results/ux-audit-chat-message.png' })

      } finally {
        await context.close()
      }
    })
  })

  test.describe('4. Feature Empty States', () => {
    test('Media page shows helpful empty state', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        await page.goto(optionsUrl + '#/media')
        await page.waitForLoadState('networkidle')

        // Check for empty state
        const hasEmptyStateText = await page.getByText(/no.*media|no.*content|get.*started|nothing.*here/i).isVisible().catch(() => false)
        const hasAddButton = await page.getByRole('button', { name: /add|upload|import|ingest/i }).isVisible().catch(() => false)
        const hasHelpfulGuide = await page.getByText(/how.*add|import.*media|get.*content/i).isVisible().catch(() => false)

        if (!hasEmptyStateText && !hasAddButton) {
          logIssue(uxIssues, {
            severity: 'major',
            workflow: 'Media',
            issue: 'Media page with no content shows no empty state guidance',
            expected: 'Show "No media yet. Import content to get started" with clear CTA'
          })
        }

        if (!hasAddButton) {
          logIssue(uxIssues, {
            severity: 'major',
            workflow: 'Media',
            issue: 'No clear action button to add first media item',
            expected: 'Prominent "Add Media" or "Import" button in empty state'
          })
        }

        await page.screenshot({ path: 'test-results/ux-audit-media-empty.png' })

      } finally {
        await context.close()
      }
    })

    test('Notes page shows helpful empty state', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        await page.goto(optionsUrl + '#/notes')
        await page.waitForLoadState('networkidle')

        const hasEmptyState = await page.getByText(/no.*notes|create.*first|get.*started/i).isVisible().catch(() => false)
        const hasCreateButton = await page.getByRole('button', { name: /create|new|add/i }).isVisible().catch(() => false)

        if (!hasEmptyState && !hasCreateButton) {
          logIssue(uxIssues, {
            severity: 'major',
            workflow: 'Notes',
            issue: 'Notes page with no content shows no empty state',
            expected: 'Show welcoming empty state with "Create your first note" CTA'
          })
        }

        await page.screenshot({ path: 'test-results/ux-audit-notes-empty.png' })

      } finally {
        await context.close()
      }
    })

    test('Flashcards page shows helpful empty state', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        await page.goto(optionsUrl + '#/flashcards')
        await page.waitForLoadState('networkidle')

        const hasEmptyState = await page.getByText(/no.*flashcard|no.*deck|create.*first|start.*learning/i).isVisible().catch(() => false)
        const hasCreateButton = await page.getByRole('button', { name: /create|new|add|import/i }).isVisible().catch(() => false)

        if (!hasEmptyState) {
          logIssue(uxIssues, {
            severity: 'minor',
            workflow: 'Flashcards',
            issue: 'Flashcards empty state lacks motivational messaging',
            expected: 'Show benefits: "Create flashcards to retain what you learn"'
          })
        }

        await page.screenshot({ path: 'test-results/ux-audit-flashcards-empty.png' })

      } finally {
        await context.close()
      }
    })
  })

  test.describe('5. Error States & Recovery', () => {
    test('server disconnection shows clear error with retry option', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl: 'http://localhost:9999', // Non-existent server
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        await page.goto(optionsUrl)
        await page.waitForLoadState('networkidle')

        // Check for connection error indication
        const hasErrorIndicator = await page.getByText(/cannot.*connect|connection.*failed|offline|unreachable|error/i).isVisible().catch(() => false)
        const hasRetryButton = await page.getByRole('button', { name: /retry|try.*again|reconnect/i }).isVisible().catch(() => false)
        const hasSettingsLink = await page.getByRole('link', { name: /settings|configure/i }).or(page.getByRole('button', { name: /settings|configure/i })).isVisible().catch(() => false)

        if (!hasErrorIndicator) {
          logIssue(uxIssues, {
            severity: 'critical',
            workflow: 'Error Recovery',
            issue: 'Server connection failure shows no error message',
            expected: 'Clear error: "Cannot connect to server. Check your settings or retry."'
          })
        }

        if (!hasRetryButton) {
          logIssue(uxIssues, {
            severity: 'major',
            workflow: 'Error Recovery',
            issue: 'No retry button when server is unreachable',
            expected: 'Prominent "Retry Connection" button for easy recovery'
          })
        }

        if (!hasSettingsLink) {
          logIssue(uxIssues, {
            severity: 'minor',
            workflow: 'Error Recovery',
            issue: 'No link to settings to fix connection issues',
            expected: 'Link to "Check Settings" for users to verify server URL'
          })
        }

        await page.screenshot({ path: 'test-results/ux-audit-connection-error.png' })

      } finally {
        await context.close()
      }
    })

    test('invalid API key shows helpful error message', async ({ uxIssues }) => {
      const { context, openSidepanel } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey: 'invalid-key-12345'
          }
        }
      })

      try {
        const sidepanel = await openSidepanel()
        await sidepanel.waitForLoadState('networkidle')

        // Try to use a feature that requires auth
        const messageInput = sidepanel.getByPlaceholder(/type.*message/i).or(sidepanel.getByRole('textbox')).first()

        if (await messageInput.isVisible()) {
          await messageInput.fill('test')
          await messageInput.press('Enter')

          const hasAuthError = await sidepanel.getByText(/invalid.*key|unauthorized|authentication.*failed|401/i).isVisible().catch(() => false)
          const hasFixLink = await sidepanel.getByRole('button', { name: /update.*key|fix|settings/i }).or(sidepanel.getByRole('link', { name: /settings/i })).isVisible().catch(() => false)

          if (!hasAuthError) {
            logIssue(uxIssues, {
              severity: 'major',
              workflow: 'Error Recovery',
              issue: 'Invalid API key error is not clearly communicated',
              expected: 'Clear message: "Authentication failed. Please check your API key."'
            })
          }

          if (!hasFixLink) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Error Recovery',
              issue: 'No quick link to fix authentication issues',
              expected: 'Button/link to open settings and update API key'
            })
          }
        }

        await sidepanel.screenshot({ path: 'test-results/ux-audit-auth-error.png' })

      } finally {
        await context.close()
      }
    })
  })

  test.describe('6. Settings Configuration UX', () => {
    test('settings are organized logically with clear labels', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        await page.goto(optionsUrl + '#/settings')
        await page.waitForLoadState('networkidle')

        // Check for settings categories
        const hasCategories = await page.locator('h2, h3, [role="heading"]').count() > 0
        if (!hasCategories) {
          logIssue(uxIssues, {
            severity: 'minor',
            workflow: 'Settings',
            issue: 'Settings page lacks clear section headings',
            expected: 'Group settings under clear headings: "Connection", "Appearance", etc.'
          })
        }

        // Check for form labels
        const inputs = page.locator('input:visible, select:visible, textarea:visible')
        const inputCount = await inputs.count()

        for (let i = 0; i < Math.min(inputCount, 5); i++) {
          const input = inputs.nth(i)
          const id = await input.getAttribute('id')
          const ariaLabel = await input.getAttribute('aria-label')
          const placeholder = await input.getAttribute('placeholder')

          if (!id && !ariaLabel && !placeholder) {
            logIssue(uxIssues, {
              severity: 'major',
              workflow: 'Settings',
              issue: 'Settings input lacks accessible label',
              expected: 'All form inputs should have associated labels for accessibility'
            })
            break
          }
        }

        await page.screenshot({ path: 'test-results/ux-audit-settings.png' })

      } finally {
        await context.close()
      }
    })

    test('save actions provide clear feedback', async ({ uxIssues }) => {
      const { context, page, optionsUrl } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        await page.goto(optionsUrl + '#/settings')
        await page.waitForLoadState('networkidle')

        // Look for a save button
        const saveButton = page.getByRole('button', { name: /save|apply|update/i })
        const hasSaveButton = await saveButton.isVisible().catch(() => false)

        if (hasSaveButton) {
          await saveButton.click()

          // Check for save confirmation
          const hasSuccessToast = await page.getByText(/saved|updated|success/i).isVisible().catch(() => false)
          const hasSuccessIndicator = await page.locator('.toast, .notification, [role="alert"], [class*="success"]').isVisible().catch(() => false)

          if (!hasSuccessToast && !hasSuccessIndicator) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Settings',
              issue: 'Save action provides no confirmation feedback',
              expected: 'Toast notification or inline message confirming "Settings saved"'
            })
          }
        } else {
          // Check for auto-save indication
          const hasAutoSave = await page.getByText(/auto.*save|changes.*saved.*automatic/i).isVisible().catch(() => false)
          if (!hasAutoSave) {
            logIssue(uxIssues, {
              severity: 'enhancement',
              workflow: 'Settings',
              issue: 'Unclear whether settings auto-save or require manual save',
              expected: 'Either show save button or indicate "Changes are saved automatically"'
            })
          }
        }

      } finally {
        await context.close()
      }
    })
  })

  test.describe('7. Sidepanel Quick Actions', () => {
    test('sidepanel actions are discoverable', async ({ uxIssues }) => {
      const { context, openSidepanel } = await launchExtension({
        seedConfig: {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey
          }
        }
      })

      try {
        const sidepanel = await openSidepanel()
        await sidepanel.waitForLoadState('networkidle')

        // Check for main action buttons
        const ingestButton = sidepanel.getByRole('button', { name: /ingest|add|import/i })
        const settingsButton = sidepanel.getByRole('button', { name: /settings|gear|cog/i }).or(sidepanel.locator('[aria-label*="settings" i]'))
        const newChatButton = sidepanel.getByRole('button', { name: /new.*chat|clear|reset/i })

        const hasIngest = await ingestButton.isVisible().catch(() => false)
        const hasSettings = await settingsButton.isVisible().catch(() => false)
        const hasNewChat = await newChatButton.isVisible().catch(() => false)

        if (!hasIngest) {
          logIssue(uxIssues, {
            severity: 'enhancement',
            workflow: 'Sidepanel',
            issue: 'Quick ingest/import action not visible in sidepanel',
            expected: 'Easy access to import content without leaving sidepanel'
          })
        }

        if (!hasSettings) {
          logIssue(uxIssues, {
            severity: 'minor',
            workflow: 'Sidepanel',
            issue: 'Settings access not visible in sidepanel',
            expected: 'Gear icon or menu to access extension settings'
          })
        }

        // Check for tooltips on icon buttons
        const iconButtons = sidepanel.locator('button:not(:has-text("."))').or(sidepanel.locator('[role="button"]'))
        const iconButtonCount = await iconButtons.count()

        for (let i = 0; i < Math.min(iconButtonCount, 3); i++) {
          const btn = iconButtons.nth(i)
          const title = await btn.getAttribute('title')
          const ariaLabel = await btn.getAttribute('aria-label')
          const innerText = await btn.innerText()

          if (!title && !ariaLabel && !innerText.trim()) {
            logIssue(uxIssues, {
              severity: 'minor',
              workflow: 'Sidepanel',
              issue: 'Icon button lacks tooltip or accessible label',
              expected: 'All icon buttons should have title or aria-label for clarity'
            })
            break
          }
        }

        await sidepanel.screenshot({ path: 'test-results/ux-audit-sidepanel.png' })

      } finally {
        await context.close()
      }
    })
  })
})
