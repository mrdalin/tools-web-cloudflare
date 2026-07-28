const BEARER_PREFIX = 'Bearer '

async function digest(value) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  )
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false

  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index]
  }
  return difference === 0
}

export async function hasValidCronSecret(request, configuredSecret) {
  if (typeof configuredSecret !== 'string' || configuredSecret.length === 0) {
    return false
  }

  const authorization = request.headers.get('Authorization') || ''
  const suppliedSecret = authorization.startsWith(BEARER_PREFIX)
    ? authorization.slice(BEARER_PREFIX.length)
    : ''

  const [suppliedDigest, configuredDigest] = await Promise.all([
    digest(suppliedSecret),
    digest(configuredSecret)
  ])

  return constantTimeEqual(suppliedDigest, configuredDigest) && suppliedSecret.length > 0
}
