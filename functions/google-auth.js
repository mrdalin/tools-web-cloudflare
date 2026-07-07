import { getCORSHeaders } from './utils/cors.js'

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

let jwksCache = null
let jwksCacheExpiresAt = 0

const jsonResponse = (data, status, origin) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCORSHeaders(origin)
    }
  })

const base64urlToBytes = (value) => {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const decodeBase64urlJson = (value) => JSON.parse(new TextDecoder().decode(base64urlToBytes(value)))

const getGoogleJwks = async () => {
  const now = Date.now()
  if (jwksCache && now < jwksCacheExpiresAt) {
    return jwksCache
  }

  const response = await fetch(GOOGLE_JWKS_URL)
  if (!response.ok) {
    throw new Error('Unable to fetch Google public keys')
  }

  const maxAge = response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]
  jwksCacheExpiresAt = now + (Number(maxAge || 300) * 1000)
  jwksCache = await response.json()
  return jwksCache
}

const verifyGoogleCredential = async (credential, clientId) => {
  const parts = String(credential || '').split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid Google credential format')
  }

  const [headerPart, payloadPart, signaturePart] = parts
  const header = decodeBase64urlJson(headerPart)
  const payload = decodeBase64urlJson(payloadPart)

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Google credential signature')
  }

  const jwks = await getGoogleJwks()
  const jwk = jwks.keys?.find((key) => key.kid === header.kid)
  if (!jwk) {
    throw new Error('Google public key not found')
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const signedData = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  const signature = base64urlToBytes(signaturePart)
  const signatureValid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    signature,
    signedData
  )

  if (!signatureValid) {
    throw new Error('Invalid Google credential signature')
  }

  const now = Math.floor(Date.now() / 1000)
  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    throw new Error('Invalid Google credential issuer')
  }
  if (payload.aud !== clientId) {
    throw new Error('Invalid Google credential audience')
  }
  if (!payload.exp || payload.exp < now) {
    throw new Error('Google credential has expired')
  }
  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('Google account email is not verified')
  }

  return payload
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...getCORSHeaders(origin),
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, origin)
  }

  try {
    const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      return jsonResponse({ success: false, error: 'Google 登录未配置' }, 500, origin)
    }

    const { credential } = await request.json()
    if (!credential) {
      return jsonResponse({ success: false, error: '缺少 Google 登录凭证' }, 400, origin)
    }

    const payload = await verifyGoogleCredential(credential, clientId)
    const email = String(payload.email).trim().toLowerCase()
    const avatar = payload.picture || ''
    const username = payload.name || email.split('@')[0]
    const thirdPartyUid = payload.sub
    const db = env.DB
    const nowStr = new Date().toISOString()

    let found = await db.prepare('SELECT id FROM user WHERE email = ?').bind(email).first()

    let userId
    if (found?.id) {
      userId = found.id
      await db.prepare(`
        UPDATE user SET
          avatar = ?,
          last_login = ?,
          username = ?,
          third_party_uid = ?,
          third_party_type = 'google',
          user_level = ?
        WHERE id = ?
      `).bind(avatar, nowStr, username, thirdPartyUid, 0, userId).run()
    } else {
      userId = crypto.randomUUID()
      await db.prepare(`
        INSERT INTO user (id, email, avatar, created_at, last_login, third_party_uid, username, user_level, third_party_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, email, avatar, nowStr, nowStr, thirdPartyUid, username, 0, 'google').run()
    }

    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured')
    }

    const token = await signJWT(
      {
        uid: userId,
        email,
        avatar,
        username,
        thirdPartyType: 'google',
        thirdPartyUid,
        thirdPartyLevel: 0,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 * 7
      },
      env.JWT_SECRET
    )

    return jsonResponse({ success: true, token, message: '登录成功' }, 200, origin)
  } catch (error) {
    console.error('Google auth error:', error)
    return jsonResponse({
      success: false,
      error: 'Google 登录失败',
      message: error.message
    }, 401, origin)
  }
}

async function signJWT(payload, secret) {
  const enc = new TextEncoder()
  const header = { alg: 'HS256', typ: 'JWT' }
  const base64url = (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

  const headerB64 = base64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)))
  const data = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const sigB64 = base64url(sig)

  return `${data}.${sigB64}`
}
