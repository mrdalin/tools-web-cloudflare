<script setup lang="ts">
import { onActivated, onDeactivated, nextTick, onUnmounted, ref } from 'vue';
// import { Star } from '@element-plus/icons-vue'
import { useToolsStore } from '@/store/modules/tools'
import { useComponentStore } from '@/store/modules/component'
// import { ElMessage } from 'element-plus'
import { onBeforeRouteLeave, useRoute, useRouter, type RouteLocationNormalized } from "vue-router"
import { Top } from '@element-plus/icons-vue'
import { getCategoryPath } from '@/utils/categoryRoutes'
import ToolGrid from './ToolGrid.vue'
import { resolveActiveCategory, type CategoryPosition } from './scrollSpy'
import { markHomeReady, rememberHomeVisit } from '@/utils/homeNavigation'
import FrequentTools from './FrequentTools.vue'
defineOptions({ name: 'Home' })
//store
const toolsStore = useToolsStore()
const componentStore = useComponentStore()
const route = useRoute()
const router = useRouter()
// const getToolsCate = async () => {
//   try {
//     await toolsStore.getToolCate()
//   } catch (error: any) {
//     ElMessage.error(error.message)
//   }
// }


const showBackTop = ref(false)
const isLoadingCates = ref(false)
const HOME_TOP_EVENT = 'youngbar:home-top'
let leavingFor: RouteLocationNormalized | undefined
let isHomeActive = false
let activationVersion = 0
let activationFrame: number | undefined
let lastHomePosition = { left: 0, top: 0 }
let homeHistoryPosition: number | undefined

const syncHomeHistoryPosition = () => {
  const position = router.options.history.state.position
  homeHistoryPosition = typeof position === 'number' ? position : undefined
}

const isCurrentHome = () => isHomeActive && !leavingFor && route.path === '/'

onBeforeRouteLeave((to) => {
  leavingFor = to
  if (to.path !== '/') {
    rememberHomeVisit(route.fullPath, lastHomePosition, homeHistoryPosition)
  }
})
const removeNavigationListener = router.afterEach((to, _from, failure) => {
  if (failure && to === leavingFor) leavingFor = undefined
  if (!failure && to.path === '/') syncHomeHistoryPosition()
})

const ensureToolCates = async () => {
  if (toolsStore.cates.length > 0 || isLoadingCates.value) return
  isLoadingCates.value = true
  try {
    await toolsStore.getToolCate()
  } catch (error) {
    console.error('Load home tools failed:', error)
  } finally {
    isLoadingCates.value = false
  }
}

const getFirstCategoryAnchor = () => {
  const firstCate = toolsStore.cates[0]
  return firstCate ? `cate_${firstCate.id}` : ''
}

