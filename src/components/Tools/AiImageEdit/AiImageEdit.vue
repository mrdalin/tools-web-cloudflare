<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'

const info = {
  title: 'AI 图片编辑',
  desc: '上传图片并用文字描述想要修改/添加的内容，AI 按描述编辑图片。可同时上传多张参考图。免费使用，基于 Agnes 图像模型。',
}

const prompt = ref('')
const imageFiles = ref<File[]>([])
const previews = ref<string[]>([])
const size = ref('1024x1024')
const isLoading = ref(false)
const resultUrl = ref('')
const errorMsg = ref('')

const sizeOptions = [
  { value: '1024x1024', label: '1:1 方图 (1024×1024)' },
  { value: '1024x1792', label: '9:16 竖版 (1024×1792)' },
  { value: '1792x1024', label: '16:9 横版 (1792×1024)' },
]

const MAX_IMAGES = 16

const canGenerate = computed(() => !isLoading.value && prompt.value.trim().length > 0)

function onFilesChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  const list = Array.from(input.files)
  const remaining = MAX_IMAGES - imageFiles.value.length
  if (remaining <= 0) return
  const add = list.slice(0, remaining)
  for (const f of add) {
    imageFiles.value.push(f)
    previews.value.push(URL.createObjectURL(f))
  }
  input.value = ''
}

function removeImage(index: number) {
  URL.revokeObjectURL(previews.value[index])
  imageFiles.value.splice(index, 1)
  previews.value.splice(index, 1)
}

async function generate() {
  if (!canGenerate.value) return
  isLoading.value = true
  resultUrl.value = ''
  errorMsg.value = ''

  try {
    const fd = new FormData()
    fd.append('prompt', prompt.value)
    fd.append('size', size.value)
    for (const f of imageFiles.value) fd.append('images', f)

    const resp = await fetch('/api/ai-image-edit', { method: 'POST', body: fd })
    const data = await resp.json()
    if (!resp.ok || !data?.ok) {
      throw new Error(data?.error || '图片编辑失败，请稍后重试')
    }
    resultUrl.value = data.data?.url || ''
    if (!resultUrl.value) throw new Error('生成结果为空，请稍后重试')
  } catch (e: any) {
    errorMsg.value = e?.message || '图片编辑失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title" />

    <div class="p-4 rounded-2xl bg-white">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- 左侧：输入 -->
        <div class="space-y-5">
          <!-- 上传图片 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              参考图片（可选，不传则按提示词文生图；最多 {{ MAX_IMAGES }} 张）
            </label>
            <div class="flex flex-wrap gap-3">
              <div
                v-for="(p, i) in previews"
                :key="i"
                class="relative w-20 h-20 rounded-lg overflow-hidden border"
              >
                <img :src="p" class="w-full h-full object-cover" />
                <button
                  @click="removeImage(i)"
                  class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none"
                >
                  ×
                </button>
              </div>
              <label
                v-if="imageFiles.length < MAX_IMAGES"
                class="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500 hover:border-blue-400 text-xs"
              >
                <span class="text-2xl leading-none">+</span>
                <span>上传</span>
                <input type="file" accept="image/*" multiple class="hidden" @change="onFilesChange" />
              </label>
            </div>
          </div>

          <!-- 提示词 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">编辑描述</label>
            <textarea
              v-model="prompt"
              rows="4"
              placeholder="例如：将天空改成日落，添加彩虹，把背景变成海边…"
              class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- 尺寸 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">输出尺寸</label>
            <select v-model="size" class="w-full p-3 border rounded-lg">
              <option v-for="o in sizeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <button
            @click="generate"
            :disabled="!canGenerate"
            :class="[
              'w-full py-3 rounded-lg font-medium transition',
              !canGenerate ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white',
            ]"
          >
            {{ isLoading ? '生成中…' : '开始编辑' }}
          </button>

          <p v-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</p>
        </div>

        <!-- 右侧：结果 -->
        <div class="flex items-center justify-center min-h-[320px] bg-gray-50 rounded-xl p-4">
          <div v-if="isLoading" class="text-center">
            <div class="spinner mx-auto"></div>
            <p class="mt-3 text-gray-600">生成中，请稍候…</p>
          </div>
          <img
            v-else-if="resultUrl"
            :src="resultUrl"
            alt="编辑结果"
            class="max-w-full max-h-[70vh] rounded-lg shadow object-contain"
          />
          <div v-else class="text-center text-gray-400">
            <div class="w-16 h-16 border-2 border-dashed rounded-xl mx-auto mb-3"></div>
            <p>等待生成结果</p>
          </div>
        </div>
      </div>
    </div>

    <ToolDetail title="描述">
      <el-text>{{ info.desc }}</el-text>
    </ToolDetail>
  </div>
</template>

<style scoped>
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4299e1;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
