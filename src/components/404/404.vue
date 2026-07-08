<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToolsStore } from '@/store/modules/tools'
import type { ToolsInfo } from '@/components/Tools/tools.type'

type SearchToolInfo = ToolsInfo & {
  isExternalSite?: boolean
  externalUrl?: string
}

const router = useRouter()
const toolsStore = useToolsStore()

const query = ref('')
const loading = ref(false)
const options = ref<SearchToolInfo[]>([])

const popularTools = [
  { title: 'JSON格式化', path: '/json' },
  { title: 'Markdown编辑器', path: '/markdown' },
  { title: '二维码生成', path: '/qrcode' },
  { title: '随机密码', path: '/random-password' },
  { title: 'AI绘画', path: '/ai-text-to-image' },
  { title: 'AI翻译', path: '/ai-translate' },
]

const searchTools = async (keyword: string) => {
  options.value = []
  if (!keyword) return

  loading.value = true
  try {
    options.value = await toolsStore.getTools({
      cateId: 0,
      title: keyword,
      route: '',
    }) as SearchToolInfo[]
  } finally {
    loading.value = false
  }
}

const goTool = (item: SearchToolInfo) => {
  query.value = ''
  options.value = []

  if (item.isExternalSite && item.externalUrl) {
    window.open(item.externalUrl, '_blank')
    return
  }

  router.push(item.url)
}
</script>

<template>
  <section class="not-found-page">
    <div class="not-found-panel">
      <div class="not-found-code">404</div>
      <h1>这个页面暂时找不到</h1>
      <p>
        链接可能已经调整。可以直接搜索工具，或回到首页继续浏览。
      </p>

      <el-select
        v-model="query"
        filterable
        remote
        reserve-keyword
        remote-show-suffix
        :suffix-icon="Search"
        :loading="loading"
        :remote-method="searchTools"
        placeholder="搜索工具，例如 JSON、二维码、AI 翻译"
        class="not-found-search"
        size="large"
      >
        <el-option
          v-for="item in options"
          :key="item.id"
          :label="`${item.title} - ${item.desc}`"
          :value="item.title"
          @click="goTool(item)"
        />
      </el-select>

      <div class="not-found-actions">
        <el-button type="primary" size="large" @click="router.push('/')">返回首页</el-button>
        <el-button size="large" @click="router.back()">返回上一页</el-button>
      </div>

      <div class="not-found-links" aria-label="常用工具">
        <router-link
          v-for="tool in popularTools"
          :key="tool.path"
          :to="tool.path"
        >
          {{ tool.title }}
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 220px);
  padding: 48px 16px;
}

.not-found-panel {
  width: min(720px, 100%);
  padding: 40px;
  border: 1px solid rgba(214, 227, 225, 0.95);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.not-found-code {
  color: var(--warm-primary);
  font-size: 64px;
  font-weight: 800;
  line-height: 1;
}

.not-found-panel h1 {
  margin: 16px 0 8px;
  color: #0f172a;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0;
}

.not-found-panel p {
  margin: 0 auto 24px;
  max-width: 460px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.8;
}

.not-found-search {
  width: min(520px, 100%);
}

.not-found-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
  flex-wrap: wrap;
}

.not-found-links {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.not-found-links a {
  padding: 7px 12px;
  border: 1px solid rgba(15, 118, 110, 0.16);
  border-radius: 8px;
  color: var(--warm-primary);
  background: rgba(15, 118, 110, 0.06);
  font-size: 13px;
  text-decoration: none;
}

.not-found-links a:hover,
.not-found-links a:focus-visible {
  border-color: rgba(15, 118, 110, 0.28);
  background: rgba(15, 118, 110, 0.1);
}

@media (max-width: 640px) {
  .not-found-page {
    min-height: calc(100vh - 160px);
    padding: 24px 12px;
  }

  .not-found-panel {
    padding: 28px 18px;
  }

  .not-found-code {
    font-size: 52px;
  }

  .not-found-panel h1 {
    font-size: 22px;
  }
}
</style>