const scrollToTop = () => {
  if (!isCurrentHome()) return
  const activation = activationVersion
  const wasActive = isScrollListenerActive.value
  isScrollListenerActive.value = false
  isUserClickingCategory.value = true

  const restoreScrollState = () => {
    if (wasActive && isCurrentHome()) {
      isScrollListenerActive.value = true
    }
    window.setTimeout(() => {
      if (activation !== activationVersion || !isCurrentHome()) return
      isUserClickingCategory.value = false
      handleScroll()
    }, 50)
  }

  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  if (scrollTop <= 0) {
    restoreScrollState()
    return
  }
  const step = () => {
    if (activation !== activationVersion || !isCurrentHome()) return
    const current = document.documentElement.scrollTop || document.body.scrollTop
    if (current <= 0) {
      restoreScrollState()
      return
    }
    const distance = Math.max(current / 12, 3)
    document.documentElement.scrollTop = current - distance
    document.body.scrollTop = current - distance
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

const resetHomeToTop = async () => {
  if (!isCurrentHome()) return
  const activation = activationVersion
  await ensureToolCates()
  if (activation !== activationVersion || !isCurrentHome()) return
  componentStore.setActiveCategory(getFirstCategoryAnchor())
  await nextTick()
  scrollToTop()
}

// 滚动监听相关
const isScrollListenerActive = ref(false)
// 用户手动点击分类后，暂时禁用滚动监听（避免冲突）
const isUserClickingCategory = ref(false)

// 滚动监听函数
const handleScroll = () => {
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
  if (!leavingFor) lastHomePosition = { left: scrollLeft, top: scrollTop }
  showBackTop.value = scrollTop > 300
  if (!isScrollListenerActive.value || !isCurrentHome()) return
  // 如果用户正在点击分类，暂时跳过滚动监听
  if (isUserClickingCategory.value) return
  
  const categories = toolsStore.cates
  if (categories.length === 0) return

  // 获取当前滚动位置
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  )
  const distanceToBottom = Math.max(0, scrollHeight - scrollTop - viewportHeight)

  // 查找当前可视区域内的分类
  const categoryPositions: CategoryPosition[] = []

  for (const cate of categories) {
    const element = document.getElementById(`cate_${cate.id}`)
    if (element) {
      categoryPositions.push({
        id: `cate_${cate.id}`,
        top: element.getBoundingClientRect().top,
      })
    }
  }

  const activeCategory = resolveActiveCategory(
    categoryPositions,
    viewportHeight,
    distanceToBottom,
  )

  // 滚动只同步菜单高亮，首页地址始终保持不变。
  if (activeCategory && activeCategory !== componentStore.activeCategory) {
    componentStore.setActiveCategory(activeCategory)
  }
}

// 防抖处理
let scrollTimer: number | null = null
const throttledHandleScroll = () => {
  if (scrollTimer) return
  scrollTimer = window.requestAnimationFrame(() => {
    handleScroll()
    scrollTimer = null
  })
}

onActivated(async () => {
  const activation = ++activationVersion
  leavingFor = undefined
  await ensureToolCates()
  await nextTick()

  if (activation !== activationVersion || route.path !== '/') return
  isHomeActive = true
  syncHomeHistoryPosition()
  // 初次进入首页的定位交给路由，避免分类锚点覆盖历史滚动位置。
  markHomeReady()

  // 先让路由恢复位置，再在下一帧同步分类与滚动监听。
  activationFrame = window.requestAnimationFrame(() => {
    if (isCurrentHome()) {
      isScrollListenerActive.value = true
      window.addEventListener('scroll', throttledHandleScroll)
      handleScroll()
    }
  })
  window.addEventListener(HOME_TOP_EVENT, resetHomeToTop)
})

const deactivateHome = () => {
  isHomeActive = false
  activationVersion++
  if (activationFrame !== undefined) window.cancelAnimationFrame(activationFrame)
  isScrollListenerActive.value = false
  isUserClickingCategory.value = false
  window.removeEventListener('scroll', throttledHandleScroll)
  window.removeEventListener(HOME_TOP_EVENT, resetHomeToTop)
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer)
    scrollTimer = null
  }
}

onDeactivated(deactivateHome)
onUnmounted(() => {
  deactivateHome()
  removeNavigationListener()
})

</script>

<template>
  <div class="md:mr-6 c-xs:mr-0">
    <FrequentTools />
    <!-- list -->
    <div v-for="(cate, index) in toolsStore.cates" :key="index">
      <!-- cate title -->
      <router-link
        class="category-title mt-8 mb-3 text-xl font-bold"
        :id="'cate_' + cate.id"
        :to="getCategoryPath(cate.id)"
      >
        {{ cate.title }}
      </router-link>
      <ToolGrid :tools="cate.list" />
    </div>

    <!-- 返回顶部 -->
    <transition name="fade">
      <div
        v-show="showBackTop"
        class="fixed right-[30px] bottom-[60px] z-50 cursor-pointer w-11 h-11 rounded-lg bg-white shadow-md flex items-center justify-center hover:bg-warm-50 transition-colors border border-slate-200"
        @click="scrollToTop"
      >
        <el-icon :size="22" color="#0f766e"><Top /></el-icon>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.category-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  letter-spacing: 0;
  scroll-margin-top: 96px;
  transition: color 0.18s ease;
}

.category-title::before {
  content: '';
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--warm-primary);
}

.category-title:hover {
  color: var(--warm-primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
