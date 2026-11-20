import { expect, test } from '@playwright/test'

const categories = [
  [2, '/developer-tools', '开发运维', 28],
  [3, '/text-tools', '文本处理', 11],
  [4, '/education-tools', '教育学术', 29],
  [5, '/image-tools', '图片处理', 17],
  [8, '/data-tools', '数据图表', 4],
  [11, '/fun-tools', '趣味互动', 22],
  [9, '/random-tools', '选择随机', 5],
  [7, '/other-tools', '其他工具', 10],
  [12, '/useful-websites', '好物网站', 1],
  [13, '/productivity-tools', '内容管理', 13],
] as const

test('opens every legacy category as its independent page with only its own tools', async ({ page, request }) => {
  for (const [id, path, title, count] of categories) {
    const redirect = await request.get(`/?value=cate_${id}`, { maxRedirects: 0 })
    expect(redirect.status()).toBe(301)
    expect(new URL(redirect.headers().location).pathname).toBe(path)
    const response = await page.goto(`/?value=cate_${id}`)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(url => url.pathname === path && !url.search)
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible()
    await expect(page.locator('.tool-card')).toHaveCount(count)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://youngbar.com${path}`)
    await expect(page.locator('.tool-card[href*="?"]')).toHaveCount(0)
    await expect(page.locator('.tool-card[href$="/"]')).toHaveCount(0)
  }
})

test('keeps the homepage URL stable while scrolling and follows real category links', async ({ page, isMobile }) => {
  await page.goto('/')
  const category = page.locator('.category-title[href="/image-tools"]')
  await category.scrollIntoViewIfNeeded()
  await expect(page).toHaveURL(url => url.pathname === '/' && !url.search)
  await category.click()
  await expect(page.getByRole('heading', { name: '图片处理', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/image-tools$/)
  await page.reload()
  await expect(page.getByRole('heading', { name: '图片处理', exact: true })).toBeVisible()
  // The same links are used by the desktop sidebar and the mobile drawer.
  if (isMobile) {
    await page.getByRole('button', { name: '打开分类菜单' }).click()
  }
  const menu = page.locator(isMobile ? '.el-drawer' : '.el-aside')
  await menu.getByRole('link', { name: '文本处理', exact: true }).click()
  await expect(page).toHaveURL(/\/text-tools$/)
  await expect(page.getByRole('heading', { name: '文本处理', exact: true })).toBeVisible()
  if (isMobile) await expect(page.locator('.el-drawer')).not.toBeVisible()
})

test('returns to the same category position and preserves the homepage history', async ({ page }) => {
  await page.goto('/')
  const category = page.locator('.category-title[href="/education-tools"]')
  await category.scrollIntoViewIfNeeded()
  const homeTop = await page.evaluate(() => scrollY)
  await category.click()
  await expect(page.getByRole('heading', { name: '教育学术', exact: true })).toBeVisible()
  const card = page.locator('.tool-card').last()
  const path = await card.getAttribute('href')
  for (const back of ['tool', 'browser']) {
    await card.scrollIntoViewIfNeeded()
    const top = await page.evaluate(() => scrollY)
    expect(top).toBeGreaterThan(100)
    await card.click()
    await expect(page).toHaveURL(url => url.pathname === path)
    const backButton = page.getByRole('button', { name: '返回', exact: true })
    await expect(backButton).toBeVisible()
    if (back === 'tool') await backButton.click()
    else await page.goBack()
    await expect(page).toHaveURL(/\/education-tools$/)
    await expect(card).toBeVisible()
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(top)
  }
  await page.goBack()
  await expect(page).toHaveURL(url => url.pathname === '/')
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(homeTop)
})

test('returns directly opened tools to their category without creating parameter URLs', async ({ page }) => {
  await page.goto('/randompassword')
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page).toHaveURL(/\/developer-tools$/)
  await expect(page.getByRole('heading', { name: '开发运维', exact: true })).toBeVisible()
})
