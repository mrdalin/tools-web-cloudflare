import { expect, test } from '@playwright/test'
import { createHmac } from 'node:crypto'

const decodeSegment = (segment: string) => JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
const sign = (algorithm: string, secret: string, input: string) =>
  createHmac(algorithm, secret).update(input).digest('base64url')

test('generates a standards-compliant HMAC JWT, verifies it, and clears it for invalid payloads', async ({ page }) => {
  await page.goto('/jwt')
  await expect(page.getByRole('tab', { name: 'JWT生成' })).toBeVisible()
  await expect(page.getByText('Header(头部)', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'JWT生成' }).click()

  const payload = page.getByPlaceholder('请输入JWT载荷信息')
  await page.getByPlaceholder('请输入签名密钥').fill('browser-test-secret')
  await payload.fill('{"iss":"example.com","sub":"user","aud":"example.com"}')
  await expect(page.getByText('生成的JWT Token', { exact: true })).toBeVisible()
  const token = await page.locator('textarea[readonly]').last().inputValue()
  const parts = token.split('.')
  expect(parts).toHaveLength(3)
  expect(decodeSegment(parts[0])).toMatchObject({ alg: 'HS256', typ: 'JWT' })
  expect(decodeSegment(parts[1])).toMatchObject({ iss: 'example.com', sub: 'user', aud: 'example.com' })
  expect(parts[2]).toBe(sign('sha256', 'browser-test-secret', `${parts[0]}.${parts[1]}`))

  await page.getByRole('tab', { name: 'JWT解析' }).click()
  await page.getByPlaceholder('请输入Token').fill(token)
  await page.getByRole('button', { name: '解析', exact: true }).click()
  await page.getByPlaceholder('请输入用于校验的Secret').fill('browser-test-secret')
  await page.getByRole('button', { name: '校验签名' }).click()
  await expect(page.getByText('✓ 签名校验成功', { exact: true })).toBeVisible()
  await page.getByPlaceholder('请输入用于校验的Secret').fill('wrong-secret')
  await page.getByRole('button', { name: '校验签名' }).click()
  await expect(page.getByText('✗ 签名校验失败', { exact: true })).toBeVisible()

  await page.getByPlaceholder('请输入用于校验的Secret').fill('browser-test-secret')
  await page.evaluate(() => {
    const subtle = crypto.subtle as SubtleCrypto & { releaseKeyImport?: () => void; keyImportStarted?: boolean }
    const originalImportKey = subtle.importKey.bind(subtle)
    Object.defineProperty(subtle, 'importKey', {
      configurable: true,
      value: (...args: Parameters<SubtleCrypto['importKey']>) => new Promise<CryptoKey>((resolve, reject) => {
        subtle.keyImportStarted = true
        subtle.releaseKeyImport = () => { void originalImportKey(...args).then(resolve, reject) }
      }),
    })
  })
  await page.getByRole('button', { name: '校验签名' }).click()
  await expect.poll(() => page.evaluate(() => (crypto.subtle as any).keyImportStarted)).toBe(true)
  await page.getByPlaceholder('请输入用于校验的Secret').fill('changed-secret')
  await page.evaluate(() => (crypto.subtle as any).releaseKeyImport())
  await expect(page.getByText('✗ 签名校验失败', { exact: true })).toHaveCount(0)
  await page.evaluate(() => {
    delete (crypto.subtle as any).importKey
    delete (crypto.subtle as any).releaseKeyImport
    delete (crypto.subtle as any).keyImportStarted
  })

  await page.getByRole('tab', { name: 'JWT生成' }).click()
  const header = page.getByPlaceholder('请输入JWT头部信息')
  for (const [alg, hash] of [['HS384', 'sha384'], ['HS512', 'sha512']] as const) {
    await header.fill(JSON.stringify({ alg, typ: 'JWT' }))
    await page.getByRole('button', { name: '生成JWT' }).click()
    await expect.poll(async () => {
      const generated = (await page.locator('textarea[readonly]').last().inputValue()).split('.')
      return generated.length === 3 && decodeSegment(generated[0]).alg === alg
    }).toBe(true)
    const generated = (await page.locator('textarea[readonly]').last().inputValue()).split('.')
    expect(generated[2]).toBe(sign(hash, 'browser-test-secret', `${generated[0]}.${generated[1]}`))
  }

  await payload.fill('{ invalid json')
  await expect(page.getByText('生成的JWT Token', { exact: true })).toHaveCount(0)

  await payload.fill('{"iss":"example.com","sub":"user","aud":"example.com"}')
  await page.getByPlaceholder('请输入签名密钥').fill('')
  await page.getByRole('button', { name: '生成JWT' }).click()
  await expect(page.getByText('请输入签名密钥', { exact: true })).toBeVisible()
  await expect(page.getByText('生成的JWT Token', { exact: true })).toHaveCount(0)
})
