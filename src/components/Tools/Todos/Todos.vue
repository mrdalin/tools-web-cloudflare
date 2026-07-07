<script setup lang="ts">
import { reactive, ref, onMounted, computed, watch } from 'vue'
import functionsRequest from '@/utils/functionsRequest'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Edit, Delete, Clock } from '@element-plus/icons-vue'
import { getLocalToken, isTokenExpired, logout } from '@/utils/user'

interface Todo {
  id: string
  title: string
  completed: number
  priority: string
  dueDate: string | null
  category: string
  createTime: string
  updateTime: string
}

interface Pagination {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const info = reactive({
  title: "待办事项",
  desc: "在线待办事项管理工具，帮助您高效管理日常任务。支持设置优先级（低/中/高）、截止日期时间（精确到秒）、自定义分类，一键标记完成状态。所有数据安全存储在云端，登录后即可随时随地访问和管理您的待办清单。"
})

const todos = ref<Todo[]>([])
const showForm = ref(false)
const isEditing = ref(false)
const editingTodoId = ref<string | null>(null)

const pagination = ref<Pagination>({
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
})

const filterData = reactive({
  title: '',
  priority: '',
  category: ''
})

const formData = reactive({
  title: '',
  priority: 'medium',
  dueDate: '',
  category: '默认'
})

const loading = ref(false)
const operationLoading = ref(false)
const syncingLocal = ref(false)
const isCloudMode = ref(false)
const localTodoCount = ref(0)
const LOCAL_TODOS_KEY = 'youngbar.todos.localTodos'

const goToLogin = () => {
  const currentPath = window.location.pathname
  window.location.href = '/login?redirect=' + encodeURIComponent(currentPath)
}

const hasValidToken = () => {
  const token = getLocalToken()
  if (!token) return false
  if (isTokenExpired(token)) {
    logout()
    return false
  }
  return true
}

const isUnauthorizedError = (error: any) => error?.response?.status === 401

const buildTodoPayload = () => ({
  title: formData.title.trim(),
  priority: formData.priority,
  dueDate: formData.dueDate ? formatDateTime(new Date(formData.dueDate)) : null,
  category: formData.category.trim() || '默认'
})

const normalizeLocalTodo = (todo: any): Todo => {
  const now = new Date().toISOString()
  return {
    id: String(todo?.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(todo?.title || ''),
    completed: Number(todo?.completed || 0),
    priority: String(todo?.priority || 'medium'),
    dueDate: todo?.dueDate ? String(todo.dueDate) : null,
    category: String(todo?.category || '默认'),
    createTime: String(todo?.createTime || now),
    updateTime: String(todo?.updateTime || todo?.createTime || now)
  }
}

const readLocalTodos = (): Todo[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TODOS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(normalizeLocalTodo) : []
  } catch (error) {
    console.error('读取本地待办失败:', error)
    return []
  }
}

const writeLocalTodos = (items: Todo[]) => {
  localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(items))
  localTodoCount.value = items.length
}

const refreshLocalTodoCount = () => {
  localTodoCount.value = readLocalTodos().length
}

const getFilteredLocalTodos = (items: Todo[]) => {
  return items.filter((todo) => {
    const titleMatched = !filterData.title || todo.title.toLowerCase().includes(filterData.title.toLowerCase())
    const priorityMatched = !filterData.priority || todo.priority === filterData.priority
    const categoryMatched = !filterData.category || todo.category === filterData.category
    return titleMatched && priorityMatched && categoryMatched
  })
}

const loadLocalTodos = (page = 1, pageSize = pagination.value.pageSize) => {
  const allItems = readLocalTodos()
  const filteredItems = getFilteredLocalTodos(allItems)
  const total = filteredItems.length
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1
  const start = (safePage - 1) * pageSize
  isCloudMode.value = false
  todos.value = filteredItems.slice(start, start + pageSize)
  localTodoCount.value = allItems.length
  pagination.value = {
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNext: totalPages > 0 && safePage < totalPages,
    hasPrev: safePage > 1
  }
}

const switchToLocalMode = (message?: string) => {
  loadLocalTodos()
  if (message) {
    ElMessage.warning(message)
  }
}

// 从现有待办事项中提取分类列表
const userCategories = computed(() => {
  const categories = new Set<string>()
  categories.add('默认')
  todos.value.forEach(todo => {
    if (todo.category) {
      categories.add(todo.category)
    }
  })
  return Array.from(categories).sort()
})

