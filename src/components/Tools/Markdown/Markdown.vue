<script setup lang="ts">
import { computed, reactive } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { renderSafeMarkdown } from '@/utils/sanitize'

const info = reactive({
  title: '在线 Markdown 编辑器',
  content: '# Markdown\n\n在左侧输入内容，右侧会实时预览。\n\n- 支持标题、列表、引用、代码块\n- HTML 标签会被当作文本显示\n'
})

const previewHtml = computed(() => renderSafeMarkdown(info.content))
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <div class="markdown-editor">
      <section class="editor-pane">
        <textarea
          v-model="info.content"
          class="markdown-input"
          spellcheck="false"
          aria-label="Markdown source"
        />
      </section>
      <section class="preview-pane">
        <div class="markdown-preview" v-html="previewHtml"></div>
      </section>
    </div>

    <ToolDetail title="描述">
      <el-text>
        在线编辑 Markdown 并实时预览。
      </el-text>
    </ToolDetail>
  </div>
</template>

<style scoped>
.markdown-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  min-height: 520px;
}

.editor-pane,
.preview-pane {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.markdown-input {
  width: 100%;
  height: 100%;
  min-height: 520px;
  padding: 16px;
  border: 0;
  resize: vertical;
  outline: none;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #1f2937;
}

.markdown-preview {
  min-height: 520px;
  padding: 16px;
  overflow: auto;
  color: #1f2937;
  line-height: 1.7;
  word-break: break-word;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4),
.markdown-preview :deep(h5),
.markdown-preview :deep(h6) {
  margin: 0.8em 0 0.4em;
  font-weight: 700;
  line-height: 1.3;
}

.markdown-preview :deep(h1) {
  font-size: 1.8em;
}

.markdown-preview :deep(h2) {
  font-size: 1.45em;
}

.markdown-preview :deep(h3) {
  font-size: 1.2em;
}

.markdown-preview :deep(p) {
  margin: 0.6em 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 1.5em;
  margin: 0.6em 0;
}

.markdown-preview :deep(blockquote) {
  margin: 0.8em 0;
  padding: 0.4em 1em;
  border-left: 4px solid #d1d5db;
  color: #4b5563;
  background: #f9fafb;
}

.markdown-preview :deep(code) {
  padding: 0.15em 0.35em;
  border-radius: 4px;
  background: #f3f4f6;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-preview :deep(pre) {
  margin: 0.8em 0;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  background: #111827;
  color: #f9fafb;
}

.markdown-preview :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

.markdown-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 8px;
}

@media (max-width: 900px) {
  .markdown-editor {
    grid-template-columns: 1fr;
  }
}
</style>
