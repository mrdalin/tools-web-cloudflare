const PBKDF2_ITERATIONS = 150000
const SALT_BYTES = 16
const HASH_BYTES = 32
const PBKDF2_PREFIX = 'pbkdf2$sha256'

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Invalid hex input')
  }

  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function randomHex(length) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function pbkdf2(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: hexToBytes(saltHex),
      iterations
    },
    keyMaterial,
    HASH_BYTES * 8
  )

  return bytesToHex(new Uint8Array(bits))
}

async function legacySha256(password, salt) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(hash))
}

export async function createPasswordHash(password) {
  const salt = randomHex(SALT_BYTES)
  const hash = await pbkdf2(password, salt)

  return {
    hash: `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${salt}$${hash}`,
    salt
  }
}

export function isPbkdf2Hash(hash) {
  return typeof hash === 'string' && hash.startsWith(`${PBKDF2_PREFIX}$`)
}

export async function verifyPassword(password, storedHash, storedSalt) {
  if (!storedHash || !storedSalt) {
    return { valid: false, needsUpgrade: false }
  }

  if (isPbkdf2Hash(storedHash)) {
    const parts = storedHash.split('$')
    if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') {
      return { valid: false, needsUpgrade: false }
    }

    const iterations = Number(parts[2])
    const salt = parts[3]
    const expectedHash = parts[4]
    if (!Number.isInteger(iterations) || iterations < 1 || !salt || !expectedHash) {
      return { valid: false, needsUpgrade: false }
    }

    const actualHash = await pbkdf2(password, salt, iterations)
    const valid = timingSafeEqual(actualHash, expectedHash)
    return {
      valid,
      needsUpgrade: valid && iterations < PBKDF2_ITERATIONS
    }
  }

  const legacyHash = await legacySha256(password, storedSalt)
  return {
    valid: timingSafeEqual(legacyHash, storedHash),
    needsUpgrade: timingSafeEqual(legacyHash, storedHash)
  }
}