// 分类搜索建议
const handleCategorySearch = (queryString: string) => {
  const suggestions = userCategories.value.filter(category =>
    category.toLowerCase().includes(queryString.toLowerCase())
  )
  return suggestions.length > 0 ? suggestions : (queryString ? [queryString] : userCategories.value.slice(0, 5))
}

const fetchTodos = async (page = 1, pageSize = 10) => {
  if (!hasValidToken()) {
    loadLocalTodos(page, pageSize)
    return
  }

  try {
    loading.value = true
    isCloudMode.value = true
    refreshLocalTodoCount()
    const params: any = { page, pageSize }
    if (filterData.title) params.title = filterData.title
    if (filterData.priority) params.priority = filterData.priority
    if (filterData.category) params.category = filterData.category

    const response = await functionsRequest.get('/api/todos', { params })
    if (response.status === 200) {
      const data = response.data
      todos.value = data.data || []
      if (data.pagination) {
        pagination.value = data.pagination
      }
    }
  } catch (error: any) {
    if (isUnauthorizedError(error)) {
      switchToLocalMode('登录已过期，已切换为本地模式')
      return
    }
    console.error('获取待办事项失败:', error)
    ElMessage.error('获取待办事项失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  fetchTodos(page, pagination.value.pageSize)
}

const formatDateTime = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const createTodo = async () => {
  if (!formData.title.trim()) {
    ElMessage.warning('标题不能为空')
    return
  }

  const payload = buildTodoPayload()

  if (!isCloudMode.value || !hasValidToken()) {
    const now = new Date().toISOString()
    const localTodo: Todo = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
      completed: 0,
      createTime: now,
      updateTime: now
    }
    writeLocalTodos([localTodo, ...readLocalTodos()])
    ElMessage.success('已保存到本地')
    showForm.value = false
    resetForm()
    loadLocalTodos(pagination.value.page, pagination.value.pageSize)
    return
  }

  try {
    operationLoading.value = true
    const response = await functionsRequest.post('/api/todos', payload)

    if (response.status === 201) {
      ElMessage.success('创建成功')
      showForm.value = false
      resetForm()
      await fetchTodos(pagination.value.page, pagination.value.pageSize)
    }
  } catch (error: any) {
    if (isUnauthorizedError(error)) {
      switchToLocalMode('登录已过期，已切换为本地模式')
      return
    }
    console.error('创建待办事项失败:', error)
    ElMessage.error('创建失败')
  } finally {
    operationLoading.value = false
  }
}

const updateTodo = async () => {
  if (!editingTodoId.value || !formData.title.trim()) {
    ElMessage.warning('标题不能为空')
    return
  }

  const payload = buildTodoPayload()

  if (!isCloudMode.value || !hasValidToken()) {
    const items = readLocalTodos()
    const index = items.findIndex((item) => item.id === editingTodoId.value)
    if (index === -1) {
      ElMessage.error('本地待办不存在')
      return
    }
    items.splice(index, 1, {
      ...items[index],
      ...payload,
      updateTime: new Date().toISOString()
    })
    writeLocalTodos(items)
    ElMessage.success('已更新本地待办')
    showForm.value = false
    isEditing.value = false
    editingTodoId.value = null
    resetForm()
    loadLocalTodos(pagination.value.page, pagination.value.pageSize)
    return
  }

  try {
    operationLoading.value = true
    const response = await functionsRequest.put(`/api/todos/${editingTodoId.value}`, payload)

    if (response.status === 200) {
      ElMessage.success('更新成功')
      showForm.value = false
      isEditing.value = false
      editingTodoId.value = null
      resetForm()
      await fetchTodos(pagination.value.page, pagination.value.pageSize)
    }
  } catch (error: any) {
    if (isUnauthorizedError(error)) {
      switchToLocalMode('登录已过期，已切换为本地模式')
      return
    }
    console.error('更新待办事项失败:', error)
    ElMessage.error('更新失败')
  } finally {
    operationLoading.value = false
  }
}

const toggleComplete = async (todo: Todo) => {
  if (!isCloudMode.value || !hasValidToken()) {
    const items = readLocalTodos()
    const index = items.findIndex((item) => item.id === todo.id)
    if (index === -1) return
    items.splice(index, 1, {
      ...items[index],
      completed: todo.completed === 1 ? 0 : 1,
      updateTime: new Date().toISOString()
    })
    writeLocalTodos(items)
    ElMessage.success(todo.completed === 1 ? '已标记为未完成' : '已标记为完成')
    loadLocalTodos(pagination.value.page, pagination.value.pageSize)
    return
  }

  try {
    const response = await functionsRequest.put(`/api/todos/${todo.id}`, {
      completed: todo.completed === 1 ? 0 : 1
    })

    if (response.status === 200) {
      ElMessage.success(todo.completed === 1 ? '已标记为未完成' : '已标记为完成')
      await fetchTodos(pagination.value.page, pagination.value.pageSize)
    }
  } catch (error) {
    console.error('更新状态失败:', error)
    ElMessage.error('更新状态失败')
  }
}

const deleteTodo = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个待办事项吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    if (!isCloudMode.value || !hasValidToken()) {
      writeLocalTodos(readLocalTodos().filter((item) => item.id !== id))
      ElMessage.success('已删除本地待办')
      loadLocalTodos(pagination.value.page, pagination.value.pageSize)
      return
    }

    const response = await functionsRequest.delete(`/api/todos/${id}`)

    if (response.status === 200) {
      ElMessage.success('删除成功')
      await fetchTodos(pagination.value.page, pagination.value.pageSize)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除待办事项失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const showCreateForm = () => {
  resetForm()
  isEditing.value = false
  showForm.value = true
}

const showEditForm = (todo: Todo) => {
  formData.title = todo.title
  formData.priority = todo.priority
  formData.dueDate = todo.dueDate || ''
  formData.category = todo.category || '默认'
  editingTodoId.value = todo.id
  isEditing.value = true
  showForm.value = true
}

const resetForm = () => {
  formData.title = ''
  formData.priority = 'medium'
  formData.dueDate = ''
  formData.category = '默认'
  editingTodoId.value = null
}

const cancelForm = () => {
  showForm.value = false
  isEditing.value = false
  resetForm()
}

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  }
  return colors[priority] || 'text-gray-600'
}

