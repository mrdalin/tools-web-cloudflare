<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, reactive } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Connection,
  Key,
  Upload,
  Plus,
  Delete,
  Remove,
  DocumentCopy,
  Edit,
  Document,
  VideoPlay,
  Close,
  Refresh,
  Headset,
  Files,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import {
  requestUploadUrl,
  createSong,
  listMySongs,
  deleteSong,
  updateSong,
  listMyPlaylists,
  createPlaylist,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  xhrPutToR2,
  postMySongPlay,
} from '@/api/music-playlist'
import {
  ALLOWED_MIME,
  MAX_FILE_SIZE_MB,
  formatDuration,
  formatBytes,
} from './constants'
import type { SongMeta, PlaylistMeta, PlaylistDetail } from './types'
import type { RequestUploadUrlResult } from '@/api/music-playlist'

const userStore = useUserStore()
userStore.initUserState()

const goToLogin = () => {
  window.location.href = `/login?redirect=${encodeURIComponent('/music-playlist/')}`
}

/** el-table 默认槽 row 为 DefaultRow，统一收窄为 SongMeta 再传给处理函数 */
const asSong = (row: unknown) => row as SongMeta

// ============ 菜单 ============

type MenuKey = 'songs' | 'playlists'
const activeMenu = ref<MenuKey>('songs')

// ============ 歌曲 ============

const songs = ref<SongMeta[]>([])
const loadingSongs = ref(false)
const keyword = ref('')

const loadSongs = async () => {
  loadingSongs.value = true
  try {
    const { list } = await listMySongs({ page: 1, pageSize: 100, keyword: keyword.value })
    songs.value = list
  } catch (e) {
    console.error(e)
  } finally {
    loadingSongs.value = false
  }
}

const onDeleteSong = async (song: SongMeta) => {
  try {
    await ElMessageBox.confirm(
      `确认删除歌曲「${song.title}」？音频文件会一并清理，且关联歌单会自动移除。`,
      '删除歌曲',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deleteSong(song.id)
    ElMessage.success('已删除')
    await loadSongs()
    await loadPlaylists()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '删除失败')
  }
}

const onTogglePublic = async (song: SongMeta) => {
  try {
    await updateSong(song.id, { isPublic: !song.isPublic })
    ElMessage.success(song.isPublic ? '已关闭分享' : '已开启分享')
    await loadSongs()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '更新失败')
  }
}

const onCopySongLink = (song: SongMeta) => {
  const url = `${window.location.origin}/music-playlist/song/${song.slug}`
  navigator.clipboard.writeText(url).then(
    () => ElMessage.success('已复制分享链接'),
    () => ElMessage.error('复制失败，请手动选择')
  )
}

const onEditSong = async (song: SongMeta) => {
  try {
    const { value } = await ElMessageBox.prompt(
      '修改歌曲标题',
      '编辑歌曲',
      {
        inputValue: song.title,
        inputPlaceholder: '请输入新标题',
        confirmButtonText: '保存',
        cancelButtonText: '取消',
      }
    )
    if (value && value.trim() && value.trim() !== song.title) {
      await updateSong(song.id, { title: value.trim() })
      ElMessage.success('已更新')
      await loadSongs()
    }
  } catch {
    /* 用户取消 */
  }
}

// ============ 播放（不离开当前页） ============

const currentSong = ref<SongMeta | null>(null)

// ============ 响应式：手机端简化操作列 ============

const isMobile = ref(false)
const updateIsMobile = () => { isMobile.value = window.innerWidth <= 768 }
const audioRef = ref<HTMLAudioElement | null>(null)
let lastPlayTs = 0

const onPlaySong = async (song: SongMeta) => {
  if (!song.playUrl) {
    ElMessage.warning('该歌曲暂时无法播放（缺少 R2 公开地址）')
    return
  }
  // 同一首：恢复播放（用户可能暂停了）
  if (currentSong.value?.id === song.id) {
    audioRef.value?.play().catch(() => { /* 用户手势失效，静默 */ })
    return
  }
  currentSong.value = song
  // 等 v-if 把 <audio> 挂载 / src 切换完成再 play
  await nextTick()
  setTimeout(() => audioRef.value?.play().catch(() => {}), 0)
}

const stopPlayback = () => {
  audioRef.value?.pause()
  if (audioRef.value) audioRef.value.currentTime = 0
  currentSong.value = null
}

const onAudioPlay = async () => {
  const song = currentSong.value
  if (!song) return
  const now = Date.now()
  if (now - lastPlayTs < 30_000) return // 防抖，避免拖动进度条连续触发
  lastPlayTs = now
  await postMySongPlay(song.id)
}

const onAudioEnded = () => {
  lastPlayTs = 0 // 播完重置，下次重新允许 +1
}

// ============ 歌单 ============

const playlists = ref<PlaylistMeta[]>([])
const loadingPlaylists = ref(false)

const loadPlaylists = async () => {
  loadingPlaylists.value = true
  try {
    const { list } = await listMyPlaylists({ page: 1, pageSize: 100 })
    playlists.value = list
  } catch (e) {
    console.error(e)
  } finally {
    loadingPlaylists.value = false
  }
}

