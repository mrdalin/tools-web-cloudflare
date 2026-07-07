import { ApiResponse } from '../utils/db.js'
import { consumeVerificationCode, verifyCode } from './send-verification-code.js'

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
    const { email: rawEmail, code } = await request.json()
    const email = String(rawEmail || '').trim().toLowerCase()

    if (!email || !code) {
      return ApiResponse.error('请填写邮箱和验证码', origin, 400)
    }

    const user = await env.DB.prepare('SELECT id, email, username, avatar FROM user WHERE email = ?')
      .bind(email)
      .first()

    if (!user) {
      return ApiResponse.error('用户不存在', origin, 404)
    }

    const validCode = await verifyCode(env, email, 'login', code, { consume: false })
    if (!validCode) {
      return ApiResponse.error('验证码错误或已过期', origin, 400)
    }

    const now = new Date().toISOString()
    await env.DB.prepare('UPDATE user SET last_login = ? WHERE id = ?').bind(now, user.id).run()
    await consumeVerificationCode(env, email, 'login')

    const token = await generateJWT({
      uid: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar || ''
    }, env.JWT_SECRET)

    return ApiResponse.success({ token, username: user.username }, origin)
  } catch (error) {
    console.error('Email login error:', error)
    return ApiResponse.error('登录失败，请稍后重试', origin, 500)
  }
}