const getPriorityText = (priority: string) => {
  const texts: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return texts[priority] || priority
}

const syncLocalTodosToCloud = async () => {
  if (!hasValidToken()) {
    ElMessage.warning('请先登录后再同步本地待办')
    goToLogin()
    return
  }

  const localTodos = readLocalTodos()
  if (localTodos.length === 0) {
    ElMessage.info('没有需要同步的本地待办')
    return
  }

  try {
    syncingLocal.value = true
    for (const todo of localTodos) {
      const response = await functionsRequest.post('/api/todos', {
        title: todo.title,
        priority: todo.priority,
        dueDate: todo.dueDate,
        category: todo.category
      })
      const createdId = response.data?.id || response.data?.data?.id
      if (todo.completed === 1 && createdId) {
        await functionsRequest.put(`/api/todos/${createdId}`, { completed: 1 })
      }
    }
    localStorage.removeItem(LOCAL_TODOS_KEY)
    localTodoCount.value = 0
    ElMessage.success(`已同步 ${localTodos.length} 条本地待办到云端`)
    await fetchTodos(1, pagination.value.pageSize || 10)
  } catch (error: any) {
    if (isUnauthorizedError(error)) {
      switchToLocalMode('登录已过期，请重新登录后再同步')
      return
    }
    console.error('同步本地待办失败:', error)
    ElMessage.error('同步失败，请稍后重试')
  } finally {
    syncingLocal.value = false
  }
}

