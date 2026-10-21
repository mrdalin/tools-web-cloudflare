---
description: 通用模式、SEO 要求与布局组件
---

## SEO 要求

每个工具页面必须包含：
1. 路由 meta 中的 `title`、`keywords`、`description`
2. 页面底部的详细描述（ToolDetail 组件中）
3. 执行 `pnpm generate:sitemap` 更新版本库中的 `public/sitemap.xml`；生产构建也会自动生成 `dist/sitemap.xml`

`scripts/build-pages-route-shells.mjs` 会读取路由、工具分类、`ToolDetail` 静态说明和精选 SEO 内容，为每个工具生成独立 HTML、canonical 和结构化数据。不要把这些页面恢复成相同的首页副本。登录、个人资料和动态分享详情不进入 sitemap；未知路径及缺失资源必须返回真实 404。

## 通用模式

### 工具组件结构

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'

// 状态
const input = ref('')
const result = ref('')

// 方法
const handleProcess = () => { /* ... */ }
</script>

<template>
  <div class="flex flex-col mt-3">
    <DetailHeader :title="工具标题" />

    <!-- 主要工具 UI -->
    <div class="p-4 rounded-2xl bg-white">
      <!-- 工具内容 -->
    </div>

    <!-- 使用说明 -->
    <ToolDetail title="使用说明">
      <!-- SEO 详细描述 -->
    </ToolDetail>
  </div>
</template>
```

### 布局组件

- **`DetailHeader`**：页面标题，面包屑式展示
- **`ToolDetail`**：可折叠内容区域（用法、示例、提示）
- **左侧边栏**：响应式——移动端隐藏，小屏幕下为抽屉式
