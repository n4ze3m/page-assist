import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('TTS Playground UX', () => {
  let server: MockTldwServer

  test.beforeAll(async () => {
    server = new MockTldwServer({
      '/api/v1/audio/providers': (_req, res) => {
        const body = {
          providers: {
            kokoro: {
              provider_name: 'kokoro',
              supports_streaming: true,
              supports_voice_cloning: false,
              supports_ssml: false,
              supports_speech_rate: true,
              supports_emotion_control: false
            }
          },
          voices: {
            kokoro: [
              { id: 'af_heart', name: 'Heart', language: 'en' },
              { id: 'af_bella', name: 'Bella', language: 'en' }
            ]
          }
        }
        res.writeHead(200, {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
          'access-control-allow-credentials': 'true'
        })
        res.end(JSON.stringify(body))
      }
    })
    await server.start()
  })

  test.afterAll(async () => {
    await server.stop()
  })

  test('shows provider-specific settings and lets user play sample text', async () => {
    const extPath = path.resolve('build/chrome-mv3')
    const { context, page, optionsUrl } = await launchWithExtension(extPath)

    // Configure mock tldw server URL (no auth required for this test)
    await page.goto(optionsUrl + '#/settings/tldw', {
      waitUntil: 'domcontentloaded'
    })
    await page.getByLabel('Server URL').fill(server.url)
    await page.getByRole('button', { name: 'Save' }).click()

    // Navigate to TTS Playground
    await page.goto(optionsUrl + '#/tts', {
      waitUntil: 'domcontentloaded'
    })

    // Provider summary and settings form should be visible
    await expect(page.getByText(/Current provider/i)).toBeVisible()
    await expect(page.getByText(/Text to speech/i)).toBeVisible()

    // Switch provider to tldw to reveal server-driven options
    await page.getByText('Text to speech').scrollIntoViewIfNeeded()
    const providerSelect = page.getByText('Browser TTS', { exact: false })
    await providerSelect.click()
    await page
      .getByRole('option', {
        name: /tldw server \(audio\/speech\)/i
      })
      .click()

    // tldw-specific fields should appear (model, voice, response format, speed)
    await expect(page.getByText(/TTS Model/i)).toBeVisible()
    await expect(page.getByText(/TTS Voice/i)).toBeVisible()
    await expect(page.getByText(/Response format/i)).toBeVisible()
    await expect(page.getByText(/Synthesis speed/i)).toBeVisible()

    // Enter some sample text and play it
    const textarea = page.getByPlaceholder(
      /Type or paste text here, then use Play to listen./i
    )
    await textarea.fill('Hello from the TTS playground test')

    const playButton = page.getByRole('button', { name: /Play/i })
    await playButton.click()

    // We cannot assert on actual audio, but the button should flip to "Playing…" briefly
    await expect(
      page.getByRole('button', { name: /Playing…/i })
    ).toBeVisible({ timeout: 10_000 })

    await context.close()
  })

  test('shows tldw provider capabilities and voices preview from /audio/providers', async () => {
    const extPath = path.resolve('build/chrome-mv3')
    const { context, page, optionsUrl } = await launchWithExtension(extPath)

    // Configure mock tldw server URL
    await page.goto(optionsUrl + '#/settings/tldw', {
      waitUntil: 'domcontentloaded'
    })
    await page.getByLabel('Server URL').fill(server.url)
    await page.getByRole('button', { name: 'Save' }).click()

    // Go to TTS Playground
    await page.goto(optionsUrl + '#/tts', {
      waitUntil: 'domcontentloaded'
    })

    // Switch provider to tldw and save settings so the playground summary uses tldw config
    await page.getByText('Text to speech').scrollIntoViewIfNeeded()
    const providerSelect = page.getByText('Browser TTS', { exact: false })
    await providerSelect.click()
    await page
      .getByRole('option', {
        name: /tldw server \(audio\/speech\)/i
      })
      .click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Wait for tldw audio to be detected so /api/v1/audio/providers is queried
    await expect(
      page.getByText(/audio API detected/i)
    ).toBeVisible({ timeout: 15_000 })

    // Provider capabilities row should be visible
    await expect(
      page.getByText(/Provider capabilities/i)
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Streaming/i)).toBeVisible()
    await expect(page.getByText(/Speed control/i)).toBeVisible()

    // Voices preview should show server voices and one of the mocked names
    await expect(page.getByText(/Server voices/i)).toBeVisible()
    await expect(page.getByText(/Heart/)).toBeVisible()

    // Popover trigger for raw provider config should be present
    await expect(
      page.getByRole('button', { name: /View raw provider config/i })
    ).toBeVisible()

    await context.close()
  })
})
