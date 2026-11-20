<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import jsQR from 'jsqr'
import { ElMessage } from 'element-plus'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { Camera, Upload, CopyDocument, Delete } from '@element-plus/icons-vue'

const activeTab = ref('upload')
const scanResult = ref('')
const isScanning = ref(false)
const video = ref<HTMLVideoElement | null>(null)
const imageStatus = ref<'reading' | 'found' | 'empty' | 'error' | ''>('')
const imageMessage = {
  reading: '正在识别图片…',
  found: '二维码识别成功',
  empty: '未识别到二维码，请换一张更清晰的图片',
  error: '图片读取失败，请选择可打开的图片',
  '': '',
}
let imageRequest = 0
let cameraRequest = 0
let stream: MediaStream | null = null
let scanTimer: ReturnType<typeof setTimeout> | undefined

const readQrCode = (
  context: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
) => {
  // Bound the amount of pixel data the decoder has to process on mobile.
  const scale = Math.min(1, 2048 / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  if (context.canvas.width !== w) context.canvas.width = w
  if (context.canvas.height !== h) context.canvas.height = h
  context.fillStyle = '#fff'
  context.fillRect(0, 0, w, h)
  context.drawImage(source, 0, 0, w, h)
  return jsQR(context.getImageData(0, 0, w, h).data, w, h)?.data ?? ''
}

const readImage = async (file: File) => {
  const request = ++imageRequest
  scanResult.value = ''
  imageStatus.value = 'reading'
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (request !== imageRequest) return
    const context = document.createElement('canvas').getContext('2d')!
    scanResult.value = readQrCode(context, image, image.naturalWidth, image.naturalHeight)
    imageStatus.value = scanResult.value ? 'found' : 'empty'
  } catch {
    if (request === imageRequest) imageStatus.value = 'error'
  } finally {
    URL.revokeObjectURL(url)
  }
}

const selectImage = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void readImage(file)
}

const dropImage = (event: DragEvent) => {
  const file = event.dataTransfer?.files[0]
  if (file) void readImage(file)
}

const stopScan = () => {
  ++cameraRequest
  clearTimeout(scanTimer)
  stream?.getTracks().forEach(track => track.stop())
  stream = null
  if (video.value) video.value.srcObject = null
  isScanning.value = false
}

const startScan = async () => {
  const preview = video.value
  if (isScanning.value || activeTab.value !== 'camera' || !preview) return
  const request = ++cameraRequest
  isScanning.value = true

  try {
    const pendingStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
    })
    // Permission may resolve after leaving the tab or even the tool page.
    if (request !== cameraRequest) {
      pendingStream.getTracks().forEach(track => track.stop())
      return
    }
    stream = pendingStream
    for (const track of stream.getVideoTracks()) {
      track.addEventListener('ended', () => {
        if (request === cameraRequest) stopScan()
      }, { once: true })
    }
    preview.srcObject = stream
    await preview.play()
  } catch {
    if (request !== cameraRequest) return
    stopScan()
    ElMessage.error('无法打开摄像头，请检查设备和浏览器权限，或使用图片识别')
    return
  }

  if (request !== cameraRequest) return
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const scanFrame = () => {
    if (request !== cameraRequest) return
    try {
      if (preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && preview.videoWidth && preview.videoHeight) {
        const result = readQrCode(context, preview, preview.videoWidth, preview.videoHeight)
        if (result) {
          scanResult.value = result
          ElMessage.success('二维码识别成功！')
          stopScan()
          return
        }
      }
      scanTimer = setTimeout(scanFrame, 350)
    } catch {
      stopScan()
      ElMessage.error('扫描失败，请重试')
    }
  }
  scanFrame()
}

watch(activeTab, tab => {
  if (tab === 'camera') {
    ++imageRequest
    imageStatus.value = ''
  } else {
    stopScan()
  }
}, { flush: 'sync' })

onBeforeUnmount(() => {
  ++imageRequest
  stopScan()
})

