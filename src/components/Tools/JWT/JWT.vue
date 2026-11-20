<script setup lang="ts">
import { reactive, ref, onMounted, watch } from 'vue'
import DetailHeader from '@/components/Layout/DetailHeader/DetailHeader.vue'
import ToolDetail from '@/components/Layout/ToolDetail/ToolDetail.vue'
import {jwtDecode} from 'jwt-decode'
import { ElMessage } from 'element-plus'

const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin
const siteHost = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')

const getHmacHash = (algorithm: unknown) => {
  if (algorithm === 'HS256') return 'SHA-256'
  if (algorithm === 'HS384') return 'SHA-384'
  if (algorithm === 'HS512') return 'SHA-512'
  return null
}

const encodeBase64Url = (value: Uint8Array) => {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const decodeBase64Url = (value: string) => {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    throw new Error('Token签名编码无效')
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  if (encodeBase64Url(bytes) !== value) throw new Error('Token签名编码无效')
  return bytes
}

const encodeJsonObject = (value: string) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('Header 和 Payload 必须是有效 JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JWT Header 和 Payload 必须是 JSON 对象')
  }
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(parsed)))
}

const createRandomSecret = () => encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))

// 添加tab状态
const activeTab = ref('parse')

const info = reactive({
  title: "JWT工具",
  token: '', // 移除硬编码的token
})

// JWT生成相关数据
const generateData = reactive({
  header: JSON.stringify({
    "alg": "HS256",
    "typ": "JWT"
  }, null, 2),
  payload: JSON.stringify({
    "iss": siteHost,
    "sub": "youngbar-user",
    "aud": siteHost,
    "iat": Math.floor(Date.now() / 1000),
    "exp": Math.floor(Date.now() / 1000) + 3600
  }, null, 2),
  secret: createRandomSecret(),
  generatedToken: ''
})

const decodeHeader = ref()
const decodePayload = ref()
const invalidToken = ref(false)
// 添加校验相关的状态
const verifySecret = ref('')
const signatureValid = ref(false)
const signatureInvalid = ref(false)

//解析
const parser = () => {
  if (!info.token || !info.token.trim()) {
    ElMessage.warning('请输入JWT Token')
    return
  }
  try {
    decodePayload.value = JSON.stringify(jwtDecode(info.token), null, '\t')
    decodeHeader.value = JSON.stringify(jwtDecode(info.token, {header: true}), null, '\t')
    invalidToken.value = false
    // 重置校验状态
    signatureValid.value = false
    signatureInvalid.value = false
    ElMessage.success('解析成功')
  } catch {
    invalidToken.value = true
    decodeHeader.value = ''
    decodePayload.value = ''
    signatureValid.value = false
    signatureInvalid.value = false
    ElMessage.error('Token格式无效，请检查输入')
  }
}

// 添加JWT签名校验功能
const verifySignature = async () => {
  signatureValid.value = false
  signatureInvalid.value = false

  if (!info.token.trim()) {
    ElMessage.warning('请输入JWT Token')
    return
  }
  if (!verifySecret.value) {
    ElMessage.warning('请输入Secret')
    return
  }
  
  try {
    const parts = info.token.split('.')
    if (parts.length !== 3) {
      ElMessage.error('Token格式不正确')
      return
    }
    const header = jwtDecode<{ alg?: string }>(info.token, { header: true })
    const hash = getHmacHash(header.alg)
    if (!hash) {
      ElMessage.error('仅支持 HS256、HS384、HS512 签名算法')
      return
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(verifySecret.value),
      { name: 'HMAC', hash },
      false,
      ['verify'],
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )

    if (valid) {
      signatureValid.value = true
      signatureInvalid.value = false
      ElMessage.success('签名校验成功！')
    } else {
      signatureValid.value = false
      signatureInvalid.value = true
      ElMessage.error('签名校验失败！')
    }
  } catch {
    ElMessage.error('校验过程中发生错误')
  }
}

//清空输入框
const clear = () => {
  info.token = ''
  decodeHeader.value = ''
  decodePayload.value = ''
  invalidToken.value = false
  verifySecret.value = ''
  signatureValid.value = false
  signatureInvalid.value = false
}

