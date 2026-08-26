<script setup lang="ts">
const gitUrl = (import.meta.env.VITE_GIT_URL || 'https://github.com/mrdalin/tools-web-cloudflare').replace(/\/$/, '')
const feedbackUrl = `${gitUrl}/issues/new`

const dataItems = [
  '账号信息：邮箱、用户名、登录方式、注册与登录时间等基础信息。',
  'Google 登录信息：当你选择 Google 登录时，本站只接收 Google 返回的唯一用户 ID、邮箱、邮箱验证状态和基础资料，用于创建或登录 Youngbar 账号。',
  '你主动保存的内容：笔记、短链、收藏、体重记录、QA 页面、待办、密码管理器加密数据等。',
  'AI 功能输入：你提交给 AI 工具的文本、图片或视频生成需求，会通过 Cloudflare Functions 转发给已配置的 AI 服务提供方处理。',
  '访问统计信息：本站会使用 Google Analytics 统计页面访问、工具使用等匿名汇总数据，不会主动上报你在工具中输入的具体内容。',
  '安全与运行日志：为了防止滥用、排查故障和保障服务稳定，Cloudflare 可能记录请求 IP、浏览器信息、访问时间和错误日志。'
]

const useItems = [
  '提供账号注册、登录、找回密码和数据同步功能。',
  '保存你主动创建的工具数据，并在你登录后跨设备使用。',
  '调用 AI、邮件、云数据库等必要服务完成你发起的操作。',
  '发现异常请求、限制恶意滥用、排查错误和改进网站体验。',
  '在法律法规要求或保护网站与用户安全所必需时，配合必要的合规处理。'
]

const providerItems = [
  'Cloudflare：网站托管、Pages Functions、D1 数据库、访问日志与安全防护。',
  'Resend：发送邮箱验证码、找回密码等事务邮件。',
  'Google：当你主动选择 Google 登录时提供身份认证，并通过 Google Analytics 提供匿名访问统计。',
  'Agnes AI 及备用 AI 服务：处理你主动提交的 AI 文本、图片或视频生成请求。'
]
</script>

<template>
  <main class="privacy-page">
    <section class="privacy-hero">
      <p class="privacy-kicker">Youngbar 工具箱</p>
      <h1>隐私政策</h1>
      <p>
        本页面说明 Youngbar 工具箱如何收集、使用、保存和保护你的信息。本站尽量让大多数工具无需登录即可使用；
        只有在你需要同步个人数据、使用账号功能或调用部分云端能力时，才会处理必要信息。
      </p>
      <div class="privacy-meta">
        <span>生效日期：2026 年 6 月 21 日</span>
        <span>适用网站：https://youngbar.com</span>
      </div>
    </section>

    <section class="privacy-content">
      <article class="privacy-section">
        <h2>我们收集的信息</h2>
        <ul>
          <li v-for="item in dataItems" :key="item">{{ item }}</li>
        </ul>
      </article>

      <article class="privacy-section">
        <h2>我们如何使用信息</h2>
        <ul>
          <li v-for="item in useItems" :key="item">{{ item }}</li>
        </ul>
      </article>

      <article class="privacy-section">
        <h2>第三方服务</h2>
        <p>
          Youngbar 工具箱不会出售你的个人信息。为了让网站正常运行，我们会使用以下服务处理必要数据：
        </p>
        <ul>
          <li v-for="item in providerItems" :key="item">{{ item }}</li>
        </ul>
      </article>

      <article class="privacy-section">
        <h2>Cookie 与本地存储</h2>
        <p>
          本站会使用浏览器本地存储保存登录状态、主题偏好、部分工具草稿和必要配置。你可以在浏览器中清除这些数据；
          清除后，部分登录态和本地偏好会失效。
        </p>
      </article>

      <article class="privacy-section">
        <h2>数据保存与删除</h2>
        <p>
          你主动创建的账号数据会保存在 Cloudflare D1 数据库中，用于提供同步和管理功能。你可以删除自己创建的笔记、
          短链、收藏、体重记录等内容。如果你希望删除账号或反馈隐私相关问题，可以通过下方反馈入口联系维护者。
        </p>
      </article>

      <article class="privacy-section">
        <h2>安全措施</h2>
        <p>
          账号密码会以加盐哈希方式保存，验证码会设置有效期和失败次数限制。本站也会通过 HTTPS、Cloudflare 安全能力、
          输入过滤和访问限制来降低滥用和数据泄露风险。
        </p>
      </article>

      <article class="privacy-section">
        <h2>联系我们</h2>
        <p>
          如果你对隐私政策、账号数据或 Google 登录有疑问，请通过
          <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">GitHub Issues</a>
          提交反馈。
        </p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.privacy-page {
  width: min(960px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 28px 0 20px;
}

.privacy-hero {
  border: 1px solid rgba(214, 227, 225, 0.95);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  padding: 32px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.privacy-kicker {
  margin: 0 0 8px;
  color: var(--warm-primary);
  font-size: 14px;
  font-weight: 700;
}

.privacy-hero h1 {
  margin: 0;
  color: #0f172a;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.25;
}

.privacy-hero p {
  margin: 16px 0 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.8;
}

.privacy-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.privacy-meta span {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--youngbar-primary-soft);
  color: var(--warm-primary);
  font-size: 13px;
}

.privacy-content {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.privacy-section {
  border: 1px solid rgba(214, 227, 225, 0.95);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 24px;
}

.privacy-section h2 {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 750;
}

.privacy-section p,
.privacy-section li {
  color: #475569;
  font-size: 15px;
  line-height: 1.8;
}

.privacy-section ul {
  margin: 0;
  padding-left: 20px;
}

.privacy-section li + li {
  margin-top: 8px;
}

.privacy-section a {
  color: var(--warm-primary);
  font-weight: 700;
}

@media (max-width: 640px) {
  .privacy-page {
    width: min(100%, calc(100vw - 24px));
    padding-top: 16px;
  }

  .privacy-hero,
  .privacy-section {
    padding: 20px;
  }

  .privacy-hero h1 {
    font-size: 26px;
  }
}
</style>
