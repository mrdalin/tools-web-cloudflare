import { ApiResponse } from '../utils/db.js'
import { consumeVerificationCode, verifyCode } from './send-verification-code.js'
import { createPasswordHash } from '../utils/password.js'

const generateJWT = async (payload, secret) => {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = { ...payload, iat: now, exp: now + 30 * 86400 }

  const base64url = (obj) => {
    const str = JSON.stringify(obj)
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const headerB64 = base64url(header)
  const payloadB64 = base64url(jwtPayload)
  const data = `${headerB64}.${payloadB64}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${data}.${signatureB64}`
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method !== 'POST') {
    return ApiResponse.error('仅支持 POST 请求', origin, 405)
  }

  try {
    const { email: rawEmail, password, code, username: rawUsername } = await request.json()
    const email = String(rawEmail || '').trim().toLowerCase()
    const username = String(rawUsername || '').trim()

    if (!email || !password || !code || !username) {
      return ApiResponse.error('请填写完整注册信息', origin, 400)
    }

    if (password.length < 6) {
      return ApiResponse.error('密码至少 6 位', origin, 400)
    }

    const existing = await env.DB.prepare('SELECT id FROM user WHERE email = ?').bind(email).first()
    if (existing) {
      return ApiResponse.error('该邮箱已注册', origin, 409)
    }

    const validCode = await verifyCode(env, email, 'register', code, { consume: false })
    if (!validCode) {
      return ApiResponse.error('验证码错误或已过期', origin, 400)
    }

    const { hash: hashedPassword, salt } = await createPasswordHash(password)
    const userId = crypto.randomUUID()
    const now = new Date().toISOString()
    await env.DB.prepare(
      'INSERT INTO user (id, email, username, password, salt, avatar, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, email, username, hashedPassword, salt, '', now, now).run()

    await consumeVerificationCode(env, email, 'register')

    const token = await generateJWT({ uid: userId, email, username, avatar: '' }, env.JWT_SECRET)

    return ApiResponse.success({ token, username }, origin)
  } catch (error) {
    console.error('Email register error:', error)
    return ApiResponse.error('注册失败，请稍后重试', origin, 500)
  }
}
