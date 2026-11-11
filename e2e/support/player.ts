import type { ElectronApplication, Page } from '@playwright/test'

export async function waitForPlayerWindow(
  app: ElectronApplication,
  timeoutMs = 90_000
): Promise<Page> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    for (const candidate of app.windows()) {
      if (candidate.url().includes('hotstar.com')) {
        return candidate
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error('The player window did not open')
}
