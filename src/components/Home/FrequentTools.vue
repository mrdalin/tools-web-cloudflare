<script setup lang="ts">
import { nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, ArrowRight, Check, Close, Rank, Refresh, Setting } from '@element-plus/icons-vue'
import { useSpriteLogo } from '@/components/Tools/useSpriteLogo'
import {
  FREQUENT_TOOLS_STORAGE_KEY,
  FREQUENT_TOOLS_UPDATED_EVENT,
  getFrequentTools,
  isFrequentToolsPersistent,
  normalizeToolPath,
  removeFrequentTool,
  reorderFrequentTools,
  restoreFrequentTools,
  type FrequentToolItem,
} from '@/utils/frequentTools'

// 首次渲染前读取本地数据，避免首页准备完成后再插入卡片造成跳动。
const items = ref<FrequentToolItem[]>(getFrequentTools())
const isPersistent = ref(isFrequentToolsPersistent())
const isManaging = ref(false)
const grid = ref<HTMLElement>()
const draggedPath = ref('')
const dropPath = ref('')
const liveMessage = ref('')
const toolPath = (item: FrequentToolItem) => normalizeToolPath(item.tool.url)

const refreshItems = () => {
  items.value = getFrequentTools()
  isPersistent.value = isFrequentToolsPersistent()
}

const moveItem = (index: number, direction: -1 | 1) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= items.value.length) return
  const item = items.value[index]
  reorderFrequentTools(toolPath(item), toolPath(items.value[targetIndex]))
  liveMessage.value = item.tool.title + '已移到第' + (targetIndex + 1) + '位'
}

const removeItem = async (item: FrequentToolItem, index: number) => {
  removeFrequentTool(toolPath(item))
  liveMessage.value = '已移除' + item.tool.title + '，可通过恢复自动整理重新显示'
  await nextTick()
  const buttons = grid.value?.querySelectorAll<HTMLButtonElement>('[data-remove-tool]')
  buttons?.[Math.min(index, buttons.length - 1)]?.focus()
}

const restoreItems = () => {
  restoreFrequentTools()
  liveMessage.value = '已恢复自动整理，使用记录已保留'
}

let drag: {
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  from: string
  handle: HTMLElement
} | undefined
let scrollFrame: number | undefined

const updateDropTarget = () => {
  if (!drag || !draggedPath.value) return
  const card = document.elementFromPoint(drag.x, drag.y)?.closest<HTMLElement>('[data-frequent-tool]')
  dropPath.value = card && grid.value?.contains(card) ? card.dataset.frequentTool || '' : ''
}

const autoScroll = () => {
  if (!drag || !draggedPath.value) return
  const edge = 64
  const delta = drag.y < edge ? -Math.ceil((edge - drag.y) / 5)
    : drag.y > window.innerHeight - edge ? Math.ceil((drag.y - window.innerHeight + edge) / 5) : 0
  if (delta) {
    window.scrollBy({ top: Math.max(-16, Math.min(16, delta)), behavior: 'instant' })
    updateDropTarget()
  }
  scrollFrame = window.requestAnimationFrame(autoScroll)
}

const cancelDrag = () => {
  const previous = drag
  drag = undefined
  if (scrollFrame !== undefined) window.cancelAnimationFrame(scrollFrame)
  scrollFrame = undefined
  draggedPath.value = ''
  dropPath.value = ''
  if (previous?.handle.hasPointerCapture(previous.pointerId)) {
    previous.handle.releasePointerCapture(previous.pointerId)
  }
}

const startDrag = (event: PointerEvent, item: FrequentToolItem) => {
  if (!isManaging.value || !event.isPrimary || event.button !== 0) return
  cancelDrag()
  const handle = event.currentTarget as HTMLElement
  handle.focus()
  handle.setPointerCapture(event.pointerId)
  drag = {
    pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
    x: event.clientX, y: event.clientY, from: toolPath(item), handle,
  }
}

