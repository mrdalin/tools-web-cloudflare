import { expect, test } from '@playwright/test'

test('returns to the same homepage position from a tool', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('.tool-card[href="/colorpicker"]')
  const scrollY = () => page.evaluate(() => scrollY)
  for (const back of ['tool', 'browser']) {
    await card.scrollIntoViewIfNeeded()
    const before = await scrollY()
    expect(before).toBeGreaterThan(500)
    await card.click()
    await expect(page).toHaveURL(/\/colorpicker$/)
    const returnButton = page.getByRole('button', { name: '返回', exact: true })
    await expect(returnButton).toBeVisible()
    if (back === 'tool') await returnButton.click()
    else await page.goBack()
    await expect(page).toHaveURL(url => url.pathname === '/')
    await expect(card).toBeVisible()
    await expect.poll(async () => Math.abs(await scrollY() - before)).toBeLessThanOrEqual(1)
  }
})

test('keeps the dragged order and deleted item after reloading', async ({ page, context, isMobile }) => {
  await page.goto('/')
  const section = page.getByRole('region', { name: '常用功能', exact: true })
  const cards = section.locator('[data-frequent-tool]')
  const order = () => cards.evaluateAll(items => items.map(item => item.getAttribute('data-frequent-tool')))
  await expect(cards).toHaveCount(8)
  await section.getByRole('button', { name: '管理常用功能' }).click()
  const before = await order()
  const handle = section.locator('.frequent-tool-drag').first()
  await handle.scrollIntoViewIfNeeded()
  const active = (await handle.boundingBox())!
  const target = (await cards.nth(2).boundingBox())!
  const start = { x: active.x + active.width / 2, y: active.y + active.height / 2 }
  const end = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  if (isMobile) {
    const session = await context.newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    for (let step = 1; step <= 8; step++) {
      const point = { x: start.x + (end.x - start.x) * step / 8, y: start.y + (end.y - start.y) * step / 8 }
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await session.detach()
  } else {
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 8 })
    await page.mouse.up()
  }
  await expect.poll(order).toEqual([before[1], before[2], before[0], ...before.slice(3)])
  const removed = await cards.first().getAttribute('data-frequent-tool')
  await cards.first().getByRole('button', { name: /^移除/ }).click()
  await expect(cards).toHaveCount(7)
  const after = await order()
  expect(after).not.toContain(removed)
  await page.reload()
  await expect.poll(order).toEqual(after)
})

test('opens an internal tool with the search keyboard controls', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('combobox')
  await search.fill('json')
  await expect(page.getByRole('option').first()).toBeVisible()
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(page).toHaveURL(/\/json$/)
  await expect(page.getByRole('button', { name: '返回', exact: true })).toBeVisible()
})
