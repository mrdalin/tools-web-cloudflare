<script setup lang="ts">
const gitUrl = (import.meta.env.VITE_GIT_URL || 'https://github.com/mrdalin/tools-web-cloudflare').replace(/\/$/, '')
const issueUrl = `${gitUrl}/issues/new`
</script>

<template>
  <div class="feedback-wrapper mt-8">
    <div class="bg-white rounded-2xl p-6 shadow-sm">
      <h3 class="text-lg font-bold text-primary mb-4 flex items-center gap-2">
        <svg class="w-5 h-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M1.5 2.5A1.5 1.5 0 0 1 3 1h10a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 13 15H3a1.5 1.5 0 0 1-1.5-1.5v-11zM3 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-11A.5.5 0 0 0 13 2H3z" />
          <path d="M5 5.5A.5.5 0 0 1 5.5 5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 5.5zm0 3A.5.5 0 0 1 5.5 8h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8.5zm0 3A.5.5 0 0 1 5.5 11.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
        </svg>
        反馈建议
      </h3>
      <p class="text-sm text-gray-500">
        欢迎大家沟通交流，如有问题或建议请通过
        <a :href="issueUrl" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80">GitHub Issues</a>
        反馈。
      </p>
    </div>
  </div>
</template>
