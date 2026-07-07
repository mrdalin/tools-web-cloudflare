<script setup lang="ts">
const gitUrl = (import.meta.env.VITE_GIT_URL || 'https://github.com/ideajoker/tools-web-cloudflare').replace(/\/$/, '')
const feedbackUrl = `${gitUrl}/issues/new`
</script>

<template>
    <div class="w-full rounded-2xl z-10 p-5 text-center">
        <div class="copyright text-sm text-gray-600 leading-relaxed">
            <div class="mb-1">
                © 2006-2026 Youngbar
            </div>
            <div class="mb-2 text-xs text-gray-500">
                一切来自 2006 年的「飘」
            </div>
            <div class="flex justify-center items-center text-xs">
                <a :href="feedbackUrl" target="_blank" class="text-blue-700 hover:underline">反馈建议</a>
            </div>
        </div>
    </div>
</template>

<style scoped>
</style>