// 复制结果
const copyResult = async () => {
  if (!scanResult.value) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  
  try {
    await navigator.clipboard.writeText(scanResult.value)
    ElMessage.success('复制成功！')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 清空结果
const clearResult = () => {
  scanResult.value = ''
  imageStatus.value = ''
  ElMessage.success('已清空结果')
}

const resultLink = computed(() => {
  try {
    const url = new URL(scanResult.value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
})

const openLink = () => {
  if (resultLink.value) window.open(resultLink.value, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="flex flex-col mt-3 ml-4 flex-1 mr-3">
    <DetailHeader title="二维码识别" />

    <div class="p-6 rounded-2xl bg-white shadow-sm">
      <!-- 识别方式选择 -->
      <el-tabs v-model="activeTab" class="mb-6">
        <el-tab-pane label="图片识别" name="upload">
          <div class="text-center">
            <h3 class="text-lg font-medium text-gray-900 mb-4">图片识别</h3>
            
            <div class="max-w-md mx-auto" data-testid="qr-image-drop" @dragover.prevent @drop.prevent="dropImage">
              <input id="qr-image-file" type="file" accept="image/*" aria-label="选择图片" class="sr-only peer" @change="selectImage" />
              <label for="qr-image-file" class="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600">
                <el-icon class="text-4xl text-gray-400 mb-4"><Upload /></el-icon>
                <span class="block font-medium text-gray-700">选择图片或拖拽图片到此处</span>
                <span class="block mt-1 text-sm text-gray-500">PNG、JPG、GIF 等</span>
              </label>
              <p role="status" class="mt-3 min-h-[1.25rem] text-sm" :class="{
                'text-red-700': imageStatus === 'error',
                'text-amber-700': imageStatus === 'empty',
                'text-green-700': imageStatus === 'found',
                'text-gray-500': imageStatus === 'reading',
              }">{{ imageMessage[imageStatus] }}</p>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="摄像头扫描" name="camera">
          <div class="text-center">
            <h3 class="text-lg font-medium text-gray-900 mb-4">摄像头扫描识别</h3>
            
            <!-- 扫描区域 -->
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 max-w-md mx-auto">
              <video v-show="isScanning" ref="video" class="block w-full aspect-[4/3] bg-gray-900 object-contain rounded" autoplay muted playsinline />
              <div v-if="!isScanning" class="text-center py-8">
                <el-icon class="text-4xl text-gray-400 mb-4">
                  <Camera />
                </el-icon>
                <p class="text-gray-500">点击开始扫描按钮开始识别二维码</p>
              </div>
            </div>

            <!-- 控制按钮 -->
            <div class="space-x-4">
              <el-button 
                type="primary" 
                @click="startScan"
                :disabled="isScanning"
              >
                开始扫描
              </el-button>
              <el-button 
                @click="stopScan"
                :disabled="!isScanning"
              >
                停止扫描
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- 识别结果 -->
      <div v-if="scanResult" class="border-t pt-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-lg font-medium text-gray-900">识别结果：</h4>
          <div class="space-x-2">
            <el-button 
              size="small" 
              @click="clearResult"
              type="danger"
            >
              <el-icon><Delete /></el-icon>
              清空结果
            </el-button>
            <el-button 
              size="small" 
              type="primary"
              @click="copyResult"
            >
              <el-icon><CopyDocument /></el-icon>
              复制结果
            </el-button>
          </div>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-700 break-all whitespace-pre-wrap">{{ scanResult }}</p>
        </div>
        
        <!-- 如果是链接，提供打开链接的按钮 -->
        <div v-if="resultLink" class="mt-4">
          <el-button 
            type="success" 
            @click="openLink"
          >
            打开链接
          </el-button>
        </div>
      </div>
    </div>

    <!-- 工具详情 -->
    <ToolDetail title="描述">
      <el-text>
        二维码识别工具，支持多种识别方式：<br><br>
        
        摄像头扫描：实时扫描识别二维码，适用于手机、电脑等设备<br>
        图片识别：支持点击上传或拖拽图片进行识别<br><br>
        
        支持识别各种类型的二维码内容，包括网址、文本、联系方式等。识别结果支持复制和直接打开链接。
      </el-text>
    </ToolDetail>
  </div>
</template>

<style scoped>
/* 拖拽区域样式 */
.border-dashed:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}
</style>