const moveDrag = (event: PointerEvent) => {
  if (!drag || drag.pointerId !== event.pointerId) return
  drag.x = event.clientX
  drag.y = event.clientY
  if (!draggedPath.value && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return
  if (!draggedPath.value) {
    draggedPath.value = drag.from
    scrollFrame = window.requestAnimationFrame(autoScroll)
  }
  updateDropTarget()
}

const finishDrag = (event: PointerEvent) => {
  if (!drag || drag.pointerId !== event.pointerId) return
  if (draggedPath.value && dropPath.value && drag.from !== dropPath.value) {
    const title = items.value.find(item => toolPath(item) === drag?.from)?.tool.title || '工具'
    reorderFrequentTools(drag.from, dropPath.value)
    liveMessage.value = title + '的顺序已保存'
  }
  cancelDrag()
}

const toggleManaging = () => {
  cancelDrag()
  isManaging.value = !isManaging.value
}

const handleStorageUpdate = (event: StorageEvent) => {
  if (event.key === FREQUENT_TOOLS_STORAGE_KEY || event.key === null) {
    cancelDrag()
    refreshItems()
  }
}

onMounted(() => {
  window.addEventListener(FREQUENT_TOOLS_UPDATED_EVENT, refreshItems)
  window.addEventListener('storage', handleStorageUpdate)
})
onActivated(refreshItems)
onDeactivated(cancelDrag)
onUnmounted(() => {
  cancelDrag()
  window.removeEventListener(FREQUENT_TOOLS_UPDATED_EVENT, refreshItems)
  window.removeEventListener('storage', handleStorageUpdate)
})
</script>

<template>
  <section class="frequent-tools" aria-labelledby="frequent-tools-title" aria-describedby="frequent-tools-description">
    <div class="frequent-tools-heading">
      <h2 id="frequent-tools-title" class="frequent-tools-title">常用功能</h2>
      <div class="frequent-tools-actions">
        <button
          v-if="isManaging || items.length === 0"
          type="button"
          class="frequent-tools-action"
          title="恢复按使用记录自动整理，保留使用记录并显示已移除的工具"
          @click="restoreItems"
        >
          <el-icon><Refresh /></el-icon>
          恢复自动整理
        </button>
        <button
          type="button"
          class="frequent-tools-action"
          :aria-pressed="isManaging"
          :aria-label="isManaging ? '完成管理' : '管理常用功能'"
          @click="toggleManaging"
        >
          <el-icon><Check v-if="isManaging" /><Setting v-else /></el-icon>
          {{ isManaging ? '完成' : '管理' }}
        </button>
      </div>
    </div>
    <p id="frequent-tools-description" class="frequent-tools-description">
      {{ isPersistent ? '按使用习惯自动整理 · 仅保存在此浏览器' : '浏览器未允许保存，当前页面仍可使用和管理' }}
    </p>
    <p v-if="isManaging" class="frequent-tools-manage-hint">拖动手柄排序，也可点击前后移动；移除的工具可恢复。</p>

    <div v-if="items.length" ref="grid" class="frequent-tools-grid">
      <div
        v-for="(item, index) in items"
        :key="toolPath(item)"
        :data-frequent-tool="toolPath(item)"
        class="frequent-tool-card"
        :class="{
          'frequent-tool-card--managing': isManaging,
          'frequent-tool-card--dragging': draggedPath === toolPath(item),
          'frequent-tool-card--target': draggedPath && dropPath === toolPath(item) && draggedPath !== dropPath,
        }"
      >
        <component
          :is="isManaging ? 'div' : RouterLink"
          :to="isManaging ? undefined : item.tool.url"
          class="frequent-tool-link"
          :title="item.tool.title + '：' + item.tool.desc"
        >
          <img
            v-if="!useSpriteLogo(item.tool).style"
            :src="item.tool.logo"
            class="frequent-tool-logo"
            alt=""
            width="40"
            height="40"
            loading="lazy"
          >
          <div v-else class="frequent-tool-logo" :style="useSpriteLogo(item.tool).style" aria-hidden="true"></div>
          <div class="frequent-tool-copy">
            <div class="frequent-tool-title">{{ item.tool.title }}</div>
            <div class="frequent-tool-meta">{{ item.isRecommended ? '推荐' : item.tool.cate }}</div>
          </div>
        </component>

        <div v-if="isManaging" class="frequent-tool-controls">
          <button
            type="button"
            class="frequent-tool-control frequent-tool-drag"
            :title="'拖动' + item.tool.title + '排序'"
            :aria-label="'拖动' + item.tool.title + '排序，也可使用方向键移动'"
            @pointerdown.prevent="startDrag($event, item)"
            @pointermove="moveDrag"
            @pointerup="finishDrag"
            @pointercancel="cancelDrag"
            @lostpointercapture="cancelDrag"
            @keydown.left.prevent="moveItem(index, -1)"
            @keydown.up.prevent="moveItem(index, -1)"
            @keydown.right.prevent="moveItem(index, 1)"
            @keydown.down.prevent="moveItem(index, 1)"
            @keydown.esc.prevent="cancelDrag"
          >
            <el-icon><Rank /></el-icon>
          </button>
          <button
            type="button"
            class="frequent-tool-control"
            :title="'前移' + item.tool.title"
            :aria-label="'前移' + item.tool.title"
            :disabled="index === 0"
            @click="moveItem(index, -1)"
          >
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <button
            type="button"
            class="frequent-tool-control"
            :title="'后移' + item.tool.title"
            :aria-label="'后移' + item.tool.title"
            :disabled="index === items.length - 1"
            @click="moveItem(index, 1)"
          >
            <el-icon><ArrowRight /></el-icon>
          </button>
          <button
            type="button"
            class="frequent-tool-control frequent-tool-control--remove"
            data-remove-tool
            :title="'移除' + item.tool.title"
            :aria-label="'移除' + item.tool.title"
            @click="removeItem(item, index)"
          >
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>
    </div>
    <p v-else class="frequent-tools-empty">常用功能已移除，可点击“恢复自动整理”重新显示。</p>
    <p v-if="!isManaging" class="frequent-tools-footnote">最多显示 8 项，标注“推荐”的工具会随使用记录更新。</p>
    <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ liveMessage }}</span>
  </section>
