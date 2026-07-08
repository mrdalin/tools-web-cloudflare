<script setup lang="ts">
import { onMounted, watch, nextTick, onUnmounted, ref } from 'vue';
// import { Star } from '@element-plus/icons-vue'
import { useToolsStore } from '@/store/modules/tools'
import { useComponentStore } from '@/store/modules/component'
// import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from "vue-router"
import { Top } from '@element-plus/icons-vue'
import { useSpriteLogo } from '@/components/Tools/useSpriteLogo'
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
  history.replaceState(null, '', '/')
  const wasActive = isScrollListenerActive.value
  isScrollListenerActive.value = false
  isUserClickingCategory.value = true

  const restoreScrollState = () => {
    if (wasActive && route.path === '/') {
      isScrollListenerActive.value = true
    }
    window.setTimeout(() => {
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
  await ensureToolCates()
  componentStore.setActiveCategory(getFirstCategoryAnchor())
  await nextTick()
  scrollToTop()
}

const scrollToAnchor = async () => {
  const v = route.query?.value as any
  const anchor = Array.isArray(v) ? v[0] : v
  if (typeof anchor !== 'string' || !anchor) return

  // 如果是滚动触发的路由更新，不执行 scrollIntoView，避免循环
  if (isScrollTriggeredUpdate.value) return

  // 暂时禁用滚动监听，避免循环触发
  const wasActive = isScrollListenerActive.value
  isScrollListenerActive.value = false

  await nextTick()
  requestAnimationFrame(() => {
    document?.getElementById(anchor)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'start',
    })

    // 滚动完成后，延迟恢复滚动监听
    setTimeout(() => {
      if (wasActive) {
        isScrollListenerActive.value = true
      }
    }, 1000)
  })
}

// 滚动监听相关
const isScrollListenerActive = ref(false)
// 用户手动点击分类后，暂时禁用滚动监听（避免冲突）
const isUserClickingCategory = ref(false)
// 标记是否是滚动触发的路由更新（避免循环）
const isScrollTriggeredUpdate = ref(false)

// 滚动监听函数
const handleScroll = () => {
  showBackTop.value = (window.pageYOffset || document.documentElement.scrollTop) > 300
  if (!isScrollListenerActive.value) return
  // 如果用户正在点击分类，暂时跳过滚动监听
  if (isUserClickingCategory.value) return
  
  const categories = toolsStore.cates
  if (categories.length === 0) return

  // 获取当前滚动位置
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop

  // 查找当前可视区域内的分类
  let activeCategory = ''
  
  for (const cate of categories) {
    const element = document.getElementById(`cate_${cate.id}`)
    if (element) {
      const rect = element.getBoundingClientRect()
      const elementTop = scrollTop + rect.top
      
      // 如果分类标题在视窗顶部以下100px范围内，则认为是当前活跃分类
      if (elementTop <= scrollTop + 100) {
        activeCategory = `cate_${cate.id}`
      } else {
        break
      }
    }
  }
  
  // 更新活跃分类和URL（添加防抖，避免频繁更新路由）
  if (activeCategory && activeCategory !== componentStore.activeCategory) {
    componentStore.setActiveCategory(activeCategory)
    // 同步更新URL地址栏
    const currentValue = route.query?.value as string
    if (currentValue !== activeCategory) {
      // 标记这是滚动触发的更新
      isScrollTriggeredUpdate.value = true
      // 使用 replace 避免添加历史记录
      router.replace({
        path: "/",
        query: { value: activeCategory }
      })
      // 更新后重置标志
      setTimeout(() => {
        isScrollTriggeredUpdate.value = false
      }, 100)
    }
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

//跳转锚点 - 复用Left.vue的逻辑
const gotoAnchor = async (anchor: string) => {
  const q = route.query?.value as any
  const current = Array.isArray(q) ? q[0] : q

  // 标记用户正在点击分类，暂时禁用滚动监听
  isUserClickingCategory.value = true

  // 1秒后恢复滚动监听
  setTimeout(() => {
    isUserClickingCategory.value = false
  }, 1000)

  if (route.path === "/") {
    if (current === anchor) {
      await nextTick()
      document?.getElementById(anchor)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'start',
      })
      return
    }
    await router.replace({
      path: "/",
      query: { value: anchor },
    })
  } else {
    await router.push({
      path: "/",
      query: { value: anchor },
    })
  }
}

