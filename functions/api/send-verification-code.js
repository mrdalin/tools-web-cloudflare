import { ApiResponse } from '../utils/db.js'

const verificationCodes = new Map()
const rateLimitBuckets = new Map()

const CODE_TTL_MS = 5 * 60 * 1000
const SEND_WINDOW_MS = 15 * 60 * 1000
const IP_SEND_LIMIT = 20
const EMAIL_SEND_LIMIT = 5
const EMAIL_COOLDOWN_MS = 60 * 1000
const MAX_VERIFY_FAILURES = 5

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const getClientIp = (request) => {
  const forwardedFor = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || ''
  return forwardedFor.split(',')[0].trim() || 'unknown'
}

const consumeRateLimit = (key, limit, windowMs) => {
  const now = Date.now()
  const bucket = (rateLimitBuckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs)

  if (bucket.length >= limit) {
    rateLimitBuckets.set(key, bucket)
    return false
  }

  bucket.push(now)
  rateLimitBuckets.set(key, bucket)
  return true
}

const canSendCode = (request, email, type) => {
  const ip = getClientIp(request)
  return (
    consumeRateLimit(`ip:${ip}`, IP_SEND_LIMIT, SEND_WINDOW_MS) &&
    consumeRateLimit(`email:${email}:${type}`, EMAIL_SEND_LIMIT, SEND_WINDOW_MS) &&
    consumeRateLimit(`cooldown:${email}:${type}`, 1, EMAIL_COOLDOWN_MS)
  )
}

const ensureVerificationCodeTable = async (db) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      type TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      failures INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      consumed_at INTEGER,
      UNIQUE(email, type)
    )
  `).run()

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at
    ON verification_codes(expires_at)
  `).run()
}

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const hashCode = async (env, email, type, code) => {
  const encoder = new TextEncoder()
  const secret = env.JWT_SECRET || ''
  const data = `${normalizeEmail(email)}:${type}:${String(code || '').trim()}:${secret}`
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return toHex(digest)
}

const saveVerificationCode = async (env, email, type, code) => {
  if (!env.DB) throw new Error('D1 database is not bound')

  await ensureVerificationCodeTable(env.DB)

  const now = Date.now()
  const codeHash = await hashCode(env, email, type, code)
  await env.DB.prepare(`
    INSERT INTO verification_codes (id, email, type, code_hash, expires_at, failures, created_at, consumed_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, NULL)
    ON CONFLICT(email, type) DO UPDATE SET
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      failures = 0,
      created_at = excluded.created_at,
      consumed_at = NULL
  `).bind(crypto.randomUUID(), email, type, codeHash, now + CODE_TTL_MS, now).run()

  await env.DB.prepare('DELETE FROM verification_codes WHERE expires_at < ? OR consumed_at IS NOT NULL')
    .bind(now)
    .run()
}

export const consumeVerificationCode = async (env, email, type) => {
  if (!env.DB) return

  await ensureVerificationCodeTable(env.DB)
  await env.DB.prepare('DELETE FROM verification_codes WHERE email = ? AND type = ?')
    .bind(normalizeEmail(email), type)
    .run()
}

const generateCode = () => {
  const random = new Uint32Array(1)
  crypto.getRandomValues(random)
  return String(100000 + (random[0] % 900000))
}

