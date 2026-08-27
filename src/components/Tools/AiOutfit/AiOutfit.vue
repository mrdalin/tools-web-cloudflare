<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'

const info = {
  title: 'AI 穿搭',
  desc: '上传人物照，AI 自动设计一套完整穿搭；或同时上传衣物照，把衣物「穿」到人物身上。免费使用，基于 Agnes 图像模型。',
}

const style = ref('')
const personFiles = ref<File[]>([])
const personPreviews = ref<string[]>([])
const clothingFiles = ref<File[]>([])
const clothingPreviews = ref<string[]>([])
const size = ref('1024x1024')
const isLoading = ref(false)
const resultUrl = ref('')
const errorMsg = ref('')

const sizeOptions = [
  { value: '1024x1024', label: '1:1 方图 (1024×1024)' },
  { value: '1024x1792', label: '9:16 竖版 (1024×1792)' },
  { value: '1792x1024', label: '16:9 横版 (1792×1024)' },
]

const MAX_TOTAL = 16

const canGenerate = computed(() => !isLoading.value && personFiles.value.length > 0)

function pickFiles(e: Event, target: 'person' | 'clothing') {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  const list = Array.from(input.files)
  const currentTotal = personFiles.value.length + clothingFiles.value.length
  const remaining = MAX_TOTAL - currentTotal
  if (remaining <= 0) return
  for (const f of list.slice(0, remaining)) {
    if (target === 'person') {
      personFiles.value.push(f)
      personPreviews.value.push(URL.createObjectURL(f))
    } else {
      clothingFiles.value.push(f)
      clothingPreviews.value.push(URL.createObjectURL(f))
    }
  }
  input.value = ''
}

function removeImage(target: 'person' | 'clothing', index: number) {
  if (target === 'person') {
    URL.revokeObjectURL(personPreviews.value[index])
    personFiles.value.splice(index, 1)
    personPreviews.value.splice(index, 1)
  } else {
    URL.revokeObjectURL(clothingPreviews.value[index])
    clothingFiles.value.splice(index, 1)
    clothingPreviews.value.splice(index, 1)
  }
}

async function generate() {
  if (!canGenerate.value) return
  isLoading.value = true
  resultUrl.value = ''
  errorMsg.value = ''

  try {
    const fd = new FormData()
    fd.append('style', style.value)
    fd.append('size', size.value)
    for (const f of personFiles.value) fd.append('personImages', f)
    for (const f of clothingFiles.value) fd.append('clothingImages', f)

    const resp = await fetch('/api/ai-outfit', { method: 'POST', body: fd })
    const data = await resp.json()
    if (!resp.ok || !data?.ok) {
      throw new Error(data?.error || '穿搭生成失败，请稍后重试')
    }
    resultUrl.value = data.data?.url || ''
    if (!resultUrl.value) throw new Error('生成结果为空，请稍后重试')
  } catch (e: any) {
    errorMsg.value = e?.message || '穿搭生成失败，请稍后重试'
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
          <!-- 人物照 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">人物照（必填，1~{{ MAX_TOTAL }} 张）</label>
            <div class="flex flex-wrap gap-3">
              <div v-for="(p, i) in personPreviews" :key="'p' + i" class="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img :src="p" class="w-full h-full object-cover" />
                <button @click="removeImage('person', i)" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none">×</button>
              </div>
              <label v-if="personFiles.length + clothingFiles.length < MAX_TOTAL" class="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500 hover:border-blue-400 text-xs">
                <span class="text-2xl leading-none">+</span>
                <span>人物</span>
                <input type="file" accept="image/*" multiple class="hidden" @change="pickFiles($event, 'person')" />
              </label>
            </div>
          </div>

          <!-- 衣物照 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">衣物照（可选，上传则替换为这些衣物）</label>
            <div class="flex flex-wrap gap-3">
              <div v-for="(p, i) in clothingPreviews" :key="'c' + i" class="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img :src="p" class="w-full h-full object-cover" />
                <button @click="removeImage('clothing', i)" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none">×</button>
              </div>
              <label v-if="personFiles.length + clothingFiles.length < MAX_TOTAL" class="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500 hover:border-blue-400 text-xs">
                <span class="text-2xl leading-none">+</span>
                <span>衣物</span>
                <input type="file" accept="image/*" multiple class="hidden" @change="pickFiles($event, 'clothing')" />
              </label>
            </div>
          </div>

          <!-- 风格 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">风格/场景（可选）</label>
            <input v-model="style" type="text" placeholder="例如：日系清新、职场通勤、约会、度假…" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
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
            {{ isLoading ? '生成中…' : '生成穿搭' }}
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
            alt="穿搭结果"
            class="max-w-full max-h-[70vh] rounded-lg shadow object-contain"
          />
          <div v-else class="text-center text-gray-400">
            <div class="w-16 h-16 border-2 border-dashed rounded-xl mx-auto mb-3"></div>
            <p>上传人物照后生成穿搭</p>
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
