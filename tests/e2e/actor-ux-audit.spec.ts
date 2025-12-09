import { test, expect, type Page } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'
import { waitForConnectionStore, forceConnected } from './utils/connection'

const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

async function openActorDrawer(page: Page) {
  // Open the per-chat settings panel from the Playground composer.
  const chatSettingsButton = page
    .getByRole('button', {
      name: /Current Chat Model Settings|Chat Settings/i
    })
    .first()
  await expect(chatSettingsButton).toBeVisible()
  await chatSettingsButton.click()

  // The Actor section lives inside CurrentChatModelSettings; use the inline switch area.
  const drawer = page
    .getByRole('dialog', { name: /Current Chat Model Settings/i })
    .first()
  await expect(drawer).toBeVisible()

  const actorHeader = drawer.getByText(/Scene Director \(Actor\)/i).first()
  await expect(actorHeader).toBeVisible()

  return drawer
}

test.describe('Scene Director (Actor) – UX audit', () => {
  test('first-time open keeps blades focused and approachable', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl, { waitUntil: 'domcontentloaded' })
      await waitForConnectionStore(page, 'actor-ux-first-open')
      await forceConnected(
        page,
        { serverUrl: 'http://127.0.0.1:8000' },
        'actor-ux-first-open'
      )

      const drawer = await openActorDrawer(page)

      // Header title + help copy set the scene.
      await expect(drawer.getByText(/Scene Director \(Actor\)/i)).toBeVisible()
      await expect(
        drawer.getByText(/Configure per-chat scene context/i)
      ).toBeVisible()

      // Enabled toggle is present but the main focus is the blade stack.
      await expect(drawer.getByRole('switch').first()).toBeVisible()

      // Blade headers summarise the four primary sections.
      await expect(
        drawer.getByRole('button', { name: /Aspects/i })
      ).toBeVisible()
      await expect(
        drawer.getByRole('button', { name: /Scene notes/i })
      ).toBeVisible()
      await expect(
        drawer.getByRole('button', { name: /Placement & templates/i })
      ).toBeVisible()
      await expect(
        drawer.getByRole('button', { name: /Tokens & preview/i })
      ).toBeVisible()

      // By default, Aspects is the active blade; Notes/Placement/Tokens controls stay out of view.
      await expect(
        drawer.getByText(/Add or remove aspects to focus the scene/i)
      ).toBeVisible()

      await expect(drawer.getByLabel(/Scene notes/i)).toHaveCount(0)
      await expect(
        drawer.getByLabel(/Actor prompt position/i)
      ).toHaveCount(0)
      await expect(
        drawer.getByText(/Actor dictionary tokens/i)
      ).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('scene notes blade supports GM-only notes and Markdown preview', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl, { waitUntil: 'domcontentloaded' })
      await waitForConnectionStore(page, 'actor-ux-notes')
      await forceConnected(
        page,
        { serverUrl: 'http://127.0.0.1:8000' },
        'actor-ux-notes'
      )
      const drawer = await openActorDrawer(page)

      // Switch to the Scene notes blade.
      await drawer.getByRole('button', { name: /Scene notes/i }).click()

      const notesArea = drawer.getByLabel(/Scene notes/i)
      await expect(notesArea).toBeVisible()
      await notesArea.fill('GM: **keep this scene tense** but hopeful.')

      // GM-only toggle should be available and operable.
      const gmToggle = drawer.getByLabel(
        /GM-only: do not send notes to the model/i
      )
      await expect(gmToggle).toBeVisible()
      await gmToggle.check()

      // Markdown + LaTeX preview is opt-in and does not distract until enabled.
      const previewToggle = drawer.getByLabel(
        /Show Markdown \+ LaTeX preview/i
      )
      await expect(previewToggle).toBeVisible()
      await previewToggle.check()

      await expect(
        drawer.getByText(/Scene notes preview/i)
      ).toBeVisible()
      const previewStrong = drawer
        .locator('strong')
        .filter({ hasText: /keep this scene tense/i })
      await expect(previewStrong).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('placement blade communicates safe injection controls', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl, { waitUntil: 'domcontentloaded' })
      await waitForConnectionStore(page, 'actor-ux-placement')
      await forceConnected(
        page,
        { serverUrl: 'http://127.0.0.1:8000' },
        'actor-ux-placement'
      )
      const drawer = await openActorDrawer(page)

      await drawer
        .getByRole('button', { name: /Placement & templates/i })
        .click()

      // Placement controls should be visible and depth input should be gated
      // when not using "In-chat at depth".
      await expect(
        drawer.getByText(/Actor prompt position/i)
      ).toBeVisible()
      const depthInput = drawer.getByLabel(/Depth \(non-system messages\)/i)
      await expect(depthInput).toBeDisabled()
      // Inline range help text should be visible to explain safe values.
      await expect(
        drawer.getByText(/Depth must be between 0 and 999/i)
      ).toBeVisible()

      // Template interaction mode helps technical users reason about overrides vs merge.
      await expect(
        drawer.getByLabel(/Scene template interaction/i)
      ).toBeVisible()
      await expect(
        drawer.getByText(
          /Merge keeps both; Override lets Actor replace overlapping fields/i
        )
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('tokens blade surfaces dictionary tokens and copy affordances', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl, { waitUntil: 'domcontentloaded' })
      await waitForConnectionStore(page, 'actor-ux-tokens')
      await forceConnected(
        page,
        { serverUrl: 'http://127.0.0.1:8000' },
        'actor-ux-tokens'
      )
      const drawer = await openActorDrawer(page)

      await drawer
        .getByRole('button', { name: /Tokens & preview/i })
        .click()

      // Prompt preview explains when nothing is being injected yet.
      await expect(
        drawer.getByText(/Actor prompt preview/i)
      ).toBeVisible()
      await expect(
        drawer.getByText(/Nothing to send yet\./i)
      ).toBeVisible()

      // Dictionary tokens give technical users concrete handles to reuse Actor state.
      const tokensHeader = drawer.getByText(/Actor dictionary tokens/i)
      const tokenHelp = drawer.getByText(
        /Use these tokens in prompts and system messages/i
      )

      await expect(tokensHeader).toBeVisible()
      await expect(tokenHelp).toBeVisible()

      // At least one token + Copy button should be present.
      const copyButton = drawer.getByRole('button', { name: /Copy/i }).first()
      await expect(copyButton).toBeVisible()
      await copyButton.click()

      // After copying, the button briefly shows a confirmation state.
      await expect(
        drawer.getByRole('button', { name: /Copied/i })
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