const sendEmail = async (to, subject, html, apiKey, fromEmail) => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html
      })
    })

    return response.ok
  } catch (error) {
    console.error('Resend error:', error)
    return false
  }
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method !== 'POST') {
    return ApiResponse.error('仅支持 POST 请求', origin, 405)
  }

  try {
    const { email: rawEmail, type } = await request.json()
    const email = normalizeEmail(rawEmail)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ApiResponse.error('邮箱格式不正确', origin, 400)
    }

    if (!['register', 'login', 'reset'].includes(type)) {
      return ApiResponse.error('类型参数错误', origin, 400)
    }

    if (!canSendCode(request, email, type)) {
      return ApiResponse.error('验证码请求过于频繁，请稍后再试', origin, 429)
    }

    if (type === 'register') {
      const existing = await env.DB.prepare('SELECT id FROM user WHERE email = ?').bind(email).first()
      if (existing) {
        return ApiResponse.error('该邮箱已注册', origin, 409)
      }
    }

    if (type === 'login' || type === 'reset') {
      const existing = await env.DB.prepare('SELECT id FROM user WHERE email = ?').bind(email).first()
      if (!existing) {
        return ApiResponse.error('该邮箱未注册', origin, 404)
      }
    }

    const code = generateCode()
    const typeText = { register: '注册', login: '登录', reset: '重置密码' }[type]
    const subject = `【Youngbar工具箱】${typeText}验证码`
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f766e;">Youngbar工具箱 ${typeText}验证码</h2>
        <p style="font-size: 16px; color: #666;">您正在进行${typeText}操作，验证码为：</p>
        <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #0f766e; letter-spacing: 5px;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #999;">验证码有效期为 5 分钟，请勿泄露给他人。</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">如非本人操作，请忽略此邮件。</p>
      </div>
    `

    await saveVerificationCode(env, email, type, code)

    const sent = await sendEmail(email, subject, html, env.RESEND_API_KEY, env.RESEND_FROM_EMAIL)

    if (!sent) {
      await consumeVerificationCode(env, email, type)
      return ApiResponse.error('验证码发送失败，请稍后重试', origin, 500)
    }

    return ApiResponse.success({ message: '验证码已发送，请查收邮件' }, origin)
  } catch (error) {
    console.error('Send verification code error:', error)
    return ApiResponse.error('服务器错误', origin, 500)
  }
}

export const verifyCode = async (env, email, type, code, options = {}) => {
  const normalizedEmail = normalizeEmail(email)
  const submittedCode = String(code || '').trim()
  const shouldConsume = options.consume !== false

  if (env?.DB) {
    await ensureVerificationCodeTable(env.DB)

    const stored = await env.DB.prepare(`
      SELECT code_hash, expires_at, failures
      FROM verification_codes
      WHERE email = ? AND type = ? AND consumed_at IS NULL
      LIMIT 1
    `).bind(normalizedEmail, type).first()

    if (!stored) return false

    if (Date.now() > Number(stored.expires_at)) {
      await consumeVerificationCode(env, normalizedEmail, type)
      return false
    }

    const failures = Number(stored.failures || 0)
    if (failures >= MAX_VERIFY_FAILURES) {
      await consumeVerificationCode(env, normalizedEmail, type)
      return false
    }

    const submittedHash = await hashCode(env, normalizedEmail, type, submittedCode)
    if (stored.code_hash !== submittedHash) {
      if (failures + 1 >= MAX_VERIFY_FAILURES) {
        await consumeVerificationCode(env, normalizedEmail, type)
      } else {
        await env.DB.prepare('UPDATE verification_codes SET failures = ? WHERE email = ? AND type = ?')
          .bind(failures + 1, normalizedEmail, type)
          .run()
      }
      return false
    }

    if (shouldConsume) {
      await consumeVerificationCode(env, normalizedEmail, type)
    }

    return true
  }

  const key = `${normalizedEmail}:${type}`
  const stored = verificationCodes.get(key)

  if (!stored) return false
  if (Date.now() > stored.expires) {
    verificationCodes.delete(key)
    return false
  }
  if (stored.failures >= MAX_VERIFY_FAILURES) {
    verificationCodes.delete(key)
    return false
  }
  if (stored.code !== submittedCode) {
    stored.failures = (stored.failures || 0) + 1
    if (stored.failures >= MAX_VERIFY_FAILURES) {
      verificationCodes.delete(key)
    } else {
      verificationCodes.set(key, stored)
    }
    return false
  }

  if (shouldConsume) {
    verificationCodes.delete(key)
  }
  return true
}
