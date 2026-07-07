<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToolsStore } from '@/store/modules/tools';
const gitUrl = ref(import.meta.env.VITE_GIT_URL || 'https://github.com/ideajoker/tools-web-cloudflare')
const sourceLinks = [
  {
    name: 'naroat/tools-web',
    href: 'https://github.com/naroat/tools-web',
    desc: 'Tools-Web 源站',
  },
  {
    name: '2424004764/tools-web',
    href: 'https://github.com/2424004764/tools-web',
    desc: 'Tools-Web 项目版本',
  },
]
const appTitle = ref(import.meta.env.VITE_APP_TITLE || '')
const toolsStore = useToolsStore()

// 计算工具总数
const totalTools = computed(() => {
  let count = 0
  for (const cate of toolsStore.cates) {
    count += cate.list?.length || 0
  }
  return count
})

onMounted(async () => {
  if (toolsStore.cates.length === 0) {
    await toolsStore.getToolCate()
  }
})
</script>

<template>
  <div class="flex flex-col mt-8 flex-1 items-center bg-white rounded-md p-10">
    <div class="p-5 w-2/3">
      <h1 class="text-2xl font-bold">关于 {{appTitle}}（源自：Tools-Web）</h1>
      <p class="mt-6">
        <el-text>本站是一个开源免费的工具站，基于 Tools-Web 二次开发，部署在 Cloudflare 上。包含开发、文本、媒体、图表、生活、查询等 <span class="text-primary font-bold">{{ totalTools }}</span> 种实用工具，完全开源免费；如果对您有帮助，请将其分享给您的朋友，并且添加到收藏夹中。因为是纯前端，所以请求外部第三方接口用 Cloudflare Functions 实现。</el-text>
      </p>

      <h1 class="text-2xl font-bold mt-6 mb-6">项目来源</h1>
      <div class="space-y-3">
        <div
          v-for="link in sourceLinks"
          :key="link.href"
          class="source-link-row"
        >
          <div>
            <div class="font-medium text-slate-900">{{ link.desc }}</div>
            <div class="text-sm text-slate-500">{{ link.name }}</div>
          </div>
          <el-link :href="link.href" target="_blank" type="primary">
            访问 GitHub
          </el-link>
        </div>
      </div>

      <h1 class="text-2xl font-bold mt-6 mb-6">技术</h1>
      <p>
        <el-text>主要基于Vite + Vue + ElementPlus + Typescript + TailwindCss + Cloudflare Functions开发，某些工具使用了第三方开源库，您可以在仓库的 <el-link :href="gitUrl + '/blob/master/package.json'" target="_blank" type="primary">package.json</el-link> 文件中找到完整的列表。</el-text>
      </p>
        <div>
          本站 AI 工具默认使用：
            <ul class="list-disc list-inside ml-4">
              <li>
                <el-link href="https://agnes-ai.com" target="_blank" type="primary">Agnes AI</el-link>
              </li>
              <li>部分语音或兜底能力仍可能通过 Cloudflare Functions 调用第三方备用服务</li>
            </ul>
        </div>
      <h1 class="text-2xl font-bold mt-6 mb-6">发现了 Bug？</h1>
      <p>
        <el-text>如果您发现了 Bug，或者某些功能未能按预期工作，请在 GitHub 仓库的 <el-link type="primary" target="_blank" :href="gitUrl + '/issues/new'" class="">issues</el-link> 中提交错误报告。</el-text>
      </p>

      <h1 class="text-2xl font-bold mt-6 mb-6">友情链接</h1>
      <p>
        <el-text>linux.do：<el-link href="https://linux.do" type="primary" target="_blank">https://linux.do</el-link></el-text>
      </p>
       
    </div>
  </div>
</template>

<style scoped>
.source-link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid rgba(214, 227, 225, 0.95);
  border-radius: 8px;
  background: #f8fafc;
}

@media (max-width: 640px) {
  .source-link-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