const editingPlaylist = ref<PlaylistDetail | null>(null)
const showPlaylistEditor = ref(false)

const openPlaylist = async (p: PlaylistMeta) => {
  try {
    editingPlaylist.value = await getPlaylist(p.id)
    showPlaylistEditor.value = true
  } catch (e: any) {
    ElMessage.error('加载歌单失败')
  }
}

const closePlaylistEditor = () => {
  showPlaylistEditor.value = false
  editingPlaylist.value = null
}

const onCreatePlaylist = async () => {
  try {
    const { value } = await ElMessageBox.prompt('为新歌单起个名字', '新建歌单', {
      inputPlaceholder: '例如：开车循环',
      confirmButtonText: '创建',
      cancelButtonText: '取消',
    })
    if (!value?.trim()) return
    const created = await createPlaylist({ title: value.trim() })
    ElMessage.success('已创建')
    await loadPlaylists()
    await openPlaylist(created)
  } catch {
    /* cancel */
  }
}

const onDeletePlaylist = async (p: PlaylistMeta) => {
  try {
    await ElMessageBox.confirm(
      `确认删除歌单「${p.title}」？歌单本身会被删除，但歌单里的歌曲仍保留。`,
      '删除歌单',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deletePlaylist(p.id)
    ElMessage.success('已删除')
    await loadPlaylists()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '删除失败')
  }
}

const onTogglePlaylistPublic = async (p: PlaylistMeta) => {
  try {
    await updatePlaylist(p.id, { isPublic: !p.isPublic })
    ElMessage.success(p.isPublic ? '已关闭分享' : '已开启分享')
    await loadPlaylists()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '更新失败')
  }
}

const onCopyPlaylistLink = (p: PlaylistMeta) => {
  const url = `${window.location.origin}/music-playlist/playlist/${p.slug}`
  navigator.clipboard.writeText(url).then(
    () => ElMessage.success('已复制分享链接'),
    () => ElMessage.error('复制失败，请手动选择')
  )
}

// ============ 歌单编辑器内操作 ============

const songsInPlaylist = computed(() => editingPlaylist.value?.songs ?? [])
const songsNotInPlaylist = computed(() => {
  const inSet = new Set(songsInPlaylist.value.map((s) => s.id))
  return songs.value.filter((s) => !inSet.has(s.id))
})

const addingSongId = ref<string | null>(null)
const onAddSongToPlaylist = async (songId: string) => {
  if (!editingPlaylist.value) return
  addingSongId.value = songId
  try {
    editingPlaylist.value = await updatePlaylist(editingPlaylist.value.id, {
      addSongIds: [songId],
    })
    ElMessage.success('已加入歌单')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '加入失败')
  } finally {
    addingSongId.value = null
  }
}

const onRemoveSongFromPlaylist = async (songId: string) => {
  if (!editingPlaylist.value) return
  try {
    editingPlaylist.value = await updatePlaylist(editingPlaylist.value.id, {
      removeSongIds: [songId],
    })
    ElMessage.success('已从歌单移除')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '移除失败')
  }
}

const onRenamePlaylist = async () => {
  if (!editingPlaylist.value) return
  try {
    const { value } = await ElMessageBox.prompt(
      '修改歌单标题',
      '编辑歌单',
      {
        inputValue: editingPlaylist.value.title,
        inputPlaceholder: '请输入新标题',
        confirmButtonText: '保存',
        cancelButtonText: '取消',
      }
    )
    if (value && value.trim() && value.trim() !== editingPlaylist.value.title) {
      editingPlaylist.value = await updatePlaylist(editingPlaylist.value.id, {
        title: value.trim(),
      })
      ElMessage.success('已更新')
      await loadPlaylists()
    }
  } catch {
    /* cancel */
  }
}

// ============ 上传弹窗（选文件 → 直传 R2 → 保存）============

interface UploadingFile {
  key: string
  file: File
  progress: number
  status: 'hashing' | 'ready' | 'signing' | 'uploading' | 'saving' | 'done' | 'failed' | 'skipped'
  errorMsg?: string
  sha256?: string
  /** 该文件 SHA-256 在服务端去重命中时复用已有 song，仅展示 */
  existingTitle?: string
  meta?: { title: string; artist: string; album: string; durationSec: number | null }
}

const showUploadModal = ref(false)
const uploadingFiles = ref<UploadingFile[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
/** 单文件大小上限（字节）—— 与后端 MAX_FILE_SIZE_BYTES 保持一致 */
const maxFileSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024
const phase = ref<'pick' | 'uploading'>('pick')

const resetUploadModal = () => {
  uploadingFiles.value = []
  phase.value = 'pick'
}

const openUploadModal = () => {
  resetUploadModal()
  showUploadModal.value = true
}

const closeUploadModal = () => {
  // 上传进行中禁止关闭
  if (phase.value === 'uploading') {
    ElMessage.warning('还有上传任务在进行中，请等待完成')
    return
  }
  showUploadModal.value = false
}

const triggerFilePicker = () => fileInput.value?.click()

const probeDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    const cleanup = () => {
      URL.revokeObjectURL(url)
      audio.removeEventListener('loadedmetadata', onLoad)
      audio.removeEventListener('error', onErr)
    }
    const onLoad = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : null
      cleanup()
      resolve(d)
    }
    const onErr = () => {
      cleanup()
      resolve(null)
    }
    audio.addEventListener('loadedmetadata', onLoad)
    audio.addEventListener('error', onErr)
    audio.src = url
  })