// 实时搜索（防抖）
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => [filterData.title, filterData.priority, filterData.category], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchTodos(1, pagination.value.pageSize)
  }, 300)
})

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <DetailHeader :info="info" />
  <div class="flex flex-col flex-1 bg-white rounded-md p-4 c-sm:p-6 mt-3">
    <div class="mode-banner" :class="{ 'mode-banner--cloud': isCloudMode }">
      <div class="mode-copy">
        <strong>{{ isCloudMode ? '云端模式' : '本地模式' }}</strong>
        <span>
          {{ isCloudMode ? '待办已保存到账号，可跨设备使用。' : '无需登录即可管理待办，数据只保存在当前浏览器；登录后可长期保存并在多个设备之间同步。' }}
        </span>
      </div>
      <div class="mode-actions">
        <el-button v-if="!isCloudMode" type="primary" plain @click="goToLogin">
          登录后云同步
        </el-button>
        <el-button
          v-if="isCloudMode && localTodoCount > 0"
          type="primary"
          :loading="syncingLocal"
          :disabled="syncingLocal"
          @click="syncLocalTodosToCloud"
        >
          同步 {{ localTodoCount }} 条本地待办
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
      <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div class="w-full sm:flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">标题搜索</label>
          <el-input v-model="filterData.title" placeholder="输入标题关键词" clearable />
        </div>
        <div class="w-full sm:w-32">
          <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <el-select v-model="filterData.priority" placeholder="全部" clearable class="w-full">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
          </el-select>
        </div>
        <div class="w-full sm:w-32">
          <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
          <el-select v-model="filterData.category" placeholder="全部" clearable class="w-full">
            <el-option label="默认" value="默认" />
            <el-option v-for="cat in userCategories.filter(c => c !== '默认')" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
      <h2 class="text-xl font-semibold text-gray-800">我的待办</h2>
      <div class="flex gap-2 w-full sm:w-auto">
        <el-button :icon="Refresh" @click="fetchTodos(pagination.page, pagination.pageSize)" :loading="loading">
          刷新
        </el-button>
        <el-button type="primary" :icon="Plus" @click="showCreateForm" class="flex-1 sm:flex-none">
          新建待办
        </el-button>
      </div>
    </div>

    <!-- 表单弹窗 -->
    <el-dialog v-model="showForm" :title="isEditing ? '编辑待办' : '新建待办'" width="500px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">标题</label>
          <el-input v-model="formData.title" placeholder="请输入待办事项标题" maxlength="200" show-word-limit />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <el-select v-model="formData.priority" class="w-full">
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
            </el-select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <el-autocomplete
              v-model="formData.category"
              :fetch-suggestions="(queryString, cb) => cb(handleCategorySearch(queryString).map(s => ({ value: s })))"
              placeholder="输入或选择分类"
              class="w-full"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">截止时间</label>
          <el-date-picker
            v-model="formData.dueDate"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DDTHH:mm:ss"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelForm">取消</el-button>
        <el-button type="primary" @click="isEditing ? updateTodo() : createTodo()" :loading="operationLoading">
          {{ isEditing ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 待办列表 -->
    <div v-loading="loading" class="flex-1">
      <div v-if="todos.length === 0" class="text-center py-12 text-gray-500">
        暂无待办事项
      </div>
      <div v-else class="space-y-2">
        <div v-for="todo in todos" :key="todo.id"
          class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          :class="{ 'bg-gray-50': todo.completed === 1 }">
          <el-checkbox :model-value="todo.completed === 1" @change="toggleComplete(todo)" />
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span :class="{ 'line-through text-gray-400': todo.completed === 1 }" class="font-medium">
                {{ todo.title }}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-opacity-20"
                :class="[
                  getPriorityColor(todo.priority),
                  {
                    'bg-green-100': todo.priority === 'low',
                    'bg-yellow-100': todo.priority === 'medium',
                    'bg-red-100': todo.priority === 'high'
                  }
                ]">
                {{ getPriorityText(todo.priority) }}
              </span>
              <span v-if="todo.category && todo.category !== '默认'" class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                {{ todo.category }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
              <span v-if="todo.dueDate" class="flex items-center gap-1">
                <el-icon><Clock /></el-icon>
                {{ todo.dueDate }}
              </span>
              <span>创建于 {{ new Date(todo.createTime).toLocaleString('zh-CN') }}</span>
            </div>
          </div>
          <div class="flex gap-1">
            <el-button :icon="Edit" size="small" @click="showEditForm(todo)" />
            <el-button :icon="Delete" size="small" type="danger" @click="deleteTodo(todo.id)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > 0" class="mt-4 flex justify-center">
      <el-pagination
        v-model:current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        layout="prev, pager, next, total"
        @current-change="handlePageChange"
      />
    </div>
  </div>
  <ToolDetail title="描述">
    <div class="text-gray-700 leading-relaxed">
      <p>{{ info.desc }}</p>
    </div>
  </ToolDetail>
</template>

<style scoped>
.mode-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding: 14px 18px;
  border: 1px solid rgba(214, 227, 225, 0.95);
  border-radius: 12px;
  background: var(--youngbar-primary-soft);
  color: #0f172a;
}

.mode-banner--cloud {
  background: rgba(255, 255, 255, 0.95);
}

.mode-copy {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-copy strong {
  color: var(--warm-primary);
  font-size: 15px;
}

.mode-copy span {
  color: #64748b;
  font-size: 14px;
}

.mode-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.mode-actions :deep(.el-button--primary) {
  background: var(--warm-primary) !important;
  border-color: var(--warm-primary) !important;
  color: #fff !important;
}

.mode-actions :deep(.el-button--primary:hover),
.mode-actions :deep(.el-button--primary:focus) {
  background: var(--warm-primary-hover) !important;
  border-color: var(--warm-primary-hover) !important;
  color: #fff !important;
}

.el-checkbox {
  margin-right: 0;
}

@media (max-width: 768px) {
  .mode-banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .mode-actions {
    width: 100%;
  }
}
</style>