onMounted(async () => {
  await nextTick()
  await ensureToolCates()
  await nextTick()

  // 只在有明确的 query.value 时才滚动到锚点
  if (route.query && route.query.value) {
    scrollToAnchor()
  }
  // 移除自动滚动到 #collect 的逻辑，避免页面一加载就滚动

  // 延迟激活滚动监听，给用户一些时间
  setTimeout(() => {
    // 只在首页激活滚动监听
    if (route.path === '/') {
      isScrollListenerActive.value = true
      window.addEventListener('scroll', throttledHandleScroll)
    }
  }, 500) // 延迟500ms
  window.addEventListener(HOME_TOP_EVENT, resetHomeToTop)
})

onUnmounted(() => {
  // 清理滚动监听
  isScrollListenerActive.value = false
  window.removeEventListener('scroll', throttledHandleScroll)
  window.removeEventListener(HOME_TOP_EVENT, resetHomeToTop)
  if (scrollTimer) {
    cancelAnimationFrame(scrollTimer)
  }
})

// 监听路由变化
watch(() => route.path, async (newPath) => {
  if (newPath === '/') {
    await ensureToolCates()
    isScrollListenerActive.value = true
    window.addEventListener('scroll', throttledHandleScroll)
  } else {
    isScrollListenerActive.value = false
    window.removeEventListener('scroll', throttledHandleScroll)
  }
})

watch(() => route.query.value, async (value) => {
  if (route.path !== '/') return
  const anchor = Array.isArray(value) ? value[0] : value
  if (typeof anchor === 'string' && anchor) {
    scrollToAnchor()
    return
  }
  await resetHomeToTop()
})

watch(() => toolsStore.cates.length, () => {
  scrollToAnchor()
})
</script>

<template>
  <div class="md:mr-6 c-xs:mr-0">
    <!-- list -->
    <div v-for="(cate, index) in toolsStore.cates" :key="index">
      <!-- cate title -->
      <div 
        class="category-title mt-8 mb-3 text-xl font-bold cursor-pointer"
        :id="'cate_' + cate.id"
        @click="gotoAnchor('cate_' + cate.id)"
      >
        {{ cate.title }}
      </div>
      <!-- card -->
      <div class="flex justify-start flex-wrap gap-[1.25%] c-xs:ml-0">
          <router-link v-for="(item, index) in cate.list" :key="index" :to="item.url" class="tool-card flex flex-col mt-4 border bg-white/95 w-full sm:w-[49%] md:w-[32%] lg:w-[24%] xl:w-[19%] p-4">
            <div class="flex items-center border-b border-slate-100 pb-3">
              <img
                v-if="!useSpriteLogo(item).style"
                :src="item.logo"
                loading="lazy"
                class="w-10 h-10 min-h-[2.5rem] min-w-[2.5rem] object-contain"
                :alt="item.title"
              >
              <div
                v-else
                class="w-10 h-10 min-h-[2.5rem] min-w-[2.5rem]"
                :style="useSpriteLogo(item).style"
                role="img"
                :aria-label="item.title"
              ></div>
              <div class="flex flex-col ml-2 w-full">
                <div class="flex">
                  <div class="font-semibold text-base line-clamp-1 text-slate-900">{{ item.title }}</div>
                </div>
                <div class="flex justify-between">
                  <el-text size="small" class="tool-card-meta">{{ item.cate }}</el-text>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-2">
              <el-text line-clamp="2" class="tool-card-desc">{{ item.desc }}</el-text>
            </div>
          </router-link>
      </div>
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

.tool-card {
  min-height: 132px;
  border-color: rgba(226, 232, 240, 0.95);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.tool-card:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 184, 166, 0.45);
  background-color: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.tool-card:focus-visible {
  outline: 3px solid rgba(20, 184, 166, 0.24);
  outline-offset: 2px;
}

.tool-card-meta {
  color: #64748b !important;
}

.tool-card-desc {
  color: #475569 !important;
  line-height: 1.55;
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