const extractArtistAlbum = (filename: string): { title: string; artist: string; album: string } => {
  const base = filename.replace(/\.[^.]+$/, '')
  const parts = base.split(' - ')
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim(), album: '' }
  }
  return { title: base.trim(), artist: '', album: '' }
}

/** 在前端算 SHA-256（hex）。大文件读 ArrayBuffer 一次到内存即可（≤30MB）。 */
async function computeSha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  const arr = new Uint8Array(hash)
  let out = ''
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, '0')
  return out
}

const handleFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  await processFiles(Array.from(input.files))
  input.value = ''
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  const dt = e.dataTransfer
  if (!dt?.files?.length) return
  await processFiles(Array.from(dt.files))
}

/**
 * 解析文件 + 算 SHA-256；真实上传在 confirmUpload() 里执行。
 */
const processFiles = async (files: File[]) => {
  const accepted: File[] = []
  for (const file of files) {
    if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
      ElMessage.warning(`已跳过不支持的文件：${file.name}（仅支持 mp3 / m4a / wav）`)
      continue
    }
    const sizeCapMB = (maxFileSizeBytes / 1024 / 1024).toFixed(0)
    if (file.size > maxFileSizeBytes) {
      ElMessage.warning(`已跳过超大文件：${file.name}（上限 ${sizeCapMB}MB）`)
      continue
    }
    accepted.push(file)
  }
  if (!accepted.length) return

  // 1) 先把所有条目入队（status='hashing'），立刻展示给用户
  for (const file of accepted) {
    uploadingFiles.value.push(
      reactive({
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        progress: 0,
        status: 'hashing',
      }) as UploadingFile
    )
  }

  // 2) 并行算 SHA-256（每个文件独立 try/catch，失败不影响他人）
  await Promise.all(
    uploadingFiles.value
      .filter((u) => u.status === 'hashing')
      .map(async (u) => {
        try {
          u.sha256 = await computeSha256(u.file)
          u.status = 'ready'
        } catch (err: any) {
          u.status = 'failed'
          u.errorMsg = `计算 SHA-256 失败：${err?.message || err}`
        }
      })
  )
}

/**
 * 用户点确认后按队列顺序上传：
 * - 命中 dedup → status='skipped'
 * - 新文件 → requestUploadUrl（签 URL）→ PUT R2 → createSong
 */
const confirmUpload = async () => {
  const targets = uploadingFiles.value.filter((u) => u.status === 'ready')
  if (!targets.length) return
  phase.value = 'uploading'

  let anySucceeded = false
  for (const item of targets) {
    try {
      // 1) 签名（或命中 dedup）
      item.status = 'signing'
      const sign = (await requestUploadUrl({
        filename: item.file.name,
        mimeType: item.file.type,
        fileSize: item.file.size,
        sha256: item.sha256!,
      })) as RequestUploadUrlResult

      if (sign.exists) {
        item.status = 'skipped'
        item.existingTitle = sign.song.title
        continue
      }

      const durationSec = await probeDuration(item.file)
      const { title, artist, album } = extractArtistAlbum(item.file.name)
      item.meta = { title, artist, album, durationSec }

      // 2) 直传 R2
      item.status = 'uploading'
      await xhrPutToR2(sign.uploadUrl, item.file, item.file.type, (p) => {
        item.progress = p.total ? (p.loaded / p.total) * 100 : 0
      })

      // 3) 元数据落库（让 server 二次查重 + 写入 sha256）
      item.status = 'saving'
      await createSong({
        title: item.meta.title,
        artist: item.meta.artist,
        album: item.meta.album,
        r2Key: sign.r2Key,
        mimeType: item.file.type,
        fileSize: item.file.size,
        durationSec: item.meta.durationSec,
        sha256: item.sha256!,
      })

      item.status = 'done'
      item.progress = 100
      anySucceeded = true
    } catch (err: any) {
      console.error('upload error:', err)
      item.status = 'failed'
      item.errorMsg = err?.response?.data?.error || err?.message || '上传失败'
    }
  }

  await loadSongs()
  phase.value = 'pick'
  if (anySucceeded) ElMessage.success('上传任务完成')
}

const dismissUploadItem = (key: string) => {
  uploadingFiles.value = uploadingFiles.value.filter((u) => u.key !== key)
}

/** 一键清空上传队列 */
const clearAllUploadingFiles = () => {
  uploadingFiles.value = []
}

