import { _electron as electron, expect, test } from '@playwright/test'

test('launches the splash window with a working preload bridge', async () => {
  const app = await electron.launch({ args: ['.'] })

  const window = await app.firstWindow()

  await expect(window).toHaveTitle('JioHotstar')
  await expect(window.getByTestId('app-name')).toHaveText('JioHotstar')
  await expect(window.getByTestId('status')).toContainText('v0.1.0')

  await app.close()
})
