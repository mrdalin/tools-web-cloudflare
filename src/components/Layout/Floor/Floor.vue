<script setup lang="ts">
const gitUrl = (import.meta.env.VITE_GIT_URL || 'https://github.com/ideajoker/tools-web-cloudflare').replace(/\/$/, '')
const feedbackUrl = `${gitUrl}/issues/new`
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__copyright">2006-2026 Youngbar</div>
    <div class="site-footer__origin">一切来自 2006 年的「飘」</div>
    <nav class="site-footer__links" aria-label="页脚链接">
      <router-link to="/privacy">隐私政策</router-link>
      <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">反馈建议</a>
    </nav>
  </footer>
</template>

<style scoped>
.site-footer {
  width: 100%;
  padding: 20px;
  text-align: center;
  color: #64748b;
}

.site-footer__copyright {
  color: #475569;
  font-size: 14px;
  line-height: 1.7;
}

.site-footer__origin {
  margin-top: 2px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.site-footer__links {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
}

.site-footer__links a {
  color: var(--warm-primary);
  text-underline-offset: 3px;
}

.site-footer__links a:hover,
.site-footer__links a:focus-visible {
  color: var(--warm-primary-hover);
  text-decoration: underline;
}
</style>