const hasActiveUpload = computed(() =>
  uploadingFiles.value.some(
    (u) => u.status === 'hashing' || u.status === 'signing' || u.status === 'uploading' || u.status === 'saving'
  )
)

const canConfirm = computed(() => {
  if (phase.value !== 'pick') return false
  return uploadingFiles.value.some((u) => u.status === 'ready')
})

onMounted(async () => {
  if (!userStore.isLoggedIn) return
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  await Promise.all([loadSongs(), loadPlaylists()])
})

onBeforeUnmount(() => {
  audioRef.value?.pause()
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<template>
  <div class="flex flex-col mt-3" :class="{ 'has-player': !!currentSong }">
    <DetailHeader title="音乐播放列表" />

    <!-- 未登录：橙色横幅 + 跳转登录 -->
    <div v-if="!userStore.isLoggedIn" class="login-banner">
      <div class="banner-icon">
        <el-icon :size="20"><Key /></el-icon>
      </div>
      <div class="banner-text">
        <div class="banner-title">需要登录才能使用</div>
        <div class="banner-desc">登录后可上传 mp3 / m4a / wav 音频，管理自己的歌单并生成分享链接。</div>
      </div>
      <el-button type="primary" :icon="Connection" @click="goToLogin">前往登录</el-button>
    </div>

    <!-- 已登录主界面：左侧菜单 + 右侧内容 -->
    <div v-else class="music-layout">
      <!-- 左侧菜单 -->
      <aside class="side-menu">
        <div
          class="menu-item"
          :class="{ active: activeMenu === 'songs' }"
          @click="activeMenu = 'songs'"
        >
          <el-icon><Headset /></el-icon>
          <span class="menu-label">我的歌曲</span>
          <el-tag v-if="songs.length" size="small" effect="plain" type="info">{{ songs.length }}</el-tag>
        </div>
        <div
          class="menu-item"
          :class="{ active: activeMenu === 'playlists' }"
          @click="activeMenu = 'playlists'"
        >
          <el-icon><Files /></el-icon>
          <span class="menu-label">我的歌单</span>
          <el-tag v-if="playlists.length" size="small" effect="plain" type="info">{{ playlists.length }}</el-tag>
        </div>
      </aside>

      <!-- 右侧内容 -->
      <section class="content-panel">
        <!-- 歌曲视图 -->
        <template v-if="activeMenu === 'songs'">
          <div class="section-head">
            <div class="section-title">
              <el-icon><Document /></el-icon>
              <span>我的歌曲</span>
            </div>
            <div class="section-tools">
              <el-input
                v-model="keyword"
                placeholder="搜索标题"
                clearable
                size="small"
                style="width: 220px"
                @input="loadSongs"
                @clear="loadSongs"
              />
              <el-button :icon="Refresh" size="small" plain circle @click="loadSongs" />
              <el-button type="primary" :icon="Upload" size="small" @click="openUploadModal">
                上传音频
              </el-button>
            </div>
          </div>

          <el-table
            v-loading="loadingSongs"
            :data="songs"
            stripe
            empty-text="还没有歌曲，点击右上「上传音频」开始"
          >
            <el-table-column label="标题" :min-width="isMobile ? 0 : 180">
              <template #default="{ row }">
                <div class="cell-title" :class="{ playing: currentSong?.id === row.id }" @click="onPlaySong(asSong(row))">
                  <!-- 默认：静止播放图标（hover 时变成主色调） -->
                  <el-icon v-if="currentSong?.id !== row.id" class="cell-icon"><VideoPlay /></el-icon>
                  <!-- 正在播放：三柱跳动均衡器 -->
                  <span v-else class="np-eq" aria-label="正在播放">
                    <span class="bar"></span><span class="bar"></span><span class="bar"></span>
                  </span>
                  <span class="cell-title-text">{{ row.title }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="false" prop="artist" label="艺人" min-width="120" />
            <el-table-column v-if="false" prop="album" label="专辑" min-width="120" />
            <el-table-column v-if="!isMobile" label="时长" width="90">
              <template #default="{ row }">{{ formatDuration(row.durationSec) }}</template>
            </el-table-column>
            <el-table-column v-if="!isMobile" label="大小" width="90">
              <template #default="{ row }">{{ formatBytes(row.fileSize) }}</template>
            </el-table-column>
            <el-table-column v-if="!isMobile" label="播放" width="80">
              <template #default="{ row }">{{ row.playCount }}</template>
            </el-table-column>
            <el-table-column v-if="!isMobile" label="分享" width="100">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.isPublic"
                  size="small"
                  @change="onTogglePublic(asSong(row))"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" :width="isMobile ? 132 : 220" fixed="right">
              <template #default="{ row }">
                <el-button-group>
                  <el-button :icon="Edit" size="small" plain @click="onEditSong(asSong(row))">
                    <span v-if="!isMobile" class="ops-label">编辑</span>
                  </el-button>
                  <el-button v-if="row.isPublic" :icon="DocumentCopy" size="small" plain @click="onCopySongLink(asSong(row))">
                    <span v-if="!isMobile" class="ops-label">复制链接</span>
                  </el-button>
                  <el-button :icon="Delete" size="small" type="danger" plain @click="onDeleteSong(asSong(row))" />
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>

          <!-- 播放器条已移出此视图，提到根级，让抽屉里点歌也能播 -->
        </template>

        <!-- 歌单视图 -->
        <template v-else>
          <div class="section-head">
            <div class="section-title">
              <el-icon><Document /></el-icon>
              <span>我的歌单</span>
            </div>
            <el-button type="primary" :icon="Plus" size="small" @click="onCreatePlaylist">
              新建歌单
            </el-button>
          </div>

          <div v-loading="loadingPlaylists" class="playlist-grid">
            <div v-for="p in playlists" :key="p.id" class="playlist-card" @click="openPlaylist(p)">
              <div class="card-head" @click.stop>
                <span class="card-title">{{ p.title }}</span>
                <div class="card-share">
                  <span class="card-share-text">{{ p.isPublic ? '已开启分享' : '已关闭分享' }}</span>
                  <el-switch
                    :model-value="p.isPublic"
                    size="small"
                    @change="onTogglePlaylistPublic(p)"
                  />
                  <el-button v-if="p.isPublic" :icon="DocumentCopy" size="small" plain @click="onCopyPlaylistLink(p)">
                    <span v-if="!isMobile" class="ops-label">复制链接</span>
                  </el-button>
                </div>
              </div>
              <div class="card-desc">{{ p.description || '（无描述）' }}</div>
              <div class="card-meta">
                <el-tag size="small" effect="plain">{{ p.songCount }} 首</el-tag>
                <el-tag size="small" effect="plain" type="info">浏览 {{ p.viewCount }}</el-tag>
              </div>
              <div class="card-actions" @click.stop>
                <el-button :icon="Delete" size="small" type="danger" plain @click="onDeletePlaylist(p)" />
              </div>
            </div>
            <el-empty v-if="!loadingPlaylists && playlists.length === 0" description="还没有歌单" />
          </div>
        </template>
      </section>
    </div>

    <!-- 播放器条：提到根级，让抽屉里点歌也能复用同一个 <audio> -->
    <div v-if="currentSong" class="now-playing-bar">
      <div class="np-info">
        <el-tag size="small" type="success" effect="dark">正在播放</el-tag>
        <span class="np-title">{{ currentSong.title }}</span>
        <span v-if="currentSong.artist" class="np-artist">— {{ currentSong.artist }}</span>
        <el-button :icon="Close" size="small" plain circle @click="stopPlayback" />
      </div>
      <audio
        ref="audioRef"
        :src="currentSong.playUrl"
        controls
        preload="metadata"
        class="np-audio"
        @play="onAudioPlay"
        @ended="onAudioEnded"
      >
        您的浏览器不支持 audio 元素。
      </audio>
    </div>

    <!-- 上传弹窗（两段式） -->
    <el-dialog
      v-model="showUploadModal"
      title="上传音频"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="!hasActiveUpload"
      :before-close="closeUploadModal"
    >
      <div
        class="upload-zone"
        :class="{ 'is-dragover': false }"
        @click="triggerFilePicker"
        @dragover.prevent
        @dragenter.prevent
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInput"
          type="file"
          accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"
          multiple
          hidden
          @change="handleFileSelect"
        />
        <el-icon :size="36" color="#ea580c"><Upload /></el-icon>
        <div class="upload-title">点击或拖拽 mp3 / m4a / wav 到此处</div>
        <div class="upload-desc">
          单文件 ≤ {{ (maxFileSizeBytes / 1024 / 1024).toFixed(0) }}MB
          · 可多选
          · 不会压缩音质，原版上传
        </div>
      </div>

      <div v-if="uploadingFiles.length" class="upload-queue">
        <div class="queue-title">
          <span>任务列表（{{ uploadingFiles.length }}）</span>
          <el-button
            v-if="phase === 'pick'"
            size="small"
            plain
            @click="clearAllUploadingFiles"
          >
            全部清除
          </el-button>
        </div>
        <div
          v-for="u in uploadingFiles"
          :key="u.key"
          class="queue-row"
          :class="{
            failed: u.status === 'failed',
            skipped: u.status === 'skipped',
            done: u.status === 'done',
          }"
        >
          <div class="row-name" :title="u.file.name">{{ u.file.name }}</div>
          <div class="row-size">{{ formatBytes(u.file.size) }}</div>
          <div class="row-progress">
            <el-progress
              v-if="u.status === 'uploading' || u.status === 'done' || u.status === 'saving'"
              :percentage="u.status === 'done' ? 100 : Math.round(u.progress)"
              :status="u.status === 'done' ? 'success' : undefined"
            />
            <div class="row-status">
              <template v-if="u.status === 'hashing'">计算指纹…</template>
              <template v-else-if="u.status === 'ready'">待上传</template>
              <template v-else-if="u.status === 'signing'">申请签名…</template>
              <template v-else-if="u.status === 'uploading'">上传中 {{ Math.round(u.progress) }}%</template>
              <template v-else-if="u.status === 'saving'">保存元数据…</template>
              <template v-else-if="u.status === 'done'">完成</template>
              <template v-else-if="u.status === 'skipped'">
                <span class="skipped-text">已存在：「{{ u.existingTitle }}」（跳过）</span>
              </template>
              <template v-else-if="u.status === 'failed'">{{ u.errorMsg || '失败' }}</template>
              <template v-else>—</template>
            </div>
          </div>
          <el-button
            v-if="phase === 'pick' && (u.status === 'done' || u.status === 'failed' || u.status === 'skipped' || u.status === 'ready')"
            :icon="Close"
            size="small"
            plain
            circle
            @click="dismissUploadItem(u.key)"
          />
        </div>

        <!-- 待上传 footer -->
        <div class="upload-summary">
          <div class="summary-row">
            <span class="summary-label">待上传文件</span>
            <span class="summary-value">{{ uploadingFiles.filter(u => u.status === 'ready').length }} 个</span>
          </div>
          <div class="summary-row quality-note">
            <span class="quality-icon">🎵</span>
            <span class="quality-text">不会压缩音质，完全原版上传</span>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="closeUploadModal">
          {{ phase === 'uploading' ? '上传中…' : '关闭' }}
        </el-button>
        <el-button
          v-if="phase === 'pick'"
          type="primary"
          :disabled="!canConfirm"
          @click="confirmUpload"
        >
          确认上传
        </el-button>
      </template>
    </el-dialog>

    <!-- 歌单编辑器（抽屉） -->
    <el-drawer
      v-model="showPlaylistEditor"
      :title="editingPlaylist ? `编辑歌单：${editingPlaylist.title}` : '编辑歌单'"
      direction="rtl"
      size="520px"
      @close="closePlaylistEditor"
    >
      <template v-if="editingPlaylist">
        <div class="pl-editor">
          <div class="pl-meta">
            <div class="pl-title-row">
              <span class="pl-title">{{ editingPlaylist.title }}</span>
              <el-button :icon="Edit" size="small" plain @click="onRenamePlaylist">改名</el-button>
            </div>
            <div class="pl-stats">
              <el-tag size="small" effect="plain">{{ editingPlaylist.songCount }} 首</el-tag>
              <el-tag size="small" effect="plain" type="info">浏览 {{ editingPlaylist.viewCount }}</el-tag>
              <el-tag size="small" effect="plain" :type="editingPlaylist.isPublic ? 'success' : 'info'">
                {{ editingPlaylist.isPublic ? '已分享' : '未分享' }}
              </el-tag>
            </div>
          </div>

          <div class="pl-section">
            <div class="pl-section-title">歌单内歌曲（{{ songsInPlaylist.length }}）</div>
            <div v-if="songsInPlaylist.length === 0" class="pl-empty">歌单为空，从下方添加</div>
            <div v-for="s in songsInPlaylist" :key="s.id" class="pl-song-row">
              <div class="pl-song-info" @click="onPlaySong(s)">
                <span class="pl-song-title" :class="{ playing: currentSong?.id === s.id }">{{ s.title }}</span>
                <span class="pl-song-artist">{{ s.artist || '未知艺人' }}</span>
              </div>
              <div class="pl-song-actions">
                <el-button :icon="VideoPlay" size="small" plain circle @click="onPlaySong(s)" />
                <el-button :icon="Remove" size="small" plain @click="onRemoveSongFromPlaylist(s.id)" />
              </div>
            </div>
          </div>

          <div class="pl-section">
            <div class="pl-section-title">未加入此歌单的歌曲（{{ songsNotInPlaylist.length }}）</div>
            <div v-if="songsNotInPlaylist.length === 0" class="pl-empty">所有歌曲都在歌单里了 ✨</div>
            <div v-for="s in songsNotInPlaylist" :key="s.id" class="pl-song-row">
              <div class="pl-song-info" @click="onPlaySong(s)">
                <span class="pl-song-title" :class="{ playing: currentSong?.id === s.id }">{{ s.title }}</span>
                <span class="pl-song-artist">{{ s.artist || '未知艺人' }}</span>
              </div>
              <div class="pl-song-actions">
                <el-button :icon="VideoPlay" size="small" plain circle @click="onPlaySong(s)" />
                <el-button
                  :icon="Plus" size="small" type="primary" plain :loading="addingSongId === s.id"
                  @click="onAddSongToPlaylist(s.id)"
                >
                  加入
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </el-drawer>

    <ToolDetail title="使用说明">
      <ol class="text-sm leading-7 text-gray-700">
        <li>登录后，点击「上传音频」按钮，在弹窗里选择或拖拽音频文件。</li>
        <li>每首歌和每个歌单都有独立的公开分享链接，复制链接发给别人即可收听，无需登录。</li>
        <li>歌曲可以加入任意多个歌单；删除歌曲会从所有歌单中自动移除。</li>
        <li>单文件上限 30 MB。</li>
        <li><strong>不会压缩音质</strong>，上传的音频文件以原始字节完整保存到 R2，原版播放。</li>
      </ol>
    </ToolDetail>
  </div>
</template>

<style scoped>
/* ============ 登录门（沿用 AliyunOssManager 的 .login-banner） ============ */
.login-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: linear-gradient(135deg, #fff7ed, #fed7aa);
  border: 1.5px solid #fdba74;
  border-radius: 14px;
  margin-bottom: 16px;
}
.banner-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
}
.banner-text { flex: 1; }
.banner-title { font-size: 15px; font-weight: 600; color: #7c2d12; }
.banner-desc { font-size: 13px; color: #9a3412; margin-top: 2px; }

/* ============ 主布局：左侧菜单 + 右侧内容 ============ */
.music-layout {
  display: flex;
  gap: 16px;
  background: #fff;
  border: 1.5px solid #fed7aa;
  border-radius: 16px;
  padding: 16px;
  min-height: 600px;
}

.side-menu {
  flex-shrink: 0;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #fffbeb;
  border-radius: 12px;
  border: 1px solid #fed7aa;
  height: fit-content;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #7c2d12;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.menu-item:hover { background: #fef3c7; }
.menu-item.active {
  background: #ea580c;
  color: #fff;
  font-weight: 600;
}
.menu-item.active :deep(.el-tag) {
  background-color: rgba(255, 255, 255, 0.25);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
}
.menu-label { flex: 1; }

.content-panel {
  flex: 1;
  min-width: 0;
}

/* ============ 区块头 ============ */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}
.section-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* ============ 歌曲表格 ============ */
.cell-title {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 2px 6px;
  margin: -2px -6px;
  border-radius: 4px;
  transition: background 0.15s;
  user-select: none;
}
.cell-title:hover { background: #fff7ed; }
.cell-title:hover .cell-title-text { color: #ea580c; }
.cell-title.playing .cell-title-text { color: #ea580c; font-weight: 600; }
.cell-icon { color: #d1d5db; transition: color 0.15s; }
.cell-title:hover .cell-icon { color: #ea580c; }
.cell-title-text {
  transition: color 0.15s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.cell-icon { flex-shrink: 0; }

/* 正在播放：三柱均衡器跳动 */
.np-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  width: 14px;
  justify-content: center;
}
.np-eq .bar {
  width: 3px;
  background: #ea580c;
  border-radius: 1px;
  transform-origin: bottom;
  animation: eq-bounce 0.9s ease-in-out infinite alternate;
}
.np-eq .bar:nth-child(1) { height: 60%; animation-delay: 0s; }
.np-eq .bar:nth-child(2) { height: 100%; animation-delay: 0.15s; }
.np-eq .bar:nth-child(3) { height: 75%; animation-delay: 0.3s; }
@keyframes eq-bounce {
  from { transform: scaleY(0.25); }
  to   { transform: scaleY(1); }
}

/* ============ 播放器条：固定在视口底部，避开抽屉遮挡 ============ */
.now-playing-bar {
  position: fixed;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1.5px solid #fed7aa;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(234, 88, 12, 0.18);
  z-index: 4000; /* 高于 el-drawer(3001)/el-dialog，避免被遮挡；低于 el-message(9999) */
}
.np-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 auto;
  min-width: 0;
}
.np-title {
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}
.np-artist { color: #6b7280; font-size: 12px; flex-shrink: 0; }
.np-audio { flex: 1; min-width: 240px; height: 36px; }

@media (max-width: 768px) {
  .now-playing-bar { flex-wrap: wrap; }
  .np-audio { width: 100%; flex-basis: 100%; }
}

/* ============ 歌单卡片 ============ */
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.playlist-card {
  padding: 14px;
  border: 1.5px solid #fed7aa;
  border-radius: 12px;
  background: #fffbeb;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  user-select: none;
}
.playlist-card:hover { background: #fff7ed; border-color: #fdba74; }
.playlist-card:active { transform: scale(0.99); }
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.card-title { font-weight: 600; font-size: 14px; color: #7c2d12; }
.card-share { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.card-share-text { font-size: 12px; color: #9a3412; font-weight: 500; }
.card-desc {
  font-size: 12px;
  color: #9a3412;
  min-height: 18px;
  word-break: break-all;
}
.card-meta { display: flex; gap: 6px; }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }

/* ============ 上传弹窗 ============ */
.upload-zone {
  border: 2px dashed #fdba74;
  border-radius: 12px;
  padding: 28px;
  text-align: center;
  background: #fffbeb;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.upload-zone:hover { background: #fef3c7; border-color: #ea580c; }
.upload-title { font-size: 14px; font-weight: 600; color: #7c2d12; margin-top: 8px; }
.upload-desc { font-size: 12px; color: #9a3412; margin-top: 4px; }

.upload-queue {
  margin-top: 14px;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  background: #fffbeb;
  padding: 10px 12px;
  max-height: 360px;
  overflow-y: auto;
}
.queue-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #7c2d12;
  margin-bottom: 6px;
}
.queue-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid #fed7aa;
}
.queue-row:last-child { border-bottom: none; }
.row-name {
  flex: 1 1 160px;
  min-width: 0;
  font-size: 12px;
  color: #7c2d12;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-size {
  flex: 0 0 64px;
  font-size: 11px;
  color: #9a3412;
  text-align: right;
}
.cost-num { font-size: 14px; font-weight: 700; color: #c2410c; }
.cost-label { font-size: 11px; color: #9a3412; margin-left: 1px; font-weight: 400; }
.row-progress { flex: 1 1 220px; min-width: 0; }
.row-status { font-size: 11px; color: #9a3412; margin-top: 2px; }
.queue-row.failed .row-name { color: #b91c1c; }
.queue-row.skipped { opacity: 0.7; }
.queue-row.done { opacity: 0.85; }
.skipped-text { color: #6b7280; }

/* 合计 / 余额 footer */
.upload-summary {
  margin-top: 10px;
  padding: 10px 12px;
  background: #fff7ed;
  border-radius: 8px;
  border: 1px dashed #fdba74;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 0;
  font-size: 13px;
  color: #7c2d12;
}
.summary-label { font-weight: 500; }
.summary-value { font-weight: 600; }
.summary-breakdown {
  margin-top: -2px;
  margin-bottom: 4px;
  padding: 6px 10px;
  background: #fff7ed;
  border-left: 3px solid #fdba74;
  border-radius: 4px;
  font-size: 11px;
  color: #7c2d12;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.summary-value.is-low .cost-num { color: #b91c1c; }
.summary-warn {
  margin-top: 6px;
  padding: 6px 10px;
  background: #fee2e2;
  border-radius: 6px;
  font-size: 12px;
  color: #991b1b;
}
.summary-warn strong { color: #7f1d1d; }

/* 不压缩音质承诺 */
.quality-note {
  margin-top: 4px;
  padding: 6px 10px;
  background: #ecfdf5;
  border-radius: 6px;
  border: 1px solid #a7f3d0;
  color: #065f46;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.quality-icon { font-size: 14px; }
.quality-text { font-weight: 500; }

/* 顶部免费额度进度条 */
.free-quota-bar {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
}
.free-quota-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
  font-size: 12px;
  color: #065f46;
}
.free-quota-label { font-weight: 600; }
.free-quota-delta { font-size: 11px; color: #047857; }

/* ============ 歌单编辑器（el-drawer） ============ */
.pl-editor { padding: 0 4px; }
.pl-meta {
  padding: 12px;
  background: #fff7ed;
  border-radius: 10px;
  margin-bottom: 14px;
}
.pl-title-row { display: flex; justify-content: space-between; align-items: center; }
.pl-title { font-weight: 600; font-size: 15px; color: #7c2d12; }
.pl-stats { display: flex; gap: 6px; margin-top: 6px; }
.pl-section { margin-top: 14px; }
.pl-section-title { font-size: 13px; font-weight: 600; color: #1f2937; margin-bottom: 6px; }
.pl-empty { font-size: 12px; color: #9ca3af; padding: 10px 0; text-align: center; }
.pl-song-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #f3f4f6;
}
.pl-song-row:last-child { border-bottom: none; }
.pl-song-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.15s;
}
.pl-song-info:hover { background: #fff7ed; }
.pl-song-info:hover .pl-song-title { color: #ea580c; }
.pl-song-title.playing { color: #ea580c; font-weight: 600; }
.pl-song-title { transition: color 0.15s; }
.pl-song-title { font-size: 13px; font-weight: 500; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl-song-artist { font-size: 11px; color: #6b7280; }
.pl-song-actions { display: flex; gap: 4px; }

/* ============ 响应式：小屏侧栏折叠 ============ */
@media (max-width: 768px) {
  .music-layout {
    flex-direction: column;
  }
  .side-menu {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
  .menu-item {
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* 歌曲表格：操作列只显示图标 + 收紧单元格内边距，给标题腾空间 */
  .content-panel :deep(.el-table__cell) {
    padding: 6px 0 !important;
  }
  .content-panel :deep(.el-table__cell:first-child) {
    padding-left: 8px !important;
  }
  .content-panel :deep(.el-table__cell:last-child) {
    padding-right: 8px !important;
  }
  .content-panel :deep(.el-button-group .el-button) {
    padding: 4px 8px;
    min-width: 32px;
  }
  .content-panel :deep(.el-button-group .el-button .ops-label) {
    display: none;
  }
  /* 隐藏的空列宽：兜底，万一 isMobile 切换前 el-table 已 mount */
  .content-panel :deep(.is-hidden) {
    display: none;
  }

  /* 固定底栏：内容避让 + 调整播放器条内边距以适配小屏 */
  .has-player { padding-bottom: 110px; }
  .now-playing-bar { padding: 8px 12px; gap: 8px; bottom: 8px; left: 8px; right: 8px; }
  .np-audio { min-width: 160px !important; height: 32px !important; }
}
</style>