// 生成JWT
let generationVersion = 0
const generateJWT = async (notifyOnError = false) => {
  const currentVersion = ++generationVersion
  const headerValue = generateData.header
  const payloadValue = generateData.payload
  const secretValue = generateData.secret

  try {
    if (!secretValue) throw new Error('请输入签名密钥')
    const header = encodeJsonObject(headerValue)
    const payload = encodeJsonObject(payloadValue)
    const parsedHeader = JSON.parse(headerValue) as { alg?: string }
    const hash = getHmacHash(parsedHeader.alg)
    if (!hash) throw new Error('仅支持 HS256、HS384、HS512 签名算法')

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secretValue),
      { name: 'HMAC', hash },
      false,
      ['sign'],
    )
    const signature = new Uint8Array(await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${header}.${payload}`),
    ))

    if (currentVersion !== generationVersion) return
    generateData.generatedToken = `${header}.${payload}.${encodeBase64Url(signature)}`
  } catch (error) {
    if (currentVersion !== generationVersion) return
    generateData.generatedToken = ''
    if (notifyOnError) {
      ElMessage.error(error instanceof Error ? error.message : 'JWT生成失败')
    }
  }
}

// 清空生成数据
const clearGenerate = () => {
  generationVersion++
  generateData.header = JSON.stringify({
    "alg": "HS256",
    "typ": "JWT"
  }, null, 2)
  generateData.payload = JSON.stringify({
    "iss": siteHost,
    "sub": "youngbar-user",
    "aud": siteHost,
    "iat": Math.floor(Date.now() / 1000),
    "exp": Math.floor(Date.now() / 1000) + 3600
  }, null, 2)
  generateData.secret = createRandomSecret()
  generateData.generatedToken = ''
}

// 添加过期时间选项
const expirationOptions = [
  { label: '1小时', value: 3600 },
  { label: '5小时', value: 18000 },
  { label: '1天', value: 86400 },
  { label: '3天', value: 259200 },
  { label: '7天', value: 604800 },
  { label: '15天', value: 1296000 },
  { label: '1个月', value: 2592000 }
]

const selectedExpiration = ref(3600) // 默认1小时

// 更新时间戳
const updateTimestamps = () => {
  try {
    const payload = JSON.parse(generateData.payload)
    payload.iat = Math.floor(Date.now() / 1000)
    payload.exp = Math.floor(Date.now() / 1000) + selectedExpiration.value
    generateData.payload = JSON.stringify(payload, null, 2)
  } catch {
    ElMessage.error('Payload JSON 格式无效，无法更新时间戳')
  }
}

// 复制JWT到剪贴板
const copyJWT = async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // 现代浏览器支持
      await navigator.clipboard.writeText(generateData.generatedToken)
      ElMessage.success('JWT已复制到剪贴板')
    } else {
      // 兼容性处理：使用传统方法
      const textArea = document.createElement('textarea')
      textArea.value = generateData.generatedToken
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        ElMessage.success('JWT已复制到剪贴板')
      } catch (err) {
        ElMessage.error('复制失败，请手动复制')
      } finally {
        document.body.removeChild(textArea)
      }
    }
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 生成随机密钥
const generateRandomSecret = () => {
  generateData.secret = createRandomSecret()
}

// 复制Secret到剪贴板
const copySecret = () => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(generateData.secret).then(() => {
      ElMessage.success('Secret已复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败，请手动复制')
    })
  } else {
    const textArea = document.createElement('textarea')
    textArea.value = generateData.secret
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      ElMessage.success('Secret已复制到剪贴板')
    } catch (err) {
      ElMessage.error('复制失败，请手动复制')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

onMounted(async () => {
  // Wait for Web Crypto before parsing the initial token.
  await generateJWT()
  info.token = generateData.generatedToken
  if (info.token) parser()
})

// 监听数据变化，自动生成JWT
watch(
  () => [generateData.header, generateData.payload, generateData.secret],
  ([header, payload, secret]) => {
    if (header && payload && secret) {
      void generateJWT()
    } else {
      generationVersion++
      generateData.generatedToken = ''
    }
  },
)
</script>

<template>
  <div class="flex flex-col mt-3 flex-1">
    <DetailHeader :title="info.title"></DetailHeader>

    <!-- Tab切换 -->
    <div class="p-4 rounded-2xl bg-white mb-4">
      <el-tabs v-model="activeTab" class="w-full">
        <el-tab-pane label="JWT解析" name="parse">
          <div class="mb-6">
            <el-input v-model="info.token" :rows="5" type="textarea" placeholder="请输入Token" @change="parser"></el-input>
            <el-text type="danger" v-if="invalidToken">Invalid token</el-text>
            <div class="mt-3">
              <el-button type="primary" @click="parser">解析</el-button>
              <el-button type="primary" @click="clear">清除</el-button>
            </div>
          </div>

          <!-- Secret校验 -->
          <div class="mb-6">
            <div class="mb-2 font-medium">Secret校验</div>
            <div class="flex gap-2">
              <el-input
                v-model="verifySecret"
                placeholder="请输入用于校验的Secret"
                :type="verifySecret ? 'text' : 'password'"
              />
              <el-button type="success" @click="verifySignature">校验签名</el-button>
            </div>
            <!-- 校验结果提示 -->
            <div v-if="signatureValid" class="mt-2">
              <el-text type="success">✓ 签名校验成功</el-text>
            </div>
            <div v-if="signatureInvalid" class="mt-2">
              <el-text type="danger">✗ 签名校验失败</el-text>
            </div>
          </div>

          <!-- header -->
          <div v-if="decodeHeader">
            <div class="mb-3">Header(头部)</div>
            <el-input
              v-model="decodeHeader"
              type="textarea"
              :autosize="true"
              class="w-full"
              readonly
            />
          </div>

          <!-- payload -->
          <div v-if="decodePayload">
            <div class="mb-3 mt-3">Payload(载荷)</div>
            <el-input
              v-model="decodePayload"
              type="textarea"
              :autosize="true"
              class="w-full"
              readonly
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="JWT生成" name="generate">
          <div class="space-y-4">
            <!-- Header -->
            <div>
              <div class="mb-2 font-medium">Header (头部)</div>
              <el-input
                v-model="generateData.header"
                type="textarea"
                :rows="4"
                placeholder="请输入JWT头部信息"
              />
            </div>

            <!-- Payload -->
            <div>
              <div class="mb-2 font-medium">Payload (载荷)</div>
              <el-input
                v-model="generateData.payload"
                type="textarea"
                :rows="7"
                placeholder="请输入JWT载荷信息"
              />
              <div class="mt-2 flex items-center gap-2">
                <el-select v-model="selectedExpiration" placeholder="选择过期时间" style="width: 120px;">
                  <el-option
                    v-for="option in expirationOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-button size="small" @click="updateTimestamps">更新时间戳</el-button>
              </div>
            </div>

            <!-- Secret -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <div class="font-medium">Secret (密钥)</div>
                <div class="flex gap-2">
                  <el-button size="small" @click="generateRandomSecret">随机生成</el-button>
                  <el-button size="small" @click="copySecret" :disabled="!generateData.secret">复制Secret</el-button>
                </div>
              </div>
              <el-input
                v-model="generateData.secret"
                placeholder="请输入签名密钥"
              />
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2">
              <el-button type="primary" @click="generateJWT(true)">生成JWT</el-button>
              <el-button @click="clearGenerate">重置</el-button>
            </div>

            <!-- 生成的Token -->
            <div v-if="generateData.generatedToken">
              <div class="mb-2 font-medium">生成的JWT Token</div>
              <el-input
                v-model="generateData.generatedToken"
                type="textarea"
                :rows="3"
                readonly
              />
              <div class="mt-2">
                <el-button size="small" @click="copyJWT">
                  复制Token
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- desc -->
    <ToolDetail title="描述">
      <el-text>
        JWT (JSON Web Token) 工具，支持解析和生成JWT令牌。<br>
        <br>
        <strong>JWT解析功能：</strong><br>
        • 解析和解码JSON Web Token并显示其内容<br>
        • 支持Header(头部)和Payload(载荷)的详细查看<br>
        • 提供Secret校验功能，验证JWT签名的有效性<br>
        • 自动检测Token格式的有效性<br>
        <br>
        <strong>JWT生成功能：</strong><br>
        • 自定义Header和Payload内容<br>
        • 支持过期时间快速设置（1小时到15天）<br>
        • 使用加密安全随机数生成32字节密钥<br>
        • 一键复制生成的JWT Token和Secret<br>
        • 实时预览生成的JWT结构<br>
        <br>
        <strong>使用场景：</strong><br>
        • 开发调试JWT认证系统<br>
        • 测试和验证JWT令牌<br>
        • 学习和理解JWT结构<br>
        • API接口的Token生成和验证
      </el-text>
    </ToolDetail>

  </div>
</template>

<style scoped>

</style>
