import { AuthMiddleware } from '../middlewares/auth.js'

export async function extractUidFromRequest(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return ''
  const token = authHeader.substring(7)
  if (!env || !env.JWT_SECRET) return ''
  const verifyResult = await AuthMiddleware.verifyToken(token, env.JWT_SECRET)
  if (!verifyResult.success) return ''
  return verifyResult.payload?.uid || ''
}
