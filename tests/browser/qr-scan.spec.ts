import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const fixture = readFileSync(new URL('./qr-fixture.gif', import.meta.url))
const marker = 'Youngbar QR regression 2026-11-19'

async function openScanner(page: Page) {
  const response = await page.goto('/qrcode-scan')
  expect(response?.ok()).toBe(true)
  const headers = await response!.allHeaders()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['content-security-policy']).not.toContain("'unsafe-eval'")
  expect(headers['permissions-policy']).toContain('camera=(self)')
}

test('decodes QR images and distinguishes an empty image from an invalid file', async ({ page }) => {
  await openScanner(page)
  const picker = page.getByLabel('选择图片')
  await picker.setInputFiles({ name: 'qr.gif', mimeType: 'image/gif', buffer: fixture })
  await expect(page.getByText(marker, { exact: true })).toBeVisible()
  const status = page.getByRole('status')
  await expect(status).toHaveText('二维码识别成功')

  const emptyBytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!)))
    return [...new Uint8Array(await blob.arrayBuffer())]
  })
  await picker.setInputFiles({ name: 'empty.png', mimeType: 'image/png', buffer: Buffer.from(emptyBytes) })
  await expect(status).toContainText('未识别到二维码')
  await expect(page.getByText(marker, { exact: true })).toHaveCount(0)

  const emptyImage = await page.evaluateHandle(bytes => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([new Uint8Array(bytes)], 'empty.png', { type: 'image/png' }))
    return transfer
  }, emptyBytes)
  await page.getByTestId('qr-image-drop').dispatchEvent('drop', { dataTransfer: emptyImage })
  await emptyImage.dispose()
  await expect(status).toContainText('未识别到二维码')
  await expect(page.getByText(marker, { exact: true })).toHaveCount(0)

  await picker.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(status).toContainText('图片读取失败')

  const qrImage = await page.evaluateHandle(bytes => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([new Uint8Array(bytes)], 'qr.gif', { type: 'image/gif' }))
    return transfer
  }, [...fixture])
  await page.getByTestId('qr-image-drop').dispatchEvent('drop', { dataTransfer: qrImage })
  await qrImage.dispose()
  await expect(page.getByText(marker, { exact: true })).toBeVisible()
})

test('releases the camera on tab switch, stop, permission delays, and page exit', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openScanner(page)
  await page.evaluate(() => {
    const requests: Array<{ track: MediaStreamTrack; allow: () => void }> = []
    Object.assign(window, { cameraRequests: requests })
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const stream = canvas.captureStream(10)
      requests.push({
        track: stream.getVideoTracks()[0],
        allow: () => {
          canvas.getContext('2d')!.fillRect(0, 0, 640, 480)
          resolve(stream)
        },
      })
    })
  })
  const start = page.getByRole('button', { name: '开始扫描', exact: true })
  const stop = page.getByRole('button', { name: '停止扫描', exact: true })
  const camera = page.getByRole('tab', { name: '摄像头扫描' })
  const image = page.getByRole('tab', { name: '图片识别' })
  const tracks = () => page.evaluate(() => (window as any).cameraRequests.map(request => request.track.readyState))
  const allow = (id: number) => page.evaluate(id => (window as any).cameraRequests[id].allow(), id)
  const previewReady = () => page.locator('video').evaluate(video => Boolean((video as HTMLVideoElement).srcObject))

  await camera.click()
  expect(await tracks()).toHaveLength(0)
  await start.click()
  await expect.poll(tracks).toEqual(['live'])
  await allow(0)
  await expect.poll(previewReady).toBe(true)
  await image.click()
  await expect.poll(tracks).toEqual(['ended'])

  await camera.click()
  await expect(start).toBeEnabled()
  expect(await tracks()).toHaveLength(1)
  await start.click()
  await expect.poll(tracks).toEqual(['ended', 'live'])
  await image.click()
  await allow(1)
  await expect.poll(tracks).toEqual(['ended', 'ended'])

  await camera.click()
  await start.click()
  await expect.poll(tracks).toHaveLength(3)
  await allow(2)
  await expect.poll(previewReady).toBe(true)
  await stop.click()
  await expect.poll(tracks).toEqual(['ended', 'ended', 'ended'])

  await start.click()
  await expect.poll(tracks).toHaveLength(4)
  await allow(3)
  await expect.poll(previewReady).toBe(true)
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page).toHaveURL(url => url.pathname === '/image-tools')
  await expect.poll(tracks).toEqual(['ended', 'ended', 'ended', 'ended'])
  expect(errors).toEqual([])
})

test('reads a QR code from a camera frame and stops the camera', async ({ page }) => {
  await openScanner(page)
  await page.evaluate(async bytes => {
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/gif' }))
    const image = new Image()
    image.src = url
    await image.decode()
    URL.revokeObjectURL(url)
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 640
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      const stream = canvas.captureStream(10)
      const track = stream.getVideoTracks()[0]
      Object.assign(window, { qrCameraTrack: track })
      const render = () => {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 640, 640)
        ctx.drawImage(image, 80, 80, 480, 480)
        if (track.readyState === 'live') setTimeout(render, 100)
      }
      render()
      return stream
    }
  }, [...fixture])
  await page.getByRole('tab', { name: '摄像头扫描' }).click()
  const start = page.getByRole('button', { name: '开始扫描', exact: true })
  await start.click()
  await expect(page.getByText(marker, { exact: true })).toBeVisible()
  await expect(start).toBeEnabled()
  expect(await page.evaluate(() => (window as any).qrCameraTrack.readyState)).toBe('ended')
})
