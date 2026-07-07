import { ApiResponse } from '../utils/db.js'
import { consumeVerificationCode, verifyCode } from './send-verification-code.js'
import { createPasswordHash } from '../utils/password.js'

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method !== 'POST') {
    return ApiResponse.error('仅支持 POST 请求', origin, 405)
  }

  try {
    const { email: rawEmail, code, newPassword } = await request.json()
    const email = String(rawEmail || '').trim().toLowerCase()

    if (!email || !code || !newPassword) {
      return ApiResponse.error('请填写完整信息', origin, 400)
    }

    if (newPassword.length < 6) {
      return ApiResponse.error('密码至少 6 位', origin, 400)
    }

    const user = await env.DB.prepare('SELECT id FROM user WHERE email = ?').bind(email).first()
    if (!user) {
      return ApiResponse.error('用户不存在', origin, 404)
    }

    const validCode = await verifyCode(env, email, 'reset', code, { consume: false })
    if (!validCode) {
      return ApiResponse.error('验证码错误或已过期', origin, 400)
    }

    const { hash: hashedPassword, salt } = await createPasswordHash(newPassword)
    const now = new Date().toISOString()
    await env.DB.prepare('UPDATE user SET password = ?, salt = ?, last_login = ? WHERE id = ?')
      .bind(hashedPassword, salt, now, user.id)
      .run()

    await consumeVerificationCode(env, email, 'reset')

    return ApiResponse.success({ message: '密码重置成功' }, origin)
  } catch (error) {
    console.error('Reset password error:', error)
    return ApiResponse.error('密码重置失败，请稍后重试', origin, 500)
  }
}
