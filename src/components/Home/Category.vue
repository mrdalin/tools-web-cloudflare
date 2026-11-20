<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useToolsStore } from '@/store/modules/tools'
import { getCategoryId, getCategoryPath } from '@/utils/categoryRoutes'
import { markHomeReady, rememberHomeVisit } from '@/utils/homeNavigation'
import ToolGrid from './ToolGrid.vue'

const route = useRoute()
const router = useRouter()
const toolsStore = useToolsStore()
const categoryId = getCategoryId(route.path)
const category = computed(() => toolsStore.cates.find((item) => item.id === categoryId))
let unmounted = false
let historyPosition: number | undefined

onBeforeUnmount(() => { unmounted = true })

onMounted(async () => {
  const position = router.options.history.state.position
  historyPosition = typeof position === 'number' ? position : undefined
  try {
    if (!toolsStore.cates.length) await toolsStore.getToolCate()
    await nextTick()
  } finally {
    if (!unmounted && getCategoryId(route.path) === categoryId) markHomeReady()
  }
})

onBeforeRouteLeave(() => {
  rememberHomeVisit(
    route.fullPath,
    { left: window.scrollX, top: window.scrollY },
    historyPosition,
  )
})
</script>

<template>
  <div class="md:mr-6 c-xs:mr-0" v-if="category">
    <nav aria-label="面包屑导航" class="mt-5 mb-4 text-sm text-slate-500">
      <router-link to="/" class="text-warm-700 hover:text-warm-600">工具首页</router-link>
      <span aria-hidden="true" class="mx-2">/</span>
      <span aria-current="page">{{ category.title }}</span>
    </nav>
    <header class="rounded-xl border border-slate-200 bg-white/95 p-5">
      <h1 class="text-xl font-semibold text-slate-900">{{ category.title }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ route.meta.description }}</p>
      <p class="mt-2 text-xs text-slate-500">共 {{ category.list.length }} 个工具</p>
    </header>
    <ToolGrid :tools="category.list" />
    <nav aria-label="其他工具分类" class="mt-8 flex flex-wrap gap-3">
      <router-link
        v-for="item in toolsStore.cates.filter((item) => item.id !== categoryId)"
        :key="item.id"
        :to="getCategoryPath(item.id)"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-warm-700 hover:bg-warm-50"
      >
        {{ item.title }}
      </router-link>
    </nav>
  </div>
</template>
