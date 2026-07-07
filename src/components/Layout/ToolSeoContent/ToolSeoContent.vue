<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getToolSeoContent } from './toolSeoContent'

const props = defineProps<{
  path?: string
}>()

const route = useRoute()
const content = computed(() => getToolSeoContent(props.path || route.path))
</script>

<template>
  <section v-if="content" class="tool-seo-content mt-6 space-y-4" aria-label="工具使用说明">
    <div class="seo-panel seo-intro">
      <p class="seo-kicker">使用指南</p>
      <h2>{{ content.heading }}</h2>
      <p>{{ content.intro }}</p>
    </div>

    <div class="seo-grid">
      <div class="seo-panel">
        <h3>适用场景</h3>
        <ul>
          <li v-for="item in content.scenarios" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div class="seo-panel">
        <h3>使用步骤</h3>
        <ol>
          <li v-for="step in content.steps" :key="step">{{ step }}</li>
        </ol>
      </div>
    </div>

    <div class="seo-panel">
      <h3>常见问题</h3>
      <div class="faq-list">
        <div v-for="faq in content.faqs" :key="faq.question" class="faq-item">
          <h4>{{ faq.question }}</h4>
          <p>{{ faq.answer }}</p>
        </div>
      </div>
    </div>

    <div class="seo-panel related-panel">
      <h3>相关工具</h3>
      <div class="related-links">
        <router-link
          v-for="tool in content.relatedTools"
          :key="tool.path"
          :to="tool.path"
        >
          {{ tool.label }}
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tool-seo-content {
  color: #24413b;
}

.seo-panel {
  border: 1px solid rgba(15, 118, 110, 0.13);
  border-radius: 8px;
  background: #fff;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(15, 118, 110, 0.05);
}

.seo-intro {
  background: linear-gradient(180deg, #ffffff 0%, #f4fbf7 100%);
}

.seo-kicker {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}

h2,
h3,
h4,
p {
  margin: 0;
}

h2 {
  color: #163832;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.35;
}

h3 {
  color: #163832;
  font-size: 17px;
  font-weight: 750;
  line-height: 1.4;
}

h4 {
  color: #1f4f47;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
}

.seo-intro p {
  margin-top: 10px;
  color: #48655f;
  font-size: 15px;
  line-height: 1.9;
}

.seo-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

ul,
ol {
  margin: 12px 0 0;
  padding-left: 20px;
  color: #48655f;
  line-height: 1.9;
}

li::marker {
  color: #0f766e;
  font-weight: 700;
}

.faq-list {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.faq-item {
  border-top: 1px solid rgba(15, 118, 110, 0.11);
  padding-top: 14px;
}

.faq-item:first-child {
  border-top: 0;
  padding-top: 0;
}

.faq-item p {
  margin-top: 6px;
  color: #48655f;
  font-size: 14px;
  line-height: 1.8;
}

.related-panel {
  display: flex;
  align-items: center;
  gap: 16px;
}

.related-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.related-links a {
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 999px;
  background: #f4fbf7;
  color: #0f766e;
  padding: 7px 12px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.related-links a:hover,
.related-links a:focus-visible {
  border-color: rgba(15, 118, 110, 0.35);
  background: #e7f6ee;
  color: #0b5d57;
}

@media (max-width: 768px) {
  .seo-grid {
    grid-template-columns: 1fr;
  }

  .related-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  h2 {
    font-size: 20px;
  }
}
</style>
