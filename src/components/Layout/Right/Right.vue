<script setup lang="ts">
import { Tools } from '@element-plus/icons-vue'
import { reactive, onMounted } from 'vue';
import { useToolsStore } from '@/store/modules/tools'
const info = reactive({
  feedbackUrl: import.meta.env.VITE_FEEDBACK_URL || 'javascript:void(0)',
  advShow: import.meta.env.VITE_ADV_SHOW || 'false',
  advList: [
    {
      img: 'https://img.jutuike.com/taokeout/banner/ele_hongbao_banner.png',
      url: 'https://baseran2.oss-cn-shenzhen.aliyuncs.com/toools-web/adv/elm_adv.jpeg'
    },
    {
      img: 'https://s3plus.sankuai.com/v1/mss_5017c592a8a946d2a54eb62a76ba299c/nebulafile/910fa09a310aadd229e90e4ad872d86e.png',
      url: 'https://baseran2.oss-cn-shenzhen.aliyuncs.com/toools-web/adv/meituan_adv.png'
    }
  ]
})

//store
const toolsStore = useToolsStore()

//点击走马灯
const clickCarousel = (url: string) => {
  const parsedUrl = new URL(url, window.location.origin)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) return

  const w = window.open('', '_blank')
  if (!w) return

  const { document } = w
  document.title = 'Image preview'
  Object.assign(document.body.style, {
    margin: '0',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5'
  })

  const img = document.createElement('img')
  img.src = parsedUrl.href
  img.alt = ''
  img.style.maxWidth = '100%'
  img.style.maxHeight = '100vh'
  document.body.replaceChildren(img)
}

onMounted(() => {
})
</script>

<template>
  <div>
    <!-- adv -->
    <div class="mt-3" v-if="info.advShow == 'true'">
      <el-carousel
        height="130px"
        :autoplay="true"
        :interval="5000"
      >
        <el-carousel-item v-for="(item, index) in info.advList" :key="index" @click="clickCarousel(item.url)">
          <el-image :src="item.img" fit="fill" class="h-full w-full"></el-image>
        </el-carousel-item>
      </el-carousel>
    </div>
    <!-- hot tools -->
    <div class="mt-3 border-solid rounded border-gray border p-3 c-xs:mr-3 c-xs:ml-3">
      <div class="text-xl text-gray-400 font-bold">随机推荐</div>
      <ul class="mt-3">
        <RouterLink :to="item.url" class="flex items-center hover:bg-gray-200 p-1 rounded" v-for="(item, index) in toolsStore.recommends" :key="index">
          <el-icon class="mr-1"><Tools /></el-icon>
          <div>{{ item.title }}</div>
        </RouterLink>
      </ul>
    </div>
  </div>
</template>

<style scoped>

</style>
