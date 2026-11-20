<script setup lang="ts">
import type { ToolsInfo } from '@/components/Tools/tools.type'
import { useSpriteLogo } from '@/components/Tools/useSpriteLogo'
import { normalizePagePath } from '@/utils/pageSeo'
defineProps<{ tools: ToolsInfo[] }>()
</script>

<template>
  <div class="flex justify-start flex-wrap gap-[1.25%] c-xs:ml-0">
    <router-link
      v-for="item in tools"
      :key="item.url"
      :to="normalizePagePath(item.url)"
      class="tool-card flex flex-col mt-4 border bg-white/95 w-full sm:w-[49%] md:w-[32%] lg:w-[24%] xl:w-[19%] p-4"
    >
      <div class="flex items-center border-b border-slate-100 pb-3">
        <img
          v-if="!useSpriteLogo(item).style"
          :src="item.logo"
          loading="lazy"
          class="w-10 h-10 min-h-[2.5rem] min-w-[2.5rem] object-contain"
          :alt="item.title"
        />
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
            <span class="tool-card-meta">{{ item.cate }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between mt-2">
        <span class="tool-card-desc line-clamp-2" :title="item.desc">{{ item.desc }}</span>
      </div>
    </router-link>
  </div>
</template>

<style scoped>
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
  font-size: 12px;
  color: #64748b !important;
  overflow-wrap: break-word;
}

/* 直接用 CSS 截断说明文字，避免逐张卡片测量布局。 */
.tool-card-desc {
  font-size: 14px;
  color: #475569 !important;
  line-height: 1.55;
  overflow-wrap: break-word;
}
</style>