</template>

<style scoped>
.frequent-tools {
  margin-top: 1rem;
  margin-bottom: 1.25rem;
}

.frequent-tools-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.frequent-tools-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 700;
}

.frequent-tools-title::before {
  content: '';
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--warm-primary);
}

.frequent-tools-description,
.frequent-tools-manage-hint,
.frequent-tools-footnote {
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.4rem;
}

.frequent-tools-description {
  margin: 0.35rem 0 0.85rem 14px;
}

.frequent-tools-manage-hint {
  margin: -0.35rem 0 0.75rem 14px;
}

.frequent-tools-footnote {
  margin-top: 0.5rem;
  font-size: 0.75rem;
}

.frequent-tools-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.frequent-tools-action,
.frequent-tool-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #0f766e;
  background: #fff;
  cursor: pointer;
}

.frequent-tools-action {
  min-height: 32px;
  padding: 0 0.6rem;
  font-size: 0.8rem;
  white-space: nowrap;
}

.frequent-tools-action:hover,
.frequent-tool-control:hover:not(:disabled) {
  border-color: rgba(20, 184, 166, 0.45);
  background: #f0fdfa;
}

.frequent-tools-action:focus-visible,
.frequent-tool-control:focus-visible,
.frequent-tool-link:focus-visible {
  outline: 3px solid rgba(20, 184, 166, 0.3);
  outline-offset: 2px;
}

.frequent-tools-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.frequent-tool-card {
  min-width: 0;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.frequent-tool-card:hover {
  border-color: rgba(20, 184, 166, 0.45);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.frequent-tool-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 74px;
  padding: 12px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
}

.frequent-tool-logo {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.frequent-tool-copy {
  min-width: 0;
}

.frequent-tool-title,
.frequent-tool-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.frequent-tool-title {
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.4rem;
  font-weight: 600;
}

.frequent-tool-meta {
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.25rem;
}

.frequent-tool-controls {
  display: flex;
  gap: 4px;
  margin: 0 8px 8px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}

.frequent-tool-control {
  min-width: 0;
  flex: 1;
  height: 32px;
  padding: 0;
}

.frequent-tool-control:disabled {
  color: #cbd5e1;
  cursor: default;
}

.frequent-tool-control--remove {
  color: #dc2626;
}

.frequent-tool-drag {
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.frequent-tool-drag:active {
  cursor: grabbing;
}

.frequent-tool-card--dragging {
  opacity: 0.5;
}

.frequent-tool-card--target {
  border-color: #0d9488;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.25);
  background: #f0fdfa;
}

.frequent-tools-empty {
  padding: 1.25rem;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.5rem;
}

@media (max-width: 1023px) {
  .frequent-tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .frequent-tool-link {
    gap: 8px;
    padding: 10px;
  }

  .frequent-tool-controls {
    gap: 2px;
    margin-right: 6px;
    margin-left: 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .frequent-tool-card {
    transition: none;
  }
}
</style>
