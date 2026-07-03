import { ApiResponse } from '../utils/db.js'
import { verifyCode } from './send-verification-code.js'
import { createPasswordHash } from '../utils/password.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return ApiResponse.error('仅支持 POST 请求', request.headers.get('Origin'))
  }

  try {
    const { email: rawEmail, code, newPassword } = await request.json()
    const email = String(rawEmail || '').trim().toLowerCase()

    if (!email || !code || !newPassword) {
      return ApiResponse.error('参数不完整', request.headers.get('Origin'))
    }

    if (newPassword.length < 6) {
      return ApiResponse.error('密码至少6位', request.headers.get('Origin'))
    }

    // 验证验证码
    if (!verifyCode(email, 'reset', code)) {
      return ApiResponse.error('验证码错误或已过期', request.headers.get('Origin'))
    }

    // 检查用户是否存在
    const user = await env.DB.prepare('SELECT id FROM user WHERE email = ?').bind(email).first()
    if (!user) {
      return ApiResponse.error('用户不存在', request.headers.get('Origin'))
    }

    // 更新密码
    const { hash: hashedPassword, salt } = await createPasswordHash(newPassword)
    const now = new Date().toISOString()
    await env.DB.prepare('UPDATE user SET password = ?, salt = ?, last_login = ? WHERE email = ?')
      .bind(hashedPassword, salt, now, email).run()

    return ApiResponse.success({ message: '密码重置成功' }, request.headers.get('Origin'))
  } catch (error) {
    console.error('Reset password error:', error)
    return ApiResponse.error('密码重置失败', request.headers.get('Origin'), 500)
  }
}
